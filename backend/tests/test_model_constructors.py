from datetime import datetime
from app.models import (
    Retailer,
    Product,
    Offer,
    PriceHistory,
    Alert,
    Coupon,
    Basket,
    BasketItem,
    Review,
    Forecast,
)
from scripts.seed_data import seed_initial_data

def test_retailer_constructor(app):
    """Verifies that the Retailer constructor correctly accepts all defined keyword arguments."""
    with app.app_context():
        r = Retailer(
            name="Test Electronics Hub",
            code="test_hub",
            website_url="https://testhub.example.com",
            logo_url="https://testhub.example.com/logo.png",
            default_shipping_cost=35.0,
            free_shipping_threshold=799.0,
            is_active=True
        )
        assert r.name == "Test Electronics Hub"
        assert r.code == "test_hub"
        assert r.website_url == "https://testhub.example.com"
        assert r.logo_url == "https://testhub.example.com/logo.png"
        assert r.default_shipping_cost == 35.0
        assert r.free_shipping_threshold == 799.0
        assert r.is_active is True
        
        d = r.to_dict()
        assert d["name"] == "Test Electronics Hub"
        assert d["code"] == "test_hub"

def test_product_constructor(app):
    """Verifies that the Product constructor correctly accepts all defined keyword arguments."""
    with app.app_context():
        p = Product(
            sku="TEST-SKU-999",
            name="Test Premium Smart Gadget",
            brand="TestBrand",
            category="Gadgets",
            description="High precision gadget for unit test validation.",
            image_url="https://example.com/gadget.png",
            base_mrp=19999.0,
            currency="INR",
            specs_json={"Connectivity": "5G", "RAM": "8GB"},
            source_type="demo"
        )
        assert p.sku == "TEST-SKU-999"
        assert p.name == "Test Premium Smart Gadget"
        assert p.brand == "TestBrand"
        assert p.category == "Gadgets"
        assert p.description == "High precision gadget for unit test validation."
        assert p.image_url == "https://example.com/gadget.png"
        assert p.base_mrp == 19999.0
        assert p.currency == "INR"
        assert p.specs_json == {"Connectivity": "5G", "RAM": "8GB"}
        assert p.source_type == "demo"

        d = p.to_dict()
        assert d["sku"] == "TEST-SKU-999"
        assert d["base_mrp"] == 19999.0

def test_offer_constructor(app):
    """Verifies that the Offer constructor correctly accepts all defined keyword arguments."""
    with app.app_context():
        o = Offer(
            product_id=1,
            retailer_id=1,
            price=17999.0,
            original_price=19999.0,
            shipping_cost=40.0,
            shipping_is_estimated=False,
            discount_pct=10.0,
            stock_status="In Stock",
            delivery_days=2,
            product_url="https://example.com/product/1",
            source_type="demo"
        )
        assert o.product_id == 1
        assert o.retailer_id == 1
        assert o.price == 17999.0
        assert o.original_price == 19999.0
        assert o.shipping_cost == 40.0
        assert o.shipping_is_estimated is False
        assert o.discount_pct == 10.0
        assert o.stock_status == "In Stock"
        assert o.delivery_days == 2
        assert o.is_available is True
        assert o.total_cost == 18039.0

def test_price_history_constructor(app):
    """Verifies that the PriceHistory constructor correctly accepts all defined keyword arguments."""
    with app.app_context():
        now = datetime.utcnow()
        ph = PriceHistory(
            product_id=1,
            retailer_id=1,
            price=18500.0,
            original_price=19999.0,
            recorded_at=now,
            source_type="demo"
        )
        assert ph.product_id == 1
        assert ph.retailer_id == 1
        assert ph.price == 18500.0
        assert ph.original_price == 19999.0
        assert ph.recorded_at == now
        assert ph.source_type == "demo"

def test_basket_and_basket_item_constructors(app):
    """Verifies that Basket and BasketItem constructors accept defined keyword arguments."""
    with app.app_context():
        b = Basket(
            user_identifier="test_basket_user",
            status="active"
        )
        assert b.user_identifier == "test_basket_user"
        assert b.status == "active"

        bi = BasketItem(
            basket_id=1,
            product_id=2,
            quantity=3,
            preferred_retailer_id=1
        )
        assert bi.basket_id == 1
        assert bi.product_id == 2
        assert bi.quantity == 3
        assert bi.preferred_retailer_id == 1

def test_review_constructor(app):
    """Verifies that the Review constructor accepts defined keyword arguments."""
    with app.app_context():
        r = Review(
            product_id=1,
            rating=4.5,
            content="Superb build quality and battery life.",
            author="Verified Reviewer",
            title="Exceptional quality",
            verified_purchase=True,
            source_type="demo"
        )
        assert r.product_id == 1
        assert r.rating == 4.5
        assert r.content == "Superb build quality and battery life."
        assert r.author == "Verified Reviewer"
        assert r.title == "Exceptional quality"
        assert r.verified_purchase is True

def test_forecast_constructor(app):
    """Verifies that the Forecast constructor accepts defined keyword arguments."""
    with app.app_context():
        f = Forecast(
            product_id=1,
            horizon_days=30,
            predicted_price=17500.0,
            lower_bound=16900.0,
            upper_bound=18100.0,
            confidence="High",
            model_name="rolling_trend"
        )
        assert f.product_id == 1
        assert f.horizon_days == 30
        assert f.predicted_price == 17500.0
        assert f.lower_bound == 16900.0
        assert f.upper_bound == 18100.0
        assert f.confidence == "High"
        assert f.model_name == "rolling_trend"

def test_seed_initial_data_idempotent(app):
    """Verifies that seed_initial_data runs cleanly and idempotently."""
    with app.app_context():
        initial_retailer_count = Retailer.query.count()
        initial_product_count = Product.query.count()
        
        # Rerun seed script
        seed_initial_data()
        
        # Counts must remain identical (no duplicated records)
        assert Retailer.query.count() == initial_retailer_count
        assert Product.query.count() == initial_product_count
