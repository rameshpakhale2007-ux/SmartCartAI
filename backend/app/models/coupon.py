from datetime import datetime
from typing import Optional, Any
from app.extensions import db

class Coupon(db.Model):
    __tablename__ = "coupons"

    id = db.Column(db.Integer, primary_key=True)
    retailer_id = db.Column(db.Integer, db.ForeignKey("retailers.id"), nullable=True, index=True)  # Nullable for platform-wide
    code = db.Column(db.String(50), nullable=False, unique=True, index=True)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=True)
    discount_type = db.Column(db.String(30), nullable=False)  # 'percentage', 'fixed_amount', 'free_shipping'
    discount_value = db.Column(db.Float, nullable=False)
    min_order_value = db.Column(db.Float, default=0.0)
    max_discount_value = db.Column(db.Float, nullable=True)
    valid_from = db.Column(db.DateTime, default=datetime.utcnow)
    valid_until = db.Column(db.DateTime, nullable=True)
    applicable_category = db.Column(db.String(100), nullable=True, index=True)
    applicable_product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=True, index=True)
    verification_status = db.Column(db.String(50), default="unverified", index=True)  # verified, unverified, expired, invalid
    source_type = db.Column(db.String(50), default="demo")  # demo, official, dataset, manual
    terms_and_conditions = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_verified_at = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, default=True, index=True)

    retailer = db.relationship("Retailer", back_populates="coupons")
    applicable_product = db.relationship("Product")

    def __init__(
        self,
        code: str,
        title: str,
        discount_type: str,
        discount_value: float,
        retailer_id: Optional[int] = None,
        description: Optional[str] = None,
        min_order_value: float = 0.0,
        max_discount_value: Optional[float] = None,
        valid_from: Optional[datetime] = None,
        valid_until: Optional[datetime] = None,
        applicable_category: Optional[str] = None,
        applicable_product_id: Optional[int] = None,
        verification_status: str = "unverified",
        source_type: str = "demo",
        terms_and_conditions: Optional[str] = None,
        created_at: Optional[datetime] = None,
        last_verified_at: Optional[datetime] = None,
        is_active: bool = True,
        **kwargs: Any,
    ):
        super().__init__(**kwargs)
        self.code = code.strip().upper() if code else ""
        self.title = title
        self.discount_type = discount_type
        self.discount_value = float(discount_value)
        self.retailer_id = retailer_id
        self.description = description
        self.min_order_value = float(min_order_value or 0.0)
        self.max_discount_value = float(max_discount_value) if max_discount_value is not None else None
        self.valid_from = valid_from or datetime.utcnow()
        self.valid_until = valid_until
        self.applicable_category = applicable_category
        self.applicable_product_id = applicable_product_id
        self.verification_status = verification_status
        self.source_type = source_type
        self.terms_and_conditions = terms_and_conditions
        self.created_at = created_at or datetime.utcnow()
        self.last_verified_at = last_verified_at
        self.is_active = is_active

    @property
    def is_expired(self) -> bool:
        """Determines if the coupon has exceeded its valid_until expiration date."""
        if self.valid_until and datetime.utcnow() > self.valid_until:
            return True
        return False

    @property
    def is_valid_now(self) -> bool:
        """Checks if coupon is currently active and within temporal validity boundaries."""
        if not self.is_active:
            return False
        now = datetime.utcnow()
        if self.valid_from and now < self.valid_from:
            return False
        if self.valid_until and now > self.valid_until:
            return False
        return True

    @property
    def effective_status(self) -> str:
        """
        Synthesizes active state, expiration, and verification into a single status indicator.
        """
        if not self.is_active:
            return "inactive"
        if self.is_expired:
            return "expired"
        return self.verification_status or "unverified"

    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "title": self.title,
            "description": self.description,
            "retailer_id": self.retailer_id,
            "retailer_name": self.retailer.name if self.retailer else "All Retailers",
            "retailer_code": self.retailer.code if self.retailer else None,
            "discount_type": self.discount_type,
            "discount_value": round(float(self.discount_value), 2),
            "min_order_value": round(float(self.min_order_value or 0.0), 2),
            "max_discount_value": round(float(self.max_discount_value), 2) if self.max_discount_value is not None else None,
            "valid_from": self.valid_from.isoformat() + "Z" if self.valid_from else None,
            "valid_until": self.valid_until.isoformat() + "Z" if self.valid_until else None,
            "applicable_category": self.applicable_category,
            "applicable_product_id": self.applicable_product_id,
            "applicable_product_name": self.applicable_product.name if self.applicable_product else None,
            "verification_status": self.verification_status,
            "effective_status": self.effective_status,
            "is_expired": self.is_expired,
            "is_valid_now": self.is_valid_now,
            "source_type": self.source_type,
            "terms_and_conditions": self.terms_and_conditions,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "last_verified_at": self.last_verified_at.isoformat() + "Z" if self.last_verified_at else None,
            "is_active": self.is_active,
        }

def ensure_coupon_schema():
    """
    Safely inspects existing coupons table and adds Phase 4 columns if missing.
    Protects existing SQLite databases without destructive table drops.
    """
    from sqlalchemy import inspect, text
    try:
        inspector = inspect(db.engine)
        if "coupons" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("coupons")]
            with db.engine.connect() as conn:
                if "applicable_category" not in columns:
                    conn.execute(text("ALTER TABLE coupons ADD COLUMN applicable_category VARCHAR(100)"))
                if "applicable_product_id" not in columns:
                    conn.execute(text("ALTER TABLE coupons ADD COLUMN applicable_product_id INTEGER"))
                if "verification_status" not in columns:
                    conn.execute(text("ALTER TABLE coupons ADD COLUMN verification_status VARCHAR(50) DEFAULT 'unverified'"))
                if "source_type" not in columns:
                    conn.execute(text("ALTER TABLE coupons ADD COLUMN source_type VARCHAR(50) DEFAULT 'demo'"))
                if "terms_and_conditions" not in columns:
                    conn.execute(text("ALTER TABLE coupons ADD COLUMN terms_and_conditions TEXT"))
                if "created_at" not in columns:
                    conn.execute(text("ALTER TABLE coupons ADD COLUMN created_at DATETIME"))
                if "last_verified_at" not in columns:
                    conn.execute(text("ALTER TABLE coupons ADD COLUMN last_verified_at DATETIME"))
                conn.commit()
    except Exception:
        pass


