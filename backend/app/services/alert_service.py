import re
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from app.models import Alert, Product, Retailer, Offer, PriceHistory
from app.extensions import db

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

class AlertService:
    """
    Service for managing price alerts and evaluating target-price trigger conditions.
    Enforces freshness rules, duplicate creation suppression, ownership checks,
    and idempotent trigger evaluation.
    """

    # Maximum age for an offer observation to be considered fresh for trigger evaluation
    MAX_OBSERVATION_AGE_DAYS = 30

    @classmethod
    def create_alert(
        cls,
        product_id: int,
        target_price: float,
        contact_email: str,
        retailer_id: Optional[int] = None,
        user_identifier: str = "guest_user"
    ) -> Dict[str, Any]:
        """
        Creates a new target-price alert with input validation and duplicate active alert suppression.
        """
        product = Product.query.get(product_id)
        if not product:
            return {"error": "PRODUCT_NOT_FOUND", "message": f"Product #{product_id} was not found."}

        if retailer_id is not None:
            retailer = Retailer.query.get(retailer_id)
            if not retailer:
                return {"error": "RETAILER_NOT_FOUND", "message": f"Retailer #{retailer_id} was not found."}

        try:
            target_price = float(target_price)
            if target_price <= 0:
                return {"error": "INVALID_TARGET_PRICE", "message": "Target price must be greater than 0."}
        except (ValueError, TypeError):
            return {"error": "INVALID_TARGET_PRICE", "message": "Target price must be a valid numeric value."}

        if not contact_email or not EMAIL_REGEX.match(contact_email.strip()):
            return {"error": "INVALID_EMAIL", "message": "A valid notification email address is required."}

        clean_email = contact_email.strip().lower()

        # Duplicate suppression: verify if an identical active alert already exists
        existing_duplicate = Alert.query.filter_by(
            product_id=product_id,
            retailer_id=retailer_id,
            user_identifier=user_identifier,
            target_price=target_price,
            is_active=True
        ).first()

        if existing_duplicate:
            return {
                "alert": existing_duplicate.to_dict(),
                "created": False,
                "message": "An identical active price alert is already configured for this product and target price."
            }

        new_alert = Alert(
            product_id=product_id,
            retailer_id=retailer_id,
            target_price=target_price,
            contact_email=clean_email,
            user_identifier=user_identifier,
            is_active=True,
            trigger_status="active",
            created_at=datetime.utcnow()
        )
        db.session.add(new_alert)
        db.session.commit()

        return {
            "alert": new_alert.to_dict(),
            "created": True,
            "message": f"Target price alert created for {product.name} at ₹{target_price:,.2f}."
        }

    @classmethod
    def list_alerts(
        cls,
        user_identifier: Optional[str] = "guest_user",
        status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Lists alerts for a user with optional status filter.
        """
        query = Alert.query
        if user_identifier:
            query = query.filter_by(user_identifier=user_identifier)

        if status == "active":
            query = query.filter_by(is_active=True)
        elif status == "inactive":
            query = query.filter_by(is_active=False)
        elif status == "triggered":
            query = query.filter_by(trigger_status="triggered")

        alerts = query.order_by(Alert.created_at.desc()).all()
        return [a.to_dict() for a in alerts]

    @classmethod
    def update_alert(
        cls,
        alert_id: int,
        is_active: Optional[bool] = None,
        target_price: Optional[float] = None,
        user_identifier: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Updates alert settings with optional user ownership enforcement.
        """
        alert = Alert.query.get(alert_id)
        if not alert:
            return {"error": "ALERT_NOT_FOUND", "message": f"Alert #{alert_id} was not found."}

        # Ownership verification
        if user_identifier and alert.user_identifier != user_identifier:
            return {"error": "UNAUTHORIZED", "message": "You do not have permission to modify this alert."}

        if target_price is not None:
            try:
                t_price = float(target_price)
                if t_price <= 0:
                    return {"error": "INVALID_TARGET_PRICE", "message": "Target price must be greater than 0."}
                alert.target_price = t_price
            except (ValueError, TypeError):
                return {"error": "INVALID_TARGET_PRICE", "message": "Target price must be a valid numeric value."}

        if is_active is not None:
            alert.is_active = bool(is_active)
            if not alert.is_active:
                alert.trigger_status = "inactive"
            elif alert.trigger_status == "inactive":
                alert.trigger_status = "active"

        db.session.commit()
        return {
            "alert": alert.to_dict(),
            "message": f"Alert #{alert_id} updated successfully."
        }

    @classmethod
    def delete_alert(cls, alert_id: int, user_identifier: Optional[str] = None) -> Dict[str, Any]:
        """
        Permanently removes an alert record with optional user ownership enforcement.
        """
        alert = Alert.query.get(alert_id)
        if not alert:
            return {"error": "ALERT_NOT_FOUND", "message": f"Alert #{alert_id} was not found."}

        if user_identifier and alert.user_identifier != user_identifier:
            return {"error": "UNAUTHORIZED", "message": "You do not have permission to delete this alert."}

        db.session.delete(alert)
        db.session.commit()
        return {"success": True, "message": f"Alert #{alert_id} deleted successfully."}

    @classmethod
    def evaluate_alerts(
        cls,
        alert_id: Optional[int] = None,
        user_identifier: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Evaluates active target-price alerts against valid current offers.
        - Enforces freshness rule (rejects offers older than MAX_OBSERVATION_AGE_DAYS)
        - Excludes out-of-stock items
        - Re-arms triggered alerts if current price rises back above target
        - Suppresses duplicate trigger count increments
        - Includes full metadata: retailer, price, shipping completeness, observation time
        - Safely rolls back on unexpected database errors to prevent dirty alert states
        """
        query = Alert.query.filter_by(is_active=True)
        if alert_id is not None:
            query = query.filter_by(id=alert_id)
        if user_identifier is not None:
            query = query.filter_by(user_identifier=user_identifier)

        alerts = query.all()
        now = datetime.utcnow()
        freshness_cutoff = now - timedelta(days=cls.MAX_OBSERVATION_AGE_DAYS)

        evaluated_count = 0
        triggered_count = 0
        skipped_count = 0
        results = []

        try:
            for alert in alerts:
                evaluated_count += 1
                observed_price = None
                observed_retailer = None
                shipping_cost = None
                shipping_is_unknown = False
                observation_time = None
                source_type = "demo"
                skip_reason = None

                # 1. Obtain current valid price observation
                if alert.retailer_id:
                    # Retailer-specific alert: inspect only that retailer's offer
                    offer = Offer.query.filter_by(
                        product_id=alert.product_id,
                        retailer_id=alert.retailer_id
                    ).first()

                    if not offer:
                        skip_reason = "No offer recorded for this specific retailer."
                    elif not offer.is_available:
                        skip_reason = f"Offer from {offer.retailer.name if offer.retailer else 'retailer'} is currently out of stock."
                    elif offer.updated_at and offer.updated_at < freshness_cutoff:
                        skip_reason = f"Offer price observation is stale (> {cls.MAX_OBSERVATION_AGE_DAYS} days old). Awaiting fresh market sync."
                    elif not offer.price or float(offer.price) <= 0:
                        skip_reason = "Invalid non-positive offer price."
                    else:
                        observed_price = float(offer.price)
                        observed_retailer = offer.retailer.name if offer.retailer else "Retailer"
                        shipping_cost = offer.shipping_cost
                        shipping_is_unknown = offer.shipping_is_unknown
                        observation_time = offer.updated_at.isoformat() + "Z" if offer.updated_at else None
                        source_type = offer.source_type
                else:
                    # Product-wide alert: find cheapest eligible in-stock offer
                    available_offers = Offer.query.filter_by(product_id=alert.product_id).all()
                    
                    # Filter for available, fresh, and valid offers
                    fresh_eligible_offers = [
                        o for o in available_offers
                        if o.is_available
                        and o.price and float(o.price) > 0
                        and (not o.updated_at or o.updated_at >= freshness_cutoff)
                    ]

                    if not fresh_eligible_offers:
                        # Check if offers exist but were rejected
                        if any(not o.is_available for o in available_offers):
                            skip_reason = "All available offers for this product are currently out of stock."
                        elif any(o.updated_at and o.updated_at < freshness_cutoff for o in available_offers):
                            skip_reason = f"All available offers are stale (> {cls.MAX_OBSERVATION_AGE_DAYS} days old)."
                        else:
                            skip_reason = "No active offers found for this product."
                    else:
                        # Select lowest listed price among verified in-stock fresh offers
                        best_offer = min(fresh_eligible_offers, key=lambda x: float(x.price))
                        observed_price = float(best_offer.price)
                        observed_retailer = best_offer.retailer.name if best_offer.retailer else "Retailer"
                        shipping_cost = best_offer.shipping_cost
                        shipping_is_unknown = best_offer.shipping_is_unknown
                        observation_time = best_offer.updated_at.isoformat() + "Z" if best_offer.updated_at else None
                        source_type = best_offer.source_type

                # 2. Handle skipped evaluation
                if observed_price is None:
                    skipped_count += 1
                    alert.last_checked_at = now
                    results.append({
                        "alert_id": alert.id,
                        "product_name": alert.product.name if alert.product else "Unknown",
                        "status": "skipped",
                        "reason": skip_reason
                    })
                    continue

                alert.last_checked_at = now
                alert.last_observed_price = round(observed_price, 2)

                # 3. Check trigger condition
                if observed_price <= float(alert.target_price):
                    is_repeated_trigger = (alert.trigger_status == "triggered")
                    
                    # Increment trigger count only on first trigger transition
                    if not is_repeated_trigger:
                        alert.trigger_count += 1

                    alert.last_triggered_at = now
                    alert.trigger_status = "triggered"
                    triggered_count += 1

                    results.append({
                        "alert_id": alert.id,
                        "product_name": alert.product.name if alert.product else "Unknown",
                        "retailer": observed_retailer,
                        "target_price": alert.target_price,
                        "observed_price": observed_price,
                        "shipping_cost": shipping_cost,
                        "shipping_is_unknown": shipping_is_unknown,
                        "observation_time": observation_time,
                        "source_type": source_type,
                        "status": "triggered",
                        "is_duplicate_suppressed": is_repeated_trigger,
                        "message": (
                            f"Target reached! Current price ₹{observed_price:,.2f} <= ₹{alert.target_price:,.2f} via {observed_retailer}."
                            + (" (Shipping cost unknown)" if shipping_is_unknown else "")
                        )
                    })
                else:
                    # Price exceeds target. If previously triggered, re-arm to active state!
                    was_previously_triggered = (alert.trigger_status == "triggered")
                    if was_previously_triggered:
                        alert.trigger_status = "active"

                    results.append({
                        "alert_id": alert.id,
                        "product_name": alert.product.name if alert.product else "Unknown",
                        "retailer": observed_retailer,
                        "target_price": alert.target_price,
                        "observed_price": observed_price,
                        "shipping_cost": shipping_cost,
                        "shipping_is_unknown": shipping_is_unknown,
                        "observation_time": observation_time,
                        "source_type": source_type,
                        "status": "not_triggered",
                        "message": (
                            f"Price ₹{observed_price:,.2f} exceeds target ₹{alert.target_price:,.2f}."
                            + (" Alert re-armed." if was_previously_triggered else "")
                        )
                    })

            db.session.commit()

        except Exception as e:
            db.session.rollback()
            raise e

        return {
            "evaluated_count": evaluated_count,
            "triggered_count": triggered_count,
            "skipped_count": skipped_count,
            "timestamp": now.isoformat() + "Z",
            "results": results
        }
