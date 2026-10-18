from datetime import datetime
from typing import Optional, Any, Dict
from app.extensions import db

class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    sku = db.Column(db.String(100), unique=True, nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False, index=True)
    brand = db.Column(db.String(100), nullable=False, index=True)
    category = db.Column(db.String(100), nullable=False, index=True)
    description = db.Column(db.Text, nullable=True)
    image_url = db.Column(db.String(500), nullable=True)
    base_mrp = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(10), default="INR")
    specs_json = db.Column(db.JSON, nullable=True)
    source_type = db.Column(db.String(50), default="demo")  # demo, dataset, manual, api
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    offers = db.relationship("Offer", back_populates="product", cascade="all, delete-orphan")
    price_histories = db.relationship("PriceHistory", back_populates="product", cascade="all, delete-orphan")
    alerts = db.relationship("Alert", back_populates="product", cascade="all, delete-orphan")
    reviews = db.relationship("Review", back_populates="product", cascade="all, delete-orphan")
    forecasts = db.relationship("Forecast", back_populates="product", cascade="all, delete-orphan")

    def __init__(
        self,
        sku: Optional[str] = None,
        name: Optional[str] = None,
        brand: Optional[str] = None,
        category: Optional[str] = None,
        description: Optional[str] = None,
        image_url: Optional[str] = None,
        base_mrp: Optional[float] = None,
        currency: str = "INR",
        specs_json: Optional[Any] = None,
        source_type: str = "demo",
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        id: Optional[int] = None,
        **kwargs: Any,
    ):
        super().__init__(**kwargs)
        if id is not None:
            self.id = id
        if sku is not None:
            self.sku = sku
        if name is not None:
            self.name = name
        if brand is not None:
            self.brand = brand
        if category is not None:
            self.category = category
        self.description = description
        self.image_url = image_url
        if base_mrp is not None:
            self.base_mrp = float(base_mrp)
        self.currency = currency
        self.specs_json = specs_json
        self.source_type = source_type
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()

    def to_dict(self):
        return {
            "id": self.id,
            "sku": self.sku,
            "name": self.name,
            "brand": self.brand,
            "category": self.category,
            "description": self.description,
            "image_url": self.image_url,
            "base_mrp": round(self.base_mrp, 2) if self.base_mrp is not None else 0.0,
            "currency": self.currency,
            "specs": self.specs_json or {},
            "source_type": self.source_type,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
