from datetime import datetime
from typing import Optional, Any
from app.extensions import db

class PriceHistory(db.Model):
    __tablename__ = "price_history"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False, index=True)
    retailer_id = db.Column(db.Integer, db.ForeignKey("retailers.id"), nullable=False, index=True)
    price = db.Column(db.Float, nullable=False)
    original_price = db.Column(db.Float, nullable=True)
    recorded_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    source_type = db.Column(db.String(50), default="demo")  # demo, dataset, manual, api

    __table_args__ = (
        db.Index("idx_price_hist_prod_date", "product_id", "recorded_at"),
        db.Index("idx_price_hist_prod_ret_date", "product_id", "retailer_id", "recorded_at"),
    )

    product = db.relationship("Product", back_populates="price_histories")
    retailer = db.relationship("Retailer", back_populates="price_histories")

    def __init__(
        self,
        product_id: Optional[int] = None,
        retailer_id: Optional[int] = None,
        price: Optional[float] = None,
        original_price: Optional[float] = None,
        recorded_at: Optional[datetime] = None,
        source_type: str = "demo",
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
        self.recorded_at = recorded_at or datetime.utcnow()
        self.source_type = source_type

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "product_name": self.product.name if self.product else "Unknown",
            "retailer_id": self.retailer_id,
            "retailer_name": self.retailer.name if self.retailer else "Unknown",
            "retailer_code": self.retailer.code if self.retailer else "",
            "price": round(float(self.price), 2),
            "original_price": round(float(self.original_price), 2) if self.original_price is not None else None,
            "recorded_at": self.recorded_at.isoformat() if self.recorded_at else None,
            "source_type": self.source_type,
        }
