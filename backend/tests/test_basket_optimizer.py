import json
import pytest
from app.models import Product, Retailer, Offer, Coupon, Basket, BasketItem
from app.services.basket_optimizer_service import BasketOptimizerService
from app.extensions import db

TEST_USER = "test_shopper_basket"

@pytest.fixture(autouse=True)
def clean_test_basket(app):
    """Ensure clean basket state before and after each test."""
    with app.app_context():
        basket = Basket.query.filter_by(user_identifier=TEST_USER).first()
        if basket:
            BasketItem.query.filter_by(basket_id=basket.id).delete()
            db.session.delete(basket)
            db.session.commit()
    yield
    with app.app_context():
        basket = Basket.query.filter_by(user_identifier=TEST_USER).first()
        if basket:
            BasketItem.query.filter_by(basket_id=basket.id).delete()
            db.session.delete(basket)
            db.session.commit()

# 1. Empty basket retrieval
def test_empty_basket_retrieval(client):
    res = client.get(f"/api/basket?user_id={TEST_USER}")
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data["success"] is True
    assert data["data"]["total_items"] == 0
    assert len(data["data"]["items"]) == 0
    assert data["data"]["catalog_mrp_total"] == 0.0

# 2. Adding a valid product
def test_add_valid_product(client, app):
    with app.app_context():
        prod = Product.query.first()
        assert prod is not None

    res = client.post("/api/basket/items", json={
        "product_id": prod.id,
        "quantity": 2,
        "user_identifier": TEST_USER
    })
    assert res.status_code == 201
    data = json.loads(res.data)
    assert data["success"] is True
    assert data["data"]["item"]["product_id"] == prod.id
    assert data["data"]["item"]["quantity"] == 2

# 3. Adding the same product twice updates quantity (deduplication)
def test_add_same_product_deduplication(client, app):
    with app.app_context():
        prod = Product.query.first()
        assert prod is not None

    res1 = client.post("/api/basket/items", json={
        "product_id": prod.id,
        "quantity": 1,
        "user_identifier": TEST_USER
    })
    assert res1.status_code == 201

    res2 = client.post("/api/basket/items", json={
        "product_id": prod.id,
        "quantity": 3,
        "user_identifier": TEST_USER
    })
    assert res2.status_code == 201

    # Basket should have 1 unique item with quantity 4
    res_b = client.get(f"/api/basket?user_id={TEST_USER}")
    data_b = json.loads(res_b.data)["data"]
    assert len(data_b["items"]) == 1
    assert data_b["items"][0]["quantity"] == 4
    assert data_b["total_items"] == 4

# 4. Invalid product ID returns 404
def test_add_invalid_product_returns_404(client):
    res = client.post("/api/basket/items", json={
        "product_id": 999999,
        "quantity": 1,
        "user_identifier": TEST_USER
    })
    assert res.status_code == 404
    data = json.loads(res.data)
    assert data["success"] is False
    assert data["error"]["code"] == "PRODUCT_NOT_FOUND"

# 5. Zero and negative quantities return 400
def test_zero_and_negative_quantities_rejected(client, app):
    with app.app_context():
        prod = Product.query.first()

    for invalid_qty in (0, -1, -5):
        res = client.post("/api/basket/items", json={
            "product_id": prod.id,
            "quantity": invalid_qty,
            "user_identifier": TEST_USER
        })
        assert res.status_code == 400
        data = json.loads(res.data)
        assert data["success"] is False
        assert data["error"]["code"] == "INVALID_QUANTITY"

# 6. Quantity update
def test_update_item_quantity(client, app):
    with app.app_context():
        prod = Product.query.first()

    res_add = client.post("/api/basket/items", json={
        "product_id": prod.id,
        "quantity": 2,
        "user_identifier": TEST_USER
    })
    item_id = json.loads(res_add.data)["data"]["item"]["id"]

    res_patch = client.patch(f"/api/basket/items/{item_id}", headers={"X-User-Id": TEST_USER}, json={
        "quantity": 5
    })
    assert res_patch.status_code == 200
    data = json.loads(res_patch.data)["data"]
    assert data["item"]["quantity"] == 5

# 7. Item deletion
def test_delete_basket_item(client, app):
    with app.app_context():
        prod = Product.query.first()

    res_add = client.post("/api/basket/items", json={
        "product_id": prod.id,
        "quantity": 1,
        "user_identifier": TEST_USER
    })
    item_id = json.loads(res_add.data)["data"]["item"]["id"]

    res_del = client.delete(f"/api/basket/items/{item_id}", headers={"X-User-Id": TEST_USER})
    assert res_del.status_code == 200

    res_b = client.get(f"/api/basket?user_id={TEST_USER}")
    data_b = json.loads(res_b.data)["data"]
    assert len(data_b["items"]) == 0

# 8. Basket clearing
def test_clear_entire_basket(client, app):
    with app.app_context():
        prods = Product.query.limit(2).all()

    for p in prods:
        client.post("/api/basket/items", json={
            "product_id": p.id,
            "quantity": 1,
            "user_identifier": TEST_USER
        })

    res_clear = client.delete("/api/basket", headers={"X-User-Id": TEST_USER})
    assert res_clear.status_code == 200

    res_b = client.get(f"/api/basket?user_id={TEST_USER}")
    data_b = json.loads(res_b.data)["data"]
    assert len(data_b["items"]) == 0

# 9. Product with no eligible offers returns no_feasible_solution
def test_product_with_no_eligible_offers(client, app):
    with app.app_context():
        no_offer_prod = Product(
            sku="ORPHAN-ITEM-99",
            name="Orphan Product No Offers",
            brand="TestBrand",
            category="Accessories",
            base_mrp=1000.0
        )
        db.session.add(no_offer_prod)
        db.session.commit()
        orphan_id = no_offer_prod.id

    client.post("/api/basket/items", json={
        "product_id": orphan_id,
        "quantity": 1,
        "user_identifier": TEST_USER
    })

    res_opt = client.post("/api/basket/optimize", json={"user_identifier": TEST_USER})
    assert res_opt.status_code == 200
    data = json.loads(res_opt.data)["data"]
    assert data["status"] == "no_feasible_solution"
    assert len(data["unavailable_products"]) >= 1

# 10. Unavailable offer exclusion (out of stock offers are not used)
def test_out_of_stock_offer_exclusion(app):
    with app.app_context():
        prod = Product(
            sku="OOS-TEST-PROD",
            name="OOS Test Product",
            brand="TestBrand",
            category="Smartphones",
            base_mrp=20000.0
        )
        r1 = Retailer.query.first()
        db.session.add(prod)
        db.session.flush()

        # Add out of stock offer
        oos_offer = Offer(
            product_id=prod.id,
            retailer_id=r1.id,
            price=15000.0,
            stock_status="Out of Stock"
        )
        db.session.add(oos_offer)
        db.session.commit()

        # Add to basket and optimize
        BasketOptimizerService.add_item(TEST_USER, prod.id, 1)
        res = BasketOptimizerService.optimize_basket(TEST_USER)
        assert res["status"] == "no_feasible_solution"
        assert any(u["product_id"] == prod.id for u in res["unavailable_products"])

# 11 & 12. Lowest-cost single-retailer and multi-retailer strategy
def test_single_and_multi_retailer_strategies(app):
    with app.app_context():
        # Setup 2 products and 2 retailers
        # Retailer A has Product 1 cheap (₹100) and Product 2 expensive (₹500)
        # Retailer B has Product 1 expensive (₹400) and Product 2 cheap (₹150)
        rA = Retailer(name="Ret Alpha", code="alpha", default_shipping_cost=50.0, free_shipping_threshold=1000.0)
        rB = Retailer(name="Ret Beta", code="beta", default_shipping_cost=50.0, free_shipping_threshold=1000.0)
        p1 = Product(sku="ITEM-1", name="Product 1", brand="B1", category="C1", base_mrp=600.0)
        p2 = Product(sku="ITEM-2", name="Product 2", brand="B2", category="C2", base_mrp=600.0)
        db.session.add_all([rA, rB, p1, p2])
        db.session.flush()

        offA1 = Offer(product_id=p1.id, retailer_id=rA.id, price=100.0, shipping_cost=50.0, stock_status="In Stock")
        offA2 = Offer(product_id=p2.id, retailer_id=rA.id, price=500.0, shipping_cost=50.0, stock_status="In Stock")
        offB1 = Offer(product_id=p1.id, retailer_id=rB.id, price=400.0, shipping_cost=50.0, stock_status="In Stock")
        offB2 = Offer(product_id=p2.id, retailer_id=rB.id, price=150.0, shipping_cost=50.0, stock_status="In Stock")
        db.session.add_all([offA1, offA2, offB1, offB2])
        db.session.commit()

        # Add both to basket
        BasketOptimizerService.add_item(TEST_USER, p1.id, 1)
        BasketOptimizerService.add_item(TEST_USER, p2.id, 1)

        res = BasketOptimizerService.optimize_basket(TEST_USER, allow_split_orders=True, max_retailers=2)
        assert res["status"] == "success"

        # Single retailer Alpha: 100 + 500 = 600 + 50 shipping = 650
        # Single retailer Beta: 400 + 150 = 550 + 50 shipping = 600 (Best single!)
        assert res["single_retailer_strategy"] is not None
        assert res["single_retailer_strategy"]["final_payable_total"] == 600.0

        # Multi-retailer split: Product 1 from Alpha (100 + 50 = 150) + Product 2 from Beta (150 + 50 = 200)
        # Total split = 150 + 200 = 350!
        assert res["multi_retailer_strategy"] is not None
        assert res["multi_retailer_strategy"]["final_payable_total"] == 350.0
        assert res["potential_savings"] == 250.0
        assert res["recommendation_type"] == "multi_retailer"

# 13. Shipping aggregation & free shipping threshold qualification
def test_shipping_free_threshold_qualification(app):
    with app.app_context():
        # Retailer with free shipping threshold 500
        r_thresh = Retailer(name="Ret Thresh", code="thresh", default_shipping_cost=60.0, free_shipping_threshold=500.0)
        p_high = Product(sku="HIGH-VAL-1", name="High Value Product", brand="BrandH", category="Tech", base_mrp=1000.0)
        db.session.add_all([r_thresh, p_high])
        db.session.flush()

        off = Offer(product_id=p_high.id, retailer_id=r_thresh.id, price=600.0, shipping_cost=60.0, stock_status="In Stock")
        db.session.add(off)
        db.session.commit()

        shipment = BasketOptimizerService.evaluate_retailer_shipment(
            retailer_id=r_thresh.id,
            items_assigned=[{"product": p_high, "quantity": 1, "offer": off}],
            apply_coupons=False
        )
        assert shipment["qualified_free_shipping"] is True
        assert shipment["shipping_fee"] == 0.0
        assert shipment["order_total"] == 600.0

# 14. Unknown shipping handling (marked incomplete, never assumed 0)
def test_unknown_shipping_handled_safely(app):
    with app.app_context():
        r_unk = Retailer(name="Ret Unknown Shipping", code="unk_ship")
        p_unk = Product(sku="UNK-SHIP-PROD", name="Unknown Ship Product", brand="BrandU", category="Tech", base_mrp=2000.0)
        db.session.add_all([r_unk, p_unk])
        db.session.flush()

        # Offer with shipping_cost=None
        off_unk = Offer(product_id=p_unk.id, retailer_id=r_unk.id, price=1500.0, shipping_cost=None, stock_status="In Stock")
        db.session.add(off_unk)
        db.session.commit()

        shipment = BasketOptimizerService.evaluate_retailer_shipment(
            retailer_id=r_unk.id,
            items_assigned=[{"product": p_unk, "quantity": 1, "offer": off_unk}],
            apply_coupons=False
        )
        assert shipment["shipping_is_unknown"] is True
        assert shipment["shipping_fee"] is None
        assert shipment["is_complete_total"] is False

# 15. Coupon eligibility and maximum discount cap
def test_coupon_applied_with_cap(app):
    with app.app_context():
        r_coup = Retailer(name="Ret Coupon Test", code="coup_ret", default_shipping_cost=0.0)
        p_coup = Product(sku="COUP-PROD", name="Coupon Product", brand="BC", category="Laptops", base_mrp=50000.0)
        db.session.add_all([r_coup, p_coup])
        db.session.flush()

        off = Offer(product_id=p_coup.id, retailer_id=r_coup.id, price=40000.0, shipping_cost=0.0, stock_status="In Stock")
        # 10% coupon capped at 1000
        coup = Coupon(
            code="CAP10PCT",
            title="10% up to 1000",
            discount_type="percentage",
            discount_value=10.0,
            retailer_id=r_coup.id,
            min_order_value=1000.0,
            max_discount_value=1000.0,
            verification_status="verified",
            is_active=True
        )
        db.session.add_all([off, coup])
        db.session.commit()

        shipment = BasketOptimizerService.evaluate_retailer_shipment(
            retailer_id=r_coup.id,
            items_assigned=[{"product": p_coup, "quantity": 1, "offer": off}],
            apply_coupons=True
        )
        assert shipment["applied_coupon"] is not None
        assert shipment["applied_coupon"]["code"] == "CAP10PCT"
        assert shipment["coupon_discount"] == 1000.0
        assert shipment["order_total"] == 39000.0

# 16. Unverified coupon exclusion from confirmed savings
def test_unverified_coupon_not_deducted(app):
    with app.app_context():
        r_unv = Retailer(name="Ret Unverified", code="unv_ret", default_shipping_cost=0.0)
        p_unv = Product(sku="UNV-PROD", name="Unverified Prod", brand="BU", category="Audio", base_mrp=10000.0)
        db.session.add_all([r_unv, p_unv])
        db.session.flush()

        off = Offer(product_id=p_unv.id, retailer_id=r_unv.id, price=8000.0, shipping_cost=0.0, stock_status="In Stock")
        unv_coup = Coupon(
            code="UNVERIFIED500",
            title="Unverified Flat 500",
            discount_type="fixed_amount",
            discount_value=500.0,
            retailer_id=r_unv.id,
            verification_status="unverified",
            is_active=True
        )
        db.session.add_all([off, unv_coup])
        db.session.commit()

        shipment = BasketOptimizerService.evaluate_retailer_shipment(
            retailer_id=r_unv.id,
            items_assigned=[{"product": p_unv, "quantity": 1, "offer": off}],
            apply_coupons=True
        )
        assert shipment["applied_coupon"] is None
        assert shipment["coupon_discount"] == 0.0
        assert len(shipment["conditional_coupons"]) == 1
        assert shipment["conditional_coupons"][0]["code"] == "UNVERIFIED500"
        assert shipment["order_total"] == 8000.0

# 17. Maximum retailer limit constraint
def test_max_retailers_limit(app):
    with app.app_context():
        # With max_retailers=1, split is prohibited and result must match single retailer
        BasketOptimizerService.clear_basket(TEST_USER)
        p = Product.query.first()
        BasketOptimizerService.add_item(TEST_USER, p.id, 1)

        res = BasketOptimizerService.optimize_basket(TEST_USER, allow_split_orders=True, max_retailers=1)
        assert res["status"] == "success"
        if res["single_retailer_strategy"]:
            assert res["multi_retailer_strategy"]["retailers_count"] == 1

# 18. No feasible complete strategy when an item has no offers
def test_no_feasible_strategy_when_item_missing_offer(client, app):
    with app.app_context():
        p1 = Product.query.first()
        p_no_offer = Product(sku="NO-OFF-2", name="No Offer Item", brand="B", category="C", base_mrp=100.0)
        db.session.add(p_no_offer)
        db.session.commit()

        BasketOptimizerService.add_item(TEST_USER, p1.id, 1)
        BasketOptimizerService.add_item(TEST_USER, p_no_offer.id, 1)

        res = BasketOptimizerService.optimize_basket(TEST_USER)
        assert res["status"] == "no_feasible_solution"
        assert len(res["unavailable_products"]) >= 1

# 19. Strategy correctness against small manually calculable example
def test_manual_calculable_scenario(app):
    with app.app_context():
        # Product A: ₹50 at Ret 1 (shipping ₹10), ₹70 at Ret 2 (shipping ₹10)
        # Total for Ret 1 alone = 50 + 10 = ₹60
        r1 = Retailer(name="Ret Calc 1", code="calc1", default_shipping_cost=10.0)
        pA = Product(sku="CALC-A", name="Product A", brand="BA", category="CA", base_mrp=100.0)
        db.session.add_all([r1, pA])
        db.session.flush()

        off = Offer(product_id=pA.id, retailer_id=r1.id, price=50.0, shipping_cost=10.0, stock_status="In Stock")
        db.session.add(off)
        db.session.commit()

        BasketOptimizerService.clear_basket(TEST_USER)
        BasketOptimizerService.add_item(TEST_USER, pA.id, 2)

        res = BasketOptimizerService.optimize_basket(TEST_USER)
        assert res["status"] == "success"
        # 2 units * 50 = 100 + 10 shipping = 110
        strat = res["single_retailer_strategy"]
        assert strat["total_items_cost"] == 100.0
        assert strat["total_shipping"] == 10.0
        assert strat["final_payable_total"] == 110.0

# 20. Deterministic results for equal-cost strategies
def test_deterministic_tie_breaking(app):
    with app.app_context():
        # Two identical offers at two retailers
        r_tie1 = Retailer(name="Tie Ret A", code="tie_a", default_shipping_cost=20.0)
        r_tie2 = Retailer(name="Tie Ret B", code="tie_b", default_shipping_cost=20.0)
        p_tie = Product(sku="TIE-PROD", name="Tie Product", brand="BT", category="CT", base_mrp=500.0)
        db.session.add_all([r_tie1, r_tie2, p_tie])
        db.session.flush()

        db.session.add_all([
            Offer(product_id=p_tie.id, retailer_id=r_tie1.id, price=400.0, shipping_cost=20.0, stock_status="In Stock"),
            Offer(product_id=p_tie.id, retailer_id=r_tie2.id, price=400.0, shipping_cost=20.0, stock_status="In Stock")
        ])
        db.session.commit()

        BasketOptimizerService.clear_basket(TEST_USER)
        BasketOptimizerService.add_item(TEST_USER, p_tie.id, 1)

        res1 = BasketOptimizerService.optimize_basket(TEST_USER)
        res2 = BasketOptimizerService.optimize_basket(TEST_USER)

        # Must produce identical deterministic result across executions
        assert res1["single_retailer_strategy"]["retailer_id"] == res2["single_retailer_strategy"]["retailer_id"]
        assert res1["single_retailer_strategy"]["final_payable_total"] == res2["single_retailer_strategy"]["final_payable_total"]


# 21. Coupon minimum order requirement shortfall
def test_coupon_minimum_order_shortfall_not_applied(app):
    with app.app_context():
        r_min = Retailer(name="Ret Min Order", code="min_ord_ret", default_shipping_cost=0.0)
        p_min = Product(sku="MIN-PROD", name="Min Prod", brand="BM", category="Electronics", base_mrp=2000.0)
        db.session.add_all([r_min, p_min])
        db.session.flush()

        off = Offer(product_id=p_min.id, retailer_id=r_min.id, price=1500.0, shipping_cost=0.0, stock_status="In Stock")
        # Requires ₹5000 minimum
        coup = Coupon(
            code="BIG5000",
            title="Flat 500 off on 5000",
            discount_type="fixed_amount",
            discount_value=500.0,
            retailer_id=r_min.id,
            min_order_value=5000.0,
            verification_status="verified",
            is_active=True
        )
        db.session.add_all([off, coup])
        db.session.commit()

        shipment = BasketOptimizerService.evaluate_retailer_shipment(
            retailer_id=r_min.id,
            items_assigned=[{"product": p_min, "quantity": 1, "offer": off}],
            apply_coupons=True
        )
        assert shipment["applied_coupon"] is None
        assert shipment["coupon_discount"] == 0.0
        assert shipment["order_total"] == 1500.0


# 22. Coupon applied with unknown shipping cost preserves incomplete total
def test_coupon_applied_with_unknown_shipping(app):
    with app.app_context():
        r_unk = Retailer(name="Ret Unk Ship", code="unk_ship_ret", default_shipping_cost=None)
        p_unk = Product(sku="UNK-PROD", name="Unk Prod", brand="BK", category="Home", base_mrp=10000.0)
        db.session.add_all([r_unk, p_unk])
        db.session.flush()

        # Undisclosed shipping
        off = Offer(product_id=p_unk.id, retailer_id=r_unk.id, price=8000.0, shipping_cost=None, stock_status="In Stock")
        coup = Coupon(
            code="SAVE1000",
            title="Flat 1000 off",
            discount_type="fixed_amount",
            discount_value=1000.0,
            retailer_id=r_unk.id,
            min_order_value=5000.0,
            verification_status="verified",
            is_active=True
        )
        db.session.add_all([off, coup])
        db.session.commit()

        shipment = BasketOptimizerService.evaluate_retailer_shipment(
            retailer_id=r_unk.id,
            items_assigned=[{"product": p_unk, "quantity": 1, "offer": off}],
            apply_coupons=True
        )
        assert shipment["applied_coupon"] is not None
        assert shipment["applied_coupon"]["code"] == "SAVE1000"
        assert shipment["coupon_discount"] == 1000.0
        assert shipment["shipping_is_unknown"] is True
        assert shipment["shipping_fee"] is None
        assert shipment["is_complete_total"] is False
        assert shipment["order_total"] == 7000.0


# 23. Retailer-specific coupon takes precedence over platform-wide coupon
def test_retailer_coupon_precedence_over_platform_coupon(app):
    with app.app_context():
        r_prec = Retailer(name="Ret Precedence", code="prec_ret", default_shipping_cost=0.0)
        p_prec = Product(sku="PREC-PROD", name="Prec Prod", brand="BP", category="Audio", base_mrp=25000.0)
        db.session.add_all([r_prec, p_prec])
        db.session.flush()

        off = Offer(product_id=p_prec.id, retailer_id=r_prec.id, price=20000.0, shipping_cost=0.0, stock_status="In Stock")
        # Retailer coupon offers ₹500
        coup_ret = Coupon(
            code="STORE500",
            title="Store ₹500 off",
            discount_type="fixed_amount",
            discount_value=500.0,
            retailer_id=r_prec.id,
            min_order_value=1000.0,
            verification_status="verified",
            is_active=True
        )
        db.session.add_all([off, coup_ret])
        db.session.commit()

        # Even if a platform coupon (like ELECTRO10) exists and offers a larger nominal discount,
        # the merchant's store coupon takes precedence for this merchant's order
        shipment = BasketOptimizerService.evaluate_retailer_shipment(
            retailer_id=r_prec.id,
            items_assigned=[{"product": p_prec, "quantity": 1, "offer": off}],
            apply_coupons=True
        )
        assert shipment["applied_coupon"] is not None
        assert shipment["applied_coupon"]["code"] == "STORE500"
        assert shipment["coupon_discount"] == 500.0
        assert shipment["order_total"] == 19500.0


# 24. Platform-wide coupon is used as fallback when no retailer coupon exists
def test_platform_coupon_fallback_when_no_retailer_coupon(app):
    with app.app_context():
        r_fb = Retailer(name="Ret Fallback", code="fb_ret", default_shipping_cost=0.0)
        p_fb = Product(sku="FB-PROD", name="Fallback Prod", brand="BF", category="Audio", base_mrp=25000.0)
        db.session.add_all([r_fb, p_fb])
        db.session.flush()

        off = Offer(product_id=p_fb.id, retailer_id=r_fb.id, price=20000.0, shipping_cost=0.0, stock_status="In Stock")
        db.session.add(off)
        db.session.commit()

        # No retailer-specific coupons created for r_fb; should fallback to platform ELECTRO10 (10% capped at 3000)
        shipment = BasketOptimizerService.evaluate_retailer_shipment(
            retailer_id=r_fb.id,
            items_assigned=[{"product": p_fb, "quantity": 1, "offer": off}],
            apply_coupons=True
        )
        assert shipment["applied_coupon"] is not None
        assert shipment["applied_coupon"]["code"] == "ELECTRO10"
        # 10% of 20000 = 2000
        assert shipment["coupon_discount"] == 2000.0
        assert shipment["order_total"] == 18000.0


# 25. Category-restricted coupon ignored when order has no items in that category
def test_category_restricted_coupon_ignored_for_other_categories(app):
    with app.app_context():
        r_cat = Retailer(name="Ret Cat Test", code="cat_ret", default_shipping_cost=0.0)
        p_cat = Product(sku="BOOK-PROD", name="Book Prod", brand="BB", category="Books", base_mrp=3000.0)
        db.session.add_all([r_cat, p_cat])
        db.session.flush()

        off = Offer(product_id=p_cat.id, retailer_id=r_cat.id, price=2500.0, shipping_cost=0.0, stock_status="In Stock")
        # Coupon strictly restricted to Smartphones category
        coup_phone = Coupon(
            code="PHONEONLY",
            title="Smartphone Only 10%",
            discount_type="percentage",
            discount_value=10.0,
            retailer_id=r_cat.id,
            applicable_category="Smartphones",
            min_order_value=1000.0,
            verification_status="verified",
            is_active=True
        )
        db.session.add_all([off, coup_phone])
        db.session.commit()

        shipment = BasketOptimizerService.evaluate_retailer_shipment(
            retailer_id=r_cat.id,
            items_assigned=[{"product": p_cat, "quantity": 1, "offer": off}],
            apply_coupons=True
        )
        # Order is Books, not Smartphones, so PHONEONLY must NOT apply
        assert shipment["applied_coupon"] is None or shipment["applied_coupon"]["code"] != "PHONEONLY"
        assert shipment["order_total"] == 2500.0


