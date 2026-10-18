import json
import pytest
from datetime import datetime, timedelta
from app.extensions import db
from app.models import Product, Offer, Retailer, PriceHistory, Alert
from app.services.buy_timing_service import BuyTimingService

@pytest.fixture
def timing_product(app):
    """Fixture to create and clean up a dedicated product for Buy Timing testing."""
    with app.app_context():
        p = Product(
            sku="TIMING-TEST-01",
            name="Timing Intelligence Tablet 11",
            brand="SmartTech",
            category="Tablets",
            base_mrp=45000.0,
            currency="INR",
            source_type="demo"
        )
        db.session.add(p)
        db.session.commit()
        prod_id = p.id
        yield prod_id

        # Teardown
        PriceHistory.query.filter_by(product_id=prod_id).delete()
        Offer.query.filter_by(product_id=prod_id).delete()
        Alert.query.filter_by(product_id=prod_id).delete()
        prod = db.session.get(Product, prod_id)
        if prod:
            db.session.delete(prod)
        db.session.commit()

@pytest.fixture
def timing_retailers(app):
    """Fixture ensuring two test retailers exist for testing retailer-specific isolation."""
    with app.app_context():
        r1 = Retailer.query.filter_by(code="timing_ret_1").first()
        if not r1:
            r1 = Retailer(name="Timing Store Alpha", code="timing_ret_1", default_shipping_cost=0.0)
            db.session.add(r1)
        r2 = Retailer.query.filter_by(code="timing_ret_2").first()
        if not r2:
            r2 = Retailer(name="Timing Store Beta", code="timing_ret_2", default_shipping_cost=50.0)
            db.session.add(r2)
        db.session.commit()
        return r1.id, r2.id


# 1. Sufficient historical data produces a valid assessment
def test_sufficient_history_produces_valid_assessment(app, timing_product, timing_retailers):
    r1_id, _ = timing_retailers
    now = datetime.utcnow()
    with app.app_context():
        # Add live offer
        off = Offer(product_id=timing_product, retailer_id=r1_id, price=38000.0, stock_status="In Stock")
        db.session.add(off)

        # Add 6 observations: 42000, 41000, 40000, 39500, 39000, 38500
        for i, p_val in enumerate([42000.0, 41000.0, 40000.0, 39500.0, 39000.0, 38500.0]):
            db.session.add(PriceHistory(
                product_id=timing_product,
                retailer_id=r1_id,
                price=p_val,
                recorded_at=now - timedelta(days=25 - i * 4)
            ))
        db.session.commit()

        res = BuyTimingService.evaluate_buy_timing(timing_product, days=30)
        assert "error" not in res
        assert res["valid_observation_count"] == 6
        assert res["data_status"] == "SUFFICIENT"
        assert res["recommendation"] in (
            BuyTimingService.RECOMMENDATION_BUY,
            BuyTimingService.RECOMMENDATION_TYPICAL,
            BuyTimingService.RECOMMENDATION_WAIT
        )
        assert res["historical_metrics"]["median_historical_price"] > 0
        assert res["historical_metrics"]["lowest_observed_price"] == 38500.0
        assert res["target_recommendations"] is not None


# 2. No history produces an insufficient-data result
def test_no_history_produces_insufficient_data(app, timing_product, timing_retailers):
    r1_id, _ = timing_retailers
    with app.app_context():
        # Live offer exists, but 0 historical price records
        off = Offer(product_id=timing_product, retailer_id=r1_id, price=40000.0, stock_status="In Stock")
        db.session.add(off)
        db.session.commit()

        res = BuyTimingService.evaluate_buy_timing(timing_product, days=30)
        assert res["recommendation"] == BuyTimingService.RECOMMENDATION_INSUFFICIENT
        assert res["data_status"] == "INSUFFICIENT_DATA"
        assert res["valid_observation_count"] == 0
        assert "A minimum of 3 observations is required" in res["explanation"]


# 3. One historical observation does not automatically produce a confident trend
def test_single_observation_does_not_produce_confident_trend(app, timing_product, timing_retailers):
    r1_id, _ = timing_retailers
    now = datetime.utcnow()
    with app.app_context():
        off = Offer(product_id=timing_product, retailer_id=r1_id, price=35000.0, stock_status="In Stock")
        db.session.add(off)
        # Only 1 observation
        db.session.add(PriceHistory(
            product_id=timing_product,
            retailer_id=r1_id,
            price=42000.0,
            recorded_at=now - timedelta(days=5)
        ))
        db.session.commit()

        res = BuyTimingService.evaluate_buy_timing(timing_product, days=30)
        assert res["recommendation"] == BuyTimingService.RECOMMENDATION_INSUFFICIENT
        assert res["valid_observation_count"] == 1
        assert res["data_status"] == "INSUFFICIENT_DATA"


# 4. Future-dated observations are excluded
def test_future_dated_observations_excluded(app, timing_product, timing_retailers):
    r1_id, _ = timing_retailers
    now = datetime.utcnow()
    with app.app_context():
        off = Offer(product_id=timing_product, retailer_id=r1_id, price=39000.0, stock_status="In Stock")
        db.session.add(off)
        # Valid historical observation
        db.session.add(PriceHistory(
            product_id=timing_product,
            retailer_id=r1_id,
            price=40000.0,
            recorded_at=now - timedelta(days=10)
        ))
        # Future-dated observation (10 days in future)
        db.session.add(PriceHistory(
            product_id=timing_product,
            retailer_id=r1_id,
            price=25000.0,
            recorded_at=now + timedelta(days=10)
        ))
        db.session.commit()

        res = BuyTimingService.evaluate_buy_timing(timing_product, days=30)
        # Future-dated record must not be included
        assert res["valid_observation_count"] == 1


# 5. Invalid and non-positive prices are excluded
def test_invalid_and_non_positive_prices_excluded(app, timing_product, timing_retailers):
    r1_id, _ = timing_retailers
    now = datetime.utcnow()
    with app.app_context():
        off = Offer(product_id=timing_product, retailer_id=r1_id, price=39000.0, stock_status="In Stock")
        db.session.add(off)
        # Valid positive price
        db.session.add(PriceHistory(
            product_id=timing_product,
            retailer_id=r1_id,
            price=40000.0,
            recorded_at=now - timedelta(days=5)
        ))
        # Zero price
        db.session.add(PriceHistory(
            product_id=timing_product,
            retailer_id=r1_id,
            price=0.0,
            recorded_at=now - timedelta(days=6)
        ))
        # Negative price
        db.session.add(PriceHistory(
            product_id=timing_product,
            retailer_id=r1_id,
            price=-1000.0,
            recorded_at=now - timedelta(days=7)
        ))
        db.session.commit()

        res = BuyTimingService.evaluate_buy_timing(timing_product, days=30)
        assert res["valid_observation_count"] == 1


# 6. Stale observations are identified
def test_stale_observations_identified(app, timing_product, timing_retailers):
    r1_id, _ = timing_retailers
    now = datetime.utcnow()
    with app.app_context():
        off = Offer(product_id=timing_product, retailer_id=r1_id, price=39000.0, stock_status="In Stock")
        db.session.add(off)
        # Observations all older than 40 days (stale within 90-day window)
        for i, p_val in enumerate([42000.0, 41500.0, 41000.0, 40500.0]):
            db.session.add(PriceHistory(
                product_id=timing_product,
                retailer_id=r1_id,
                price=p_val,
                recorded_at=now - timedelta(days=70 - i * 5)
            ))
        db.session.commit()

        res = BuyTimingService.evaluate_buy_timing(timing_product, days=90)
        assert res["historical_metrics"]["is_stale"] is True
        assert res["data_status"] == "STALE"
        assert any("stale" in lim.lower() for lim in res["limitations"])


# 7. Missing current price produces CURRENT_PRICE_UNAVAILABLE
def test_missing_current_price_handled(app, timing_product):
    with app.app_context():
        # No offers, no price history records at all
        res = BuyTimingService.evaluate_buy_timing(timing_product, days=30)
        assert res["recommendation"] == BuyTimingService.RECOMMENDATION_UNAVAILABLE
        assert res["current_price"] is None
        assert res["data_status"] == "CURRENT_PRICE_UNAVAILABLE"


# 8. Current prices below historical median produce GOOD_TIME_TO_BUY
def test_current_price_below_median_good_time_to_buy(app, timing_product, timing_retailers):
    r1_id, _ = timing_retailers
    now = datetime.utcnow()
    with app.app_context():
        # Current price = 34000 (well below historical median ~40000)
        off = Offer(product_id=timing_product, retailer_id=r1_id, price=34000.0, stock_status="In Stock")
        db.session.add(off)
        for p_val in [41000.0, 40500.0, 40000.0, 39500.0, 39000.0]:
            db.session.add(PriceHistory(
                product_id=timing_product,
                retailer_id=r1_id,
                price=p_val,
                recorded_at=now - timedelta(days=20)
            ))
        db.session.commit()

        res = BuyTimingService.evaluate_buy_timing(timing_product, days=30)
        assert res["recommendation"] == BuyTimingService.RECOMMENDATION_BUY
        assert "Good Time to Buy" in res["recommendation_label"]
        assert "below the historical median" in res["explanation"].lower() or "near the lowest" in res["explanation"].lower()


# 9. Current prices above historical median produce CONSIDER_WAITING
def test_current_price_above_median_consider_waiting(app, timing_product, timing_retailers):
    r1_id, _ = timing_retailers
    now = datetime.utcnow()
    with app.app_context():
        # Current price = 44000 (well above historical median ~38000)
        off = Offer(product_id=timing_product, retailer_id=r1_id, price=44000.0, stock_status="In Stock")
        db.session.add(off)
        for p_val in [38000.0, 37500.0, 38000.0, 38500.0, 37000.0]:
            db.session.add(PriceHistory(
                product_id=timing_product,
                retailer_id=r1_id,
                price=p_val,
                recorded_at=now - timedelta(days=20)
            ))
        db.session.commit()

        res = BuyTimingService.evaluate_buy_timing(timing_product, days=30)
        assert res["recommendation"] == BuyTimingService.RECOMMENDATION_WAIT
        assert "Consider Waiting" in res["recommendation_label"]
        assert "above the historical median" in res["explanation"].lower()


# 10. Flat historical prices produce PRICE_IS_TYPICAL
def test_flat_historical_prices_typical(app, timing_product, timing_retailers):
    r1_id, _ = timing_retailers
    now = datetime.utcnow()
    with app.app_context():
        off = Offer(product_id=timing_product, retailer_id=r1_id, price=40000.0, stock_status="In Stock")
        db.session.add(off)
        for i in range(5):
            db.session.add(PriceHistory(
                product_id=timing_product,
                retailer_id=r1_id,
                price=40000.0,
                recorded_at=now - timedelta(days=20 - i * 3)
            ))
        db.session.commit()

        res = BuyTimingService.evaluate_buy_timing(timing_product, days=30)
        assert res["recommendation"] == BuyTimingService.RECOMMENDATION_TYPICAL
        assert "steady" in res["explanation"].lower() or "typical" in res["explanation"].lower()


# 11. Retailer-specific history is not accidentally mixed with unrelated retailer history
def test_retailer_specific_history_isolation(app, timing_product, timing_retailers):
    r1_id, r2_id = timing_retailers
    now = datetime.utcnow()
    with app.app_context():
        # Retailer 1 has price 30000
        off1 = Offer(product_id=timing_product, retailer_id=r1_id, price=30000.0, stock_status="In Stock")
        # Retailer 2 has price 50000
        off2 = Offer(product_id=timing_product, retailer_id=r2_id, price=50000.0, stock_status="In Stock")
        db.session.add_all([off1, off2])

        # Add 3 observations for Retailer 1 (around 31000)
        for p_val in [31000.0, 31500.0, 30500.0]:
            db.session.add(PriceHistory(product_id=timing_product, retailer_id=r1_id, price=p_val, recorded_at=now - timedelta(days=10)))

        # Add 3 observations for Retailer 2 (around 52000)
        for p_val in [52000.0, 52500.0, 51500.0]:
            db.session.add(PriceHistory(product_id=timing_product, retailer_id=r2_id, price=p_val, recorded_at=now - timedelta(days=10)))

        db.session.commit()

        # Query specifically for Retailer 1
        res1 = BuyTimingService.evaluate_buy_timing(timing_product, days=30, retailer_id=r1_id)
        assert res1["current_price"] == 30000.0
        assert res1["valid_observation_count"] == 3
        assert res1["historical_metrics"]["median_historical_price"] <= 32000.0

        # Query specifically for Retailer 2
        res2 = BuyTimingService.evaluate_buy_timing(timing_product, days=30, retailer_id=r2_id)
        assert res2["current_price"] == 50000.0
        assert res2["valid_observation_count"] == 3
        assert res2["historical_metrics"]["median_historical_price"] >= 50000.0


# 12. Changing the observation window changes the analysis appropriately
def test_observation_window_changes_analysis(app, timing_product, timing_retailers):
    r1_id, _ = timing_retailers
    now = datetime.utcnow()
    with app.app_context():
        off = Offer(product_id=timing_product, retailer_id=r1_id, price=39000.0, stock_status="In Stock")
        db.session.add(off)

        # 3 observations within the last 20 days (price 40000)
        for i in range(3):
            db.session.add(PriceHistory(product_id=timing_product, retailer_id=r1_id, price=40000.0, recorded_at=now - timedelta(days=15 - i * 3)))

        # 4 older observations between 40 and 80 days ago (price 45000)
        for i in range(4):
            db.session.add(PriceHistory(product_id=timing_product, retailer_id=r1_id, price=45000.0, recorded_at=now - timedelta(days=70 - i * 5)))

        db.session.commit()

        res_30 = BuyTimingService.evaluate_buy_timing(timing_product, days=30)
        res_90 = BuyTimingService.evaluate_buy_timing(timing_product, days=90)

        assert res_30["valid_observation_count"] == 3
        assert res_90["valid_observation_count"] == 7
        assert res_30["historical_metrics"]["highest_observed_price"] == 40000.0
        assert res_90["historical_metrics"]["highest_observed_price"] == 45000.0


# 13. Missing products return 404
def test_missing_product_returns_404(client):
    res = client.get("/api/products/999999/buy-timing")
    assert res.status_code == 404
    data = json.loads(res.data)
    assert data["success"] is False
    assert data["error"]["code"] == "PRODUCT_NOT_FOUND"


# 14. Invalid window rejected with 400
def test_invalid_window_rejected(client, timing_product):
    res = client.get(f"/api/products/{timing_product}/buy-timing?days=45")
    assert res.status_code == 400
    data = json.loads(res.data)
    assert data["success"] is False
    assert data["error"]["code"] == "INVALID_TIME_WINDOW"


# 15. User-entered target prices validated
def test_user_entered_target_prices_validated(client, timing_product):
    # Negative target price
    res1 = client.post(f"/api/products/{timing_product}/buy-timing/target-alert", json={
        "target_price": -100.0,
        "contact_email": "shopper@example.com"
    })
    assert res1.status_code == 400
    data1 = json.loads(res1.data)
    assert data1["error"]["code"] == "INVALID_TARGET_PRICE"

    # Invalid email
    res2 = client.post(f"/api/products/{timing_product}/buy-timing/target-alert", json={
        "target_price": 35000.0,
        "contact_email": "invalid-email"
    })
    assert res2.status_code == 400
    data2 = json.loads(res2.data)
    assert data2["error"]["code"] == "INVALID_EMAIL"


# 16. Target-price alert created successfully
def test_target_price_alert_created_successfully(client, timing_product):
    res = client.post(f"/api/products/{timing_product}/buy-timing/target-alert", json={
        "target_price": 32000.0,
        "contact_email": "shopper@example.com",
        "user_identifier": "test_timing_user"
    })
    assert res.status_code == 201
    data = json.loads(res.data)
    assert data["success"] is True
    assert data["data"]["target_price"] == 32000.0
    assert data["data"]["product_id"] == timing_product


# 17. Duplicate active alert suppression remains intact
def test_alert_ownership_and_uniqueness_intact(client, timing_product):
    payload = {
        "target_price": 31000.0,
        "contact_email": "shopper_dup@example.com",
        "user_identifier": "test_dup_user"
    }
    res1 = client.post(f"/api/products/{timing_product}/buy-timing/target-alert", json=payload)
    assert res1.status_code == 201

    # Second call with identical params should be rejected as duplicate
    res2 = client.post(f"/api/products/{timing_product}/buy-timing/target-alert", json=payload)
    assert res2.status_code == 400
    data2 = json.loads(res2.data)
    assert data2["error"]["code"] == "DUPLICATE_ALERT"


# 18. Sparse history produces explicit limitations
def test_sparse_history_no_fabricated_confidence(app, timing_product, timing_retailers):
    r1_id, _ = timing_retailers
    now = datetime.utcnow()
    with app.app_context():
        off = Offer(product_id=timing_product, retailer_id=r1_id, price=30000.0, stock_status="In Stock")
        db.session.add(off)
        db.session.add(PriceHistory(
            product_id=timing_product,
            retailer_id=r1_id,
            price=31000.0,
            recorded_at=now - timedelta(days=2)
        ))
        db.session.commit()

        res = BuyTimingService.evaluate_buy_timing(timing_product, days=30)
        assert res["recommendation"] == BuyTimingService.RECOMMENDATION_INSUFFICIENT
        assert any("sparse" in lim.lower() for lim in res["limitations"])


# 19. Service handles missing values without crashing
def test_service_handles_missing_values_without_crashing(app, timing_product):
    with app.app_context():
        # Missing retailer_id, default window
        res = BuyTimingService.evaluate_buy_timing(timing_product)
        assert "error" not in res
        assert res["product_id"] == timing_product


# 20. End-to-end API response schema conforms to documented specification
def test_buy_timing_endpoint_response_schema(client, timing_product, timing_retailers):
    r1_id, _ = timing_retailers
    now = datetime.utcnow()
    with client.application.app_context():
        off = Offer(product_id=timing_product, retailer_id=r1_id, price=35000.0, stock_status="In Stock")
        db.session.add(off)
        for p_val in [38000.0, 37000.0, 36000.0]:
            db.session.add(PriceHistory(product_id=timing_product, retailer_id=r1_id, price=p_val, recorded_at=now - timedelta(days=10)))
        db.session.commit()

    res = client.get(f"/api/products/{timing_product}/buy-timing?days=30")
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data["success"] is True
    payload = data["data"]

    required_keys = [
        "product_id",
        "product_name",
        "recommendation",
        "recommendation_label",
        "observation_window_days",
        "valid_observation_count",
        "data_status",
        "evidence_type",
        "current_price",
        "historical_metrics",
        "target_recommendations",
        "explanation",
        "limitations",
        "evaluated_at"
    ]
    for k in required_keys:
        assert k in payload, f"Missing required key '{k}' in response"
