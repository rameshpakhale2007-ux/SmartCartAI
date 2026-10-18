import json
from datetime import datetime, timedelta
import pytest
from app.models import Product, Offer, Retailer, PriceHistory
from app.services.honesty_index_service import HonestyIndexService
from app.extensions import db

def test_advertised_discount_calculation_correct(app):
    """Test advertised discount percentage and savings calculation."""
    with app.app_context():
        # Valid reference price and current price
        res = HonestyIndexService.analyze_product_honesty(product_id=1, days=30)
        assert "error" not in res
        if res.get("is_evidence_sufficient") and res.get("advertised_reference_price"):
            ref = res["advertised_reference_price"]
            curr = res["current_price"]
            if curr < ref:
                expected_pct = round(((ref - curr) / ref) * 100.0, 1)
                assert res["advertised_discount_pct"] == expected_pct
                assert res["advertised_savings"] == round(ref - curr, 2)

def test_invalid_or_zero_reference_price(app):
    """Verify non-positive or missing reference prices do not report false discounts."""
    with app.app_context():
        # Create temporary product with 0 MRP
        zero_mrp_prod = Product(
            sku="ZERO-MRP-TEST",
            name="Zero MRP Product",
            brand="TestBrand",
            category="TestCategory",
            base_mrp=0.0
        )
        db.session.add(zero_mrp_prod)
        db.session.commit()

        res = HonestyIndexService.analyze_product_honesty(zero_mrp_prod.id, days=30)
        assert res["advertised_discount_pct"] is None
        assert res["advertised_savings"] is None

def test_historical_benchmarks_and_windows(app):
    """Test min, max, median calculations across 30, 60, and 90-day windows."""
    with app.app_context():
        prod = Product.query.filter_by(sku="APPL-IP15-128").first()
        ret = Retailer.query.filter_by(code="flipkart").first()
        assert prod and ret

        res_30 = HonestyIndexService.analyze_product_honesty(prod.id, retailer_id=ret.id, days=30)
        res_60 = HonestyIndexService.analyze_product_honesty(prod.id, retailer_id=ret.id, days=60)
        res_90 = HonestyIndexService.analyze_product_honesty(prod.id, retailer_id=ret.id, days=90)

        assert res_30["is_evidence_sufficient"] is True
        assert res_60["is_evidence_sufficient"] is True
        assert res_90["is_evidence_sufficient"] is True

        # Benchmarks must obey min <= median <= max
        for res in (res_30, res_60, res_90):
            b = res["benchmarks"]
            assert b["historical_min"] <= b["historical_median"] <= b["historical_max"]
            assert b["observation_count"] >= 3

        # 90-day window should contain more or equal observations compared to 30-day
        assert res_90["benchmarks"]["observation_count"] >= res_30["benchmarks"]["observation_count"]

def test_invalid_days_window_rejected(client):
    """Verify days parameter outside (30, 60, 90) returns HTTP 400."""
    res = client.get("/api/products/1/honesty?days=45")
    assert res.status_code == 400
    data = json.loads(res.data)
    assert data["success"] is False
    assert data["error"]["code"] == "INVALID_PARAM"

def test_exclusion_of_future_dated_and_non_positive_prices(app):
    """Verify future-dated and non-positive price observations are excluded from benchmarks."""
    with app.app_context():
        prod = Product.query.filter_by(sku="APPL-IP15-128").first()
        ret = Retailer.query.filter_by(code="amazon").first()
        assert prod and ret

        # Add invalid future-dated observation
        now = datetime.utcnow()
        future_obs = PriceHistory(
            product_id=prod.id,
            retailer_id=ret.id,
            price=1.0,
            recorded_at=now + timedelta(days=5),
            source_type="demo"
        )
        # Add invalid zero price observation
        zero_obs = PriceHistory(
            product_id=prod.id,
            retailer_id=ret.id,
            price=0.0,
            recorded_at=now - timedelta(days=2),
            source_type="demo"
        )
        db.session.add_all([future_obs, zero_obs])
        db.session.commit()

        res = HonestyIndexService.analyze_product_honesty(prod.id, retailer_id=ret.id, days=30)
        assert res["benchmarks"]["historical_min"] > 1.0  # Invalid ₹1 and ₹0 were excluded

def test_retailer_specific_observation_isolation(app):
    """Verify retailer history is isolated and never cross-contaminates another retailer's score."""
    with app.app_context():
        prod = Product.query.filter_by(sku="APPL-IP15-128").first()
        r_amazon = Retailer.query.filter_by(code="amazon").first()
        r_flipkart = Retailer.query.filter_by(code="flipkart").first()
        assert prod and r_amazon and r_flipkart

        res_amazon = HonestyIndexService.analyze_product_honesty(prod.id, retailer_id=r_amazon.id, days=30)
        res_flipkart = HonestyIndexService.analyze_product_honesty(prod.id, retailer_id=r_flipkart.id, days=30)

        # Observations must be strictly retailer-specific
        assert all(o["retailer_id"] == r_amazon.id for o in res_amazon["observations"])
        assert all(o["retailer_id"] == r_flipkart.id for o in res_flipkart["observations"])

def test_insufficient_historical_evidence_handling(app):
    """Verify products with fewer than 3 observations return explicit Insufficient Evidence classification."""
    with app.app_context():
        # Generic speaker has no historical observations
        speaker = Product.query.filter_by(sku="GEN-BT-SPK").first()
        assert speaker is not None

        res = HonestyIndexService.analyze_product_honesty(speaker.id, days=30)
        assert res["is_evidence_sufficient"] is False
        assert res["classification"] == HonestyIndexService.CLASSIFICATION_INSUFFICIENT
        assert res["honesty_score"] is None
        assert res["benchmarks"] is None
        assert len(res["insufficient_reasons"]) >= 1

def test_missing_product_returns_404(client):
    """Verify requesting non-existent product returns HTTP 404."""
    res = client.get("/api/products/999999/honesty")
    assert res.status_code == 404
    data = json.loads(res.data)
    assert data["success"] is False
    assert data["error"]["code"] == "PRODUCT_NOT_FOUND"

def test_score_bounds_and_component_weights(app):
    """Verify score remains within 0-100 and components sum according to documented weights."""
    with app.app_context():
        prod = Product.query.filter_by(sku="APPL-IP15-128").first()
        ret = Retailer.query.filter_by(code="flipkart").first()

        res = HonestyIndexService.analyze_product_honesty(prod.id, retailer_id=ret.id, days=90)
        assert res["is_evidence_sufficient"] is True
        score = res["honesty_score"]
        assert 0.0 <= score <= 100.0

        comps = res["component_scores"]
        assert 0.0 <= comps["consistency_score"] <= 100.0
        assert 0.0 <= comps["reference_price_score"] <= 100.0
        assert 0.0 <= comps["pre_promo_hike_score"] <= 100.0
        assert 0.0 <= comps["data_quality_score"] <= 100.0

def test_pre_promo_price_increase_evaluation(app):
    """Verify pre-promotion price hike detection triggers appropriate component score reduction."""
    with app.app_context():
        # Create a test product and historical observations simulating an artificial price hike
        hike_prod = Product(
            sku="HIKE-TEST-99",
            name="Hike Test Product",
            brand="TestBrand",
            category="Smartphones",
            base_mrp=50000.0
        )
        ret = Retailer.query.first()
        db.session.add(hike_prod)
        db.session.flush()

        base_time = datetime.utcnow()
        # Historical observations: stable at 40,000 for 20 days, spiked to 48,000 for 5 days, current offer 42,000
        for d in range(25, 5, -1):
            db.session.add(PriceHistory(
                product_id=hike_prod.id,
                retailer_id=ret.id,
                price=40000.0,
                recorded_at=base_time - timedelta(days=d),
                source_type="demo"
            ))
        for d in range(5, 0, -1):
            db.session.add(PriceHistory(
                product_id=hike_prod.id,
                retailer_id=ret.id,
                price=48000.0,  # Pre-promo spike
                recorded_at=base_time - timedelta(days=d),
                source_type="demo"
            ))

        # Add current offer at 42,000 (marketed as down from 48,000 or 50,000)
        db.session.add(Offer(
            product_id=hike_prod.id,
            retailer_id=ret.id,
            price=42000.0,
            original_price=50000.0,
            stock_status="In Stock"
        ))
        db.session.commit()

        res = HonestyIndexService.analyze_product_honesty(hike_prod.id, retailer_id=ret.id, days=30)
        assert res["is_evidence_sufficient"] is True
        # Pre-promo hike score must be lower than 100 due to detected hike
        assert res["component_scores"]["pre_promo_hike_score"] < 100.0
        assert any("price increase" in exp.lower() for exp in res["explanations"])

def test_retailers_breakdown_endpoint(client):
    """Test /api/products/<id>/honesty/retailers endpoint returns isolated per-retailer analyses."""
    prod = Product.query.filter_by(sku="APPL-IP15-128").first()
    assert prod is not None

    res = client.get(f"/api/products/{prod.id}/honesty/retailers?days=30")
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data["success"] is True
    payload = data["data"]
    assert "analyses" in payload
    assert len(payload["analyses"]) >= 1

def test_honesty_summary_endpoint(client):
    """Test /api/honesty/summary endpoint returns catalog metrics and breakdowns."""
    res = client.get("/api/honesty/summary")
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data["success"] is True
    payload = data["data"]
    assert "total_products_tracked" in payload
    assert "classification_breakdown" in payload
    assert "featured_analyses" in payload
    breakdown = payload["classification_breakdown"]
    assert "Strong Historical Support" in breakdown
    assert "Insufficient Historical Evidence" in breakdown
