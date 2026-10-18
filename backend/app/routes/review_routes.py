import io
import csv
import json
from flask import Blueprint, request, jsonify
from app.models import Product, Review
from app.services.review_integrity_service import ReviewIntegrityService
from app.extensions import db

review_bp = Blueprint("review", __name__)

MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB
MAX_UPLOAD_REVIEWS = 1000

@review_bp.route("/products/<int:product_id>/reviews/integrity", methods=["GET"])
def get_product_review_integrity(product_id: int):
    """
    GET /api/products/<product_id>/reviews/integrity
    Evaluates pattern consistency and integrity indicators for product reviews.
    Query parameters:
    - similarity_threshold: float (0.5 to 0.99, default 0.85)
    """
    raw_threshold = request.args.get("similarity_threshold", "0.85")
    try:
        threshold = float(raw_threshold)
        if not (0.5 <= threshold <= 0.99):
            threshold = ReviewIntegrityService.DEFAULT_SIMILARITY_THRESHOLD
    except (ValueError, TypeError):
        threshold = ReviewIntegrityService.DEFAULT_SIMILARITY_THRESHOLD

    result = ReviewIntegrityService.evaluate_product_reviews(
        product_id=product_id,
        similarity_threshold=threshold
    )

    if "error" in result:
        err_code = result["error"]
        status_code = 404 if err_code == "PRODUCT_NOT_FOUND" else 400
        return jsonify({
            "success": False,
            "error": {
                "code": err_code,
                "message": result.get("message", "Failed to analyze review integrity.")
            }
        }), status_code

    return jsonify({
        "success": True,
        "data": result
    }), 200


@review_bp.route("/products/<int:product_id>/reviews", methods=["GET"])
def get_product_reviews_paginated(product_id: int):
    """
    GET /api/products/<product_id>/reviews
    Returns paginated reviews with optional rating and verified purchase filters.
    Query parameters:
    - page: int (default 1)
    - per_page: int (default 10, max 100)
    - rating: int (1-5)
    - verified_only: bool (true/false)
    - sort: newest, highest_rating, lowest_rating
    """
    product = db.session.get(Product, product_id)
    if not product:
        return jsonify({
            "success": False,
            "error": {
                "code": "PRODUCT_NOT_FOUND",
                "message": f"Product #{product_id} was not found."
            }
        }), 404

    try:
        page = max(1, int(request.args.get("page", 1)))
        per_page = min(100, max(1, int(request.args.get("per_page", 10))))
    except (ValueError, TypeError):
        return jsonify({
            "success": False,
            "error": {
                "code": "INVALID_PAGINATION",
                "message": "Page and per_page must be positive integers."
            }
        }), 400

    query = Review.query.filter_by(product_id=product_id)

    raw_rating = request.args.get("rating")
    if raw_rating:
        try:
            int_rating = int(raw_rating)
            if 1 <= int_rating <= 5:
                query = query.filter(Review.rating >= int_rating, Review.rating < int_rating + 1)
        except (ValueError, TypeError):
            pass

    verified_only = request.args.get("verified_only", "").lower() in ("true", "1", "yes")
    if verified_only:
        query = query.filter_by(verified_purchase=True)

    sort_order = request.args.get("sort", "newest")
    if sort_order == "highest_rating":
        query = query.order_by(Review.rating.desc(), Review.id.desc())
    elif sort_order == "lowest_rating":
        query = query.order_by(Review.rating.asc(), Review.id.desc())
    else:
        query = query.order_by(Review.review_date.desc(), Review.id.desc())

    total_count = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    total_pages = max(1, (total_count + per_page - 1) // per_page)

    return jsonify({
        "success": True,
        "data": {
            "product_id": product_id,
            "items": [r.to_dict() for r in items],
            "total_count": total_count,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages
        }
    }), 200


@review_bp.route("/reviews/analyze", methods=["POST"])
def analyze_adhoc_reviews():
    """
    POST /api/reviews/analyze
    Analyzes an ad-hoc review corpus provided via JSON or uploaded CSV file.
    Accepts:
    1. JSON body: { "reviews": [...], "data_source": "user_uploaded", "similarity_threshold": 0.85 }
    2. Multipart form data with file (.csv or .json)
    """
    data_source = "user_uploaded"
    similarity_threshold = ReviewIntegrityService.DEFAULT_SIMILARITY_THRESHOLD
    reviews_list = []

    # Check if multipart file upload
    if request.files and "file" in request.files:
        uploaded_file = request.files["file"]
        if not uploaded_file.filename:
            return jsonify({
                "success": False,
                "error": {"code": "EMPTY_FILE", "message": "Uploaded file is empty or missing filename."}
            }), 400

        filename = uploaded_file.filename.lower()
        if not (filename.endswith(".csv") or filename.endswith(".json")):
            return jsonify({
                "success": False,
                "error": {"code": "INVALID_FILE_TYPE", "message": "Only .csv and .json files are supported."}
            }), 400

        file_bytes = uploaded_file.read()
        if len(file_bytes) > MAX_FILE_SIZE_BYTES:
            return jsonify({
                "success": False,
                "error": {
                    "code": "FILE_TOO_LARGE",
                    "message": f"File exceeds maximum allowed size of {MAX_FILE_SIZE_BYTES // (1024*1024)} MB."
                }
            }), 400

        data_source = f"uploaded_file:{uploaded_file.filename}"

        if filename.endswith(".json"):
            try:
                decoded = file_bytes.decode("utf-8")
                parsed = json.loads(decoded)
                if isinstance(parsed, list):
                    reviews_list = parsed
                elif isinstance(parsed, dict) and "reviews" in parsed:
                    reviews_list = parsed["reviews"]
                else:
                    return jsonify({
                        "success": False,
                        "error": {"code": "INVALID_JSON_STRUCTURE", "message": "Expected JSON array of review objects."}
                    }), 400
            except Exception as e:
                return jsonify({
                    "success": False,
                    "error": {"code": "MALFORMED_JSON", "message": f"Failed to parse JSON file: {str(e)}"}
                }), 400
        else:
            # Parse CSV
            try:
                decoded = file_bytes.decode("utf-8-sig", errors="replace")
                reader = csv.DictReader(io.StringIO(decoded))
                for row in reader:
                    # Support multiple common column name aliases
                    content = (
                        row.get("content") or row.get("review_text") or row.get("text") or
                        row.get("Review") or row.get("comment") or row.get("body") or ""
                    )
                    rating_val = row.get("rating") or row.get("Rating") or row.get("score") or row.get("stars")
                    author_val = row.get("author") or row.get("Author") or row.get("user") or "Anonymous"
                    title_val = row.get("title") or row.get("Title") or ""
                    date_val = row.get("date") or row.get("review_date") or row.get("Date")
                    verified_val = row.get("verified_purchase") or row.get("verified") or row.get("Verified")

                    is_verified = None
                    if verified_val is not None:
                        val_str = str(verified_val).lower().strip()
                        if val_str in ("true", "1", "yes", "y"):
                            is_verified = True
                        elif val_str in ("false", "0", "no", "n"):
                            is_verified = False

                    reviews_list.append({
                        "content": content,
                        "rating": rating_val,
                        "author": author_val,
                        "title": title_val,
                        "review_date": date_val,
                        "verified_purchase": is_verified,
                        "source_type": "user_uploaded"
                    })
            except Exception as e:
                return jsonify({
                    "success": False,
                    "error": {"code": "MALFORMED_CSV", "message": f"Failed to parse CSV file: {str(e)}"}
                }), 400

    else:
        # JSON payload parsing
        if request.is_json:
            try:
                payload = request.get_json(silent=False)
            except Exception:
                return jsonify({
                    "success": False,
                    "error": {"code": "MALFORMED_JSON", "message": "Failed to parse JSON request body."}
                }), 400

            if payload is None or not isinstance(payload, dict):
                return jsonify({
                    "success": False,
                    "error": {"code": "INVALID_JSON", "message": "Expected JSON object in request body."}
                }), 400
        else:
            raw_data = request.get_data(as_text=True).strip()
            if raw_data:
                try:
                    payload = json.loads(raw_data)
                    if not isinstance(payload, dict):
                        return jsonify({
                            "success": False,
                            "error": {"code": "INVALID_JSON", "message": "Expected JSON object in request body."}
                        }), 400
                except Exception:
                    return jsonify({
                        "success": False,
                        "error": {"code": "MALFORMED_JSON", "message": "Failed to parse JSON request body."}
                    }), 400
            else:
                return jsonify({
                    "success": False,
                    "error": {"code": "EMPTY_PAYLOAD", "message": "Request payload is empty."}
                }), 400

        reviews_list = payload.get("reviews", [])
        data_source = payload.get("data_source", "user_uploaded")
        if "similarity_threshold" in payload:
            try:
                threshold_val = float(payload["similarity_threshold"])
                if 0.5 <= threshold_val <= 0.99:
                    similarity_threshold = threshold_val
            except (ValueError, TypeError):
                pass

    if not isinstance(reviews_list, list):
        return jsonify({
            "success": False,
            "error": {"code": "INVALID_REVIEWS_LIST", "message": "Field 'reviews' must be an array of review objects."}
        }), 400

    if len(reviews_list) > MAX_UPLOAD_REVIEWS:
        return jsonify({
            "success": False,
            "error": {
                "code": "TOO_MANY_REVIEWS",
                "message": f"Review count ({len(reviews_list)}) exceeds maximum allowable limit of {MAX_UPLOAD_REVIEWS} records."
            }
        }), 400

    result = ReviewIntegrityService.evaluate_reviews_corpus(
        raw_reviews=reviews_list,
        data_source=data_source,
        similarity_threshold=similarity_threshold
    )

    return jsonify({
        "success": True,
        "data": result
    }), 200
