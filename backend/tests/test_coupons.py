import json
import pytest
from datetime import datetime, timedelta
from app.models import Coupon, Product, Retailer
from app.services.coupon_service import CouponService
from app.extensions import db

def test_list_coupons_active_and_filters(client):
    """Test listing coupons with active_only and search filtering."""
    res = client.get("/api/coupons?active_only=true")
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data["success"] is True
    payload = data["data"]
    assert "items" in payload
    assert payload["total_count"] >= 1

    # Search for specific code
    search_res = client.get("/api/coupons?search=SMARTCART500")
    assert search_res.status_code == 200
    search_data = json.loads(search_res.data)["data"]
    assert any(c["code"] == "SMARTCART500" for c in search_data["items"])

def test_get_coupon_detail_and_404(client):
    """Retrieve coupon by ID, verify terms, and test 404 for missing ID."""
    coupon = Coupon.query.filter_by(code="SMARTCART500").first()
    assert coupon is not None

    res = client.get(f"/api/coupons/{coupon.id}")
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data["success"] is True
    assert data["data"]["code"] == "SMARTCART500"
    assert data["data"]["discount_type"] in ("fixed", "fixed_amount")

    # Nonexistent coupon ID
    res_404 = client.get("/api/coupons/999999")
    assert res_404.status_code == 404
    err = json.loads(res_404.data)
    assert err["success"] is False
    assert err["error"]["code"] == "COUPON_NOT_FOUND"

def test_validate_percentage_discount_and_cap(app):
    """Test percentage discount calculation and max discount limit."""
    with app.app_context():
        # ELECTRO10: 10% off, max 3,000, min order 10,000
        # Order 15,000 -> 10% = 1,500 (under 3,000 cap)
        res1 = CouponService.validate_coupon(
            coupon_identifier="ELECTRO10",
            purchase_amount=15000.0,
            shipping_cost=0.0
        )
        assert res1["is_eligible"] is True
        assert res1["discount_amount"] == 1500.0
        assert res1["estimated_payable_amount"] == 13500.0

        # Order 50,000 -> 10% = 5,000 (capped at 3,000)
        res2 = CouponService.validate_coupon(
            coupon_identifier="ELECTRO10",
            purchase_amount=50000.0,
            shipping_cost=50.0
        )
        assert res2["is_eligible"] is True
        assert res2["discount_amount"] == 3000.0
        assert res2["estimated_payable_amount"] == 47050.0

def test_validate_minimum_order_requirement(app):
    """Test minimum purchase order requirement enforcement."""
    with app.app_context():
        # ELECTRO10 requires min order 10,000
        res = CouponService.validate_coupon(
            coupon_identifier="ELECTRO10",
            purchase_amount=4000.0
        )
        assert res["is_eligible"] is False
        assert res["error"] == "MINIMUM_ORDER_NOT_MET"
        assert "minimum requirement" in res["message"].lower()

def test_validate_expired_coupon(app):
    """Test rejection of expired coupons."""
    with app.app_context():
        # DIWALI2025 is seeded as expired
        res = CouponService.validate_coupon(
            coupon_identifier="DIWALI2025",
            purchase_amount=10000.0
        )
        assert res["is_eligible"] is False
        assert res["error"] == "COUPON_EXPIRED"
        assert "expired" in res["message"].lower()

def test_validate_retailer_and_category_restrictions(app):
    """Test retailer and category restriction matching."""
    with app.app_context():
        ret_croma = Retailer.query.filter_by(code="croma").first()
        prod_iphone = Product.query.filter_by(sku="APPL-IP15-128").first()
        assert ret_croma and prod_iphone

        # FLIPMOB15 is valid on Flipkart only, for Smartphones
        # Attempting at Croma should fail
        res_ret = CouponService.validate_coupon(
            coupon_identifier="FLIPMOB15",
            purchase_amount=30000.0,
            retailer_id=ret_croma.id,
            product_id=prod_iphone.id
        )
        assert res_ret["is_eligible"] is False
        assert res_ret["error"] == "RETAILER_MISMATCH"

def test_validate_free_shipping_with_unknown_and_known_fees(app):
    """Test free shipping coupon with known vs unknown shipping fee."""
    with app.app_context():
        # FREESHIP on Croma over 1,000
        # Known shipping fee: 100
        res_known = CouponService.validate_coupon(
            coupon_identifier="FREESHIP",
            purchase_amount=2000.0,
            shipping_cost=100.0
        )
        assert res_known["is_eligible"] is True
        assert res_known["discount_amount"] == 100.0
        assert res_known["estimated_payable_amount"] == 2000.0
        assert res_known["is_complete_total"] is True

        # Unknown shipping fee: shipping_cost = None
        res_unknown = CouponService.validate_coupon(
            coupon_identifier="FREESHIP",
            purchase_amount=2000.0,
            shipping_cost=None
        )
        assert res_unknown["is_eligible"] is True
        assert res_unknown["shipping_is_unknown"] is True
        assert res_unknown["is_complete_total"] is False
        assert res_unknown["estimated_payable_amount"] is None
        assert res_unknown["subtotal_after_discount"] == 2000.0
        assert "undisclosed" in res_unknown["calculation_notes"][0].lower()

def test_create_coupon_validation_and_unverified_provenance(client):
    """Test coupon creation API and default unverified status."""
    payload = {
        "code": "COMMUNITY25",
        "title": "Community 25% Off",
        "discount_type": "percentage",
        "discount_value": 25.0,
        "min_order_value": 1500.0,
        "max_discount_value": 1000.0
    }
    # Public submission without headers -> unverified
    res = client.post("/api/coupons", json=payload)
    assert res.status_code == 201
    data = json.loads(res.data)["data"]
    assert data["code"] == "COMMUNITY25"
    assert data["verification_status"] == "unverified"

    # Submission with legacy insecure key 'smartcart-admin' -> remains unverified (insecure secret removed)
    payload_insecure = {
        "code": "INSECUREKEY_TEST",
        "title": "Insecure Key Attempt",
        "discount_type": "fixed_amount",
        "discount_value": 100.0
    }
    res_insecure = client.post(
        "/api/coupons",
        json=payload_insecure,
        headers={"X-Admin-Key": "smartcart-admin"}
    )
    assert res_insecure.status_code == 201
    assert json.loads(res_insecure.data)["data"]["verification_status"] == "unverified"

    # Submission with environment-configured admin secret -> verified
    payload_admin = {
        "code": "ADMIN_VERIFIED_100",
        "title": "Official Admin Coupon",
        "discount_type": "fixed_amount",
        "discount_value": 500.0
    }
    res_admin = client.post(
        "/api/coupons",
        json=payload_admin,
        headers={"X-Admin-Key": "test-secret-admin-key"}
    )
    assert res_admin.status_code == 201
    assert json.loads(res_admin.data)["data"]["verification_status"] == "verified"
