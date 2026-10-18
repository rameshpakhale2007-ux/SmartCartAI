from typing import List, Dict, Any, Optional
from app.models import Product, Offer, Retailer
from app.extensions import db

class PriceComparisonService:
    """
    Engine for multi-retailer price comparison and landed cost computation.
    Evaluates: Estimated Total = Listed Price + Known Shipping Cost - Validated Discount.
    Explicitly handles unknown shipping costs and excludes unavailable offers from best-deal recommendations.
    """

    @staticmethod
    def evaluate_offer(offer: Offer, applicable_discount: float = 0.0) -> Dict[str, Any]:
        """
        Evaluates a single offer with landed cost calculations and status flags.
        """
        raw_dict = offer.to_dict()
        listed_price = float(offer.price)
        shipping_cost = float(offer.shipping_cost) if offer.shipping_cost is not None else None
        shipping_unknown = shipping_cost is None

        # Estimated total is calculable ONLY when shipping cost is known
        if not shipping_unknown:
            # Subtotal after validated discount (cannot fall below 0)
            discounted_price = max(0.0, listed_price - applicable_discount)
            estimated_total = round(discounted_price + shipping_cost, 2)
            is_complete = True
        else:
            estimated_total = None
            is_complete = False

        is_available = offer.is_available

        # Eligible means in stock AND calculable complete landed total
        is_eligible = is_available and is_complete

        return {
            **raw_dict,
            "applicable_discount": round(applicable_discount, 2),
            "estimated_total": estimated_total,
            "is_complete": is_complete,
            "is_available": is_available,
            "is_eligible": is_eligible,
            "is_cheapest_eligible": False,  # Will be assigned in compare_offers
            "notes": (
                "Landed total is incomplete because retailer shipping cost is unknown."
                if shipping_unknown
                else (
                    "Product is currently out of stock or unavailable from this retailer."
                    if not is_available
                    else "Verified eligible offer."
                )
            ),
        }

    @classmethod
    def compare_offers(
        cls,
        product_id: int,
        sort_by: str = "estimated_total",
        validated_discounts: Optional[Dict[int, float]] = None
    ) -> Dict[str, Any]:
        """
        Retrieves all offers for product_id, evaluates landed costs, determines cheapest eligible offer,
        and sorts according to requested criterion.
        """
        product = Product.query.get(product_id)
        if not product:
            return {"error": "PRODUCT_NOT_FOUND", "message": f"Product with ID {product_id} was not found."}

        validated_discounts = validated_discounts or {}
        offers = Offer.query.filter_by(product_id=product_id).all()

        evaluated_offers: List[Dict[str, Any]] = []
        for o in offers:
            disc = validated_discounts.get(o.id, 0.0)
            eval_dict = cls.evaluate_offer(o, applicable_discount=disc)
            evaluated_offers.append(eval_dict)

        # Identify cheapest eligible offer
        # Must be eligible: available AND has complete calculable estimated_total
        eligible_offers = [o for o in evaluated_offers if o["is_eligible"] and o["estimated_total"] is not None]

        cheapest_eligible_offer = None
        if eligible_offers:
            # Sort eligible offers by estimated_total ascending
            cheapest_eligible_offer = min(eligible_offers, key=lambda x: x["estimated_total"])
            # Mark in evaluated_offers
            for o in evaluated_offers:
                if o["id"] == cheapest_eligible_offer["id"]:
                    o["is_cheapest_eligible"] = True

        # Sort all evaluated offers
        if sort_by == "price":
            evaluated_offers.sort(key=lambda x: x["price"])
        elif sort_by == "retailer":
            evaluated_offers.sort(key=lambda x: x["retailer_name"].lower())
        else:
            # Default: sort by estimated_total
            # Complete eligible offers first sorted by estimated_total, then incomplete/unavailable
            def sort_key(item):
                total = item["estimated_total"]
                is_elig = item["is_eligible"]
                if is_elig and total is not None:
                    return (0, total)
                elif total is not None:
                    return (1, total)
                else:
                    return (2, item["price"])

            evaluated_offers.sort(key=sort_key)

        # Summary statistics
        price_spread = 0.0
        if len(evaluated_offers) >= 2:
            prices = [o["price"] for o in evaluated_offers]
            price_spread = round(max(prices) - min(prices), 2)

        return {
            "product": product.to_dict(),
            "total_offers": len(evaluated_offers),
            "available_offers_count": sum(1 for o in evaluated_offers if o["is_available"]),
            "cheapest_eligible_offer": cheapest_eligible_offer,
            "offers": evaluated_offers,
            "price_spread": price_spread,
            "has_unknown_shipping": any(o["shipping_is_unknown"] for o in evaluated_offers),
        }
