import json
import io
import pytest
from datetime import datetime, timedelta
from app.extensions import db
from app.models import Product, Review
from app.services.review_integrity_service import ReviewIntegrityService

@pytest.fixture
def review_test_product(app):
    """Fixture to create and clean up a dedicated product for Review Integrity tests."""
    with app.app_context():
        p = Product(
            sku="REV-TEST-01",
            name="Acoustic Pro Wireless Earbuds",
            brand="AudioMax",
            category="Audio",
            base_mrp=9999.0,
            currency="INR",
            source_type="demo"
        )
        db.session.add(p)
        db.session.commit()
        prod_id = p.id
        yield prod_id

        # Teardown
        Review.query.filter_by(product_id=prod_id).delete()
        prod = db.session.get(Product, prod_id)
        if prod:
            db.session.delete(prod)
        db.session.commit()


# 1. Empty input handling
def test_empty_review_input():
    res = ReviewIntegrityService.evaluate_reviews_corpus([], data_source="test")
    assert res["usable_reviews_count"] == 0
    assert res["integrity_score"] is None
    assert res["classification"] == "INSUFFICIENT_EVIDENCE"
    assert "minimum of 5" in res["summary"]


# 2. Fewer than five reviews produces INSUFFICIENT_EVIDENCE
def test_fewer_than_five_reviews():
    sample = [
        {"content": "Great sound quality and battery life.", "rating": 5.0},
        {"content": "Good product for daily office commute.", "rating": 4.0},
        {"content": "Decent noise cancellation overall.", "rating": 4.0},
    ]
    res = ReviewIntegrityService.evaluate_reviews_corpus(sample, data_source="test")
    assert res["usable_reviews_count"] == 3
    assert res["integrity_score"] is None
    assert res["classification"] == "INSUFFICIENT_EVIDENCE"
    assert res["confidence"] == "INSUFFICIENT"
    assert any("too small" in lim.lower() for lim in res["limitations"])


# 3. Exactly five usable reviews produces valid score and metrics
def test_exactly_five_usable_reviews():
    sample = [
        {"content": "Great sound and battery life.", "rating": 5.0, "review_date": "2026-09-01T10:00:00Z"},
        {"content": "Good product for commute.", "rating": 4.0, "review_date": "2026-09-02T10:00:00Z"},
        {"content": "Decent audio performance overall.", "rating": 4.0, "review_date": "2026-09-05T10:00:00Z"},
        {"content": "Comfortable fit in the ears.", "rating": 4.0, "review_date": "2026-09-10T10:00:00Z"},
        {"content": "Solid build quality and finish.", "rating": 5.0, "review_date": "2026-09-15T10:00:00Z"},
    ]
    res = ReviewIntegrityService.evaluate_reviews_corpus(sample, data_source="test")
    assert res["usable_reviews_count"] == 5
    assert res["integrity_score"] is not None
    assert 0.0 <= res["integrity_score"] <= 100.0
    assert res["classification"] in ("HIGH_PATTERN_CONSISTENCY", "MODERATE_PATTERN_CONSISTENCY", "LOW_PATTERN_CONSISTENCY")
    assert res["metric_scores"] is not None


# 4. Duplicate review detection identifies template groups
def test_duplicate_review_detection():
    identical_text = "Amazing deal best phone ever fast delivery and excellent packaging highly recommended to everyone."
    sample = [
        {"id": 1, "content": identical_text, "rating": 5.0},
        {"id": 2, "content": identical_text, "rating": 5.0},
        {"id": 3, "content": "The battery life is really good and display is crisp.", "rating": 4.0},
        {"id": 4, "content": "Sound is clear and comfortable for long meetings.", "rating": 4.0},
        {"id": 5, "content": "Fast bluetooth connection with my laptop.", "rating": 5.0},
    ]
    res = ReviewIntegrityService.evaluate_reviews_corpus(sample, similarity_threshold=0.85)
    dup_analysis = res["duplicate_analysis"]
    assert dup_analysis["flagged_reviews_count"] >= 2
    assert len(dup_analysis["duplicate_groups"]) >= 1
    group = dup_analysis["duplicate_groups"][0]
    assert 1 in group["review_ids"] and 2 in group["review_ids"]
    assert dup_analysis["text_originality_score"] < 100.0


# 5. Non-duplicate reviews yield high originality score
def test_nonduplicate_reviews_high_originality():
    sample = [
        {"content": "Dynamic island and bright OLED screen are remarkable upgrades.", "rating": 5.0},
        {"content": "Camera captures beautiful low-light family portraits outdoors.", "rating": 5.0},
        {"content": "Fast USB-C charging speeds make daily use seamless.", "rating": 4.0},
        {"content": "A bit heavy in the pocket compared to previous generation.", "rating": 3.0},
        {"content": "Premium aerospace titanium frame feels luxury in hand.", "rating": 5.0},
    ]
    res = ReviewIntegrityService.evaluate_reviews_corpus(sample, similarity_threshold=0.85)
    assert res["duplicate_analysis"]["flagged_reviews_count"] == 0
    assert len(res["duplicate_analysis"]["duplicate_groups"]) == 0
    assert res["duplicate_analysis"]["text_originality_score"] == 100.0


# 6. Rating-sentiment divergence detection
def test_rating_sentiment_divergence():
    sample = [
        # Divergent 1: 5 stars with terrible complaint
        {"id": 101, "content": "Terrible horrible broken product waste of money completely defective garbage.", "rating": 5.0},
        # Divergent 2: 1 star with glowing praise
        {"id": 102, "content": "Excellent outstanding superb sound quality love this wonderful purchase.", "rating": 1.0},
        # Normal reviews
        {"id": 103, "content": "Great earbuds, comfortable and reliable battery.", "rating": 5.0},
        {"id": 104, "content": "Sound is good and pairing is very fast.", "rating": 4.0},
        {"id": 105, "content": "Solid everyday headphones with clear microphone.", "rating": 4.0},
    ]
    res = ReviewIntegrityService.evaluate_reviews_corpus(sample)
    sent_analysis = res["sentiment_analysis"]
    assert sent_analysis["divergent_count"] >= 2
    types = [d["divergence_type"] for d in sent_analysis["divergent_reviews"]]
    assert "POSITIVE_RATING_NEGATIVE_TEXT" in types
    assert "NEGATIVE_RATING_POSITIVE_TEXT" in types
    assert sent_analysis["sentiment_alignment_score"] < 100.0


# 7. Neutral sentiment does not flag false-positive divergence
def test_neutral_sentiment_does_not_flag_divergence():
    sample = [
        {"content": "The package arrived on Tuesday afternoon by courier.", "rating": 4.0},
        {"content": "Includes three pairs of silicone ear tips in the box.", "rating": 3.0},
        {"content": "Cable length is approximately one meter in measurement.", "rating": 3.0},
        {"content": "Black color matte plastic finish casing.", "rating": 4.0},
        {"content": "Weight is forty grams with charging case.", "rating": 3.0},
    ]
    res = ReviewIntegrityService.evaluate_reviews_corpus(sample)
    assert res["sentiment_analysis"]["divergent_count"] == 0
    assert res["sentiment_analysis"]["sentiment_alignment_score"] == 100.0


# 8. Missing review text is filtered safely
def test_missing_or_short_review_text_filtered():
    sample = [
        {"content": "Hi", "rating": 5.0},  # < 3 chars, unusable
        {"content": "", "rating": 4.0},    # empty, unusable
        {"content": None, "rating": 5.0},  # None, unusable
        {"content": "Decent earphones with clear audio.", "rating": 4.0},
        {"content": "Reliable battery life for daily work.", "rating": 4.0},
    ]
    res = ReviewIntegrityService.evaluate_reviews_corpus(sample)
    # Only 2 usable reviews
    assert res["usable_reviews_count"] == 2
    assert res["integrity_score"] is None
    assert res["classification"] == "INSUFFICIENT_EVIDENCE"


# 9. Missing rating is handled gracefully without crash
def test_missing_rating_handled_gracefully():
    sample = [
        {"content": "Good sound quality and battery life.", "rating": None},
        {"content": "Fast delivery and nice packaging.", "rating": None},
        {"content": "Very clear audio on zoom calls.", "rating": 5.0},
        {"content": "Durable cable and smooth controls.", "rating": 4.0},
        {"content": "Comfortable fit in ears during workouts.", "rating": 4.0},
    ]
    res = ReviewIntegrityService.evaluate_reviews_corpus(sample)
    assert res["usable_reviews_count"] == 5
    assert res["integrity_score"] is not None


# 10. Missing dates marks temporal analysis unavailable and adjusts scoring weights
def test_missing_dates_excludes_temporal_metric_and_adjusts_weights():
    sample = [
        {"content": "Good audio performance and strong bass.", "rating": 5.0, "review_date": None},
        {"content": "Nice design and lightweight body.", "rating": 4.0, "review_date": None},
        {"content": "Battery lasts for several days.", "rating": 5.0, "review_date": None},
        {"content": "Ear tips seal well and isolate noise.", "rating": 4.0, "review_date": None},
        {"content": "Microphone is loud and clear.", "rating": 4.0, "review_date": None},
    ]
    res = ReviewIntegrityService.evaluate_reviews_corpus(sample)
    assert res["temporal_analysis"]["temporal_analysis_available"] is False
    assert any("temporal_dispersion" in em for em in res["excluded_metrics"])
    # Weights reallocated across available metrics
    assert "temporal_dispersion" not in res["weights_applied"]
    assert res["weights_applied"]["text_originality"] == 0.55
    assert res["weights_applied"]["sentiment_alignment"] == 0.45


# 11. Insufficient temporal evidence (< 5 dated reviews) handled with explanation
def test_insufficient_temporal_evidence():
    sample = [
        {"content": "Review number one with valid text.", "rating": 5.0, "review_date": "2026-09-01"},
        {"content": "Review number two with valid text.", "rating": 4.0, "review_date": "2026-09-02"},
        {"content": "Review number three with valid text.", "rating": 5.0, "review_date": None},
        {"content": "Review number four with valid text.", "rating": 4.0, "review_date": None},
        {"content": "Review number five with valid text.", "rating": 4.0, "review_date": None},
    ]
    res = ReviewIntegrityService.evaluate_reviews_corpus(sample)
    temp = res["temporal_analysis"]
    assert temp["temporal_analysis_available"] is False
    assert "Fewer than 5 dated reviews" in temp["reason"]


# 12. Verified, unverified, and unknown statuses quantified accurately
def test_verified_purchase_distribution_quantified():
    sample = [
        {"content": "Review one text.", "rating": 5.0, "verified_purchase": True},
        {"content": "Review two text.", "rating": 4.0, "verified_purchase": True},
        {"content": "Review three text.", "rating": 4.0, "verified_purchase": False},
        {"content": "Review four text.", "rating": 3.0, "verified_purchase": None},
        {"content": "Review five text.", "rating": 5.0, "verified_purchase": True},
    ]
    res = ReviewIntegrityService.evaluate_reviews_corpus(sample)
    v_dist = res["verified_distribution"]
    assert v_dist["verified_count"] == 3
    assert v_dist["unverified_count"] == 1
    assert v_dist["unknown_count"] == 1
    assert v_dist["verified_proportion_pct"] == 60.0


# 13. HTML tags safely stripped from review text
def test_html_tags_safely_normalized():
    text_with_html = "<script>alert('xss')</script><b>Great</b> product with <i>fast</i> shipping &amp; durability!"
    normalized = ReviewIntegrityService.normalize_text(text_with_html)
    assert "<script>" not in normalized
    assert "<b>" not in normalized
    assert "Great product with fast shipping & durability!" in normalized


# 14. Documented score bounds and formula consistency
def test_score_bounds_and_formula():
    sample = [
        {"content": "High quality audio, excellent sound and clear microphone.", "rating": 5.0, "review_date": "2026-09-01"},
        {"content": "Comfortable to wear all day during travel.", "rating": 5.0, "review_date": "2026-09-05"},
        {"content": "Long battery life and fast USB charging.", "rating": 4.0, "review_date": "2026-09-10"},
        {"content": "Durable protective case with magnetic latch.", "rating": 4.0, "review_date": "2026-09-15"},
        {"content": "Easy bluetooth connection with multiple devices.", "rating": 5.0, "review_date": "2026-09-20"},
    ]
    res = ReviewIntegrityService.evaluate_reviews_corpus(sample)
    score = res["integrity_score"]
    assert isinstance(score, float)
    assert 0.0 <= score <= 100.0
    assert sum(res["weights_applied"].values()) == pytest.approx(1.0, 0.01)


# 15. GET /api/products/<id>/reviews/integrity returns 200 with schema
def test_api_product_review_integrity(client, review_test_product):
    with client.application.app_context():
        # Seed 6 reviews for test product
        for i in range(6):
            db.session.add(Review(
                product_id=review_test_product,
                author=f"Tester_{i}",
                rating=4.0 + (i % 2),
                title="Good product",
                content=f"Review content number {i} with distinct description of the audio product.",
                review_date=datetime.utcnow() - timedelta(days=20 - i * 3),
                verified_purchase=(i % 2 == 0),
                source_type="demo"
            ))
        db.session.commit()

    res = client.get(f"/api/products/{review_test_product}/reviews/integrity")
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data["success"] is True
    payload = data["data"]

    required_keys = [
        "product_info", "data_source", "total_reviews_count",
        "usable_reviews_count", "integrity_score", "classification",
        "confidence", "summary", "duplicate_analysis",
        "sentiment_analysis", "temporal_analysis", "verified_distribution",
        "limitations", "evaluated_at"
    ]
    for k in required_keys:
        assert k in payload, f"Missing key '{k}' in response"


# 16. GET /api/products/<id>/reviews/integrity returns 404 for missing product
def test_api_review_integrity_missing_product_404(client):
    res = client.get("/api/products/999999/reviews/integrity")
    assert res.status_code == 404
    data = json.loads(res.data)
    assert data["success"] is False
    assert data["error"]["code"] == "PRODUCT_NOT_FOUND"


# 17. GET /api/products/<id>/reviews pagination and filtering
def test_api_paginated_product_reviews(client, review_test_product):
    with client.application.app_context():
        for i in range(12):
            db.session.add(Review(
                product_id=review_test_product,
                author=f"Shopper_{i}",
                rating=5.0 if i < 6 else 3.0,
                content=f"Detailed review text number {i} for earbuds test.",
                verified_purchase=(i < 6)
            ))
        db.session.commit()

    # Page 1, limit 5
    res = client.get(f"/api/products/{review_test_product}/reviews?page=1&per_page=5")
    assert res.status_code == 200
    data = json.loads(res.data)["data"]
    assert len(data["items"]) == 5
    assert data["total_count"] == 12
    assert data["total_pages"] == 3

    # Filter verified only
    res_v = client.get(f"/api/products/{review_test_product}/reviews?verified_only=true")
    assert res_v.status_code == 200
    data_v = json.loads(res_v.data)["data"]
    assert data_v["total_count"] == 6


# 18. POST /api/reviews/analyze ad-hoc JSON payload
def test_api_adhoc_review_analysis_json(client):
    payload = {
        "data_source": "custom_audit",
        "similarity_threshold": 0.85,
        "reviews": [
            {"content": "Sound is very clean with good active noise cancellation.", "rating": 5.0},
            {"content": "Battery holds charge for 30 hours continuously.", "rating": 5.0},
            {"content": "Fast bluetooth pairing and comfortable lightweight fit.", "rating": 4.0},
            {"content": "Microphone sounds loud and clear during meetings.", "rating": 4.0},
            {"content": "Smooth volume controls and sturdy matte finish.", "rating": 5.0},
        ]
    }
    res = client.post("/api/reviews/analyze", json=payload)
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data["success"] is True
    assert data["data"]["usable_reviews_count"] == 5
    assert data["data"]["integrity_score"] is not None


# 19. POST /api/reviews/analyze with CSV file upload
def test_api_adhoc_review_analysis_csv_upload(client):
    csv_content = (
        "author,rating,content,verified\n"
        "User1,5,Amazing wireless headphones with crystal sound,true\n"
        "User2,5,Excellent battery performance and fast charging,true\n"
        "User3,4,Comfortable ear cushions for long music sessions,true\n"
        "User4,4,Clear microphone for calls and office meetings,false\n"
        "User5,5,Great build quality and premium protective case,true\n"
    )
    data = {
        "file": (io.BytesIO(csv_content.encode("utf-8")), "sample_reviews.csv")
    }
    res = client.post("/api/reviews/analyze", data=data, content_type="multipart/form-data")
    assert res.status_code == 200
    resp_data = json.loads(res.data)
    assert resp_data["success"] is True
    assert resp_data["data"]["usable_reviews_count"] == 5
    assert resp_data["data"]["integrity_score"] is not None


# 20. POST /api/reviews/analyze rejects invalid payloads
def test_api_adhoc_review_analysis_invalid_payload_rejected(client):
    # Invalid JSON structure
    res1 = client.post("/api/reviews/analyze", data="not json", content_type="application/json")
    assert res1.status_code == 400

    # Reviews is not a list
    res2 = client.post("/api/reviews/analyze", json={"reviews": "not a list"})
    assert res2.status_code == 400
    data2 = json.loads(res2.data)
    assert data2["error"]["code"] == "INVALID_REVIEWS_LIST"


# 21. Temporal dispersion evaluates sparse histories meaningfully without hardcoded score floors
def test_temporal_sparse_baseline_and_no_artificial_floor():
    # Scenario A: All 5 reviews on a single calendar day -> 0.0 dispersion score (no artificial 40.0 floor)
    sample_same_day = [
        {"content": f"Review number {i} text for earphones test.", "rating": 5.0, "review_date": "2026-09-01T10:00:00Z"}
        for i in range(5)
    ]
    res_a = ReviewIntegrityService.evaluate_reviews_corpus(sample_same_day)
    assert res_a["temporal_analysis"]["temporal_analysis_available"] is True
    assert res_a["temporal_analysis"]["has_burst_detected"] is True
    assert res_a["temporal_analysis"]["temporal_dispersion_score"] == 0.0

    # Scenario B: 4 out of 5 reviews on 1 day across a 2-day span -> burst correctly identified on sparse corpus
    sample_sparse = [
        {"content": f"Burst review {i} text.", "rating": 5.0, "review_date": "2026-09-01T10:00:00Z"}
        for i in range(4)
    ] + [
        {"content": "Single review on separate day text.", "rating": 4.0, "review_date": "2026-09-02T10:00:00Z"}
    ]
    res_b = ReviewIntegrityService.evaluate_reviews_corpus(sample_sparse)
    assert res_b["temporal_analysis"]["has_burst_detected"] is True
    # 4 out of 5 reviews in burst = 80% concentration -> dispersion score = 20.0 (no artificial 30.0 floor)
    assert res_b["temporal_analysis"]["temporal_dispersion_score"] == 20.0

