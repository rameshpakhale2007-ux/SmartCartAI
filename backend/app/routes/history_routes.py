from flask import Blueprint, request, jsonify
from app.services.historical_price_service import HistoricalPriceService

history_bp = Blueprint("history", __name__)

@history_bp.route("/products/<int:product_id>/history", methods=["GET"])
def get_product_price_history(product_id):
    """
    Retrieve historical price observations and statistical trends for a product.
    Query parameters:
    - days: 30, 60, or 90 (default 30)
    - retailer_id: optional integer filter
    """
    days_param = request.args.get("days", 30)
    try:
        days = int(days_param)
    except (ValueError, TypeError):
        return jsonify({
            "success": False,
            "error": {
                "code": "INVALID_QUERY_PARAMETER",
                "message": "Query parameter 'days' must be an integer (30, 60, 90, 180, or 365)."
            }
        }), 400

    retailer_id = None
    if request.args.get("retailer_id"):
        try:
            retailer_id = int(request.args.get("retailer_id"))
        except (ValueError, TypeError):
            return jsonify({
                "success": False,
                "error": {
                    "code": "INVALID_QUERY_PARAMETER",
                    "message": "Query parameter 'retailer_id' must be an integer."
                }
            }), 400

    result = HistoricalPriceService.get_price_history(
        product_id=product_id,
        days=days,
        retailer_id=retailer_id
    )

    if "error" in result:
        err_code = result["error"]
        status_code = 404 if err_code == "PRODUCT_NOT_FOUND" else 400
        return jsonify({
            "success": False,
            "error": {
                "code": err_code,
                "message": result.get("message", "Failed to retrieve historical prices.")
            }
        }), status_code

    return jsonify({
        "success": True,
        "data": result
    })
