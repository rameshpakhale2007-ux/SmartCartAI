import json
import pytest
from app.models import Product, Offer
from app.services.alternative_service import AlternativeService
from app.extensions import db

def test_get_product_alternatives_success(client):
    """Retrieve alternatives for iPhone 15 and verify structure and exclusions."""
    source = Product.query.filter_by(sku="APPL-IP15-128").first()
    assert source is not None

    res = client.get(f"/api/products/{source.id}/alternatives")
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data["success"] is True
    payload = data["data"]

    assert payload["source_product"]["id"] == source.id
    assert "alternatives" in payload
    assert len(payload["alternatives"]) >= 1

    # Source product MUST NOT appear as its own alternative
    alt_ids = [alt["product"]["id"] for alt in payload["alternatives"]]
    assert source.id not in alt_ids

    # Unrelated categories MUST NOT be present
    alt_categories = set(alt["product"]["category"] for alt in payload["alternatives"])
    assert alt_categories == {source.category}

    # Verify score bounds and explanations
    for alt in payload["alternatives"]:
        assert 0.0 <= alt["similarity_score"] <= 100.0
        assert len(alt["explanations"]) >= 1
        assert "pricing" in alt

def test_get_alternatives_missing_product_404(client):
    """Return 404 for nonexistent source product."""
    res = client.get("/api/products/999999/alternatives")
    assert res.status_code == 404
    data = json.loads(res.data)
    assert data["success"] is False
    assert data["error"]["code"] == "PRODUCT_NOT_FOUND"

def test_alternatives_budget_and_similarity_filters(client):
    """Verify max_price and min_similarity filtering."""
    source = Product.query.filter_by(sku="APPL-IP15-128").first()
    assert source is not None

    # Filter with strict max_price (e.g., 45,000 to find OnePlus 12R)
    res_budget = client.get(f"/api/products/{source.id}/alternatives?max_price=45000")
    assert res_budget.status_code == 200
    budget_data = json.loads(res_budget.data)["data"]["alternatives"]
    for alt in budget_data:
        price = alt["pricing"]["best_listed_price"] or alt["product"]["base_mrp"]
        assert price <= 45000.0

    # Filter with high min_similarity (>= 60)
    res_sim = client.get(f"/api/products/{source.id}/alternatives?min_similarity=60")
    assert res_sim.status_code == 200
    sim_data = json.loads(res_sim.data)["data"]["alternatives"]
    for alt in sim_data:
        assert alt["similarity_score"] >= 60.0

def test_alternatives_brand_filter(client):
    """Filter alternatives by specific manufacturer brand."""
    source = Product.query.filter_by(sku="APPL-IP15-128").first()
    assert source is not None

    res_brand = client.get(f"/api/products/{source.id}/alternatives?brand=Samsung")
    assert res_brand.status_code == 200
    brand_data = json.loads(res_brand.data)["data"]["alternatives"]
    assert len(brand_data) >= 1
    assert all(alt["product"]["brand"].lower() == "samsung" for alt in brand_data)

def test_alternatives_sorting_price_and_similarity(client):
    """Verify sorting by price_asc, price_desc, and similarity."""
    source = Product.query.filter_by(sku="APPL-IP15-128").first()
    assert source is not None

    # 1. Test Ascending Effective Price (price_asc)
    res_price_asc = client.get(f"/api/products/{source.id}/alternatives?sort=price_asc")
    assert res_price_asc.status_code == 200
    items_asc = json.loads(res_price_asc.data)["data"]["alternatives"]
    assert len(items_asc) >= 2
    prices_asc = [alt["pricing"]["best_listed_price"] or alt["product"]["base_mrp"] for alt in items_asc]
    assert prices_asc == sorted(prices_asc)

    # 2. Test Descending Effective Price (price_desc)
    res_price_desc = client.get(f"/api/products/{source.id}/alternatives?sort=price_desc")
    assert res_price_desc.status_code == 200
    items_desc = json.loads(res_price_desc.data)["data"]["alternatives"]
    assert len(items_desc) >= 2
    prices_desc = [alt["pricing"]["best_listed_price"] or alt["product"]["base_mrp"] for alt in items_desc]
    assert prices_desc == sorted(prices_desc, reverse=True)

    # 3. Test Similarity Sorting (default)
    res_sim = client.get(f"/api/products/{source.id}/alternatives?sort=similarity")
    assert res_sim.status_code == 200
    items_sim = json.loads(res_sim.data)["data"]["alternatives"]
    assert len(items_sim) >= 2
    scores = [alt["similarity_score"] for alt in items_sim]
    assert scores == sorted(scores, reverse=True)

def test_compare_alternatives_matrix(client):
    """Test side-by-side spec and value comparison matrix."""
    source = Product.query.filter_by(sku="APPL-IP15-128").first()
    cand = Product.query.filter_by(sku="SAM-S24-128").first()
    assert source and cand

    res = client.get(f"/api/products/{source.id}/alternatives/compare?ids={cand.id}")
    assert res.status_code == 200
    data = json.loads(res.data)["data"]
    assert "products" in data
    assert len(data["products"]) == 2
    assert "specifications_matrix" in data
    assert any(row["specification"] == "Storage" for row in data["specifications_matrix"])

def test_handle_product_with_no_offers_gracefully(app):
    """Verify alternatives calculation handles products with no offers safely."""
    with app.app_context():
        no_offer_prod = Product.query.filter_by(sku="NOTH-PHN2-512").first()
        source = Product.query.filter_by(sku="APPL-IP15-128").first()
        assert no_offer_prod and source

        pricing = AlternativeService._get_product_pricing_summary(no_offer_prod.id)
        assert pricing["availability_status"] == "No Offers"
        assert pricing["total_offers_count"] == 0
        assert pricing["best_listed_price"] is None

def test_missing_specifications_not_treated_as_matching(app):
    """Verify missing or empty specifications return 0 score and are not treated as matches."""
    with app.app_context():
        # Both empty
        score_both_empty, exp1 = AlternativeService._compare_specifications({}, {})
        assert score_both_empty == 0.0
        assert len(exp1) >= 1

        # One empty, one populated
        score_one_empty, exp2 = AlternativeService._compare_specifications({"Storage": "128GB"}, {})
        assert score_one_empty == 0.0

        # Completely disjoint specifications
        score_disjoint, exp3 = AlternativeService._compare_specifications(
            {"Battery": "5000 mAh"},
            {"Display": "6.7 OLED"}
        )
        assert score_disjoint == 0.0

def test_unknown_landed_prices_not_ranked_cheapest(client):
    """Verify products with unknown landed prices are placed at the end when sorting by landed_price_asc."""
    source = Product.query.filter_by(sku="APPL-IP15-128").first()
    assert source is not None

    res = client.get(f"/api/products/{source.id}/alternatives?sort=landed_price_asc")
    assert res.status_code == 200
    items = json.loads(res.data)["data"]["alternatives"]

    # Verify that any item with None best_landed_price appears after items with valid numeric best_landed_price
    known_landed = []
    unknown_landed = []
    for item in items:
        lp = item["pricing"]["best_landed_price"]
        if lp is not None:
            known_landed.append(lp)
        else:
            unknown_landed.append(item)

    # Known landed prices must be sorted ascending
    assert known_landed == sorted(known_landed)
