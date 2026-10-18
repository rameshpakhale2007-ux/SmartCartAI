import statistics
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Tuple
from app.models import Product, Offer, Retailer, PriceHistory
from app.extensions import db

class HonestyIndexService:
    """
    Fake-Discount Detector & Honesty Index Evaluation Engine.
    Analyzes whether advertised discounts and strike-through reference prices
    are supported by actual historical price-history evidence.

    Uses an explainable, 4-pillar weighted model:
    1. Historical Price Consistency (35%)
    2. Advertised Reference Price Credibility (30%)
    3. Pre-Promotion Price Movement (20%)
    4. Data Quality & Evidence Coverage (15%)
    """

    SUPPORTED_WINDOWS = (30, 60, 90)
    WEIGHT_CONSISTENCY = 0.35
    WEIGHT_REFERENCE_PRICE = 0.30
    WEIGHT_PRE_PROMO_HIKE = 0.20
    WEIGHT_DATA_QUALITY = 0.15

    CLASSIFICATION_STRONG = "Strong Historical Support"
    CLASSIFICATION_MODERATE = "Moderate Historical Support"
    CLASSIFICATION_REVIEW = "Price Pattern Requires Review"
    CLASSIFICATION_MISLEADING = "Potentially Misleading Discount"
    CLASSIFICATION_INSUFFICIENT = "Insufficient Historical Evidence"

    @classmethod
    def analyze_product_honesty(
        cls,
        product_id: int,
        retailer_id: Optional[int] = None,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Performs an in-depth honesty analysis for a specific product and optional retailer.
        Calculates advertised discounts, historical benchmarks, pre-promo movement,
        and evidence-backed honesty index score.
        """
        product = Product.query.get(product_id)
        if not product:
            return {
                "error": "PRODUCT_NOT_FOUND",
                "message": f"Product #{product_id} was not found."
            }

        if days not in cls.SUPPORTED_WINDOWS:
            return {
                "error": "INVALID_TIME_WINDOW",
                "message": f"Invalid days parameter '{days}'. Supported windows are 30, 60, or 90 days."
            }

        now = datetime.utcnow()
        analysis_timestamp = now.isoformat() + "Z"

        # 1. Resolve Active Offer
        offer_query = Offer.query.filter_by(product_id=product_id)
        if retailer_id is not None:
            offer_query = offer_query.filter_by(retailer_id=retailer_id)
        
        # Prefer in-stock offer with best price
        offers = offer_query.all()
        current_offer: Optional[Offer] = None
        if offers:
            in_stock = [o for o in offers if o.is_available and o.price and float(o.price) > 0]
            if in_stock:
                current_offer = min(in_stock, key=lambda x: float(x.price))
            else:
                current_offer = min(offers, key=lambda x: float(x.price) if x.price else float("inf"))

        current_retailer = current_offer.retailer if current_offer and current_offer.retailer else None
        target_retailer_id = current_retailer.id if current_retailer else retailer_id

        # 2. Extract Listed and Advertised Reference Prices
        current_price = float(current_offer.price) if current_offer and current_offer.price else None
        
        # Advertised reference price: strike-through original_price on offer, fallback to product.base_mrp
        raw_reference_price = None
        if current_offer and current_offer.original_price and float(current_offer.original_price) > 0:
            raw_reference_price = float(current_offer.original_price)
        elif product.base_mrp and float(product.base_mrp) > 0:
            raw_reference_price = float(product.base_mrp)

        advertised_reference_price = round(raw_reference_price, 2) if raw_reference_price is not None else None

        # Calculate Advertised Discount
        advertised_discount_pct = None
        advertised_savings = None
        if current_price is not None and advertised_reference_price is not None and advertised_reference_price > 0:
            if current_price < advertised_reference_price:
                advertised_discount_pct = round(
                    ((advertised_reference_price - current_price) / advertised_reference_price) * 100.0,
                    1
                )
                advertised_savings = round(advertised_reference_price - current_price, 2)
            else:
                advertised_discount_pct = 0.0
                advertised_savings = 0.0

        # 3. Retrieve Historical Observations (isolated by retailer when target_retailer_id specified)
        cutoff_date = now - timedelta(days=days)
        hist_query = PriceHistory.query.filter(
            PriceHistory.product_id == product_id,
            PriceHistory.recorded_at >= cutoff_date,
            PriceHistory.recorded_at <= now,
            PriceHistory.price > 0
        )
        if target_retailer_id is not None:
            hist_query = hist_query.filter(PriceHistory.retailer_id == target_retailer_id)

        observations = hist_query.order_by(PriceHistory.recorded_at.asc()).all()

        # Discover all retailers with history for this product
        available_retailer_records = (
            db.session.query(Retailer)
            .join(PriceHistory, PriceHistory.retailer_id == Retailer.id)
            .filter(
                PriceHistory.product_id == product_id,
                PriceHistory.price > 0,
                PriceHistory.recorded_at <= now
            )
            .distinct()
            .all()
        )
        available_retailers = [
            {"id": r.id, "name": r.name, "code": r.code}
            for r in available_retailer_records
        ]

        # 4. Check Evidence Sufficiency
        obs_count = len(observations)
        is_evidence_sufficient = obs_count >= 3 and current_price is not None

        provenance = observations[-1].source_type if observations else (current_offer.source_type if current_offer else "demo")

        # 5. Handle Insufficient Evidence
        if not is_evidence_sufficient:
            reasons = []
            if current_price is None:
                reasons.append("No active listed offer found for this product/retailer")
            if obs_count == 0:
                reasons.append(f"Zero historical price observations recorded in the past {days} days")
            elif obs_count < 3:
                reasons.append(f"Only {obs_count} observation(s) available; at least 3 are required for statistical evaluation")

            return {
                "product": product.to_dict(),
                "retailer": current_retailer.to_dict() if current_retailer else None,
                "days": days,
                "analysis_timestamp": analysis_timestamp,
                "is_evidence_sufficient": False,
                "insufficient_reasons": reasons,
                "classification": cls.CLASSIFICATION_INSUFFICIENT,
                "honesty_score": None,
                "component_scores": None,
                "explanations": [
                    "Historical observations are insufficient to reliably evaluate the credibility of the advertised discount."
                ] + reasons,
                "current_price": round(current_price, 2) if current_price is not None else None,
                "advertised_reference_price": advertised_reference_price,
                "advertised_discount_pct": advertised_discount_pct,
                "advertised_savings": advertised_savings,
                "benchmarks": None,
                "observations_count": obs_count,
                "observations": [o.to_dict() for o in observations],
                "available_retailers": available_retailers,
                "provenance": provenance,
                "limitations": (
                    "Sparse price history. Data is not fabricated when insufficient. "
                    "Observations must reflect confirmed retailer snapshots."
                )
            }

        # 6. Compute Historical Benchmarks
        prices = [float(o.price) for o in observations]
        hist_min = min(prices)
        hist_max = max(prices)
        hist_median = statistics.median(prices)
        latest_hist_price = prices[-1]
        earliest_hist_price = prices[0]
        price_change = round(latest_hist_price - earliest_hist_price, 2)
        price_change_pct = round(((latest_hist_price - earliest_hist_price) / earliest_hist_price) * 100.0, 1) if earliest_hist_price > 0 else 0.0

        benchmarks = {
            "historical_min": round(hist_min, 2),
            "historical_max": round(hist_max, 2),
            "historical_median": round(hist_median, 2),
            "latest_historical_price": round(latest_hist_price, 2),
            "earliest_historical_price": round(earliest_hist_price, 2),
            "price_spread": round(hist_max - hist_min, 2),
            "price_change": price_change,
            "price_change_pct": price_change_pct,
            "observation_count": obs_count,
            "period_start": observations[0].recorded_at.isoformat() + "Z" if observations[0].recorded_at else None,
            "period_end": observations[-1].recorded_at.isoformat() + "Z" if observations[-1].recorded_at else None,
        }

        # 7. Evaluate 4 Pillars and Generate Explanations
        scores_breakdown, explanations = cls._compute_scoring_components(
            current_price=current_price,
            advertised_reference_price=advertised_reference_price,
            benchmarks=benchmarks,
            observations=observations,
            days=days
        )

        # Weighted final score
        final_score = round(
            (scores_breakdown["consistency_score"] * cls.WEIGHT_CONSISTENCY) +
            (scores_breakdown["reference_price_score"] * cls.WEIGHT_REFERENCE_PRICE) +
            (scores_breakdown["pre_promo_hike_score"] * cls.WEIGHT_PRE_PROMO_HIKE) +
            (scores_breakdown["data_quality_score"] * cls.WEIGHT_DATA_QUALITY),
            1
        )
        final_score = min(max(final_score, 0.0), 100.0)

        # 8. Classify Findings
        classification = cls._classify_score(final_score, scores_breakdown)

        # Comparison summary metrics
        real_savings_vs_median = round(hist_median - current_price, 2) if current_price < hist_median else 0.0
        real_discount_vs_median_pct = round(((hist_median - current_price) / hist_median) * 100.0, 1) if current_price < hist_median and hist_median > 0 else 0.0

        return {
            "product": product.to_dict(),
            "retailer": current_retailer.to_dict() if current_retailer else None,
            "days": days,
            "analysis_timestamp": analysis_timestamp,
            "is_evidence_sufficient": True,
            "classification": classification,
            "honesty_score": final_score,
            "component_scores": scores_breakdown,
            "scoring_weights": {
                "consistency": f"{int(cls.WEIGHT_CONSISTENCY * 100)}%",
                "reference_price": f"{int(cls.WEIGHT_REFERENCE_PRICE * 100)}%",
                "pre_promo_hike": f"{int(cls.WEIGHT_PRE_PROMO_HIKE * 100)}%",
                "data_quality": f"{int(cls.WEIGHT_DATA_QUALITY * 100)}%",
            },
            "explanations": explanations,
            "current_price": round(current_price, 2),
            "advertised_reference_price": advertised_reference_price,
            "advertised_discount_pct": advertised_discount_pct,
            "advertised_savings": advertised_savings,
            "real_savings_vs_median": real_savings_vs_median,
            "real_discount_vs_median_pct": real_discount_vs_median_pct,
            "benchmarks": benchmarks,
            "observations_count": obs_count,
            "observations": [o.to_dict() for o in observations],
            "available_retailers": available_retailers,
            "provenance": provenance,
            "limitations": (
                f"Analysis is based on {obs_count} historical price observations recorded within the past {days} days. "
                "The Honesty Index assesses statistical consistency against observed data and is not an accusation of fraud."
            )
        }

    @classmethod
    def analyze_retailers_honesty(
        cls,
        product_id: int,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Generates individual, isolated honesty analyses for each retailer offering this product.
        Never combines observations from unrelated retailers into a single retailer score.
        """
        product = Product.query.get(product_id)
        if not product:
            return {
                "error": "PRODUCT_NOT_FOUND",
                "message": f"Product #{product_id} was not found."
            }

        offers = Offer.query.filter_by(product_id=product_id).all()
        retailer_ids = list(set(o.retailer_id for o in offers if o.retailer_id))

        results = []
        for r_id in retailer_ids:
            analysis = cls.analyze_product_honesty(
                product_id=product_id,
                retailer_id=r_id,
                days=days
            )
            results.append(analysis)

        return {
            "product_id": product_id,
            "days": days,
            "retailers_count": len(results),
            "analyses": results
        }

    @classmethod
    def get_honesty_summary(cls) -> Dict[str, Any]:
        """
        Derives catalog-wide honesty summary metrics across actual stored products and history.
        Does not invent synthetic data or artificial rankings.
        """
        products = Product.query.limit(20).all()
        total_products = Product.query.count()

        classifications_count = {
            cls.CLASSIFICATION_STRONG: 0,
            cls.CLASSIFICATION_MODERATE: 0,
            cls.CLASSIFICATION_REVIEW: 0,
            cls.CLASSIFICATION_MISLEADING: 0,
            cls.CLASSIFICATION_INSUFFICIENT: 0,
        }

        scored_list = []
        featured_analyses = []

        for p in products:
            res = cls.analyze_product_honesty(p.id, days=30)
            if "error" not in res:
                c = res.get("classification")
                if c in classifications_count:
                    classifications_count[c] += 1
                
                score = res.get("honesty_score")
                if score is not None:
                    scored_list.append(score)

                featured_analyses.append({
                    "product_id": p.id,
                    "product_name": p.name,
                    "category": p.category,
                    "classification": c,
                    "honesty_score": score,
                    "current_price": res.get("current_price"),
                    "advertised_discount_pct": res.get("advertised_discount_pct"),
                    "observations_count": res.get("observations_count", 0),
                    "is_evidence_sufficient": res.get("is_evidence_sufficient", False)
                })

        avg_score = round(statistics.mean(scored_list), 1) if scored_list else None

        return {
            "total_products_tracked": total_products,
            "products_sampled": len(products),
            "average_honesty_score": avg_score,
            "classification_breakdown": classifications_count,
            "sufficient_evidence_count": len(scored_list),
            "insufficient_evidence_count": classifications_count[cls.CLASSIFICATION_INSUFFICIENT],
            "featured_analyses": featured_analyses
        }

    # =========================================================================
    # Internal Calculation Helpers
    # =========================================================================

    @classmethod
    def _compute_scoring_components(
        cls,
        current_price: float,
        advertised_reference_price: Optional[float],
        benchmarks: Dict[str, Any],
        observations: List[PriceHistory],
        days: int
    ) -> Tuple[Dict[str, float], List[str]]:
        """
        Calculates each of the 4 component scores (0-100) and human-readable explanations.
        """
        explanations: List[str] = []
        hist_min = benchmarks["historical_min"]
        hist_max = benchmarks["historical_max"]
        hist_median = benchmarks["historical_median"]
        obs_count = benchmarks["observation_count"]

        # ---------------------------------------------------------------------
        # 1. Historical Price Consistency (35%)
        # ---------------------------------------------------------------------
        # Evaluates how favorable the current price is compared to the historical median and minimum.
        if current_price <= hist_min:
            consistency_score = 100.0
            explanations.append(f"Current price (₹{current_price:,.2f}) matches or beats the lowest observed price (₹{hist_min:,.2f}) in the past {days} days.")
        elif current_price < hist_median:
            # Scaled from 70 to 99 depending on how close to minimum
            span = hist_median - hist_min
            ratio = (hist_median - current_price) / span if span > 0 else 0.5
            consistency_score = round(70.0 + (ratio * 29.0), 1)
            savings_median = round(hist_median - current_price, 2)
            explanations.append(f"Current price is ₹{savings_median:,.2f} below the historical median (₹{hist_median:,.2f}).")
        elif current_price == hist_median:
            consistency_score = 60.0
            explanations.append(f"Current price exactly equals the historical median (₹{hist_median:,.2f}).")
        else:
            # current_price > hist_median: Buyer is paying more than historical median!
            excess = current_price - hist_median
            excess_pct = (excess / hist_median) if hist_median > 0 else 0.2
            consistency_score = max(10.0, round(50.0 - (excess_pct * 100.0), 1))
            explanations.append(f"Current price (₹{current_price:,.2f}) exceeds the {days}-day historical median (₹{hist_median:,.2f}) by ₹{excess:,.2f}.")

        # ---------------------------------------------------------------------
        # 2. Advertised Reference Price Credibility (30%)
        # ---------------------------------------------------------------------
        # Evaluates whether the strike-through reference price was ever observed in actual history.
        if advertised_reference_price is None or advertised_reference_price <= 0:
            ref_score = 70.0
            explanations.append("No explicit strike-through reference price was advertised; evaluating against catalog MRP.")
        elif advertised_reference_price <= hist_max * 1.02:
            # Reference price is consistent with the highest observed historical prices
            ref_score = 100.0
            explanations.append(f"Advertised reference price (₹{advertised_reference_price:,.2f}) aligns with the observed maximum price (₹{hist_max:,.2f}).")
        else:
            # Reference price exceeds the highest observed price in the period
            inflation = advertised_reference_price - hist_max
            inflation_pct = (inflation / hist_max) if hist_max > 0 else 0.2
            ref_score = max(10.0, round(100.0 - (inflation_pct * 150.0), 1))
            explanations.append(
                f"Advertised reference price (₹{advertised_reference_price:,.2f}) is ₹{inflation:,.2f} ({round(inflation_pct * 100, 1)}%) higher than the highest observed historical price (₹{hist_max:,.2f})."
            )

        # ---------------------------------------------------------------------
        # 3. Pre-Promotion Price Movement (20%)
        # ---------------------------------------------------------------------
        # Inspects whether the price was artificially raised immediately before the discount
        hike_score, hike_detected, hike_explanation = cls._evaluate_pre_promo_hike(
            observations=observations,
            current_price=current_price
        )
        explanations.append(hike_explanation)

        # ---------------------------------------------------------------------
        # 4. Data Quality & Coverage (15%)
        # ---------------------------------------------------------------------
        if obs_count >= 20:
            data_quality_score = 100.0
            explanations.append(f"High evidence density: {obs_count} verified historical observations across {days} days.")
        elif obs_count >= 10:
            data_quality_score = 85.0
            explanations.append(f"Good evidence coverage: {obs_count} verified observations.")
        elif obs_count >= 5:
            data_quality_score = 70.0
            explanations.append(f"Moderate evidence coverage: {obs_count} observations recorded.")
        else:
            data_quality_score = 50.0
            explanations.append(f"Limited observation density: {obs_count} observations available in the evaluation window.")

        scores = {
            "consistency_score": consistency_score,
            "reference_price_score": ref_score,
            "pre_promo_hike_score": hike_score,
            "data_quality_score": data_quality_score
        }

        return scores, explanations

    @classmethod
    def _evaluate_pre_promo_hike(
        cls,
        observations: List[PriceHistory],
        current_price: float
    ) -> Tuple[float, bool, str]:
        """
        Inspects whether a price surge occurred in recent observations before dropping to current price.
        """
        if len(observations) < 4:
            return 80.0, False, "Observation history is too short to establish prior price spike patterns."

        prices = [float(o.price) for o in observations]
        
        # Compare prices in the final 25% of observations against the initial 50%
        split_idx = max(1, int(len(prices) * 0.5))
        prior_prices = prices[:split_idx]
        recent_pre_promo_prices = prices[split_idx:]

        prior_median = statistics.median(prior_prices)
        max_recent_pre_promo = max(recent_pre_promo_prices)

        if prior_median > 0 and max_recent_pre_promo > prior_median * 1.08 and current_price < max_recent_pre_promo:
            hike_pct = round(((max_recent_pre_promo - prior_median) / prior_median) * 100.0, 1)
            score = max(20.0, round(100.0 - (hike_pct * 3.0), 1))
            return (
                score,
                True,
                f"A price increase of ~{hike_pct}% was recorded prior to the current advertised discount."
            )

        return 100.0, False, "No pre-promotion artificial price surge detected prior to current offer."

    @classmethod
    def _classify_score(cls, final_score: float, components: Dict[str, float]) -> str:
        """
        Maps a 0-100 score to objective classification categories.
        """
        if final_score >= 80.0:
            return cls.CLASSIFICATION_STRONG
        elif final_score >= 60.0:
            return cls.CLASSIFICATION_MODERATE
        elif final_score >= 40.0:
            return cls.CLASSIFICATION_REVIEW
        else:
            return cls.CLASSIFICATION_MISLEADING
