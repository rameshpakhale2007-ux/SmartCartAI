from flask import Blueprint, request, jsonify
from app.services.basket_optimizer_service import BasketOptimizerService

basket_bp = Blueprint("basket", __name__)

def _get_user_id() -> str:
    """Helper to extract user identifier from headers, query params, or JSON body."""
    uid = request.headers.get("X-User-Id")
    if uid and uid.strip():
        return uid.strip()
    uid = request.args.get("user_id")
    if uid and uid.strip():
        return uid.strip()
    return "guest_user"

@basket_bp.route("/basket", methods=["GET"])
def get_basket():
    """
    Retrieve active basket items, quantities, catalog info, and available retailer offers.
    """
    user_id = _get_user_id()
    result = BasketOptimizerService.get_basket_details(user_identifier=user_id)
    return jsonify({
        "success": True,
        "data": result
    })

@basket_bp.route("/basket/items", methods=["POST"])
def add_basket_item():
    """
    Add a product to the active basket.
    JSON payload:
    {
        "product_id": int,
        "quantity": int (optional, default 1),
        "preferred_retailer_id": int (optional)
    }
    """
    data = request.get_json(silent=True)
    if not data or not isinstance(data, dict):
        return jsonify({
            "success": False,
            "error": {"code": "INVALID_JSON", "message": "Expected valid JSON request body."}
        }), 400

    product_id = data.get("product_id")
    quantity = data.get("quantity", 1)
    preferred_retailer_id = data.get("preferred_retailer_id")
    user_id = data.get("user_identifier") or _get_user_id()

    result = BasketOptimizerService.add_item(
        user_identifier=user_id,
        product_id=product_id,
        quantity=quantity,
        preferred_retailer_id=preferred_retailer_id
    )

    if "error" in result:
        err_code = result["error"]
        status_code = 404 if err_code in ("PRODUCT_NOT_FOUND", "RETAILER_NOT_FOUND") else 400
        return jsonify({
            "success": False,
            "error": {"code": err_code, "message": result.get("message")}
        }), status_code

    return jsonify({
        "success": True,
        "data": result
    }), 201

@basket_bp.route("/basket/items/<int:item_id>", methods=["PATCH"])
def update_basket_item(item_id):
    """
    Update quantity of a basket item.
    JSON payload:
    {
        "quantity": int
    }
    """
    data = request.get_json(silent=True)
    if not data or not isinstance(data, dict):
        return jsonify({
            "success": False,
            "error": {"code": "INVALID_JSON", "message": "Expected valid JSON request body."}
        }), 400

    if "quantity" not in data:
        return jsonify({
            "success": False,
            "error": {"code": "MISSING_QUANTITY", "message": "Field 'quantity' is required."}
        }), 400

    user_id = _get_user_id()
    result = BasketOptimizerService.update_item_quantity(
        user_identifier=user_id,
        item_id=item_id,
        quantity=data["quantity"]
    )

    if "error" in result:
        err_code = result["error"]
        status_code = 404 if err_code == "ITEM_NOT_FOUND" else 400
        return jsonify({
            "success": False,
            "error": {"code": err_code, "message": result.get("message")}
        }), status_code

    return jsonify({
        "success": True,
        "data": result
    })

@basket_bp.route("/basket/items/<int:item_id>", methods=["DELETE"])
def remove_basket_item(item_id):
    """
    Remove an individual item from the active basket.
    """
    user_id = _get_user_id()
    result = BasketOptimizerService.remove_item(
        user_identifier=user_id,
        item_id=item_id
    )

    if "error" in result:
        err_code = result["error"]
        status_code = 404 if err_code == "ITEM_NOT_FOUND" else 400
        return jsonify({
            "success": False,
            "error": {"code": err_code, "message": result.get("message")}
        }), status_code

    return jsonify({
        "success": True,
        "data": result
    })

@basket_bp.route("/basket", methods=["DELETE"])
def clear_basket():
    """
    Clear all items from the active basket.
    """
    user_id = _get_user_id()
    result = BasketOptimizerService.clear_basket(user_identifier=user_id)
    return jsonify({
        "success": True,
        "data": result
    })

@basket_bp.route("/basket/optimize", methods=["POST"])
def optimize_basket():
    """
    Calculate optimal single-retailer and multi-retailer checkout strategies.
    JSON payload:
    {
        "allow_split_orders": bool (optional, default true),
        "max_retailers": int (optional, default 3)
    }
    """
    data = request.get_json(silent=True) or {}
    allow_split_orders = data.get("allow_split_orders", True)
    max_retailers = data.get("max_retailers", 3)
    user_id = data.get("user_identifier") or _get_user_id()

    result = BasketOptimizerService.optimize_basket(
        user_identifier=user_id,
        allow_split_orders=bool(allow_split_orders),
        max_retailers=int(max_retailers)
    )

    return jsonify({
        "success": True,
        "data": result
    })
