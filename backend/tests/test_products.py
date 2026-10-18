import json
import pytest
from app.models import Product, Offer, Retailer
from app.services.price_comparison_service import PriceComparisonService
from app.providers.csv_provider import CSVProductProvider

def test_product_search_and_pagination(client):
    """Test product search query and pagination envelope."""
    # Search for iPhone
    res = client.get("/api/products?search=iphone")
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data["success"] is True
    items = data["data"]["items"]
    assert len(items) >= 1
    assert any("iPhone" in p["name"] for p in items)
    pagination = data["data"]["pagination"]
    assert pagination["page"] == 1
    assert pagination["total_items"] >= 1

def test_product_search_case_insensitive(client):
    """Verify case-insensitive search matching."""
    res_lower = client.get("/api/products?search=sony")
    res_upper = client.get("/api/products?search=SONY")
    assert res_lower.status_code == 200
    assert res_upper.status_code == 200
    data_lower = json.loads(res_lower.data)["data"]["items"]
    data_upper = json.loads(res_upper.data)["data"]["items"]
    assert len(data_lower) == len(data_upper)
    assert len(data_lower) >= 1

def test_product_category_and_brand_filtering(client):
    """Test category and brand filters."""
    # Filter by category
    res = client.get("/api/products?category=Smartphones")
    assert res.status_code == 200
    items = json.loads(res.data)["data"]["items"]
    assert all(p["category"] == "Smartphones" for p in items)

    # Filter by brand
    res_brand = client.get("/api/products?brand=Apple")
    assert res_brand.status_code == 200
    items_brand = json.loads(res_brand.data)["data"]["items"]
    assert all(p["brand"] == "Apple" for p in items_brand)

def test_product_price_filtering_and_validation(client):
    """Test min_price, max_price, and negative price error handling."""
    # Valid price filter
    res = client.get("/api/products?min_price=10000&max_price=40000")
    assert res.status_code == 200

    # Negative price validation
    res_neg = client.get("/api/products?min_price=-500")
    assert res_neg.status_code == 400
    err_data = json.loads(res_neg.data)
    assert err_data["success"] is False
    assert err_data["error"]["code"] == "INVALID_FILTER"

    # min_price > max_price
    res_inv = client.get("/api/products?min_price=50000&max_price=10000")
    assert res_inv.status_code == 400
    assert json.loads(res_inv.data)["error"]["code"] == "INVALID_FILTER"

def test_invalid_pagination_parameters(client):
    """Test invalid page and per_page inputs."""
    res = client.get("/api/products?page=invalid")
    assert res.status_code == 400
    assert json.loads(res.data)["error"]["code"] == "INVALID_PAGINATION"

def test_product_details_retrieval(client):
    """Test retrieving product details by ID and 404 for missing ID."""
    prod = Product.query.first()
    assert prod is not None

    res = client.get(f"/api/products/{prod.id}")
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data["success"] is True
    assert data["data"]["id"] == prod.id
    assert "specs" in data["data"]
    assert "offers_summary" in data["data"]

    # Missing ID
    res_404 = client.get("/api/products/999999")
    assert res_404.status_code == 404
    assert json.loads(res_404.data)["error"]["code"] == "PRODUCT_NOT_FOUND"

def test_product_offers_and_comparison_route(client):
    """Test offer retrieval and comparison endpoints."""
    prod = Product.query.filter_by(sku="APPL-IP15-128").first()
    assert prod is not None

    # Route 1: /api/products/<id>/offers
    res = client.get(f"/api/products/{prod.id}/offers")
    assert res.status_code == 200
    data = json.loads(res.data)["data"]
    assert "offers" in data
    assert len(data["offers"]) >= 3
    assert data["cheapest_eligible_offer"] is not None

    # Route 2: /api/comparison?product_id=<id>
    res_comp = client.get(f"/api/comparison?product_id={prod.id}")
    assert res_comp.status_code == 200
    data_comp = json.loads(res_comp.data)["data"]
    assert data_comp["cheapest_eligible_offer"]["id"] == data["cheapest_eligible_offer"]["id"]

def test_cheapest_eligible_offer_excludes_unavailable(app):
    """Verify that Out of Stock offers are not selected as the cheapest eligible offer."""
    with app.app_context():
        prod = Product.query.filter_by(sku="APPL-IP15-128").first()
        res = PriceComparisonService.compare_offers(prod.id)
        cheapest = res["cheapest_eligible_offer"]
        assert cheapest is not None
        assert cheapest["is_available"] is True
        assert cheapest["stock_status"] in ("In Stock", "Available", "Limited Stock")
        # Ensure Tata CLiQ offer (67999, out of stock) was NOT chosen even though listed price is lower
        assert cheapest["retailer_code"] != "tatacliq"

def test_unknown_shipping_cost_not_assumed_zero(app):
    """Verify that unknown shipping cost is marked incomplete and not treated as free."""
    with app.app_context():
        prod = Product.query.filter_by(sku="APPL-IP15-128").first()
        res = PriceComparisonService.compare_offers(prod.id)
        reliance_offer = next((o for o in res["offers"] if o["retailer_code"] == "reliance_digital"), None)
        assert reliance_offer is not None
        assert reliance_offer["shipping_is_unknown"] is True
        assert reliance_offer["is_complete"] is False
        assert reliance_offer["estimated_total"] is None
        assert reliance_offer["is_cheapest_eligible"] is False

def test_csv_provider_validation_rules():
    """Test CSV dataset validation: empty files, missing columns, invalid prices."""
    provider = CSVProductProvider()

    # 1. Empty dataset
    valid, res = provider.parse_and_validate("")
    assert valid is False
    assert any("empty" in err.lower() for err in res["errors"])

    # 2. Missing columns
    bad_csv = "sku,name,price\nTEST-1,Test Item,100"
    valid, res = provider.parse_and_validate(bad_csv)
    assert valid is False
    assert any("missing required" in err.lower() for err in res["errors"])

    # 3. Invalid negative price
    invalid_price_csv = """sku,name,brand,category,base_mrp,retailer_code,price
TEST-2,Negative Price Product,TestBrand,Gadgets,500,amazon,-200"""
    valid, res = provider.parse_and_validate(invalid_price_csv)
    assert valid is False
    assert any("invalid price" in err.lower() for err in res["errors"])

    # 4. Valid dataset with unknown shipping
    valid_csv = """sku,name,brand,category,base_mrp,retailer_code,price,shipping_cost,stock_status
TEST-OK,Valid Item,ValidBrand,Electronics,1000,amazon,899,,In Stock"""
    valid, res = provider.parse_and_validate(valid_csv)
    assert valid is True
    assert res["products_count"] == 1
    assert res["offers_count"] == 1
    assert provider.normalized_offers[0]["shipping_is_unknown"] is True
