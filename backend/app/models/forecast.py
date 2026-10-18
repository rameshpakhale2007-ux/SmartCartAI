from datetime import datetime
from typing import Optional, Any
from app.extensions import db

class Forecast(db.Model):
    __tablename__ = "forecasts"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    horizon_days = db.Column(db.Integer, nullable=False)
    predicted_price = db.Column(db.Float, nullable=False)
    lower_bound = db.Column(db.Float, nullable=True)
    upper_bound = db.Column(db.Float, nullable=True)
    confidence = db.Column(db.String(50), default="Medium")  # High, Medium, Low
    model_name = db.Column(db.String(100), default="rolling_trend")
    forecast_type = db.Column(db.String(50), default="resale")  # resale, price_trend
    reference_price = db.Column(db.Float, nullable=True)
    depreciation_pct = db.Column(db.Float, nullable=True)
    status = db.Column(db.String(50), default="estimated")  # estimated, scenario, insufficient_data
    observation_count = db.Column(db.Integer, default=0)
    assumptions_json = db.Column(db.JSON, nullable=True)
    model_version = db.Column(db.String(50), default="1.0.0")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    product = db.relationship("Product", back_populates="forecasts")

    def __init__(
        self,
        product_id: Optional[int] = None,
        horizon_days: Optional[int] = None,
        predicted_price: Optional[float] = None,
        lower_bound: Optional[float] = None,
        upper_bound: Optional[float] = None,
        confidence: str = "Medium",
        model_name: str = "rolling_trend",
        forecast_type: str = "resale",
        reference_price: Optional[float] = None,
        depreciation_pct: Optional[float] = None,
        status: str = "estimated",
        observation_count: int = 0,
        assumptions_json: Optional[Any] = None,
        model_version: str = "1.0.0",
        created_at: Optional[datetime] = None,
        id: Optional[int] = None,
        **kwargs: Any,
    ):
        super().__init__(**kwargs)
        if id is not None:
            self.id = id
        if product_id is not None:
            self.product_id = product_id
        if horizon_days is not None:
            self.horizon_days = horizon_days
        if predicted_price is not None:
            self.predicted_price = float(predicted_price)
        self.lower_bound = float(lower_bound) if lower_bound is not None else None
        self.upper_bound = float(upper_bound) if upper_bound is not None else None
        self.confidence = confidence
        self.model_name = model_name
        self.forecast_type = forecast_type
        self.reference_price = float(reference_price) if reference_price is not None else None
        self.depreciation_pct = float(depreciation_pct) if depreciation_pct is not None else None
        self.status = status
        self.observation_count = int(observation_count or 0)
        self.assumptions_json = assumptions_json
        self.model_version = model_version
        self.created_at = created_at or datetime.utcnow()

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "product_name": self.product.name if self.product else "Unknown",
            "horizon_days": self.horizon_days,
            "horizon_months": round(self.horizon_days / 30.4375, 1) if self.horizon_days else None,
            "predicted_price": round(float(self.predicted_price), 2),
            "reference_price": round(float(self.reference_price), 2) if self.reference_price is not None else None,
            "depreciation_pct": round(float(self.depreciation_pct), 2) if self.depreciation_pct is not None else None,
            "lower_bound": round(float(self.lower_bound), 2) if self.lower_bound is not None else None,
            "upper_bound": round(float(self.upper_bound), 2) if self.upper_bound is not None else None,
            "confidence": self.confidence,
            "model_name": self.model_name,
            "forecast_type": self.forecast_type,
            "status": self.status,
            "observation_count": self.observation_count,
            "assumptions": self.assumptions_json or {},
            "model_version": self.model_version,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

def ensure_forecast_schema():
    """
    Safely inspects existing forecasts table and adds Phase 7 columns if missing.
    Protects existing SQLite databases without destructive table drops.
    """
    from sqlalchemy import inspect, text
    try:
        inspector = inspect(db.engine)
        if "forecasts" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("forecasts")]
            with db.engine.connect() as conn:
                if "forecast_type" not in columns:
                    conn.execute(text("ALTER TABLE forecasts ADD COLUMN forecast_type VARCHAR(50) DEFAULT 'resale'"))
                if "reference_price" not in columns:
                    conn.execute(text("ALTER TABLE forecasts ADD COLUMN reference_price FLOAT"))
                if "depreciation_pct" not in columns:
                    conn.execute(text("ALTER TABLE forecasts ADD COLUMN depreciation_pct FLOAT"))
                if "status" not in columns:
                    conn.execute(text("ALTER TABLE forecasts ADD COLUMN status VARCHAR(50) DEFAULT 'estimated'"))
                if "observation_count" not in columns:
                    conn.execute(text("ALTER TABLE forecasts ADD COLUMN observation_count INTEGER DEFAULT 0"))
                if "assumptions_json" not in columns:
                    conn.execute(text("ALTER TABLE forecasts ADD COLUMN assumptions_json JSON"))
                if "model_version" not in columns:
                    conn.execute(text("ALTER TABLE forecasts ADD COLUMN model_version VARCHAR(50) DEFAULT '1.0.0'"))
                conn.commit()
    except Exception:
        pass

