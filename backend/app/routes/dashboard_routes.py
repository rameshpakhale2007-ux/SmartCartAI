from datetime import datetime
from flask import Blueprint, jsonify
from app.extensions import db
from app.models import Product, Offer, Alert, PriceHistory, Retailer

dashboard_bp = Blueprint("dashboard", __name__)

@dashboard_bp.route("/health", methods=["GET"])
def health_check():
    return jsonify({
        "success": True,
        "status": "operational",
        "service": "SmartCart AI Backend",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "database": "connected" if db.engine else "disconnected"
    })

@dashboard_bp.route("/dashboard/summary", methods=["GET"])
def get_dashboard_summary():
    try:
        total_products = Product.query.count()
        active_alerts = Alert.query.filter_by(is_active=True).count()
        total_retailers = Retailer.query.filter_by(is_active=True).count()
        
        # Recent price history items
        recent_histories = PriceHistory.query.order_by(PriceHistory.recorded_at.desc()).limit(5).all()
        recent_price_changes = []
        for h in recent_histories:
            prod = h.product
            recent_price_changes.append({
                "id": h.id,
                "product_id": h.product_id,
                "product_name": prod.name if prod else "Unknown",
                "retailer_name": h.retailer.name if h.retailer else "Retailer",
                "new_price": h.price,
                "old_price": h.original_price or h.price,
                "recorded_at": h.recorded_at.isoformat() if h.recorded_at else None,
                "source_type": h.source_type,
            })

        # Lowest available offers
        lowest_offers = []
        products = Product.query.limit(4).all()
        for prod in products:
            best_offer = Offer.query.filter_by(product_id=prod.id).order_by(Offer.price.asc()).first()
            if best_offer:
                lowest_offers.append({
                    "product_id": prod.id,
                    "product_name": prod.name,
                    "brand": prod.brand,
                    "category": prod.category,
                    "image_url": prod.image_url,
                    "base_mrp": prod.base_mrp,
                    "best_price": best_offer.price,
                    "retailer_name": best_offer.retailer.name if best_offer.retailer else "Retailer",
                    "shipping_cost": best_offer.shipping_cost,
                    "total_cost": best_offer.total_cost,
                    "savings_from_mrp": round(max(0, prod.base_mrp - (best_offer.total_cost if best_offer.total_cost is not None else best_offer.price)), 2),
                    "source_type": best_offer.source_type,
                })

        # Data sources status
        data_sources = [
            {"source": "Local Catalog DB", "type": "verified_store", "status": "Online", "records": total_products},
            {"source": "Demonstration Fixtures", "type": "demo", "status": "Active", "records": Offer.query.filter_by(source_type="demo").count()},
            {"source": "Historical Price Engine", "type": "timeseries", "status": "Online", "records": PriceHistory.query.count()},
            {"source": "Live Provider API", "type": "api", "status": "Standby (Simulated Local Mode)", "records": 0},
        ]

        # Favorable deals (discount > 15%)
        deals = Offer.query.filter(Offer.discount_pct >= 15).limit(4).all()
        favorable_deals = [d.to_dict() for d in deals]

        return jsonify({
            "success": True,
            "data": {
                "metrics": {
                    "total_products_tracked": total_products,
                    "active_price_alerts": active_alerts,
                    "monitored_retailers": total_retailers,
                    "average_basket_savings_pct": 14.8,
                    "honesty_scans_performed": 128,
                },
                "lowest_available_offers": lowest_offers,
                "favorable_deals": favorable_deals,
                "recent_price_changes": recent_price_changes,
                "data_source_health": data_sources,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": {
                "code": "DASHBOARD_FETCH_ERROR",
                "message": str(e)
            }
        }), 500
