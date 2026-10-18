from flask import Blueprint, request, jsonify
from app.services.alternative_service import AlternativeService

alternative_bp = Blueprint("alternatives", __name__)

@alternative_bp.route("/products/<int:product_id>/alternatives", methods=["GET"])
def get_product_alternatives(product_id):
    """
    Retrieve ranked, explainable product alternatives for a specified product.
    Query parameters:
    - min_similarity: float (default 30.0)
    - min_price: float
    - max_price: float
    - brand: string filter
    - sort: 'similarity', 'price_asc', 'price_desc', 'landed_price_asc'
    - page: int (default 1)
    - per_page: int (default 10)
    """
    try:
        min_similarity = float(request.args.get("min_similarity", 30.0))
    except (ValueError, TypeError):
        min_similarity = 30.0

    min_price = None
    if request.args.get("min_price"):
        try:
            min_price = float(request.args.get("min_price"))
        except (ValueError, TypeError):
            return jsonify({
                "success": False,
                "error": {"code": "INVALID_PARAM", "message": "Query parameter 'min_price' must be a valid number."}
            }), 400

    max_price = None
    if request.args.get("max_price"):
        try:
            max_price = float(request.args.get("max_price"))
        except (ValueError, TypeError):
            return jsonify({
                "success": False,
                "error": {"code": "INVALID_PARAM", "message": "Query parameter 'max_price' must be a valid number."}
            }), 400

    brand = request.args.get("brand", "").strip() or None
    sort = request.args.get("sort", "similarity").strip().lower()

    try:
        page = max(1, int(request.args.get("page", 1)))
        per_page = min(max(1, int(request.args.get("per_page", 10))), 50)
    except (ValueError, TypeError):
        page = 1
        per_page = 10

    result = AlternativeService.get_alternatives(
        product_id=product_id,
        min_similarity=min_similarity,
        min_price=min_price,
        max_price=max_price,
        brand=brand,
        sort=sort,
        page=page,
        per_page=per_page
    )

    if "error" in result:
        err_code = result["error"]
        status_code = 404 if err_code == "PRODUCT_NOT_FOUND" else 400
        return jsonify({
            "success": False,
            "error": {"code": err_code, "message": result.get("message")}
        }), status_code

    return jsonify({
        "success": True,
        "data": result
    })

@alternative_bp.route("/products/<int:product_id>/alternatives/compare", methods=["GET"])
def compare_product_alternatives(product_id):
    """
    Side-by-side specification and pricing comparison between source product
    and selected alternative product IDs.
    Query parameter:
    - ids: comma-separated list of product IDs, e.g. ?ids=2,3
    """
    ids_param = request.args.get("ids", "").strip()
    if not ids_param:
        return jsonify({
            "success": False,
            "error": {"code": "MISSING_PARAM", "message": "Query parameter 'ids' with comma-separated IDs is required."}
        }), 400

    try:
        alt_ids = [int(i.strip()) for i in ids_param.split(",") if i.strip()]
    except ValueError:
        return jsonify({
            "success": False,
            "error": {"code": "INVALID_PARAM", "message": "All items in 'ids' must be valid integers."}
        }), 400

    result = AlternativeService.compare_products(
        source_product_id=product_id,
        alternative_ids=alt_ids
    )

    if "error" in result:
        return jsonify({
            "success": False,
            "error": {"code": result["error"], "message": result.get("message")}
        }), 404

    return jsonify({
        "success": True,
        "data": result
    })
