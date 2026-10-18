from datetime import datetime
from typing import Optional, Any
from app.extensions import db

class Basket(db.Model):
    __tablename__ = "baskets"

    id = db.Column(db.Integer, primary_key=True)
    user_identifier = db.Column(db.String(100), default="guest_user")
    status = db.Column(db.String(50), default="active")  # active, completed, abandoned
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    items = db.relationship("BasketItem", back_populates="basket", cascade="all, delete-orphan")

    def __init__(
        self,
        user_identifier: str = "guest_user",
        status: str = "active",
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        id: Optional[int] = None,
        **kwargs: Any,
    ):
        super().__init__(**kwargs)
        if id is not None:
            self.id = id
        self.user_identifier = user_identifier
        self.status = status
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()

    def to_dict(self):
        return {
            "id": self.id,
            "user_identifier": self.user_identifier,
            "status": self.status,
            "items": [item.to_dict() for item in self.items],
            "total_items": sum(item.quantity for item in self.items),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

class BasketItem(db.Model):
    __tablename__ = "basket_items"

    id = db.Column(db.Integer, primary_key=True)
    basket_id = db.Column(db.Integer, db.ForeignKey("baskets.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    quantity = db.Column(db.Integer, default=1, nullable=False)
    preferred_retailer_id = db.Column(db.Integer, db.ForeignKey("retailers.id"), nullable=True)

    basket = db.relationship("Basket", back_populates="items")
    product = db.relationship("Product")
    preferred_retailer = db.relationship("Retailer")

    def __init__(
        self,
        basket_id: Optional[int] = None,
        product_id: Optional[int] = None,
        quantity: int = 1,
        preferred_retailer_id: Optional[int] = None,
        id: Optional[int] = None,
        **kwargs: Any,
    ):
        super().__init__(**kwargs)
        if id is not None:
            self.id = id
        if basket_id is not None:
            self.basket_id = basket_id
        if product_id is not None:
            self.product_id = product_id
        self.quantity = quantity
        self.preferred_retailer_id = preferred_retailer_id

    def to_dict(self):
        return {
            "id": self.id,
            "basket_id": self.basket_id,
            "product_id": self.product_id,
            "product_name": self.product.name if self.product else "Unknown",
            "product_brand": self.product.brand if self.product else None,
            "product_category": self.product.category if self.product else None,
            "product_sku": self.product.sku if self.product else None,
            "product_image": self.product.image_url if self.product else None,
            "base_mrp": float(self.product.base_mrp) if self.product and self.product.base_mrp else 0.0,
            "quantity": self.quantity,
            "preferred_retailer_id": self.preferred_retailer_id,
            "preferred_retailer_name": self.preferred_retailer.name if self.preferred_retailer else None,
        }
