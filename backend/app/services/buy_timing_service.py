import math
import statistics
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from app.models import Product, Offer, Retailer, PriceHistory
from app.services.alert_service import AlertService
from app.extensions import db

class BuyTimingService:
    """
    Best Time to Buy & Purchase Timing Intelligence Engine.
    Evaluates current listed prices against historical time-series benchmarks,
    quantifies price range positioning, and delivers evidence-based, explainable recommendations.

    Decision Categories:
    - GOOD_TIME_TO_BUY: Price is at least 3% below historical median or within 2% of observed window low.
    - CONSIDER_WAITING: Price is at least 5% above historical median or in top 20% of observed range.
    - PRICE_IS_TYPICAL: Price is within the normal historical fluctuation band around median.
    - INSUFFICIENT_DATA: Fewer than 3 valid observations or no data in selected window.
    - CURRENT_PRICE_UNAVAILABLE: No valid active offer or recent observation available.
    """

    SUPPORTED_WINDOWS = (30, 60, 90, 180, 365)
    DEFAULT_WINDOW = 30
    MIN_OBSERVATIONS_FOR_SUFFICIENT = 3
    STALE_THRESHOLD_DAYS = 30

    RECOMMENDATION_BUY = "GOOD_TIME_TO_BUY"
    RECOMMENDATION_WAIT = "CONSIDER_WAITING"
    RECOMMENDATION_TYPICAL = "PRICE_IS_TYPICAL"
    RECOMMENDATION_INSUFFICIENT = "INSUFFICIENT_DATA"
    RECOMMENDATION_UNAVAILABLE = "CURRENT_PRICE_UNAVAILABLE"

    @classmethod
    def evaluate_buy_timing(
        cls,
        product_id: int,
        days: int = 30,
        retailer_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Calculates purchase timing recommendation, historical price metrics,
        and explainable target-price suggestions.
        """
        # 1. Parameter Type Validation
        if isinstance(product_id, bool) or not isinstance(product_id, int):
            return {
                "error": "INVALID_PRODUCT_ID",
                "message": "Product ID must be an integer."
            }

        if isinstance(days, bool) or days not in cls.SUPPORTED_WINDOWS:
            return {
                "error": "INVALID_TIME_WINDOW",
                "message": f"Invalid days parameter '{days}'. Supported windows are 30, 60, 90, 180, or 365 days."
            }

        if retailer_id is not None:
            if isinstance(retailer_id, bool) or not isinstance(retailer_id, int):
                return {
                    "error": "INVALID_RETAILER_ID",
                    "message": "Retailer ID must be an integer."
                }
            retailer = db.session.get(Retailer, retailer_id)
            if not retailer:
                return {
                    "error": "RETAILER_NOT_FOUND",
                    "message": f"Retailer #{retailer_id} was not found."
                }

        # 2. Resolve Product
        product = db.session.get(Product, product_id)
        if not product:
            return {
                "error": "PRODUCT_NOT_FOUND",
                "message": f"Product #{product_id} was not found."
            }

        now = datetime.utcnow()
        cutoff_date = now - timedelta(days=days)

        # 3. Resolve Current Reference Price from Active Offers
        offer_query = Offer.query.filter(
            Offer.product_id == product_id,
            Offer.price > 0,
            Offer.stock_status == "In Stock"
        )
        if retailer_id is not None:
            offer_query = offer_query.filter(Offer.retailer_id == retailer_id)

        cheapest_offer = offer_query.order_by(Offer.price.asc()).first()

        current_price = None
        current_price_source = None
        current_retailer_name = None
        is_live_offer = False

        if cheapest_offer:
            current_price = round(float(cheapest_offer.price), 2)
            current_retailer_name = cheapest_offer.retailer.name if cheapest_offer.retailer else "Retailer"
            current_price_source = f"Lowest in-stock offer from {current_retailer_name}"
            is_live_offer = True

        # 4. Fetch and Clean Historical Observations
        history_query = PriceHistory.query.filter(
            PriceHistory.product_id == product_id,
            PriceHistory.recorded_at >= cutoff_date,
            PriceHistory.recorded_at <= now,
            PriceHistory.price > 0
        )
        if retailer_id is not None:
            history_query = history_query.filter(PriceHistory.retailer_id == retailer_id)

        raw_observations = history_query.order_by(PriceHistory.recorded_at.asc()).all()

        # Deduplicate observations: unique by (retailer_id, recorded_at, price)
        seen_snapshots = set()
        clean_observations = []
        for o in raw_observations:
            if o.price is None or math.isnan(float(o.price)) or math.isinf(float(o.price)) or float(o.price) <= 0:
                continue
            key = (o.retailer_id, o.recorded_at, round(float(o.price), 2))
            if key not in seen_snapshots:
                seen_snapshots.add(key)
                clean_observations.append(o)

        obs_count = len(clean_observations)

        # Fallback for current price if no live offer found
        if current_price is None and obs_count > 0:
            latest_obs = clean_observations[-1]
            obs_age = (now - latest_obs.recorded_at).days
            if obs_age <= cls.STALE_THRESHOLD_DAYS:
                current_price = round(float(latest_obs.price), 2)
                current_retailer_name = latest_obs.retailer.name if latest_obs.retailer else "Historical Snapshot"
                current_price_source = f"Most recent recorded observation ({obs_age} days ago)"
                is_live_offer = False

        # 5. Handle Missing Current Price
        if current_price is None:
            return {
                "product_id": product.id,
                "product_name": product.name,
                "brand": product.brand,
                "category": product.category,
                "recommendation": cls.RECOMMENDATION_UNAVAILABLE,
                "recommendation_label": "Current Price Unavailable",
                "observation_window_days": days,
                "valid_observation_count": obs_count,
                "data_status": "CURRENT_PRICE_UNAVAILABLE",
                "evidence_type": "HISTORICAL_ANALYSIS",
                "current_price": None,
                "current_price_source": None,
                "historical_metrics": None,
                "target_recommendations": None,
                "explanation": "No active in-stock retailer offers or recent valid price observations could be established for this product.",
                "limitations": [
                    "Current market pricing could not be verified.",
                    "Timing assessment requires at least one active offer or recent verified price."
                ],
                "evaluated_at": now.isoformat() + "Z"
            }

        # 6. Handle Insufficient Historical Data (< 3 observations)
        if obs_count < cls.MIN_OBSERVATIONS_FOR_SUFFICIENT:
            single_obs_price = clean_observations[0].price if obs_count == 1 else None
            return {
                "product_id": product.id,
                "product_name": product.name,
                "brand": product.brand,
                "category": product.category,
                "recommendation": cls.RECOMMENDATION_INSUFFICIENT,
                "recommendation_label": "Insufficient Evidence",
                "observation_window_days": days,
                "valid_observation_count": obs_count,
                "data_status": "INSUFFICIENT_DATA",
                "evidence_type": "HISTORICAL_ANALYSIS",
                "current_price": current_price,
                "current_price_source": current_price_source,
                "is_live_offer": is_live_offer,
                "historical_metrics": {
                    "current_price": current_price,
                    "lowest_observed_price": round(float(single_obs_price), 2) if single_obs_price else current_price,
                    "highest_observed_price": round(float(single_obs_price), 2) if single_obs_price else current_price,
                    "median_historical_price": round(float(single_obs_price), 2) if single_obs_price else current_price,
                    "average_historical_price": round(float(single_obs_price), 2) if single_obs_price else current_price,
                    "historical_price_range": 0.0,
                    "price_change": 0.0,
                    "price_change_pct": 0.0,
                    "observation_count": obs_count,
                    "first_observation_date": clean_observations[0].recorded_at.isoformat() + "Z" if obs_count > 0 else None,
                    "last_observation_date": clean_observations[-1].recorded_at.isoformat() + "Z" if obs_count > 0 else None,
                    "observation_age_days": (now - clean_observations[-1].recorded_at).days if obs_count > 0 else None,
                    "is_stale": ((now - clean_observations[-1].recorded_at).days > cls.STALE_THRESHOLD_DAYS) if obs_count > 0 else False
                },
                "target_recommendations": {
                    "suggested_conservative_target": round(current_price * 0.95, 2),
                    "suggested_moderate_target": round(current_price * 0.90, 2),
                    "suggested_aggressive_target": round(current_price * 0.85, 2),
                    "target_basis": "Hypothetical discount percentages from current price (sparse history)"
                },
                "explanation": (
                    f"Only {obs_count} historical observation(s) available in the {days}-day window. "
                    "A minimum of 3 observations is required to establish a valid statistical baseline. "
                    "Timing cannot be assessed with confidence."
                ),
                "limitations": [
                    f"Available data coverage is sparse ({obs_count} observations in {days} days).",
                    "Single observations or sparse records do not establish a reliable historical baseline.",
                    "Consider setting a price alert to track future pricing movements as more snapshots are captured."
                ] + ([
                    f"Historical observations are stale: latest snapshot was captured {(now - clean_observations[-1].recorded_at).days} days ago."
                ] if (obs_count > 0 and (now - clean_observations[-1].recorded_at).days > cls.STALE_THRESHOLD_DAYS) else []),
                "evaluated_at": now.isoformat() + "Z"
            }

        # 7. Compute Historical Statistical Metrics
        prices = [round(float(o.price), 2) for o in clean_observations]
        lowest_observed = min(prices)
        highest_observed = max(prices)
        median_price = round(statistics.median(prices), 2)
        average_price = round(statistics.mean(prices), 2)
        price_range = round(highest_observed - lowest_observed, 2)

        earliest_price = prices[0]
        price_change = round(current_price - earliest_price, 2)
        price_change_pct = round(((current_price - earliest_price) / earliest_price) * 100, 2) if earliest_price > 0 else 0.0

        first_date = clean_observations[0].recorded_at.isoformat() + "Z"
        last_date = clean_observations[-1].recorded_at.isoformat() + "Z"
        obs_age_days = (now - clean_observations[-1].recorded_at).days
        is_stale = obs_age_days > cls.STALE_THRESHOLD_DAYS

        # 8. Determine Buy Timing Recommendation & Explainability
        # Compare current price against median and window low
        pct_diff_from_median = round(((current_price - median_price) / median_price) * 100, 2) if median_price > 0 else 0.0

        limitations = [
            f"Lowest observed price (₹{lowest_observed:,.2f}) reflects the available {days}-day window and does not represent an all-time low.",
            "Historical price analysis evaluates past catalog movements and does not guarantee future discounts or price reductions.",
            "Retailer catalog pricing may change based on inventory, seller promotions, or seasonal demand."
        ]

        if is_stale:
            limitations.append(
                f"Historical observations are stale: the most recent recorded price snapshot was captured {obs_age_days} days ago "
                f"(exceeds the {cls.STALE_THRESHOLD_DAYS}-day freshness threshold). Current market pricing may have changed since."
            )

        if obs_count < 5:
            limitations.append(f"Observation density is moderate ({obs_count} snapshots); confidence is moderate.")

        # Data Status Classification
        if is_stale:
            data_status = "STALE"
        elif obs_count >= 5:
            data_status = "SUFFICIENT"
        else:
            data_status = "MODERATE"

        # Check for completely flat prices across all observations
        is_flat_trend = (lowest_observed == highest_observed == current_price)

        if is_flat_trend:
            recommendation = cls.RECOMMENDATION_TYPICAL
            recommendation_label = "Price Is Typical"
            explanation = (
                f"The current price of ₹{current_price:,.2f} has remained steady across all {obs_count} observations "
                f"in the {days}-day window. No price fluctuations have been observed."
            )
        elif current_price <= median_price * 0.97 or (lowest_observed > 0 and current_price <= lowest_observed * 1.02):
            # Price compares favorably (at least 3% below median, or within 2% of window low)
            recommendation = cls.RECOMMENDATION_BUY
            recommendation_label = "Good Time to Buy"
            if current_price <= lowest_observed * 1.02:
                explanation = (
                    f"The current price of ₹{current_price:,.2f} is near the lowest observed price (₹{lowest_observed:,.2f}) "
                    f"in the available {days}-day window ({abs(pct_diff_from_median)}% below the historical median of ₹{median_price:,.2f})."
                )
            else:
                explanation = (
                    f"The current price of ₹{current_price:,.2f} is {abs(pct_diff_from_median)}% below the historical median "
                    f"of ₹{median_price:,.2f} across the observed {days}-day window."
                )
        elif current_price >= median_price * 1.05 or (price_range > 0 and (current_price - lowest_observed) / price_range >= 0.80):
            # Price is elevated (at least 5% above median or in top 20% of range)
            recommendation = cls.RECOMMENDATION_WAIT
            recommendation_label = "Consider Waiting"
            explanation = (
                f"The current price of ₹{current_price:,.2f} is {pct_diff_from_median}% above the historical median "
                f"of ₹{median_price:,.2f}. Lower prices (as low as ₹{lowest_observed:,.2f}) were observed during this {days}-day window, "
                "though future discounts are not guaranteed."
            )
        else:
            # Price is within normal historical fluctuation range
            recommendation = cls.RECOMMENDATION_TYPICAL
            recommendation_label = "Price Is Typical"
            explanation = (
                f"The current price of ₹{current_price:,.2f} is consistent with typical historical levels, "
                f"hovering near the observed {days}-day median of ₹{median_price:,.2f}."
            )

        # 9. Target-Price Recommendations
        target_recommendations = {
            "suggested_conservative_target": median_price,
            "suggested_moderate_target": round(median_price * 0.95, 2),
            "suggested_aggressive_target": lowest_observed,
            "conservative_explanation": f"Historical median price (₹{median_price:,.2f}) — typical purchase benchmark.",
            "moderate_explanation": f"5% below historical median (₹{round(median_price * 0.95, 2):,.2f}) — modest savings target.",
            "aggressive_explanation": f"Lowest observed price in {days} days (₹{lowest_observed:,.2f}) — ambitious savings target.",
            "disclaimer": "Target prices represent user alert thresholds and are not guaranteed future prices."
        }

        metrics = {
            "current_price": current_price,
            "lowest_observed_price": lowest_observed,
            "highest_observed_price": highest_observed,
            "median_historical_price": median_price,
            "average_historical_price": average_price,
            "historical_price_range": price_range,
            "price_change": price_change,
            "price_change_pct": price_change_pct,
            "observation_count": obs_count,
            "first_observation_date": first_date,
            "last_observation_date": last_date,
            "observation_age_days": obs_age_days,
            "is_stale": is_stale,
            "pct_diff_from_median": pct_diff_from_median
        }

        return {
            "product_id": product.id,
            "product_name": product.name,
            "brand": product.brand,
            "category": product.category,
            "recommendation": recommendation,
            "recommendation_label": recommendation_label,
            "observation_window_days": days,
            "valid_observation_count": obs_count,
            "data_status": data_status,
            "evidence_type": "HISTORICAL_ANALYSIS",
            "current_price": current_price,
            "current_price_source": current_price_source,
            "current_retailer_name": current_retailer_name,
            "is_live_offer": is_live_offer,
            "historical_metrics": metrics,
            "target_recommendations": target_recommendations,
            "explanation": explanation,
            "limitations": limitations,
            "evaluated_at": now.isoformat() + "Z"
        }

    @classmethod
    def create_target_price_alert(
        cls,
        product_id: int,
        target_price: float,
        contact_email: str,
        retailer_id: Optional[int] = None,
        user_identifier: str = "guest_user"
    ) -> Dict[str, Any]:
        """
        Creates a target-price alert directly delegating to AlertService,
        preserving existing alert validations, uniqueness, and ownership rules.
        """
        return AlertService.create_alert(
            product_id=product_id,
            target_price=target_price,
            contact_email=contact_email,
            retailer_id=retailer_id,
            user_identifier=user_identifier
        )
