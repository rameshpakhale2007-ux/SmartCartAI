from flask import Blueprint, request, jsonify
from app.services.tco_service import TCOService
from app.services.resale_forecast_service import ResaleForecastService

tco_bp = Blueprint("tco", __name__)

@tco_bp.route("/tco/calculate", methods=["POST"])
def calculate_tco():
    """
    POST /api/tco/calculate
    Computes gross and net Total Cost of Ownership over user-selected ownership horizon.
    """
    payload = request.get_json() or {}
    result = TCOService.calculate_tco(payload)

    if "error" in result:
        err_code = result.get("error")
        status_code = 404 if err_code == "PRODUCT_NOT_FOUND" else 400
        return jsonify({
            "success": False,
            "error": {
                "code": err_code,
                "message": result.get("message")
            }
        }), status_code

    return jsonify({
        "success": True,
        "data": result
    }), 200


@tco_bp.route("/products/<int:product_id>/resale-forecast", methods=["GET"])
def get_resale_forecast(product_id: int):
    """
    GET /api/products/<product_id>/resale-forecast
    Forecasts future resale value and compound depreciation at selected horizon.
    """
    raw_months = request.args.get("months", "36")
    try:
        months = int(raw_months)
    except ValueError:
        return jsonify({
            "success": False,
            "error": {
                "code": "INVALID_HORIZON",
                "message": "Ownership horizon (months) must be an integer."
            }
        }), 400

    condition = request.args.get("condition", "good")
    scenario = request.args.get("scenario", "expected")

    raw_annual_rate = request.args.get("annual_rate")
    custom_annual_rate = None
    if raw_annual_rate is not None:
        try:
            custom_annual_rate = float(raw_annual_rate)
        except ValueError:
            return jsonify({
                "success": False,
                "error": {
                    "code": "INVALID_DEPRECIATION_RATE",
                    "message": "Annual depreciation rate must be a valid numeric decimal between 0 and 1."
                }
            }), 400

    persist = request.args.get("persist", "false").lower() in ("true", "1")

    result = ResaleForecastService.get_resale_forecast(
        product_id=product_id,
        months=months,
        condition=condition,
        scenario=scenario,
        custom_annual_rate=custom_annual_rate,
        persist=persist,
    )

    if "error" in result:
        err_code = result.get("error")
        status_code = 404 if err_code == "PRODUCT_NOT_FOUND" else 400
        return jsonify({
            "success": False,
            "error": {
                "code": err_code,
                "message": result.get("message")
            }
        }), status_code

    return jsonify({
        "success": True,
        "data": result
    }), 200


@tco_bp.route("/tco/compare", methods=["POST"])
def compare_tco():
    """
    POST /api/tco/compare
    Compares Total Cost of Ownership across multiple selected products.
    """
    payload = request.get_json() or {}
    products_list = payload.get("products", [])

    result = TCOService.compare_tco(products_list)
    if "error" in result:
        return jsonify({
            "success": False,
            "error": {
                "code": result.get("error"),
                "message": result.get("message")
            }
        }), 400

    return jsonify({
        "success": True,
        "data": result
    }), 200


@tco_bp.route("/products/<int:product_id>/resale-forecast/history", methods=["GET"])
def get_forecast_history(product_id: int):
    """
    GET /api/products/<product_id>/resale-forecast/history
    Retrieves stored historical forecast records for the specified product.
    """
    result = ResaleForecastService.get_forecast_history(product_id)
    if "error" in result:
        return jsonify({
            "success": False,
            "error": {
                "code": result.get("error"),
                "message": result.get("message")
            }
        }), 404

    return jsonify({
        "success": True,
        "data": result
    }), 200
