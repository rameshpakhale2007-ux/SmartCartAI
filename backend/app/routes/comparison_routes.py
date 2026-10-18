from flask import Blueprint, request, jsonify
from app.models import Product
from app.services.price_comparison_service import PriceComparisonService

comparison_bp = Blueprint("comparison", __name__)

@comparison_bp.route("/comparison", methods=["GET"])
def get_comparison():
    """
    Comparison endpoint supporting /api/comparison?product_id=<id>&sort=<sort_by>.
    """
    product_id_raw = request.args.get("product_id")
    if not product_id_raw:
        return jsonify({
            "success": False,
            "error": {"code": "MISSING_PRODUCT_ID", "message": "Query parameter 'product_id' is required."}
        }), 400

    try:
        product_id = int(product_id_raw)
    except (ValueError, TypeError):
        return jsonify({
            "success": False,
            "error": {"code": "INVALID_PRODUCT_ID", "message": "'product_id' must be an integer."}
        }), 400

    product = Product.query.get(product_id)
    if not product:
        return jsonify({
            "success": False,
            "error": {"code": "PRODUCT_NOT_FOUND", "message": f"Product #{product_id} was not found."}
        }), 404

    sort_by = request.args.get("sort", "estimated_total").strip().lower()
    comparison_data = PriceComparisonService.compare_offers(product_id, sort_by=sort_by)

    return jsonify({
        "success": True,
        "data": comparison_data
    })
