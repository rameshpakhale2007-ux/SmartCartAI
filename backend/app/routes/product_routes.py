from flask import Blueprint, request, jsonify
from app.models import Product, Offer, Retailer
from app.services.price_comparison_service import PriceComparisonService
from app.extensions import db

product_bp = Blueprint("products", __name__)

@product_bp.route("/products", methods=["GET"])
def get_products():
    """
    Search and filter products catalog with pagination, multi-retailer offer summaries,
    and sorting.
    """
    try:
        # 1. Parameter extraction and validation
        search_query = request.args.get("search", "").strip()
        category_filter = request.args.get("category", "").strip()
        brand_filter = request.args.get("brand", "").strip()
        retailer_filter = request.args.get("retailer", "").strip()
        sort_by = request.args.get("sort", "newest").strip().lower()

        # Numeric validations
        try:
            page = max(1, int(request.args.get("page", 1)))
        except (ValueError, TypeError):
            return jsonify({
                "success": False,
                "error": {"code": "INVALID_PAGINATION", "message": "Page parameter must be an integer >= 1."}
            }), 400

        try:
            per_page = min(100, max(1, int(request.args.get("per_page", 12))))
        except (ValueError, TypeError):
            return jsonify({
                "success": False,
                "error": {"code": "INVALID_PAGINATION", "message": "per_page must be an integer between 1 and 100."}
            }), 400

        min_price = None
        if request.args.get("min_price"):
            try:
                min_price = float(request.args.get("min_price"))
                if min_price < 0:
                    return jsonify({
                        "success": False,
                        "error": {"code": "INVALID_FILTER", "message": "min_price cannot be negative."}
                    }), 400
            except ValueError:
                return jsonify({
                    "success": False,
                    "error": {"code": "INVALID_FILTER", "message": "min_price must be a valid number."}
                }), 400

        max_price = None
        if request.args.get("max_price"):
            try:
                max_price = float(request.args.get("max_price"))
                if max_price < 0:
                    return jsonify({
                        "success": False,
                        "error": {"code": "INVALID_FILTER", "message": "max_price cannot be negative."}
                    }), 400
            except ValueError:
                return jsonify({
                    "success": False,
                    "error": {"code": "INVALID_FILTER", "message": "max_price must be a valid number."}
                }), 400

        if min_price is not None and max_price is not None and min_price > max_price:
            return jsonify({
                "success": False,
                "error": {"code": "INVALID_FILTER", "message": "min_price cannot exceed max_price."}
            }), 400

        # 2. Build Query
        query = Product.query

        if search_query:
            pattern = f"%{search_query}%"
            query = query.filter(
                (Product.name.ilike(pattern)) |
                (Product.brand.ilike(pattern)) |
                (Product.category.ilike(pattern)) |
                (Product.description.ilike(pattern)) |
                (Product.sku.ilike(pattern))
            )

        if category_filter:
            query = query.filter(Product.category.ilike(category_filter))

        if brand_filter:
            query = query.filter(Product.brand.ilike(brand_filter))

        if retailer_filter:
            query = query.join(Offer).join(Retailer).filter(
                (Retailer.code.ilike(retailer_filter)) | (Retailer.name.ilike(retailer_filter))
            ).distinct()

        if min_price is not None:
            # Filter products that have at least one offer with price >= min_price or base_mrp >= min_price
            query = query.filter(
                Product.offers.any(Offer.price >= min_price) | (Product.base_mrp >= min_price)
            )

        if max_price is not None:
            query = query.filter(
                Product.offers.any(Offer.price <= max_price) | (Product.base_mrp <= max_price)
            )

        # 3. Sorting
        if sort_by == "name_asc":
            query = query.order_by(Product.name.asc())
        elif sort_by == "name_desc":
            query = query.order_by(Product.name.desc())
        elif sort_by == "price_asc":
            query = query.order_by(Product.base_mrp.asc())
        elif sort_by == "price_desc":
            query = query.order_by(Product.base_mrp.desc())
        else:
            query = query.order_by(Product.created_at.desc(), Product.id.desc())

        # 4. Pagination
        total_items = query.count()
        total_pages = (total_items + per_page - 1) // per_page if total_items > 0 else 1
        products = query.offset((page - 1) * per_page).limit(per_page).all()

        # 5. Attach Lowest Offer & Offer Count summaries
        product_items = []
        for p in products:
            p_data = p.to_dict()
            offers = Offer.query.filter_by(product_id=p.id).all()
            p_data["offer_count"] = len(offers)
            
            # Find cheapest eligible offer if any
            comp = PriceComparisonService.compare_offers(p.id)
            cheapest = comp.get("cheapest_eligible_offer")
            p_data["lowest_eligible_offer"] = cheapest
            p_data["has_unknown_shipping"] = comp.get("has_unknown_shipping", False)
            
            product_items.append(p_data)

        # 6. Global Available Filters for UX
        all_categories = [c[0] for c in db.session.query(Product.category).distinct().all() if c[0]]
        all_brands = [b[0] for b in db.session.query(Product.brand).distinct().all() if b[0]]

        return jsonify({
            "success": True,
            "data": {
                "items": product_items,
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total_items": total_items,
                    "total_pages": total_pages,
                    "has_next": page < total_pages,
                    "has_prev": page > 1,
                },
                "filters": {
                    "categories": sorted(all_categories),
                    "brands": sorted(all_brands),
                }
            }
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": {"code": "PRODUCT_SEARCH_ERROR", "message": str(e)}
        }), 500

@product_bp.route("/products/<int:product_id>", methods=["GET"])
def get_product_details(product_id):
    """
    Retrieve single product details with specifications, offer count, and pricing summary.
    """
    product = Product.query.get(product_id)
    if not product:
        return jsonify({
            "success": False,
            "error": {"code": "PRODUCT_NOT_FOUND", "message": f"Product #{product_id} was not found."}
        }), 404

    comp = PriceComparisonService.compare_offers(product_id)
    p_data = product.to_dict()
    p_data["offers_summary"] = {
        "total_offers": comp.get("total_offers", 0),
        "available_offers_count": comp.get("available_offers_count", 0),
        "cheapest_eligible_offer": comp.get("cheapest_eligible_offer"),
        "price_spread": comp.get("price_spread", 0.0),
        "has_unknown_shipping": comp.get("has_unknown_shipping", False),
    }

    return jsonify({
        "success": True,
        "data": p_data
    })

@product_bp.route("/products/<int:product_id>/offers", methods=["GET"])
def get_product_offers(product_id):
    """
    Retrieve all retailer offers for a product evaluated through the price comparison engine.
    """
    product = Product.query.get(product_id)
    if not product:
        return jsonify({
            "success": False,
            "error": {"code": "PRODUCT_NOT_FOUND", "message": f"Product #{product_id} was not found."}
        }), 404

    sort_by = request.args.get("sort", "estimated_total").strip().lower()
    comparison_result = PriceComparisonService.compare_offers(product_id, sort_by=sort_by)

    return jsonify({
        "success": True,
        "data": comparison_result
    })
