from flask import Blueprint, request, jsonify
from app.services.honesty_index_service import HonestyIndexService

honesty_bp = Blueprint("honesty", __name__)

@honesty_bp.route("/products/<int:product_id>/honesty", methods=["GET"])
def get_product_honesty(product_id: int):
    """
    Retrieve comprehensive Honesty Index evaluation for a specified product.
    Measures advertised discounts and strike-through reference prices against
    verified historical price observations.
    Query parameters:
    - retailer_id: optional integer to isolate observations for a specific retailer
    - days: evaluation window, restricted to 30, 60, or 90 (default 30)
    """
    days_param = request.args.get("days", 30)
    try:
        days = int(days_param)
        if days not in HonestyIndexService.SUPPORTED_WINDOWS:
            return jsonify({
                "success": False,
                "error": {
                    "code": "INVALID_PARAM",
                    "message": "Query parameter 'days' must be 30, 60, or 90."
                }
            }), 400
    except (ValueError, TypeError):
        return jsonify({
            "success": False,
            "error": {
                "code": "INVALID_PARAM",
                "message": "Query parameter 'days' must be an integer (30, 60, or 90)."
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
                    "code": "INVALID_PARAM",
                    "message": "Query parameter 'retailer_id' must be an integer."
                }
            }), 400

    result = HonestyIndexService.analyze_product_honesty(
        product_id=product_id,
        retailer_id=retailer_id,
        days=days
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

@honesty_bp.route("/products/<int:product_id>/honesty/retailers", methods=["GET"])
def get_product_retailers_honesty(product_id: int):
    """
    Retrieve separate honesty analyses for each retailer currently offering this product.
    Ensures observations and benchmarks are isolated per retailer.
    Query parameters:
    - days: evaluation window (30, 60, or 90; default 30)
    """
    days_param = request.args.get("days", 30)
    try:
        days = int(days_param)
        if days not in HonestyIndexService.SUPPORTED_WINDOWS:
            return jsonify({
                "success": False,
                "error": {
                    "code": "INVALID_PARAM",
                    "message": "Query parameter 'days' must be 30, 60, or 90."
                }
            }), 400
    except (ValueError, TypeError):
        return jsonify({
            "success": False,
            "error": {
                "code": "INVALID_PARAM",
                "message": "Query parameter 'days' must be an integer (30, 60, or 90)."
            }
        }), 400

    result = HonestyIndexService.analyze_retailers_honesty(
        product_id=product_id,
        days=days
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

@honesty_bp.route("/honesty/summary", methods=["GET"])
def get_honesty_summary():
    """
    Retrieve catalog-wide summary metrics for the Honesty Index and discount integrity.
    Aggregates metrics from stored catalog observations without synthetic data.
    """
    summary = HonestyIndexService.get_honesty_summary()
    return jsonify({
        "success": True,
        "data": summary
    })
