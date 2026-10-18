import hmac
from flask import Blueprint, request, jsonify, current_app
from app.services.coupon_service import CouponService

coupon_bp = Blueprint("coupons", __name__)

@coupon_bp.route("/coupons", methods=["GET"])
def get_coupons():
    """
    List coupons with search, filters, sorting, and pagination.
    Query parameters:
    - search: text search across code, title, description
    - retailer_id: integer filter
    - discount_type: 'percentage', 'fixed_amount', 'free_shipping'
    - verification_status: 'verified', 'unverified', 'expired'
    - product_id: integer filter for product applicability
    - category: string filter for category applicability
    - active_only: boolean (default true)
    - sort: 'discount_desc', 'min_order_asc', 'expiring_soon', 'newest'
    - page: int (default 1)
    - per_page: int (default 20)
    """
    search = request.args.get("search", "").strip() or None
    retailer_id = None
    if request.args.get("retailer_id"):
        try:
            retailer_id = int(request.args.get("retailer_id"))
        except (ValueError, TypeError):
            return jsonify({
                "success": False,
                "error": {"code": "INVALID_PARAM", "message": "Query parameter 'retailer_id' must be an integer."}
            }), 400

    discount_type = request.args.get("discount_type", "").strip() or None
    verification_status = request.args.get("verification_status", "").strip() or None

    product_id = None
    if request.args.get("product_id"):
        try:
            product_id = int(request.args.get("product_id"))
        except (ValueError, TypeError):
            return jsonify({
                "success": False,
                "error": {"code": "INVALID_PARAM", "message": "Query parameter 'product_id' must be an integer."}
            }), 400

    category = request.args.get("category", "").strip() or None
    active_only = request.args.get("active_only", "true").lower() in ("true", "1", "yes")
    sort = request.args.get("sort", "newest").strip().lower()

    try:
        page = max(1, int(request.args.get("page", 1)))
        per_page = min(max(1, int(request.args.get("per_page", 20))), 100)
    except (ValueError, TypeError):
        page = 1
        per_page = 20

    data = CouponService.list_coupons(
        search=search,
        retailer_id=retailer_id,
        discount_type=discount_type,
        verification_status=verification_status,
        product_id=product_id,
        category=category,
        active_only=active_only,
        sort=sort,
        page=page,
        per_page=per_page
    )

    return jsonify({
        "success": True,
        "data": data
    })

@coupon_bp.route("/coupons/<int:coupon_id>", methods=["GET"])
def get_coupon_detail(coupon_id):
    """Retrieve detailed terms, restrictions, and verification status for a single coupon."""
    coupon = CouponService.get_coupon(coupon_id)
    if not coupon:
        return jsonify({
            "success": False,
            "error": {"code": "COUPON_NOT_FOUND", "message": f"Coupon #{coupon_id} was not found."}
        }), 404

    return jsonify({
        "success": True,
        "data": coupon
    })

@coupon_bp.route("/coupons/validate", methods=["POST"])
def validate_coupon():
    """
    Validate a coupon code against a purchase context.
    JSON body:
    {
        "coupon_code": "SAVE10",
        "purchase_amount": 5000.0,
        "product_id": Optional[int],
        "retailer_id": Optional[int],
        "quantity": Optional[int],
        "shipping_cost": Optional[float]
    }
    """
    data = request.get_json(silent=True)
    if not data or not isinstance(data, dict):
        return jsonify({
            "success": False,
            "error": {"code": "INVALID_JSON", "message": "Expected valid JSON request body."}
        }), 400

    coupon_identifier = data.get("coupon_code") or data.get("coupon_id")
    if not coupon_identifier:
        return jsonify({
            "success": False,
            "error": {"code": "MISSING_FIELD", "message": "Field 'coupon_code' or 'coupon_id' is required."}
        }), 400

    purchase_amount = data.get("purchase_amount")
    if purchase_amount is not None:
        try:
            purchase_amount = float(purchase_amount)
        except (ValueError, TypeError):
            return jsonify({
                "success": False,
                "error": {"code": "INVALID_PARAM", "message": "Field 'purchase_amount' must be a valid number."}
            }), 400

    product_id = data.get("product_id")
    if product_id is not None:
        try:
            product_id = int(product_id)
        except (ValueError, TypeError):
            product_id = None

    retailer_id = data.get("retailer_id")
    if retailer_id is not None:
        try:
            retailer_id = int(retailer_id)
        except (ValueError, TypeError):
            retailer_id = None

    quantity = max(1, int(data.get("quantity", 1)))

    shipping_cost = data.get("shipping_cost")
    if shipping_cost is not None:
        try:
            shipping_cost = float(shipping_cost)
        except (ValueError, TypeError):
            shipping_cost = None

    result = CouponService.validate_coupon(
        coupon_identifier=coupon_identifier,
        purchase_amount=purchase_amount,
        product_id=product_id,
        retailer_id=retailer_id,
        quantity=quantity,
        shipping_cost=shipping_cost
    )

    status_code = 200
    if not result.get("is_eligible") and result.get("error") == "COUPON_NOT_FOUND":
        status_code = 404

    return jsonify({
        "success": result.get("is_eligible", False),
        "data": result,
        "message": result.get("message")
    }), status_code

@coupon_bp.route("/coupons", methods=["POST"])
def create_coupon():
    """
    Create a new coupon promotion.
    Demonstration/guest submissions are tagged as 'unverified'.
    """
    data = request.get_json(silent=True)
    if not data or not isinstance(data, dict):
        return jsonify({
            "success": False,
            "error": {"code": "INVALID_JSON", "message": "Expected valid JSON request body."}
        }), 400

    code = data.get("code")
    title = data.get("title")
    discount_type = data.get("discount_type")
    discount_value = data.get("discount_value")

    if not code or not title or not discount_type or discount_value is None:
        return jsonify({
            "success": False,
            "error": {"code": "MISSING_FIELD", "message": "Fields 'code', 'title', 'discount_type', and 'discount_value' are required."}
        }), 400

    # Authorization check:
    # Requires an explicitly configured administrative secret in environment (ADMIN_API_KEY).
    # Fails safely if unconfigured (never allows default keys).
    # Public submissions without verified administrative keys are tagged as 'unverified'.
    admin_secret = current_app.config.get("ADMIN_API_KEY")
    req_admin_key = request.headers.get("X-Admin-Key")
    is_admin = False
    if admin_secret and req_admin_key:
        is_admin = hmac.compare_digest(str(req_admin_key).strip(), str(admin_secret).strip())

    result = CouponService.create_coupon(
        code=code,
        title=title,
        discount_type=discount_type,
        discount_value=discount_value,
        retailer_id=data.get("retailer_id"),
        description=data.get("description"),
        min_order_value=data.get("min_order_value", 0.0),
        max_discount_value=data.get("max_discount_value"),
        applicable_category=data.get("applicable_category"),
        applicable_product_id=data.get("applicable_product_id"),
        terms_and_conditions=data.get("terms_and_conditions"),
        is_admin_verified=is_admin
    )

    if "error" in result:
        return jsonify({
            "success": False,
            "error": {"code": result["error"], "message": result.get("message")}
        }), 400

    return jsonify({
        "success": True,
        "data": result["coupon"],
        "message": result.get("message")
    }), 201
