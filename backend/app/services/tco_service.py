import math
from typing import Dict, Any, Optional, List
from app.models import Product, Offer
from app.extensions import db
from app.services.resale_forecast_service import ResaleForecastService

class TCOService:
    """
    Total Cost of Ownership (TCO) Engine.
    Computes gross and net ownership costs over 6-60 month horizons.
    Ensures missing cost assumptions are not silently replaced with zero.
    Resale proceeds are deducted exactly once.
    Prevents double-counting financing costs if already bundled into purchase price.
    """

    @classmethod
    def calculate_tco(cls, payload: Dict[str, Any]) -> Dict[str, Any]:
        # 1. Validate Product ID (if provided)
        product_id = payload.get("product_id")
        product = None
        if product_id is not None:
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

        # 2. Ownership Duration Validation
        ownership_months = payload.get("ownership_months", 36)
        if isinstance(ownership_months, bool) or not isinstance(ownership_months, int) or ownership_months <= 0:
            return {
                "error": "INVALID_OWNERSHIP_PERIOD",
                "message": "Ownership duration must be a positive integer representing months (e.g. 6, 12, 24, 36, 48, 60)."
            }

        # 3. Monetary Input Validation Helper
        def validate_cost_field(name: str, val: Any) -> Optional[float]:
            if val is None:
                return None
            if isinstance(val, bool) or not isinstance(val, (int, float)):
                raise ValueError(f"Field '{name}' must be a numeric value.")
            f_val = float(val)
            if math.isnan(f_val) or math.isinf(f_val):
                raise ValueError(f"Field '{name}' must be a finite real number.")
            if f_val < 0:
                raise ValueError(f"Field '{name}' cannot be negative (received {val}).")
            return f_val

        try:
            raw_purchase_price = payload.get("purchase_price")
            purchase_price = validate_cost_field("purchase_price", raw_purchase_price)
            acquisition_cost = validate_cost_field("acquisition_cost", payload.get("acquisition_cost"))
            monthly_operating_cost = validate_cost_field("monthly_operating_cost", payload.get("monthly_operating_cost"))
            maintenance_cost = validate_cost_field("maintenance_cost", payload.get("maintenance_cost"))
            repair_cost = validate_cost_field("repair_cost", payload.get("repair_cost"))
            accessory_cost = validate_cost_field("accessory_cost", payload.get("accessory_cost"))
            financing_cost = validate_cost_field("financing_cost", payload.get("financing_cost"))
            estimated_resale = validate_cost_field("estimated_resale_value", payload.get("estimated_resale_value"))
        except ValueError as e:
            return {
                "error": "INVALID_COST_INPUT",
                "message": str(e)
            }

        # Financing Double-Counting Protection
        purchase_includes_financing = bool(payload.get("purchase_includes_financing", False))

        # Sourcing purchase price from catalog if not manually entered
        purchase_price_source = "User assumption"
        if purchase_price is None and product:
            offers = Offer.query.filter_by(product_id=product.id).all()
            active_offers = [o for o in offers if o.is_available and float(o.price) > 0]
            if active_offers:
                cheapest = min(active_offers, key=lambda o: float(o.price))
                purchase_price = round(float(cheapest.price), 2)
                purchase_price_source = f"Best active offer ({cheapest.retailer.name if cheapest.retailer else 'Retailer'})"
            else:
                purchase_price = round(float(product.base_mrp), 2)
                purchase_price_source = "Catalog base MRP"

        if purchase_price is None or purchase_price <= 0:
            return {
                "error": "MISSING_PURCHASE_PRICE",
                "message": "Purchase price must be provided or available from the product catalog."
            }

        # Auto-compute resale if omitted but product is present and user requested automatic estimate
        resale_source = "User assumption"
        if estimated_resale is None and product and payload.get("auto_estimate_resale", False):
            fc = ResaleForecastService.get_resale_forecast(
                product_id=product.id,
                months=ownership_months,
                condition=payload.get("condition", "good"),
            )
            if "error" not in fc:
                estimated_resale = fc.get("estimated_resale_value")
                resale_source = f"Resale Forecast Engine ({fc.get('forecast_method')})"

        # 4. Check Data Completeness
        # A field is complete only when explicitly provided (even if 0)
        missing_fields = []
        if acquisition_cost is None:
            missing_fields.append("acquisition_cost")
        if monthly_operating_cost is None:
            missing_fields.append("monthly_operating_cost")
        if maintenance_cost is None:
            missing_fields.append("maintenance_cost")
        if repair_cost is None:
            missing_fields.append("repair_cost")
        if accessory_cost is None:
            missing_fields.append("accessory_cost")
        if financing_cost is None and not purchase_includes_financing:
            missing_fields.append("financing_cost")
        if estimated_resale is None:
            missing_fields.append("estimated_resale_value")

        is_complete = len(missing_fields) == 0
        completeness_status = "complete" if is_complete else "incomplete"

        # 5. Calculate Cost Components
        operating_total = (
            round(monthly_operating_cost * ownership_months, 2)
            if monthly_operating_cost is not None
            else None
        )

        # Do not add financing cost if already bundled into purchase price
        effective_financing = 0.0 if purchase_includes_financing else (financing_cost or 0.0)

        gross_cost = (
            purchase_price
            + (acquisition_cost or 0.0)
            + (operating_total or 0.0)
            + (maintenance_cost or 0.0)
            + (repair_cost or 0.0)
            + (accessory_cost or 0.0)
            + effective_financing
        )
        gross_cost = round(gross_cost, 2)

        # Net Cost deducts resale proceeds EXACTLY ONCE
        if estimated_resale is not None:
            net_cost = round(max(0.0, gross_cost - estimated_resale), 2)
            monthly_equivalent_cost = round(net_cost / ownership_months, 2)
            resale_recovery_pct = round((estimated_resale / purchase_price) * 100.0, 2) if purchase_price > 0 else 0.0
        else:
            net_cost = None
            monthly_equivalent_cost = None
            resale_recovery_pct = None

        cost_breakdown = {
            "purchase_price": purchase_price,
            "acquisition_cost": acquisition_cost,
            "monthly_operating_cost": monthly_operating_cost,
            "total_operating_cost": operating_total,
            "maintenance_cost": maintenance_cost,
            "repair_cost": repair_cost,
            "accessory_cost": accessory_cost,
            "financing_cost": financing_cost if not purchase_includes_financing else 0.0,
            "purchase_includes_financing": purchase_includes_financing,
            "estimated_resale_value": estimated_resale,
        }

        # Percentage breakdown of gross costs
        def pct_of_gross(val):
            if val is None or gross_cost <= 0:
                return 0.0
            return round((val / gross_cost) * 100.0, 1)

        breakdown_percentages = {
            "purchase_price_pct": pct_of_gross(purchase_price),
            "acquisition_pct": pct_of_gross(acquisition_cost),
            "operating_pct": pct_of_gross(operating_total),
            "maintenance_pct": pct_of_gross(maintenance_cost),
            "repair_pct": pct_of_gross(repair_cost),
            "accessory_pct": pct_of_gross(accessory_cost),
            "financing_pct": pct_of_gross(effective_financing),
        }

        explanations = [
            f"Gross ownership costs total ₹{gross_cost:,.2f} over {ownership_months} months.",
        ]
        if purchase_includes_financing:
            explanations.append("Purchase price already includes financing; financing interest was not double-counted.")

        if estimated_resale is not None:
            explanations.append(
                f"Deducting estimated resale proceeds of ₹{estimated_resale:,.2f} once results in Net TCO of ₹{net_cost:,.2f} (effective ₹{monthly_equivalent_cost:,.2f}/month)."
            )
        else:
            explanations.append(
                "Estimated resale proceeds are unknown; Net TCO and monthly equivalent cost cannot be determined without a resale valuation assumption."
            )

        if not is_complete:
            explanations.append(
                f"Notice: The following optional cost parameters were omitted: {', '.join(missing_fields)}. They were not assumed to be zero."
            )

        return {
            "success": True,
            "product_id": product.id if product else None,
            "product": product.to_dict() if product else None,
            "ownership_months": ownership_months,
            "gross_cost": gross_cost,
            "net_cost": net_cost,
            "monthly_equivalent_cost": monthly_equivalent_cost,
            "resale_recovery_pct": resale_recovery_pct,
            "is_complete": is_complete,
            "completeness_status": completeness_status,
            "missing_fields": missing_fields,
            "cost_breakdown": cost_breakdown,
            "breakdown_percentages": breakdown_percentages,
            "data_provenance": {
                "purchase_price_source": purchase_price_source,
                "resale_source": resale_source,
            },
            "explanations": explanations,
        }

    @classmethod
    def compare_tco(cls, products_list: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not products_list or not isinstance(products_list, list):
            return {
                "error": "EMPTY_COMPARISON_LIST",
                "message": "At least two products must be supplied for TCO comparison."
            }

        if len(products_list) > 5:
            return {
                "error": "COMPARISON_LIMIT_EXCEEDED",
                "message": "A maximum of 5 products can be compared simultaneously."
            }

        # Check for duplicate product entries if ownership duration is identical
        seen_keys = set()
        for idx, item in enumerate(products_list):
            pid = item.get("product_id")
            months = item.get("ownership_months", 36)
            if pid is not None:
                key = (pid, months)
                if key in seen_keys:
                    return {
                        "error": "DUPLICATE_COMPARISON_PRODUCT",
                        "message": f"Product ID {pid} is included multiple times with identical ownership duration ({months} months). Compare distinct products or different ownership horizons."
                    }
                seen_keys.add(key)

        evaluated_items = []
        all_complete = True
        durations_set = set()

        for idx, item_payload in enumerate(products_list):
            res = cls.calculate_tco(item_payload)
            if "error" in res:
                return {
                    "error": "INVALID_ITEM_IN_COMPARISON",
                    "message": f"Product #{idx + 1}: {res['message']}"
                }
            evaluated_items.append(res)
            durations_set.add(res["ownership_months"])
            if not res["is_complete"]:
                all_complete = False

        # Fairness Check: Ensure equivalent ownership periods
        matching_durations = len(durations_set) == 1

        # Ranking logic
        # Only rank by net_cost if ALL items are complete, have matching durations, and have valid net_cost
        if all_complete and matching_durations and all(it["net_cost"] is not None for it in evaluated_items):
            evaluated_items.sort(key=lambda x: x["net_cost"])
            cheapest_item = evaluated_items[0]
            comparison_status = "fully_comparable"
            summary_message = f"'{cheapest_item['product']['name'] if cheapest_item.get('product') else 'Product #1'}' offers the lowest verified Net TCO (₹{cheapest_item['net_cost']:,.2f})."
        elif not matching_durations:
            comparison_status = "partially_comparable"
            summary_message = "Cannot compare products directly because ownership horizons differ across products. Select matching ownership durations (e.g. 36 months) for fair lifecycle comparison."
        else:
            comparison_status = "partially_comparable"
            summary_message = "Cannot determine definitive cheapest product because one or more products have incomplete cost inputs or missing resale values."

        return {
            "success": True,
            "comparison_status": comparison_status,
            "is_fully_comparable": all_complete and matching_durations,
            "products_count": len(evaluated_items),
            "summary_message": summary_message,
            "comparisons": evaluated_items,
        }
