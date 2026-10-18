from datetime import datetime
from typing import Optional, Any
from app.extensions import db

class Offer(db.Model):
    __tablename__ = "offers"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False, index=True)
    retailer_id = db.Column(db.Integer, db.ForeignKey("retailers.id"), nullable=False, index=True)
    price = db.Column(db.Float, nullable=False)
    original_price = db.Column(db.Float, nullable=True)  # Advertised strike-through reference
    shipping_cost = db.Column(db.Float, nullable=True)  # None indicates unknown shipping
    shipping_is_estimated = db.Column(db.Boolean, default=False)
    discount_pct = db.Column(db.Float, default=0.0)
    stock_status = db.Column(db.String(50), default="In Stock")  # In Stock, Out of Stock, Unknown, Pre-order
    delivery_days = db.Column(db.Integer, default=3)
    product_url = db.Column(db.String(500), nullable=True)
    source_type = db.Column(db.String(50), default="demo")  # demo, dataset, manual, api
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    product = db.relationship("Product", back_populates="offers")
    retailer = db.relationship("Retailer", back_populates="offers")

    def __init__(
        self,
        product_id: Optional[int] = None,
        retailer_id: Optional[int] = None,
        price: Optional[float] = None,
        original_price: Optional[float] = None,
        shipping_cost: Optional[float] = None,
        shipping_is_estimated: bool = False,
        discount_pct: float = 0.0,
        stock_status: str = "In Stock",
        delivery_days: int = 3,
        product_url: Optional[str] = None,
        source_type: str = "demo",
        updated_at: Optional[datetime] = None,
        id: Optional[int] = None,
        **kwargs: Any,
    ):
        super().__init__(**kwargs)
        if id is not None:
            self.id = id
        if product_id is not None:
            self.product_id = product_id
        if retailer_id is not None:
            self.retailer_id = retailer_id
        if price is not None:
            self.price = float(price)
        self.original_price = float(original_price) if original_price is not None else None
        self.shipping_cost = float(shipping_cost) if shipping_cost is not None else None
        self.shipping_is_estimated = shipping_is_estimated
        self.discount_pct = float(discount_pct or 0.0)
        self.stock_status = stock_status
        self.delivery_days = delivery_days
        self.product_url = product_url
        self.source_type = source_type
        self.updated_at = updated_at or datetime.utcnow()

    @property
    def shipping_is_unknown(self):
        return self.shipping_cost is None

    @property
    def is_available(self):
        """A product is available only when confirmed in stock; unknown availability is not assumed in stock."""
        if not self.stock_status:
            return False
        normalized = self.stock_status.strip().lower()
        return normalized in ("in stock", "available", "limited stock")

    @property
    def total_cost(self):
        """
        Calculates landed purchase total.
        If shipping cost is unknown, the total cannot be calculated with certainty and returns None.
        """
        if self.shipping_cost is None:
            return None
        return round(float(self.price) + float(self.shipping_cost), 2)

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "retailer_id": self.retailer_id,
            "retailer_name": self.retailer.name if self.retailer else "Unknown",
            "retailer_code": self.retailer.code if self.retailer else "",
            "retailer_logo": self.retailer.logo_url if self.retailer else None,
            "price": round(float(self.price), 2),
            "original_price": round(float(self.original_price or self.price), 2),
            "shipping_cost": round(float(self.shipping_cost), 2) if self.shipping_cost is not None else None,
            "shipping_is_unknown": self.shipping_is_unknown,
            "shipping_is_estimated": self.shipping_is_estimated,
            "total_cost": self.total_cost,
            "is_complete_total": not self.shipping_is_unknown,
            "stock_status": self.stock_status or "Unknown",
            "is_available": self.is_available,
            "discount_pct": round(float(self.discount_pct or 0.0), 1),
            "delivery_days": self.delivery_days,
            "product_url": self.product_url,
            "source_type": self.source_type,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
