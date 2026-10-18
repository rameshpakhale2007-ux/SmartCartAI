from typing import List, Dict, Any, Optional
from app.providers.base_provider import BaseProvider
from app.models import Product, Offer, Retailer
from app.extensions import db

class DemoProductProvider(BaseProvider):
    """
    Demonstration data provider that supplies seeded fixtures.
    All data returned is explicitly labeled as demonstration data ('demo').
    """

    def __init__(self):
        super().__init__(source_name="SmartCart Demo Fixtures", source_type="demo")

    def search_products(self, query: Optional[str] = None, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        filters = filters or {}
        q = Product.query

        if query:
            search_term = f"%{query.strip()}%"
            q = q.filter(
                (Product.name.ilike(search_term)) |
                (Product.brand.ilike(search_term)) |
                (Product.category.ilike(search_term)) |
                (Product.description.ilike(search_term))
            )

        if filters.get("category"):
            q = q.filter(Product.category.ilike(filters["category"].strip()))

        if filters.get("brand"):
            q = q.filter(Product.brand.ilike(filters["brand"].strip()))

        products = q.all()
        results = []
        for p in products:
            p_dict = p.to_dict()
            p_dict["source_type"] = self.source_type
            results.append(p_dict)

        return results

    def get_product_details(self, product_id: int) -> Optional[Dict[str, Any]]:
        prod = Product.query.get(product_id)
        if not prod:
            return None
        data = prod.to_dict()
        data["source_type"] = self.source_type
        return data

    def get_offers(self, product_id: int) -> List[Dict[str, Any]]:
        offers = Offer.query.filter_by(product_id=product_id).all()
        results = []
        for o in offers:
            o_dict = o.to_dict()
            o_dict["source_type"] = self.source_type
            results.append(o_dict)
        return results

    def get_current_price(self, product_id: int) -> Optional[float]:
        cheapest = Offer.query.filter_by(product_id=product_id).order_by(Offer.price.asc()).first()
        return round(float(cheapest.price), 2) if cheapest else None
