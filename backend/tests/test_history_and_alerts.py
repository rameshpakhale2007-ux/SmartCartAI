import json
import pytest
from app.models import Product, Retailer, Offer, PriceHistory, Alert
from app.services.historical_price_service import HistoricalPriceService
from app.services.alert_service import AlertService
from app.extensions import db

# ==========================================
# 1. Historical Price Tests
# ==========================================

def test_get_price_history_valid_product(client):
    """Retrieve 30-day price history for iPhone 15."""
    prod = Product.query.filter_by(sku="APPL-IP15-128").first()
    assert prod is not None

    res = client.get(f"/api/products/{prod.id}/history?days=30")
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data["success"] is True
    payload = data["data"]

    assert payload["days"] == 30
    assert payload["has_sufficient_data"] is True
    assert len(payload["observations"]) >= 20

    # Verify chronological ordering (ascending)
    obs = payload["observations"]
    timestamps = [o["recorded_at"] for o in obs]
    assert timestamps == sorted(timestamps)

    # Verify statistics structure
    stats = payload["statistics"]
    assert stats["min_price"] <= stats["max_price"]
    assert stats["min_price"] <= stats["median_price"] <= stats["max_price"]
    assert stats["current_observed_price"] == obs[-1]["price"]
    assert stats["observation_count"] == len(obs)

def test_get_price_history_windows(client):
    """Verify 60 and 90-day time windows."""
    prod = Product.query.filter_by(sku="APPL-IP15-128").first()
    assert prod is not None

    res_60 = client.get(f"/api/products/{prod.id}/history?days=60")
    assert res_60.status_code == 200
    data_60 = json.loads(res_60.data)["data"]
    assert data_60["days"] == 60

    res_90 = client.get(f"/api/products/{prod.id}/history?days=90")
    assert res_90.status_code == 200
    data_90 = json.loads(res_90.data)["data"]
    assert data_90["days"] == 90
    assert len(data_90["observations"]) >= len(data_60["observations"])

def test_get_price_history_invalid_window(client):
    """Reject unsupported time window parameters."""
    prod = Product.query.first()
    res = client.get(f"/api/products/{prod.id}/history?days=45")
    assert res.status_code == 400
    data = json.loads(res.data)
    assert data["success"] is False
    assert data["error"]["code"] == "INVALID_TIME_WINDOW"

def test_get_price_history_missing_product(client):
    """Return 404 for nonexistent product ID."""
    res = client.get("/api/products/999999/history?days=30")
    assert res.status_code == 404
    data = json.loads(res.data)
    assert data["success"] is False
    assert data["error"]["code"] == "PRODUCT_NOT_FOUND"

def test_get_price_history_retailer_filter(client):
    """Filter historical observations by specific retailer."""
    prod = Product.query.filter_by(sku="APPL-IP15-128").first()
    ret_flipkart = Retailer.query.filter_by(code="flipkart").first()
    assert prod and ret_flipkart

    res = client.get(f"/api/products/{prod.id}/history?days=30&retailer_id={ret_flipkart.id}")
    assert res.status_code == 200
    payload = json.loads(res.data)["data"]
    assert all(o["retailer_id"] == ret_flipkart.id for o in payload["observations"])

def test_get_price_history_empty_product(client):
    """Handle product with zero observations safely."""
    prod = Product.query.filter_by(sku="DEL-XPS13-PLUS").first()
    assert prod is not None

    res = client.get(f"/api/products/{prod.id}/history?days=30")
    assert res.status_code == 200
    payload = json.loads(res.data)["data"]
    assert payload["has_sufficient_data"] is False
    assert payload["observations"] == []
    assert payload["statistics"] is None

# ==========================================
# 2. Target-Price Alert Tests
# ==========================================

def test_create_alert_success(client):
    """Create a new valid target-price alert."""
    prod = Product.query.first()
    payload = {
        "product_id": prod.id,
        "target_price": 50000.0,
        "contact_email": "testuser@example.com",
        "user_identifier": "test_user_1"
    }

    res = client.post("/api/alerts", json=payload)
    assert res.status_code == 201
    data = json.loads(res.data)
    assert data["success"] is True
    alert = data["data"]
    assert alert["product_id"] == prod.id
    assert alert["target_price"] == 50000.0
    assert alert["is_active"] is True
    assert alert["trigger_status"] == "active"

def test_create_alert_validations(client):
    """Validate target price and email formatting."""
    prod = Product.query.first()

    # Negative target price
    res_neg = client.post("/api/alerts", json={
        "product_id": prod.id,
        "target_price": -100,
        "contact_email": "user@example.com"
    })
    assert res_neg.status_code == 400
    assert json.loads(res_neg.data)["error"]["code"] == "INVALID_TARGET_PRICE"

    # Invalid email
    res_email = client.post("/api/alerts", json={
        "product_id": prod.id,
        "target_price": 1000,
        "contact_email": "not-an-email"
    })
    assert res_email.status_code == 400
    assert json.loads(res_email.data)["error"]["code"] == "INVALID_EMAIL"

    # Missing product ID
    res_no_prod = client.post("/api/alerts", json={
        "target_price": 1000,
        "contact_email": "user@example.com"
    })
    assert res_no_prod.status_code == 400

def test_duplicate_active_alert_suppression(client):
    """Verify duplicate active alerts are suppressed."""
    prod = Product.query.first()
    payload = {
        "product_id": prod.id,
        "target_price": 42000.0,
        "contact_email": "duplicate_check@example.com",
        "user_identifier": "dup_user"
    }

    res1 = client.post("/api/alerts", json=payload)
    assert res1.status_code == 201

    # Second creation with identical parameters
    res2 = client.post("/api/alerts", json=payload)
    assert res2.status_code == 200
    data2 = json.loads(res2.data)
    assert "already configured" in data2["message"]

def test_update_and_delete_alert(client):
    """Test updating alert status, target price, and deletion."""
    prod = Product.query.first()
    create_res = client.post("/api/alerts", json={
        "product_id": prod.id,
        "target_price": 30000.0,
        "contact_email": "update_test@example.com",
        "user_identifier": "mod_user"
    })
    alert_id = json.loads(create_res.data)["data"]["id"]

    # Patch: Deactivate
    patch_res = client.patch(f"/api/alerts/{alert_id}", json={"is_active": False})
    assert patch_res.status_code == 200
    assert json.loads(patch_res.data)["data"]["is_active"] is False
    assert json.loads(patch_res.data)["data"]["trigger_status"] == "inactive"

    # Delete
    del_res = client.delete(f"/api/alerts/{alert_id}")
    assert del_res.status_code == 200
    assert json.loads(del_res.data)["success"] is True

    # Confirm 404 after deletion
    del_again = client.delete(f"/api/alerts/{alert_id}")
    assert del_again.status_code == 404

def test_evaluate_alerts_trigger_logic(app):
    """
    Test alert trigger conditions:
    1. Triggers when in-stock price <= target price
    2. Does NOT trigger when price > target price
    3. Excludes out-of-stock offers
    4. Suppresses duplicate trigger increments
    """
    with app.app_context():
        prod_iphone = Product.query.filter_by(sku="APPL-IP15-128").first()
        assert prod_iphone is not None

        # Current lowest in-stock iPhone 15 price is ~68,499 (Flipkart)
        # Alert A: Target 70,000 -> Should TRIGGER
        alert_a = AlertService.create_alert(
            product_id=prod_iphone.id,
            target_price=70000.0,
            contact_email="trigger_test@example.com",
            user_identifier="eval_user_a"
        )["alert"]

        # Alert B: Target 50,000 -> Should NOT trigger
        alert_b = AlertService.create_alert(
            product_id=prod_iphone.id,
            target_price=50000.0,
            contact_email="not_trigger@example.com",
            user_identifier="eval_user_b"
        )["alert"]

        # Alert C: Target Tata CLiQ (67999, but Out of Stock) -> Should SKIP / NOT trigger
        ret_tatacliq = Retailer.query.filter_by(code="tatacliq").first()
        alert_c = AlertService.create_alert(
            product_id=prod_iphone.id,
            retailer_id=ret_tatacliq.id if ret_tatacliq else None,
            target_price=68000.0,
            contact_email="oos_test@example.com",
            user_identifier="eval_user_c"
        )["alert"]

        # Run first evaluation
        summary1 = AlertService.evaluate_alerts(alert_id=alert_a["id"])
        assert summary1["triggered_count"] == 1
        res_a1 = summary1["results"][0]
        assert res_a1["status"] == "triggered"
        assert res_a1["is_duplicate_suppressed"] is False

        # Run second evaluation for Alert A (Duplicate trigger suppression)
        summary2 = AlertService.evaluate_alerts(alert_id=alert_a["id"])
        assert summary2["triggered_count"] == 1
        res_a2 = summary2["results"][0]
        assert res_a2["status"] == "triggered"
        assert res_a2["is_duplicate_suppressed"] is True  # Duplicate suppressed!

        # Evaluate Alert B (Price > target)
        summary_b = AlertService.evaluate_alerts(alert_id=alert_b["id"])
        assert summary_b["triggered_count"] == 0
        assert summary_b["results"][0]["status"] == "not_triggered"

        # Evaluate Alert C (Out of stock offer)
        if ret_tatacliq:
            summary_c = AlertService.evaluate_alerts(alert_id=alert_c["id"])
            assert summary_c["triggered_count"] == 0
            assert summary_c["results"][0]["status"] == "skipped"
            assert "out of stock" in summary_c["results"][0]["reason"].lower()

def test_alert_model_direct_instantiation(app):
    """
    Directly verify Alert constructor accepts all model fields without type/keyword errors.
    """
    import datetime
    with app.app_context():
        now = datetime.datetime.utcnow()
        alert = Alert(
            product_id=1,
            retailer_id=2,
            target_price=45000.0,
            contact_email="direct_test@example.com",
            user_identifier="direct_user",
            is_active=True,
            trigger_status="active",
            last_checked_at=now,
            last_observed_price=44999.0,
            last_triggered_at=now,
            trigger_count=2,
            created_at=now
        )
        assert alert.product_id == 1
        assert alert.retailer_id == 2
        assert alert.target_price == 45000.0
        assert alert.contact_email == "direct_test@example.com"
        assert alert.user_identifier == "direct_user"
        assert alert.is_active is True
        assert alert.trigger_status == "active"
        assert alert.last_checked_at == now
        assert alert.last_observed_price == 44999.0
        assert alert.last_triggered_at == now
        assert alert.trigger_count == 2
        assert alert.created_at == now

        alert_dict = alert.to_dict()
        assert alert_dict["target_price"] == 45000.0
        assert alert_dict["user_identifier"] == "direct_user"
        assert alert_dict["trigger_count"] == 2

def test_list_alerts_endpoint(client):
    """Verify listing alerts with user scoping and status filters."""
    prod = Product.query.first()
    user_id = "filter_user_123"

    # Create one active and one inactive alert for this user
    res1 = client.post("/api/alerts", json={
        "product_id": prod.id,
        "target_price": 55000.0,
        "contact_email": "filter1@example.com",
        "user_identifier": user_id
    })
    assert res1.status_code == 201
    alert1_id = json.loads(res1.data)["data"]["id"]

    res2 = client.post("/api/alerts", json={
        "product_id": prod.id,
        "target_price": 56000.0,
        "contact_email": "filter2@example.com",
        "user_identifier": user_id
    })
    assert res2.status_code == 201
    alert2_id = json.loads(res2.data)["data"]["id"]

    # Deactivate alert2
    client.patch(f"/api/alerts/{alert2_id}", json={"is_active": False, "user_identifier": user_id})

    # List all for this user
    list_res = client.get(f"/api/alerts?user_id={user_id}")
    assert list_res.status_code == 200
    list_data = json.loads(list_res.data)["data"]
    assert list_data["total_count"] == 2
    assert list_data["active_count"] == 1

    # Filter active only
    active_res = client.get(f"/api/alerts?user_id={user_id}&status=active")
    assert active_res.status_code == 200
    active_data = json.loads(active_res.data)["data"]
    assert len(active_data["alerts"]) == 1
    assert active_data["alerts"][0]["id"] == alert1_id

def test_alert_ownership_security(client):
    """Enforce ownership checks on alert update and delete."""
    prod = Product.query.first()
    owner_user = "real_owner"
    attacker_user = "malicious_user"

    create_res = client.post("/api/alerts", json={
        "product_id": prod.id,
        "target_price": 40000.0,
        "contact_email": "owner@example.com",
        "user_identifier": owner_user
    })
    alert_id = json.loads(create_res.data)["data"]["id"]

    # Attacker tries to patch
    patch_res = client.patch(
        f"/api/alerts/{alert_id}",
        json={"target_price": 100.0},
        headers={"X-User-Id": attacker_user}
    )
    assert patch_res.status_code == 403
    assert json.loads(patch_res.data)["error"]["code"] == "UNAUTHORIZED"

    # Attacker tries to delete
    del_res = client.delete(
        f"/api/alerts/{alert_id}",
        headers={"X-User-Id": attacker_user}
    )
    assert del_res.status_code == 403
    assert json.loads(del_res.data)["error"]["code"] == "UNAUTHORIZED"

    # Owner can update and delete
    patch_ok = client.patch(
        f"/api/alerts/{alert_id}",
        json={"target_price": 38000.0},
        headers={"X-User-Id": owner_user}
    )
    assert patch_ok.status_code == 200
    assert json.loads(patch_ok.data)["data"]["target_price"] == 38000.0

    del_ok = client.delete(
        f"/api/alerts/{alert_id}",
        headers={"X-User-Id": owner_user}
    )
    assert del_ok.status_code == 200

