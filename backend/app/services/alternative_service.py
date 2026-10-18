import re
from typing import Dict, Any, Optional, List, Tuple
from app.models import Product, Offer, Retailer
from app.services.price_comparison_service import PriceComparisonService
from app.extensions import db

class AlternativeService:
    """
    Intelligent Product Alternatives & Similarity Engine.
    Employs an explainable multi-attribute weighted similarity model:
    - Category Compatibility (35%)
    - Technical Specification Overlap (30%)
    - Price Proximity (25%)
    - Brand Alignment (10%)
    Integrates directly with live/stored offer data and landed-price calculations.
    """

    # Similarity scoring weights (Sum = 1.0)
    WEIGHT_CATEGORY = 0.35
    WEIGHT_SPECS = 0.30
    WEIGHT_PRICE = 0.25
    WEIGHT_BRAND = 0.10

    @classmethod
    def get_alternatives(
        cls,
        product_id: int,
        min_similarity: float = 30.0,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        brand: Optional[str] = None,
        sort: str = "similarity",
        page: int = 1,
        per_page: int = 10
    ) -> Dict[str, Any]:
        """
        Discovers and ranks similar product alternatives for a specified product.
        Excludes the target product itself and unrelated product categories.
        """
        source_product = Product.query.get(product_id)
        if not source_product:
            return {
                "error": "PRODUCT_NOT_FOUND",
                "message": f"Product #{product_id} was not found."
            }

        # Query candidates in the same category, excluding the source product
        candidates_query = Product.query.filter(
            Product.id != product_id,
            Product.category == source_product.category
        )

        if brand and brand.strip():
            candidates_query = candidates_query.filter(
                Product.brand.ilike(f"%{brand.strip()}%")
            )

        candidates = candidates_query.all()

        # Score and enrich all candidates
        scored_alternatives = []
        source_pricing = cls._get_product_pricing_summary(source_product.id)
        source_ref_price = source_pricing["best_listed_price"] or float(source_product.base_mrp)

        for cand in candidates:
            cand_pricing = cls._get_product_pricing_summary(cand.id)
            cand_ref_price = cand_pricing["best_listed_price"] or float(cand.base_mrp)

            # Apply budget filters
            if min_price is not None and cand_ref_price < float(min_price):
                continue
            if max_price is not None and cand_ref_price > float(max_price):
                continue

            # Compute weighted similarity and explanation
            sim_result = cls._calculate_similarity(
                source_product=source_product,
                candidate_product=cand,
                source_price=source_ref_price,
                candidate_price=cand_ref_price,
                candidate_pricing=cand_pricing
            )

            if sim_result["score"] < min_similarity:
                continue

            price_diff = round(cand_ref_price - source_ref_price, 2)
            price_diff_pct = round(((cand_ref_price - source_ref_price) / source_ref_price) * 100, 1) if source_ref_price > 0 else 0.0

            scored_alternatives.append({
                "product": cand.to_dict(),
                "similarity_score": sim_result["score"],
                "score_breakdown": sim_result["breakdown"],
                "explanations": sim_result["explanations"],
                "pricing": cand_pricing,
                "effective_price": cand_ref_price,
                "price_difference": price_diff,
                "price_difference_pct": price_diff_pct,
                "is_cheaper": cand_ref_price < source_ref_price,
                "savings": round(source_ref_price - cand_ref_price, 2) if cand_ref_price < source_ref_price else 0.0,
            })

        def _get_effective_price(item: Dict[str, Any]) -> float:
            """
            Extracts effective comparison price: best listed offer price,
            falling back to base MRP. Missing prices evaluate to float('inf').
            """
            pricing = item.get("pricing") or {}
            best_listed = pricing.get("best_listed_price")
            if best_listed is not None:
                try:
                    val = float(best_listed)
                    if val > 0:
                        return val
                except (ValueError, TypeError):
                    pass
            prod = item.get("product") or {}
            base_mrp = prod.get("base_mrp")
            if base_mrp is not None:
                try:
                    val = float(base_mrp)
                    if val > 0:
                        return val
                except (ValueError, TypeError):
                    pass
            return float("inf")

        # Sorting
        if sort in ("price_asc", "price"):
            scored_alternatives.sort(
                key=lambda x: (
                    0 if _get_effective_price(x) != float("inf") else 1,
                    _get_effective_price(x),
                    -x["similarity_score"]
                )
            )
        elif sort == "price_desc":
            scored_alternatives.sort(
                key=lambda x: (
                    0 if _get_effective_price(x) != float("inf") else 1,
                    -_get_effective_price(x) if _get_effective_price(x) != float("inf") else 0.0,
                    -x["similarity_score"]
                )
            )
        elif sort in ("landed_price_asc", "landed_price"):
            # Unknown landed prices are sorted to the end (never ranked cheapest or free)
            scored_alternatives.sort(
                key=lambda x: (
                    0 if x["pricing"]["best_landed_price"] is not None else 1,
                    x["pricing"]["best_landed_price"] if x["pricing"]["best_landed_price"] is not None else float("inf"),
                    -x["similarity_score"]
                )
            )
        elif sort == "landed_price_desc":
            scored_alternatives.sort(
                key=lambda x: (
                    0 if x["pricing"]["best_landed_price"] is not None else 1,
                    -(x["pricing"]["best_landed_price"]) if x["pricing"]["best_landed_price"] is not None else 0.0,
                    -x["similarity_score"]
                )
            )
        else:  # default: similarity desc
            scored_alternatives.sort(
                key=lambda x: (
                    -x["similarity_score"],
                    _get_effective_price(x)
                )
            )

        # Pagination
        total_count = len(scored_alternatives)
        page = max(1, page)
        per_page = min(max(1, per_page), 50)
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        paginated_items = scored_alternatives[start_idx:end_idx]
        total_pages = (total_count + per_page - 1) // per_page if total_count > 0 else 1

        return {
            "source_product": source_product.to_dict(),
            "source_pricing": source_pricing,
            "alternatives": paginated_items,
            "total_count": total_count,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1,
            "scoring_methodology": {
                "category_weight": f"{int(cls.WEIGHT_CATEGORY * 100)}%",
                "specifications_weight": f"{int(cls.WEIGHT_SPECS * 100)}%",
                "price_weight": f"{int(cls.WEIGHT_PRICE * 100)}%",
                "brand_weight": f"{int(cls.WEIGHT_BRAND * 100)}%",
            }
        }

    @classmethod
    def compare_products(
        cls,
        source_product_id: int,
        alternative_ids: List[int]
    ) -> Dict[str, Any]:
        """
        Generates a detailed attribute-by-attribute side-by-side comparison
        between a source product and selected alternatives.
        """
        source_product = Product.query.get(source_product_id)
        if not source_product:
            return {"error": "PRODUCT_NOT_FOUND", "message": f"Product #{source_product_id} not found."}

        target_ids = [aid for aid in alternative_ids if aid != source_product_id]
        candidates = Product.query.filter(Product.id.in_(target_ids)).all() if target_ids else []

        all_products = [source_product] + candidates
        all_specs_keys = set()
        for p in all_products:
            specs = p.specs_json or {}
            all_specs_keys.update(specs.keys())

        comparison_matrix = []
        for key in sorted(all_specs_keys):
            row = {"specification": key, "values": {}}
            for p in all_products:
                val = (p.specs_json or {}).get(key, "—")
                row["values"][str(p.id)] = val
            comparison_matrix.append(row)

        product_summaries = []
        for p in all_products:
            pricing = cls._get_product_pricing_summary(p.id)
            product_summaries.append({
                "product": p.to_dict(),
                "pricing": pricing,
                "is_source": p.id == source_product_id
            })

        return {
            "source_id": source_product_id,
            "products": product_summaries,
            "specifications_matrix": comparison_matrix
        }

    # =========================================================================
    # Internal Calculation Helpers
    # =========================================================================

    @classmethod
    def _calculate_similarity(
        cls,
        source_product: Product,
        candidate_product: Product,
        source_price: float,
        candidate_price: float,
        candidate_pricing: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Calculates explainable 0-100 similarity score across 4 pillars.
        """
        explanations = []
        candidate_pricing = candidate_pricing or {}

        # 1. Category Score (0 or 100)
        is_same_cat = (source_product.category or "").strip().lower() == (candidate_product.category or "").strip().lower()
        cat_score = 100.0 if is_same_cat else 0.0
        if is_same_cat:
            explanations.append(f"Same product category ({source_product.category})")

        # 2. Brand Score
        is_same_brand = (source_product.brand or "").strip().lower() == (candidate_product.brand or "").strip().lower()
        brand_score = 100.0 if is_same_brand else 50.0
        if is_same_brand:
            explanations.append(f"Same brand ecosystem ({source_product.brand})")
        else:
            explanations.append(f"Alternative manufacturer ({candidate_product.brand} vs {source_product.brand})")

        # 3. Price Proximity Score
        # Decreases linearly with percentage deviation
        if source_price > 0:
            pct_diff = abs(candidate_price - source_price) / source_price
            price_score = max(0.0, round(100.0 - (pct_diff * 100.0), 1))
        else:
            price_score = 50.0

        if candidate_price < source_price:
            savings = round(source_price - candidate_price, 2)
            if candidate_pricing.get("in_stock_offers_count", 0) > 0:
                explanations.append(f"Lower price point (Save ₹{savings:,.2f})")
            else:
                explanations.append(f"Lower catalog MRP (Save ₹{savings:,.2f} vs target, currently out of stock)")
        elif abs(candidate_price - source_price) <= (source_price * 0.15):
            explanations.append(f"Comparable price point within 15% (₹{candidate_price:,.2f} vs ₹{source_price:,.2f})")

        # 4. Specifications Similarity Score
        # Missing specifications are strictly NOT treated as matching
        spec_score, spec_explanations = cls._compare_specifications(
            source_product.specs_json or {},
            candidate_product.specs_json or {}
        )
        explanations.extend(spec_explanations)

        # Weighted combination
        final_score = round(
            (cat_score * cls.WEIGHT_CATEGORY) +
            (spec_score * cls.WEIGHT_SPECS) +
            (price_score * cls.WEIGHT_PRICE) +
            (brand_score * cls.WEIGHT_BRAND),
            1
        )
        final_score = min(max(final_score, 0.0), 100.0)

        return {
            "score": final_score,
            "breakdown": {
                "category_score": cat_score,
                "specifications_score": spec_score,
                "price_score": price_score,
                "brand_score": brand_score,
            },
            "explanations": explanations
        }

    @classmethod
    def _compare_specifications(
        cls,
        source_specs: Dict[str, Any],
        candidate_specs: Dict[str, Any]
    ) -> Tuple[float, List[str]]:
        """
        Compares two specs_json dictionaries and produces a 0-100 score + explanations.
        Missing specifications on either side are strictly NOT assumed matching.
        """
        if not source_specs or not candidate_specs:
            return 0.0, ["Limited technical specifications recorded for comparison"]

        source_norm = {
            k.strip().lower(): (k, v)
            for k, v in source_specs.items()
            if v is not None and str(v).strip()
        }
        cand_norm = {
            k.strip().lower(): (k, v)
            for k, v in candidate_specs.items()
            if v is not None and str(v).strip()
        }

        source_keys = set(source_norm.keys())
        cand_keys = set(cand_norm.keys())

        if not source_keys or not cand_keys:
            return 0.0, ["Insufficient technical specifications recorded for comparison"]

        common_keys = source_keys.intersection(cand_keys)

        if not common_keys:
            return 0.0, ["Different technical feature sets recorded"]

        matches = 0.0
        explanations = []

        for k in common_keys:
            orig_k, s_val = source_norm[k]
            _, c_val = cand_norm[k]
            s_str = str(s_val).strip().lower()
            c_str = str(c_val).strip().lower()

            if s_str == c_str:
                matches += 1.0
                explanations.append(f"Matching {orig_k} ({s_val})")
            else:
                # Check for numerical / token overlap
                s_tokens = set(re.findall(r"\w+", s_str))
                c_tokens = set(re.findall(r"\w+", c_str))
                overlap = s_tokens.intersection(c_tokens)
                if overlap:
                    matches += 0.5
                    explanations.append(f"Similar {orig_k} ({c_val} vs {s_val})")

        # Score relative to the union of attributes: missing attributes do not count as matching
        all_keys_count = len(source_keys.union(cand_keys))
        score = round((matches / max(all_keys_count, 1)) * 100.0, 1)
        score = min(max(score, 0.0), 100.0)

        if not explanations:
            explanations.append("Different technical specifications across compared attributes")

        return score, explanations[:3]  # Return top 3 specification highlights

    @classmethod
    def _get_product_pricing_summary(cls, product_id: int) -> Dict[str, Any]:
        """
        Queries current offers for a product to extract best listed price,
        best landed price, availability, and offer count.
        """
        offers = Offer.query.filter_by(product_id=product_id).all()
        in_stock_offers = [o for o in offers if o.is_available and o.price and float(o.price) > 0]

        best_listed = None
        best_landed = None
        cheapest_offer = None
        has_unknown_shipping = False

        if in_stock_offers:
            # Find lowest listed price
            cheapest_offer = min(in_stock_offers, key=lambda x: float(x.price))
            best_listed = round(float(cheapest_offer.price), 2)

            # Find lowest calculable landed price among offers with known shipping
            known_shipping_offers = [o for o in in_stock_offers if not o.shipping_is_unknown]
            if known_shipping_offers:
                best_landed_offer = min(known_shipping_offers, key=lambda x: x.total_cost)
                best_landed = round(float(best_landed_offer.total_cost), 2)
            else:
                has_unknown_shipping = True
        elif offers:
            # All offers out of stock
            lowest_all = min(offers, key=lambda x: float(x.price) if x.price else float("inf"))
            best_listed = round(float(lowest_all.price), 2) if lowest_all.price else None

        retailer_names = list(set(o.retailer.name for o in in_stock_offers if o.retailer))

        return {
            "best_listed_price": best_listed,
            "best_landed_price": best_landed,
            "shipping_is_unknown": has_unknown_shipping or (cheapest_offer and cheapest_offer.shipping_is_unknown),
            "total_offers_count": len(offers),
            "in_stock_offers_count": len(in_stock_offers),
            "availability_status": "In Stock" if in_stock_offers else ("Out of Stock" if offers else "No Offers"),
            "available_retailers": retailer_names,
            "source_type": cheapest_offer.source_type if cheapest_offer else "demo"
        }
