import math
from datetime import datetime
from typing import Dict, Any, Optional, List
from app.models import Product, Offer, PriceHistory, Forecast
from app.extensions import db

CATEGORY_BASELINE_DEPRECIATION = {
    "smartphones": 0.22,
    "laptops": 0.25,
    "audio": 0.18,
    "tablets": 0.22,
    "wearables": 0.28,
    "cameras": 0.16,
    "gaming": 0.20,
    "televisions": 0.20,
}
DEFAULT_BASELINE_DEPRECIATION = 0.20

CONDITION_MULTIPLIERS = {
    "excellent": 1.05,
    "good": 1.00,
    "fair": 0.88,
}

SUPPORTED_HORIZONS = [6, 12, 24, 36, 48, 60]

class ResaleForecastService:
    """
    Intelligent Resale Value Forecasting Engine.
    Estimates future resale value and depreciation over user-selected horizons (6-60M)
    using compound annual depreciation calibrated by verified historical retail observations
    and category baseline models.
    """

    @classmethod
    def get_resale_forecast(
        cls,
        product_id: int,
        months: int = 36,
        condition: str = "good",
        scenario: str = "expected",
        custom_annual_rate: Optional[float] = None,
        persist: bool = False,
    ) -> Dict[str, Any]:
        if isinstance(product_id, bool) or not isinstance(product_id, int):
            return {
                "error": "INVALID_PRODUCT_ID",
                "message": "Product ID must be an integer."
            }

        product = db.session.get(Product, product_id)
        if not product:
            return {
                "error": "PRODUCT_NOT_FOUND",
                "message": f"Product with ID {product_id} was not found."
            }

        # 1. Validation
        if isinstance(months, bool) or not isinstance(months, int) or months <= 0:
            return {
                "error": "INVALID_HORIZON",
                "message": "Ownership duration (months) must be a positive integer."
            }

        normalized_condition = condition.lower().strip() if condition else "good"
        if normalized_condition not in CONDITION_MULTIPLIERS:
            normalized_condition = "good"

        normalized_scenario = scenario.lower().strip() if scenario else "expected"
        if normalized_scenario not in ("expected", "optimistic", "pessimistic"):
            normalized_scenario = "expected"

        if custom_annual_rate is not None:
            if isinstance(custom_annual_rate, bool) or not isinstance(custom_annual_rate, (int, float)) or custom_annual_rate <= 0 or custom_annual_rate >= 1.0:
                return {
                    "error": "INVALID_DEPRECIATION_RATE",
                    "message": "Annual depreciation rate must be a positive percentage strictly between 0% and 100% (0.0 < rate < 1.0)."
                }

        # 2. Determine Reference Purchase/Offer Price
        offers = Offer.query.filter_by(product_id=product_id).all()
        active_offers = [o for o in offers if o.is_available and float(o.price) > 0]

        if active_offers:
            cheapest_offer = min(active_offers, key=lambda o: float(o.price))
            reference_price = round(float(cheapest_offer.price), 2)
            reference_source = f"Lowest in-stock offer from {cheapest_offer.retailer.name if cheapest_offer.retailer else 'retailer'}"
        else:
            reference_price = round(float(product.base_mrp), 2)
            reference_source = "Catalog base MRP"

        if reference_price <= 0:
            return {
                "error": "INVALID_REFERENCE_PRICE",
                "message": "Product reference price must be greater than zero."
            }

        # 3. Analyze Historical Price Observations (filtering and deduplication)
        now = datetime.utcnow()
        raw_hist_records = (
            PriceHistory.query.filter_by(product_id=product_id)
            .filter(PriceHistory.recorded_at <= now)
            .filter(PriceHistory.price > 0)
            .order_by(PriceHistory.recorded_at.asc())
            .all()
        )

        # Deduplicate identical records on the same timestamp
        seen_snapshots = set()
        hist_records = []
        for r in raw_hist_records:
            t_key = (r.retailer_id, r.recorded_at.isoformat() if r.recorded_at else None, float(r.price))
            if t_key not in seen_snapshots:
                seen_snapshots.add(t_key)
                hist_records.append(r)

        obs_count = len(hist_records)
        has_sufficient_data = obs_count >= 3

        # 4. Calibration & Depreciation Rates
        category_key = (product.category or "").strip().lower()
        cat_rate = CATEGORY_BASELINE_DEPRECIATION.get(category_key, DEFAULT_BASELINE_DEPRECIATION)

        if has_sufficient_data:
            first_obs = hist_records[0]
            last_obs = hist_records[-1]
            time_diff_days = (last_obs.recorded_at - first_obs.recorded_at).total_seconds() / 86400.0

            if time_diff_days >= 7.0 and float(first_obs.price) > 0:
                years_span = time_diff_days / 365.25
                price_ratio = float(last_obs.price) / float(first_obs.price)
                if price_ratio < 1.0 and years_span > 0:
                    raw_annual_drop = 1.0 - math.pow(price_ratio, 1.0 / years_span)
                    base_rate = max(0.08, min(0.45, (raw_annual_drop * 0.5) + (cat_rate * 0.5)))
                else:
                    base_rate = cat_rate
            else:
                base_rate = cat_rate
            status = "sufficient_data"
            forecast_method = "historical_trend_calibrated"
        else:
            base_rate = cat_rate
            status = "insufficient_data"
            forecast_method = "illustrative_compound_annual_scenario"

        # Apply custom rate if explicitly supplied
        if custom_annual_rate is not None:
            active_rate = float(custom_annual_rate)
            forecast_method = "user_specified_annual_rate"
        else:
            if normalized_scenario == "optimistic":
                active_rate = max(0.05, round(base_rate * 0.65, 4))
            elif normalized_scenario == "pessimistic":
                active_rate = min(0.65, round(base_rate * 1.45, 4))
            else:
                active_rate = round(base_rate, 4)

        # 5. Compound Depreciation Calculation
        years = months / 12.0
        cond_mult = CONDITION_MULTIPLIERS[normalized_condition]

        # Future Value = PV * (1 - r)^Years * condition_multiplier
        unbounded_resale = reference_price * math.pow(1.0 - active_rate, years) * cond_mult
        estimated_resale = round(max(0.0, min(reference_price, unbounded_resale)), 2)
        depreciation_amount = round(max(0.0, reference_price - estimated_resale), 2)
        depreciation_pct = round((depreciation_amount / reference_price) * 100.0, 2)

        # Scenario comparisons
        rate_optimistic = max(0.05, round(base_rate * 0.65, 4))
        rate_expected = round(base_rate, 4)
        rate_pessimistic = min(0.65, round(base_rate * 1.45, 4))

        def calc_scenario_val(r):
            val = reference_price * math.pow(1.0 - r, years) * cond_mult
            return round(max(0.0, min(reference_price, val)), 2)

        scenarios_dict = {
            "optimistic": {
                "name": "Optimistic (Slow Depreciation)",
                "annual_rate": round(rate_optimistic * 100.0, 1),
                "estimated_resale": calc_scenario_val(rate_optimistic),
                "depreciation_pct": round(((reference_price - calc_scenario_val(rate_optimistic)) / reference_price) * 100.0, 1),
                "description": f"Assumes premium brand retention and low wear (~{round(rate_optimistic * 100.0, 1)}% annual rate).",
            },
            "expected": {
                "name": "Expected (Baseline Projection)",
                "annual_rate": round(rate_expected * 100.0, 1),
                "estimated_resale": calc_scenario_val(rate_expected),
                "depreciation_pct": round(((reference_price - calc_scenario_val(rate_expected)) / reference_price) * 100.0, 1),
                "description": f"Standard category trajectory (~{round(rate_expected * 100.0, 1)}% annual rate).",
            },
            "pessimistic": {
                "name": "Pessimistic (Rapid Depreciation)",
                "annual_rate": round(rate_pessimistic * 100.0, 1),
                "estimated_resale": calc_scenario_val(rate_pessimistic),
                "depreciation_pct": round(((reference_price - calc_scenario_val(rate_pessimistic)) / reference_price) * 100.0, 1),
                "description": f"Faster generational obsolescence or aggressive market price drops (~{round(rate_pessimistic * 100.0, 1)}% annual rate).",
            },
        }

        # Multi-horizon trajectory for visualization across all 6 supported horizons
        trajectory = []
        for h in SUPPORTED_HORIZONS:
            h_years = h / 12.0
            h_exp = round(max(0.0, min(reference_price, reference_price * math.pow(1.0 - rate_expected, h_years) * cond_mult)), 2)
            h_opt = round(max(0.0, min(reference_price, reference_price * math.pow(1.0 - rate_optimistic, h_years) * cond_mult)), 2)
            h_pes = round(max(0.0, min(reference_price, reference_price * math.pow(1.0 - rate_pessimistic, h_years) * cond_mult)), 2)
            trajectory.append({
                "months": h,
                "label": f"{h}M",
                "expected": h_exp,
                "optimistic": h_opt,
                "pessimistic": h_pes,
            })

        # Explanations and limitations
        explanations = [
            f"Reference price of ₹{reference_price:,.2f} sourced from {reference_source}.",
            f"Assumes compound annual depreciation rate of {round(active_rate * 100.0, 2)}% over {months} months ({round(years, 1)} years).",
            f"Physical condition is factored as '{normalized_condition.capitalize()}' (multiplier: {cond_mult}x).",
            "Data source context: Recorded historical observations reflect new retail catalog prices across monitored merchants, rather than peer-to-peer used transaction ledgers.",
        ]
        if not has_sufficient_data:
            explanations.append(
                f"Notice: Historical database contains only {obs_count} verified price observation(s) (minimum 3 required). Projection is an illustrative scenario analysis based on category assumptions, not an empirically calibrated market forecast."
            )

        limitations = [
            "Resale estimate is a mathematical projection based on compound depreciation models and does not represent an actual secondary-market buyback offer.",
            "Actual used-market valuation depends on real-world wear, battery health, cosmetic condition, accessories, packaging, and regional secondary demand.",
            "Historical retail price trends serve as proxy signals; they do not guarantee future used-goods transaction values.",
        ]

        confidence = "High" if obs_count >= 10 else ("Medium" if has_sufficient_data else "Low")

        result = {
            "success": True,
            "product_id": product.id,
            "product": product.to_dict(),
            "ownership_months": months,
            "condition": normalized_condition,
            "scenario": normalized_scenario,
            "reference_price": reference_price,
            "reference_price_source": reference_source,
            "estimated_resale_value": estimated_resale,
            "depreciation_amount": depreciation_amount,
            "depreciation_pct": depreciation_pct,
            "annual_depreciation_rate": round(active_rate * 100.0, 2),
            "has_sufficient_data": has_sufficient_data,
            "status": status,
            "observation_count": obs_count,
            "forecast_method": forecast_method,
            "confidence": confidence,
            "scenarios": scenarios_dict,
            "trajectory": trajectory,
            "explanations": explanations,
            "limitations": limitations,
            "created_at": now.isoformat() + "Z",
        }

        # Persist if requested
        if persist:
            try:
                forecast_record = Forecast(
                    product_id=product.id,
                    horizon_days=int(months * 30.4375),
                    predicted_price=estimated_resale,
                    lower_bound=calc_scenario_val(rate_pessimistic),
                    upper_bound=calc_scenario_val(rate_optimistic),
                    confidence=confidence,
                    model_name=forecast_method,
                    forecast_type="resale",
                    reference_price=reference_price,
                    depreciation_pct=depreciation_pct,
                    status=status,
                    observation_count=obs_count,
                    assumptions_json={
                        "condition": normalized_condition,
                        "annual_rate": round(active_rate * 100.0, 2),
                        "scenario": normalized_scenario,
                        "months": months,
                    },
                    model_version="1.0.0",
                    created_at=now,
                )
                db.session.add(forecast_record)
                db.session.commit()
                result["forecast_id"] = forecast_record.id
            except Exception:
                db.session.rollback()

        return result

    @classmethod
    def get_forecast_history(cls, product_id: int) -> Dict[str, Any]:
        if isinstance(product_id, bool) or not isinstance(product_id, int):
            return {
                "error": "INVALID_PRODUCT_ID",
                "message": "Product ID must be an integer."
            }

        product = db.session.get(Product, product_id)
        if not product:
            return {
                "error": "PRODUCT_NOT_FOUND",
                "message": f"Product with ID {product_id} was not found."
            }

        records = (
            Forecast.query.filter_by(product_id=product_id, forecast_type="resale")
            .order_by(Forecast.created_at.desc())
            .limit(20)
            .all()
        )

        return {
            "success": True,
            "product_id": product.id,
            "product_name": product.name,
            "count": len(records),
            "history": [r.to_dict() for r in records],
        }
