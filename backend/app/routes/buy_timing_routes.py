from flask import Blueprint, request, jsonify
from app.services.buy_timing_service import BuyTimingService

buy_timing_bp = Blueprint("buy_timing", __name__)

@buy_timing_bp.route("/products/<int:product_id>/buy-timing", methods=["GET"])
def get_buy_timing_assessment(product_id: int):
    """
    GET /api/products/<product_id>/buy-timing
    Evaluates historical pricing benchmarks and returns a purchase-timing recommendation.
    Query parameters:
    - days: 30, 60, 90, 180, or 365 (default 30)
    - retailer_id: optional integer filter
    """
    raw_days = request.args.get("days", "30")
    try:
        days = int(raw_days)
    except (ValueError, TypeError):
        return jsonify({
            "success": False,
            "error": {
                "code": "INVALID_TIME_WINDOW",
                "message": "Query parameter 'days' must be an integer (30, 60, 90, 180, or 365)."
            }
        }), 400

    retailer_id = None
    raw_retailer_id = request.args.get("retailer_id")
    if raw_retailer_id:
        try:
            retailer_id = int(raw_retailer_id)
        except (ValueError, TypeError):
            return jsonify({
                "success": False,
                "error": {
                    "code": "INVALID_QUERY_PARAMETER",
                    "message": "Query parameter 'retailer_id' must be an integer."
                }
            }), 400

    result = BuyTimingService.evaluate_buy_timing(
        product_id=product_id,
        days=days,
        retailer_id=retailer_id
    )

    if "error" in result:
        err_code = result["error"]
        status_code = 404 if err_code in ("PRODUCT_NOT_FOUND", "RETAILER_NOT_FOUND") else 400
        return jsonify({
            "success": False,
            "error": {
                "code": err_code,
                "message": result.get("message", "Failed to evaluate purchase timing.")
            }
        }), status_code

    return jsonify({
        "success": True,
        "data": result
    }), 200


@buy_timing_bp.route("/products/<int:product_id>/buy-timing/target-alert", methods=["POST"])
def create_buy_timing_target_alert(product_id: int):
    """
    POST /api/products/<product_id>/buy-timing/target-alert
    Establishes a target-price alert directly using the core alert infrastructure.
    Request body:
    {
        "target_price": float,
        "contact_email": str,
        "retailer_id": Optional[int],
        "user_identifier": Optional[str]
    }
    """
    payload = request.get_json(silent=True) or {}
    if not isinstance(payload, dict):
        return jsonify({
            "success": False,
            "error": {"code": "INVALID_JSON", "message": "Expected JSON object in request body."}
        }), 400

    target_price = payload.get("target_price")
    contact_email = payload.get("contact_email") or payload.get("email")
    retailer_id = payload.get("retailer_id")
    user_identifier = payload.get("user_identifier", "guest_user")

    if target_price is None:
        return jsonify({
            "success": False,
            "error": {"code": "MISSING_FIELD", "message": "Field 'target_price' is required."}
        }), 400

    if not contact_email:
        return jsonify({
            "success": False,
            "error": {"code": "MISSING_FIELD", "message": "Field 'contact_email' is required."}
        }), 400

    result = BuyTimingService.create_target_price_alert(
        product_id=product_id,
        target_price=target_price,
        contact_email=contact_email,
        retailer_id=retailer_id,
        user_identifier=user_identifier
    )

    if "error" in result:
        err_code = result["error"]
        status_code = 404 if err_code in ("PRODUCT_NOT_FOUND", "RETAILER_NOT_FOUND") else 400
        return jsonify({
            "success": False,
            "error": {
                "code": err_code,
                "message": result.get("message", "Failed to create target-price alert.")
            }
        }), status_code

    if not result.get("created"):
        return jsonify({
            "success": False,
            "error": {
                "code": "DUPLICATE_ALERT",
                "message": result.get("message", "An identical active price alert is already configured for this product and target price.")
            }
        }), 400

    alert_data = result.get("alert") or {}
    return jsonify({
        "success": True,
        "data": alert_data,
        "message": result.get("message")
    }), 201
