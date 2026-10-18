import json

def test_health_check(client):
    """Verify backend health endpoint returns operational status and schema."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["success"] is True
    assert data["status"] == "operational"
    assert "version" in data
    assert "timestamp" in data

def test_root_endpoint(client):
    """Verify platform root endpoint returns operational service metadata."""
    response = client.get("/")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["success"] is True
    assert data["status"] == "operational"
    assert data["service"] == "SmartCart AI Backend API"
    assert data["health_check"] == "/api/health"

def test_dashboard_summary(client):
    """Verify dashboard summary returns valid metrics and data structures."""
    response = client.get("/api/dashboard/summary")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["success"] is True
    payload = data["data"]
    
    assert "metrics" in payload
    assert payload["metrics"]["total_products_tracked"] >= 1
    assert payload["metrics"]["monitored_retailers"] >= 1
    assert "lowest_available_offers" in payload
    assert "data_source_health" in payload
    assert len(payload["data_source_health"]) >= 3

def test_404_handler(client):
    """Verify custom error handler for non-existent route."""
    response = client.get("/api/non-existent-endpoint")
    assert response.status_code == 404
    data = json.loads(response.data)
    assert data["success"] is False
    assert data["error"]["code"] == "NOT_FOUND"
