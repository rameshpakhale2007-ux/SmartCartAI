from flask import Flask, jsonify
from app.config import Config
from app.extensions import db, cors

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    
    cors_origins = app.config.get("CORS_ORIGINS", "*")
    cors.init_app(
        app,
        resources={
            r"/api/*": {"origins": cors_origins},
            r"/*": {"origins": cors_origins}
        },
        supports_credentials=False if cors_origins == "*" else True,
        allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Accept"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
    )

    # Register blueprints
    from app.routes.dashboard_routes import dashboard_bp
    from app.routes.product_routes import product_bp
    from app.routes.comparison_routes import comparison_bp
    from app.routes.history_routes import history_bp
    from app.routes.alert_routes import alert_bp
    from app.routes.coupon_routes import coupon_bp
    from app.routes.alternative_routes import alternative_bp
    from app.routes.honesty_routes import honesty_bp
    from app.routes.basket_routes import basket_bp
    from app.routes.tco_routes import tco_bp
    from app.routes.buy_timing_routes import buy_timing_bp
    from app.routes.review_routes import review_bp

    app.register_blueprint(dashboard_bp, url_prefix="/api")
    app.register_blueprint(product_bp, url_prefix="/api")
    app.register_blueprint(comparison_bp, url_prefix="/api")
    app.register_blueprint(history_bp, url_prefix="/api")
    app.register_blueprint(alert_bp, url_prefix="/api")
    app.register_blueprint(coupon_bp, url_prefix="/api")
    app.register_blueprint(alternative_bp, url_prefix="/api")
    app.register_blueprint(honesty_bp, url_prefix="/api")
    app.register_blueprint(basket_bp, url_prefix="/api")
    app.register_blueprint(tco_bp, url_prefix="/api")
    app.register_blueprint(buy_timing_bp, url_prefix="/api")
    app.register_blueprint(review_bp, url_prefix="/api")

    # Root index route for platform health pings and user accessibility
    @app.route("/", methods=["GET"])
    def root_endpoint():
        return jsonify({
            "success": True,
            "service": "SmartCart AI Backend API",
            "status": "operational",
            "version": "1.0.0",
            "health_check": "/api/health",
            "dashboard_summary": "/api/dashboard/summary"
        })

    # Safe non-destructive schema migration check
    with app.app_context():
        from app.models.coupon import ensure_coupon_schema
        from app.models.forecast import ensure_forecast_schema
        ensure_coupon_schema()
        ensure_forecast_schema()

    # Global Error Handlers
    @app.errorhandler(404)
    def handle_not_found(e):
        return jsonify({
            "success": False,
            "error": {
                "code": "NOT_FOUND",
                "message": "The requested API endpoint was not found."
            }
        }), 404

    @app.errorhandler(400)
    def handle_bad_request(e):
        return jsonify({
            "success": False,
            "error": {
                "code": "BAD_REQUEST",
                "message": str(e)
            }
        }), 400

    @app.errorhandler(500)
    def handle_server_error(e):
        return jsonify({
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An internal server error occurred."
            }
        }), 500

    return app
