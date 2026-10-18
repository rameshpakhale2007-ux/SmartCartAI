from flask import Blueprint, request, jsonify
from app.services.alert_service import AlertService

alert_bp = Blueprint("alerts", __name__)

@alert_bp.route("/alerts", methods=["GET"])
def get_alerts():
    """
    List price alerts for user. Optional filter by status ('active', 'inactive', 'triggered').
    """
    user_id = request.args.get("user_id", "guest_user").strip()
    status_filter = request.args.get("status", "").strip().lower() or None

    alerts = AlertService.list_alerts(user_identifier=user_id, status=status_filter)
    return jsonify({
        "success": True,
        "data": {
            "alerts": alerts,
            "total_count": len(alerts),
            "active_count": sum(1 for a in alerts if a["is_active"]),
            "triggered_count": sum(1 for a in alerts if a["trigger_status"] == "triggered")
        }
    })

@alert_bp.route("/alerts", methods=["POST"])
def create_alert():
    """
    Create a new target-price alert.
    JSON body:
    {
        "product_id": int,
        "target_price": float,
        "contact_email": str,
        "retailer_id": Optional[int],
        "user_identifier": Optional[str]
    }
    """
    data = request.get_json(silent=True)
    if not data or not isinstance(data, dict):
        return jsonify({
            "success": False,
            "error": {"code": "INVALID_JSON", "message": "Expected valid JSON request body."}
        }), 400

    product_id = data.get("product_id")
    target_price = data.get("target_price")
    contact_email = data.get("contact_email")
    retailer_id = data.get("retailer_id")
    user_identifier = data.get("user_identifier", "guest_user")

    if product_id is None:
        return jsonify({
            "success": False,
            "error": {"code": "MISSING_FIELD", "message": "Field 'product_id' is required."}
        }), 400

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

    result = AlertService.create_alert(
        product_id=product_id,
        target_price=target_price,
        contact_email=contact_email,
        retailer_id=retailer_id,
        user_identifier=user_identifier
    )

    if "error" in result:
        err_code = result["error"]
        status_code = 404 if "NOT_FOUND" in err_code else 400
        return jsonify({
            "success": False,
            "error": {"code": err_code, "message": result.get("message")}
        }), status_code

    status_code = 201 if result.get("created") else 200
    return jsonify({
        "success": True,
        "data": result["alert"],
        "message": result.get("message")
    }), status_code

@alert_bp.route("/alerts/<int:alert_id>", methods=["PATCH"])
def update_alert(alert_id):
    """
    Update alert configuration (e.g., target price or active status).
    Enforces user ownership when user_id is provided.
    """
    data = request.get_json(silent=True) or {}
    is_active = data.get("is_active")
    target_price = data.get("target_price")
    user_id = request.headers.get("X-User-Id") or data.get("user_identifier") or request.args.get("user_id")

    result = AlertService.update_alert(
        alert_id=alert_id,
        is_active=is_active,
        target_price=target_price,
        user_identifier=user_id
    )

    if "error" in result:
        err_code = result["error"]
        status_code = 404 if err_code == "ALERT_NOT_FOUND" else (403 if err_code == "UNAUTHORIZED" else 400)
        return jsonify({
            "success": False,
            "error": {"code": err_code, "message": result.get("message")}
        }), status_code

    return jsonify({
        "success": True,
        "data": result["alert"],
        "message": result.get("message")
    })

@alert_bp.route("/alerts/<int:alert_id>", methods=["DELETE"])
def delete_alert(alert_id):
    """
    Delete an existing price alert with ownership verification.
    """
    user_id = request.headers.get("X-User-Id") or request.args.get("user_id")
    result = AlertService.delete_alert(alert_id=alert_id, user_identifier=user_id)
    if "error" in result:
        err_code = result["error"]
        status_code = 404 if err_code == "ALERT_NOT_FOUND" else 403
        return jsonify({
            "success": False,
            "error": {"code": err_code, "message": result.get("message")}
        }), status_code

    return jsonify({
        "success": True,
        "message": result.get("message")
    })

@alert_bp.route("/alerts/check", methods=["POST"])
def check_all_alerts():
    """
    Trigger alert evaluation. Optionally scoped to a specific user via user_id query/header.
    """
    user_id = request.headers.get("X-User-Id") or request.args.get("user_id")
    summary = AlertService.evaluate_alerts(user_identifier=user_id)
    return jsonify({
        "success": True,
        "data": summary,
        "message": f"Evaluated {summary['evaluated_count']} alert(s); {summary['triggered_count']} triggered."
    })

@alert_bp.route("/alerts/<int:alert_id>/check", methods=["POST"])
def check_single_alert(alert_id):
    """
    Trigger manual check for a specific alert.
    """
    user_id = request.headers.get("X-User-Id") or request.args.get("user_id")
    summary = AlertService.evaluate_alerts(alert_id=alert_id, user_identifier=user_id)
    if not summary.get("results"):
        return jsonify({
            "success": False,
            "error": {"code": "ALERT_NOT_FOUND", "message": f"Active alert #{alert_id} not found."}
        }), 404

    return jsonify({
        "success": True,
        "data": summary["results"][0],
        "message": "Alert checked successfully."
    })
