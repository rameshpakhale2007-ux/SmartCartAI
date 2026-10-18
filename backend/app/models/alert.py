from datetime import datetime
from typing import Optional, Any
from app.extensions import db

class Alert(db.Model):
    __tablename__ = "alerts"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False, index=True)
    retailer_id = db.Column(db.Integer, db.ForeignKey("retailers.id"), nullable=True, index=True)
    target_price = db.Column(db.Float, nullable=False)
    contact_email = db.Column(db.String(255), nullable=False)
    user_identifier = db.Column(db.String(100), default="guest_user", index=True)
    is_active = db.Column(db.Boolean, default=True, index=True)
    trigger_status = db.Column(db.String(50), default="active")  # active, triggered, inactive
    last_checked_at = db.Column(db.DateTime, nullable=True)
    last_observed_price = db.Column(db.Float, nullable=True)
    last_triggered_at = db.Column(db.DateTime, nullable=True)
    trigger_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.Index("idx_alert_user_active", "user_identifier", "is_active"),
    )

    product = db.relationship("Product", back_populates="alerts")
    retailer = db.relationship("Retailer")

    def __init__(
        self,
        product_id: Optional[int] = None,
        retailer_id: Optional[int] = None,
        target_price: Optional[float] = None,
        contact_email: Optional[str] = None,
        user_identifier: str = "guest_user",
        is_active: bool = True,
        trigger_status: str = "active",
        last_checked_at: Optional[datetime] = None,
        last_observed_price: Optional[float] = None,
        last_triggered_at: Optional[datetime] = None,
        trigger_count: int = 0,
        created_at: Optional[datetime] = None,
        **kwargs: Any,
    ):
        super().__init__(**kwargs)
        if product_id is not None:
            self.product_id = product_id
        self.retailer_id = retailer_id
        if target_price is not None:
            self.target_price = target_price
        if contact_email is not None:
            self.contact_email = contact_email
        self.user_identifier = user_identifier
        self.is_active = is_active
        self.trigger_status = trigger_status
        self.last_checked_at = last_checked_at
        self.last_observed_price = last_observed_price
        self.last_triggered_at = last_triggered_at
        self.trigger_count = trigger_count
        self.created_at = created_at or datetime.utcnow()

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "product_name": self.product.name if self.product else "Unknown",
            "product_image": self.product.image_url if self.product else None,
            "product_base_mrp": self.product.base_mrp if self.product else None,
            "retailer_id": self.retailer_id,
            "retailer_name": self.retailer.name if self.retailer else "All Retailers",
            "retailer_code": self.retailer.code if self.retailer else None,
            "target_price": round(float(self.target_price), 2),
            "contact_email": self.contact_email,
            "user_identifier": self.user_identifier,
            "is_active": self.is_active,
            "trigger_status": self.trigger_status,
            "last_checked_at": self.last_checked_at.isoformat() if self.last_checked_at else None,
            "last_observed_price": round(float(self.last_observed_price), 2) if self.last_observed_price is not None else None,
            "last_triggered_at": self.last_triggered_at.isoformat() if self.last_triggered_at else None,
            "trigger_count": self.trigger_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
