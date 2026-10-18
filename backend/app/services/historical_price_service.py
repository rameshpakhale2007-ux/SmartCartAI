import statistics
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from app.models import Product, PriceHistory, Retailer
from app.extensions import db

class HistoricalPriceService:
    """
    Service for historical price tracking, filtering, and statistical analysis.
    Supports 30, 60, and 90-day time-series evaluation windows.
    Enforces strict temporal bounds and data validation rules.
    """

    SUPPORTED_WINDOWS = (30, 60, 90, 180, 365)

    @classmethod
    def get_price_history(
        cls,
        product_id: int,
        days: int = 30,
        retailer_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Retrieves historical observations for a product within the requested time window,
        optionally filtered by retailer. Calculates min, max, median, and price change metrics.
        - Excludes future-dated records (recorded_at > now)
        - Excludes invalid non-positive prices (price <= 0)
        - Ensures observations are returned strictly chronologically (ascending)
        """
        product = db.session.get(Product, product_id)
        if not product:
            return {
                "error": "PRODUCT_NOT_FOUND",
                "message": f"Product #{product_id} was not found."
            }

        if days not in cls.SUPPORTED_WINDOWS:
            return {
                "error": "INVALID_TIME_WINDOW",
                "message": f"Invalid days parameter '{days}'. Supported windows are 30, 60, 90, 180, or 365 days."
            }

        now = datetime.utcnow()
        cutoff_date = now - timedelta(days=days)

        # Query bounded by [cutoff_date, now] and positive prices
        query = PriceHistory.query.filter(
            PriceHistory.product_id == product_id,
            PriceHistory.recorded_at >= cutoff_date,
            PriceHistory.recorded_at <= now,
            PriceHistory.price > 0
        )

        if retailer_id is not None:
            query = query.filter(PriceHistory.retailer_id == retailer_id)

        # Order observations chronologically (earliest to latest)
        observations = query.order_by(PriceHistory.recorded_at.asc()).all()

        # Discover all retailers with history for this product (to populate retailer filter dropdown in UI)
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

        if not observations:
            return {
                "product": product.to_dict(),
                "days": days,
                "retailer_id": retailer_id,
                "observations": [],
                "statistics": None,
                "has_sufficient_data": False,
                "available_retailers": available_retailers,
                "message": f"No historical price observations found for this product within the past {days} days."
            }

        # Calculate statistics from valid observations
        prices = [float(o.price) for o in observations if o.price and float(o.price) > 0]
        min_price = min(prices)
        max_price = max(prices)
        median_price = statistics.median(prices)
        
        # Most recent observation in period represents the current observed price
        current_observed_price = prices[-1]
        earliest_observed_price = prices[0]
        
        price_change = round(current_observed_price - earliest_observed_price, 2)
        price_change_pct = (
            round(((current_observed_price - earliest_observed_price) / earliest_observed_price) * 100, 2)
            if earliest_observed_price > 0 else 0.0
        )

        # Stored observation metadata
        stats = {
            "current_observed_price": round(current_observed_price, 2),
            "earliest_observed_price": round(earliest_observed_price, 2),
            "min_price": round(min_price, 2),
            "max_price": round(max_price, 2),
            "median_price": round(median_price, 2),
            "price_spread": round(max_price - min_price, 2),
            "price_change": price_change,
            "price_change_pct": price_change_pct,
            "observation_count": len(observations),
            "period_start": observations[0].recorded_at.isoformat() + "Z" if observations[0].recorded_at else None,
            "period_end": observations[-1].recorded_at.isoformat() + "Z" if observations[-1].recorded_at else None,
            "is_live": False,  # Explicitly identifies this is historical stored observation
            "provenance": observations[-1].source_type if observations else "demo"
        }

        has_sufficient = len(observations) >= 3

        return {
            "product": product.to_dict(),
            "days": days,
            "retailer_id": retailer_id,
            "observations": [o.to_dict() for o in observations],
            "statistics": stats,
            "has_sufficient_data": has_sufficient,
            "available_retailers": available_retailers,
            "message": (
                "Historical pricing time-series aggregated successfully."
                if has_sufficient
                else "Sparse data: fewer than 3 observations available in this time window."
            )
        }
