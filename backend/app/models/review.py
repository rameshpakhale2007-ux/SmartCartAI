from datetime import datetime
from typing import Optional, Any
from app.extensions import db

class Review(db.Model):
    __tablename__ = "reviews"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    author = db.Column(db.String(150), default="Anonymous Customer")
    rating = db.Column(db.Float, nullable=False)
    title = db.Column(db.String(255), nullable=True)
    content = db.Column(db.Text, nullable=False)
    review_date = db.Column(db.DateTime, default=datetime.utcnow)
    verified_purchase = db.Column(db.Boolean, default=True)
    source_type = db.Column(db.String(50), default="demo")  # demo, dataset, uploaded

    product = db.relationship("Product", back_populates="reviews")

    def __init__(
        self,
        product_id: Optional[int] = None,
        rating: Optional[float] = None,
        content: Optional[str] = None,
        author: str = "Anonymous Customer",
        title: Optional[str] = None,
        review_date: Optional[datetime] = None,
        verified_purchase: bool = True,
        source_type: str = "demo",
        id: Optional[int] = None,
        **kwargs: Any,
    ):
        super().__init__(**kwargs)
        if id is not None:
            self.id = id
        if product_id is not None:
            self.product_id = product_id
        if rating is not None:
            self.rating = float(rating)
        if content is not None:
            self.content = content
        self.author = author
        self.title = title
        self.review_date = review_date or datetime.utcnow()
        self.verified_purchase = verified_purchase
        self.source_type = source_type

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "author": self.author,
            "rating": self.rating,
            "title": self.title,
            "content": self.content,
            "review_date": self.review_date.isoformat() if self.review_date else None,
            "verified_purchase": self.verified_purchase,
            "source_type": self.source_type,
        }
