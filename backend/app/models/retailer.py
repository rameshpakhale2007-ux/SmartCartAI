from datetime import datetime
from typing import Optional, Any
from app.extensions import db

class Retailer(db.Model):
    __tablename__ = "retailers"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    code = db.Column(db.String(50), nullable=False, unique=True)
    website_url = db.Column(db.String(255), nullable=True)
    logo_url = db.Column(db.String(255), nullable=True)
    default_shipping_cost = db.Column(db.Float, default=0.0)
    free_shipping_threshold = db.Column(db.Float, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    offers = db.relationship("Offer", back_populates="retailer", cascade="all, delete-orphan")
    price_histories = db.relationship("PriceHistory", back_populates="retailer", cascade="all, delete-orphan")
    coupons = db.relationship("Coupon", back_populates="retailer", cascade="all, delete-orphan")

    def __init__(
        self,
        name: Optional[str] = None,
        code: Optional[str] = None,
        website_url: Optional[str] = None,
        logo_url: Optional[str] = None,
        default_shipping_cost: float = 0.0,
        free_shipping_threshold: Optional[float] = None,
        is_active: bool = True,
        created_at: Optional[datetime] = None,
        id: Optional[int] = None,
        **kwargs: Any,
    ):
        super().__init__(**kwargs)
        if id is not None:
            self.id = id
        if name is not None:
            self.name = name
        if code is not None:
            self.code = code
        self.website_url = website_url
        self.logo_url = logo_url
        self.default_shipping_cost = float(default_shipping_cost or 0.0)
        self.free_shipping_threshold = float(free_shipping_threshold) if free_shipping_threshold is not None else None
        self.is_active = is_active
        self.created_at = created_at or datetime.utcnow()

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "code": self.code,
            "website_url": self.website_url,
            "logo_url": self.logo_url,
            "default_shipping_cost": self.default_shipping_cost,
            "free_shipping_threshold": self.free_shipping_threshold,
            "is_active": self.is_active,
        }
