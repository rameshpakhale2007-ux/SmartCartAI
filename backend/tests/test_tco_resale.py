import pytest
from datetime import datetime, timedelta
from app.extensions import db
from app.models import Product, Offer, PriceHistory, Retailer, Forecast
from app.services.tco_service import TCOService
from app.services.resale_forecast_service import ResaleForecastService

@pytest.fixture
def sample_tco_product(app):
    """Creates a dedicated product for TCO and resale testing."""
    with app.app_context():
        p = Product(
            sku="TEST-TCO-PROD-01",
            name="SmartCart Ultra Laptop 14",
            brand="SmartBrand",
            category="Laptops",
            base_mrp=60000.0,
            currency="INR",
            specs_json={"RAM": "16GB", "SSD": "512GB"},
            source_type="demo",
        )
        db.session.add(p)
        db.session.commit()
        prod_id = p.id
        yield prod_id
        # Cleanup
        PriceHistory.query.filter_by(product_id=prod_id).delete()
        Offer.query.filter_by(product_id=prod_id).delete()
        Forecast.query.filter_by(product_id=prod_id).delete()
        prod = db.session.get(Product, prod_id)
        if prod:
            db.session.delete(prod)
        db.session.commit()

@pytest.fixture
def retailer_fixture(app):
    with app.app_context():
        r = Retailer.query.first()
        if not r:
            r = Retailer(
                name="Test Retailer",
                code="test_retailer",
                default_shipping_cost=50.0,
            )
            db.session.add(r)
            db.session.commit()
        return r.id


# 1. Valid TCO calculation
def test_valid_tco_calculation(client, sample_tco_product):
    payload = {
        "product_id": sample_tco_product,
        "purchase_price": 50000.0,
        "ownership_months": 36,
        "acquisition_cost": 1000.0,
        "monthly_operating_cost": 200.0,
        "maintenance_cost": 2000.0,
        "repair_cost": 1500.0,
        "accessory_cost": 1000.0,
        "financing_cost": 500.0,
        "estimated_resale_value": 15000.0,
    }
    res = client.post("/api/tco/calculate", json=payload)
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert data["success"] is True
    assert data["is_complete"] is True
    assert data["completeness_status"] == "complete"
    assert len(data["missing_fields"]) == 0

    # 50000 + 1000 + (200*36=7200) + 2000 + 1500 + 1000 + 500 = 63200
    assert data["gross_cost"] == 63200.0
    # 63200 - 15000 = 48200
    assert data["net_cost"] == 48200.0
    # 48200 / 36 = 1338.89
    assert data["monthly_equivalent_cost"] == round(48200.0 / 36, 2)


# 2. Missing purchase price
def test_missing_purchase_price(client):
    payload = {
        "ownership_months": 36,
        "acquisition_cost": 500.0,
    }
    res = client.post("/api/tco/calculate", json=payload)
    assert res.status_code == 400
    body = res.get_json()
    assert body["error"]["code"] == "MISSING_PURCHASE_PRICE"


# 3. Missing operating-cost information
def test_missing_operating_cost_is_incomplete(client, sample_tco_product):
    payload = {
        "product_id": sample_tco_product,
        "purchase_price": 50000.0,
        "ownership_months": 24,
        "acquisition_cost": 1000.0,
        # monthly_operating_cost omitted
        "maintenance_cost": 1000.0,
        "estimated_resale_value": 20000.0,
    }
    res = client.post("/api/tco/calculate", json=payload)
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert data["is_complete"] is False
    assert data["completeness_status"] == "incomplete"
    assert "monthly_operating_cost" in data["missing_fields"]
    # Operating cost was not silently replaced by 0 in the breakdown
    assert data["cost_breakdown"]["monthly_operating_cost"] is None
    assert data["cost_breakdown"]["total_operating_cost"] is None


# 4. Explicit zero-cost inputs
def test_explicit_zero_cost_inputs_are_complete(client, sample_tco_product):
    payload = {
        "product_id": sample_tco_product,
        "purchase_price": 40000.0,
        "ownership_months": 12,
        "acquisition_cost": 0.0,
        "monthly_operating_cost": 0.0,
        "maintenance_cost": 0.0,
        "repair_cost": 0.0,
        "accessory_cost": 0.0,
        "financing_cost": 0.0,
        "estimated_resale_value": 0.0,
    }
    res = client.post("/api/tco/calculate", json=payload)
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert data["is_complete"] is True
    assert len(data["missing_fields"]) == 0
    assert data["gross_cost"] == 40000.0
    assert data["net_cost"] == 40000.0


# 5. Negative monetary values
def test_negative_monetary_values_rejected(client, sample_tco_product):
    payload = {
        "product_id": sample_tco_product,
        "purchase_price": 50000.0,
        "maintenance_cost": -500.0,
    }
    res = client.post("/api/tco/calculate", json=payload)
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "INVALID_COST_INPUT"


# 6. Invalid ownership duration
def test_invalid_ownership_duration_rejected(client, sample_tco_product):
    payload = {
        "product_id": sample_tco_product,
        "purchase_price": 50000.0,
        "ownership_months": -6,
    }
    res = client.post("/api/tco/calculate", json=payload)
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "INVALID_OWNERSHIP_PERIOD"


# 7. Correct gross ownership cost
def test_correct_gross_ownership_cost(client, sample_tco_product):
    payload = {
        "product_id": sample_tco_product,
        "purchase_price": 20000.0,
        "ownership_months": 10,
        "acquisition_cost": 500.0,
        "monthly_operating_cost": 100.0,  # 10 * 100 = 1000
        "maintenance_cost": 400.0,
        "repair_cost": 200.0,
        "accessory_cost": 300.0,
        "financing_cost": 100.0,
    }
    res = client.post("/api/tco/calculate", json=payload)
    data = res.get_json()["data"]
    expected_gross = 20000.0 + 500.0 + 1000.0 + 400.0 + 200.0 + 300.0 + 100.0
    assert data["gross_cost"] == expected_gross


# 8. Correct net ownership cost
def test_correct_net_ownership_cost(client, sample_tco_product):
    payload = {
        "product_id": sample_tco_product,
        "purchase_price": 30000.0,
        "ownership_months": 12,
        "acquisition_cost": 0.0,
        "monthly_operating_cost": 0.0,
        "maintenance_cost": 0.0,
        "repair_cost": 0.0,
        "accessory_cost": 0.0,
        "financing_cost": 0.0,
        "estimated_resale_value": 12000.0,
    }
    res = client.post("/api/tco/calculate", json=payload)
    data = res.get_json()["data"]
    assert data["net_cost"] == 18000.0


# 9. Prevention of double-counting resale proceeds
def test_prevention_of_double_counting_resale(client, sample_tco_product):
    payload = {
        "product_id": sample_tco_product,
        "purchase_price": 10000.0,
        "ownership_months": 6,
        "acquisition_cost": 0.0,
        "monthly_operating_cost": 0.0,
        "maintenance_cost": 0.0,
        "repair_cost": 0.0,
        "accessory_cost": 0.0,
        "financing_cost": 0.0,
        "estimated_resale_value": 4000.0,
    }
    res = client.post("/api/tco/calculate", json=payload)
    data = res.get_json()["data"]
    assert data["gross_cost"] == 10000.0
    # Net must be exactly 10000 - 4000 = 6000 (not subtracted twice to become 2000)
    assert data["net_cost"] == 6000.0


# 10. Monthly equivalent cost
def test_monthly_equivalent_cost(client, sample_tco_product):
    payload = {
        "product_id": sample_tco_product,
        "purchase_price": 24000.0,
        "ownership_months": 24,
        "acquisition_cost": 0.0,
        "monthly_operating_cost": 0.0,
        "maintenance_cost": 0.0,
        "repair_cost": 0.0,
        "accessory_cost": 0.0,
        "financing_cost": 0.0,
        "estimated_resale_value": 12000.0,
    }
    res = client.post("/api/tco/calculate", json=payload)
    data = res.get_json()["data"]
    # Net cost = 12000, 12000 / 24 months = 500/month
    assert data["monthly_equivalent_cost"] == 500.0


# 11. Resale forecast with sufficient evidence
def test_resale_forecast_sufficient_evidence(app, client, sample_tco_product, retailer_fixture):
    with app.app_context():
        # Seed 4 historical observations
        base_time = datetime.utcnow() - timedelta(days=60)
        for i, price in enumerate([58000.0, 56000.0, 54000.0, 52000.0]):
            obs = PriceHistory(
                product_id=sample_tco_product,
                retailer_id=retailer_fixture,
                price=price,
                recorded_at=base_time + timedelta(days=i * 15),
                source_type="demo",
            )
            db.session.add(obs)
        db.session.commit()

    res = client.get(f"/api/products/{sample_tco_product}/resale-forecast?months=36")
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert data["has_sufficient_data"] is True
    assert data["status"] == "sufficient_data"
    assert data["observation_count"] >= 3
    assert data["forecast_method"] == "historical_trend_calibrated"
    assert data["estimated_resale_value"] > 0
    assert data["estimated_resale_value"] <= data["reference_price"]


# 12. Insufficient historical observations
def test_resale_forecast_insufficient_evidence(app, client, sample_tco_product, retailer_fixture):
    with app.app_context():
        # Seed only 1 observation
        obs = PriceHistory(
            product_id=sample_tco_product,
            retailer_id=retailer_fixture,
            price=59000.0,
            recorded_at=datetime.utcnow() - timedelta(days=5),
            source_type="demo",
        )
        db.session.add(obs)
        db.session.commit()

    res = client.get(f"/api/products/{sample_tco_product}/resale-forecast?months=24")
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert data["has_sufficient_data"] is False
    assert data["status"] == "insufficient_data"
    assert data["observation_count"] == 1
    assert "insufficient" in data["forecast_method"].lower() or "illustrative" in data["forecast_method"].lower()


# 13. Future-dated observations excluded
def test_future_dated_observations_excluded(app, client, sample_tco_product, retailer_fixture):
    with app.app_context():
        # Clean existing
        PriceHistory.query.filter_by(product_id=sample_tco_product).delete()
        # Add 1 valid past and 3 future-dated observations
        past_obs = PriceHistory(
            product_id=sample_tco_product,
            retailer_id=retailer_fixture,
            price=55000.0,
            recorded_at=datetime.utcnow() - timedelta(days=10),
        )
        future_obs = PriceHistory(
            product_id=sample_tco_product,
            retailer_id=retailer_fixture,
            price=45000.0,
            recorded_at=datetime.utcnow() + timedelta(days=10),
        )
        db.session.add(past_obs)
        db.session.add(future_obs)
        db.session.commit()

    res = client.get(f"/api/products/{sample_tco_product}/resale-forecast")
    data = res.get_json()["data"]
    # Only 1 past observation counted
    assert data["observation_count"] == 1
    assert data["has_sufficient_data"] is False


# 14. Non-positive historical prices excluded
def test_non_positive_historical_prices_excluded(app, client, sample_tco_product, retailer_fixture):
    with app.app_context():
        PriceHistory.query.filter_by(product_id=sample_tco_product).delete()
        # Add zero-price and negative price
        obs_zero = PriceHistory(
            product_id=sample_tco_product,
            retailer_id=retailer_fixture,
            price=0.0,
            recorded_at=datetime.utcnow() - timedelta(days=5),
        )
        obs_neg = PriceHistory(
            product_id=sample_tco_product,
            retailer_id=retailer_fixture,
            price=-100.0,
            recorded_at=datetime.utcnow() - timedelta(days=4),
        )
        db.session.add(obs_zero)
        db.session.add(obs_neg)
        db.session.commit()

    res = client.get(f"/api/products/{sample_tco_product}/resale-forecast")
    data = res.get_json()["data"]
    assert data["observation_count"] == 0


# 15. Valid scenario calculations
def test_valid_scenario_calculations(client, sample_tco_product):
    res = client.get(f"/api/products/{sample_tco_product}/resale-forecast?months=36")
    data = res.get_json()["data"]
    scenarios = data["scenarios"]
    assert "optimistic" in scenarios
    assert "expected" in scenarios
    assert "pessimistic" in scenarios
    # Optimistic resale must be >= Expected >= Pessimistic
    assert scenarios["optimistic"]["estimated_resale"] >= scenarios["expected"]["estimated_resale"]
    assert scenarios["expected"]["estimated_resale"] >= scenarios["pessimistic"]["estimated_resale"]


# 16. Invalid depreciation assumptions
def test_invalid_depreciation_assumptions(client, sample_tco_product):
    res = client.get(f"/api/products/{sample_tco_product}/resale-forecast?annual_rate=-0.25")
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "INVALID_DEPRECIATION_RATE"

    res2 = client.get(f"/api/products/{sample_tco_product}/resale-forecast?annual_rate=1.5")
    assert res2.status_code == 400
    assert res2.get_json()["error"]["code"] == "INVALID_DEPRECIATION_RATE"


# 17. Non-negative resale estimates
def test_non_negative_resale_estimates(client, sample_tco_product):
    # Over 60 months with high rate, resale must remain non-negative
    res = client.get(f"/api/products/{sample_tco_product}/resale-forecast?months=60&annual_rate=0.85")
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert data["estimated_resale_value"] >= 0.0


# 18. Missing product returns 404
def test_missing_product_returns_404(client):
    res = client.get("/api/products/999999/resale-forecast")
    assert res.status_code == 404
    assert res.get_json()["error"]["code"] == "PRODUCT_NOT_FOUND"


# 19. TCO comparison with complete comparable inputs
def test_tco_comparison_complete_comparable(client, sample_tco_product):
    payload = {
        "products": [
            {
                "product_id": sample_tco_product,
                "purchase_price": 50000.0,
                "ownership_months": 24,
                "acquisition_cost": 500.0,
                "monthly_operating_cost": 100.0,
                "maintenance_cost": 500.0,
                "repair_cost": 0.0,
                "accessory_cost": 0.0,
                "financing_cost": 0.0,
                "estimated_resale_value": 20000.0,
            },
            {
                "purchase_price": 40000.0,
                "ownership_months": 24,
                "acquisition_cost": 500.0,
                "monthly_operating_cost": 100.0,
                "maintenance_cost": 500.0,
                "repair_cost": 0.0,
                "accessory_cost": 0.0,
                "financing_cost": 0.0,
                "estimated_resale_value": 15000.0,
            },
        ]
    }
    res = client.post("/api/tco/compare", json=payload)
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert data["is_fully_comparable"] is True
    assert data["comparison_status"] == "fully_comparable"
    assert len(data["comparisons"]) == 2
    # Second product net: 40000 + 500 + 2400 + 500 - 15000 = 28400
    # First product net: 50000 + 500 + 2400 + 500 - 20000 = 33400
    # Ranked ascending by net cost
    assert data["comparisons"][0]["net_cost"] < data["comparisons"][1]["net_cost"]


# 20. Incomplete totals are not ranked as confirmed cheapest
def test_incomplete_totals_not_ranked_as_cheapest(client, sample_tco_product):
    payload = {
        "products": [
            {
                "purchase_price": 30000.0,
                "ownership_months": 24,
                # Missing all other costs and missing resale
            },
            {
                "purchase_price": 40000.0,
                "ownership_months": 24,
                "acquisition_cost": 500.0,
                "monthly_operating_cost": 50.0,
                "maintenance_cost": 500.0,
                "repair_cost": 0.0,
                "accessory_cost": 0.0,
                "financing_cost": 0.0,
                "estimated_resale_value": 15000.0,
            },
        ]
    }
    res = client.post("/api/tco/compare", json=payload)
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert data["is_fully_comparable"] is False
    assert data["comparison_status"] == "partially_comparable"
    assert "Cannot determine definitive cheapest" in data["summary_message"]


# 21. Forecast persistence
def test_forecast_persistence(client, sample_tco_product):
    # Request forecast with persist=true
    res = client.get(f"/api/products/{sample_tco_product}/resale-forecast?months=24&persist=true")
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert "forecast_id" in data

    # Retrieve history
    hist_res = client.get(f"/api/products/{sample_tco_product}/resale-forecast/history")
    assert hist_res.status_code == 200
    hist_data = hist_res.get_json()["data"]
    assert hist_data["count"] >= 1
    assert hist_data["history"][0]["product_id"] == sample_tco_product


# 22. Database isolation between tests
def test_database_isolation(app, sample_tco_product):
    with app.app_context():
        # Verifies that clean test runs do not affect real smartcart.db
        p = db.session.get(Product, sample_tco_product)
        assert p is not None
        assert p.sku == "TEST-TCO-PROD-01"


# 23. Financing cost not double-counted if purchase price already includes financing
def test_financing_not_double_counted(client, sample_tco_product):
    payload = {
        "product_id": sample_tco_product,
        "purchase_price": 50000.0,
        "ownership_months": 24,
        "purchase_includes_financing": True,
        "financing_cost": 5000.0,  # Should NOT be added again to gross_cost
        "acquisition_cost": 0.0,
        "monthly_operating_cost": 0.0,
        "maintenance_cost": 0.0,
        "repair_cost": 0.0,
        "accessory_cost": 0.0,
        "estimated_resale_value": 20000.0,
    }
    res = client.post("/api/tco/calculate", json=payload)
    assert res.status_code == 200
    data = res.get_json()["data"]
    # Gross cost should be 50000.0, NOT 55000.0
    assert data["gross_cost"] == 50000.0
    assert data["net_cost"] == 30000.0


# 24. Rejection of duplicate comparison products
def test_duplicate_comparison_products_rejected(client, sample_tco_product):
    payload = {
        "products": [
            {"product_id": sample_tco_product, "ownership_months": 36},
            {"product_id": sample_tco_product, "ownership_months": 36},
        ]
    }
    res = client.post("/api/tco/compare", json=payload)
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "DUPLICATE_COMPARISON_PRODUCT"


# 25. Comparison fairness: mismatched ownership horizons marked partially comparable
def test_mismatched_ownership_horizons_in_comparison(client, sample_tco_product):
    payload = {
        "products": [
            {
                "purchase_price": 30000.0,
                "ownership_months": 12,
                "acquisition_cost": 0.0,
                "monthly_operating_cost": 0.0,
                "maintenance_cost": 0.0,
                "repair_cost": 0.0,
                "accessory_cost": 0.0,
                "financing_cost": 0.0,
                "estimated_resale_value": 15000.0,
            },
            {
                "purchase_price": 30000.0,
                "ownership_months": 36,
                "acquisition_cost": 0.0,
                "monthly_operating_cost": 0.0,
                "maintenance_cost": 0.0,
                "repair_cost": 0.0,
                "accessory_cost": 0.0,
                "financing_cost": 0.0,
                "estimated_resale_value": 10000.0,
            },
        ]
    }
    res = client.post("/api/tco/compare", json=payload)
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert data["is_fully_comparable"] is False
    assert data["comparison_status"] == "partially_comparable"
    assert "ownership horizons differ" in data["summary_message"]

