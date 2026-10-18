import re
from datetime import datetime
from typing import Dict, Any, Optional, List
from app.models import Coupon, Retailer, Product, Offer
from app.extensions import db

class CouponService:
    """
    Business logic service for coupon and promotion intelligence:
    - Discovery, search, and filtering
    - Multi-tier eligibility validation
    - Precise savings and payable total calculations
    - Transparent verification and provenance tracking
    """

    SUPPORTED_DISCOUNT_TYPES = ("percentage", "fixed_amount", "fixed", "free_shipping")
    VALID_VERIFICATION_STATUSES = ("verified", "unverified", "expired", "invalid")

    @classmethod
    def list_coupons(
        cls,
        search: Optional[str] = None,
        retailer_id: Optional[int] = None,
        discount_type: Optional[str] = None,
        verification_status: Optional[str] = None,
        product_id: Optional[int] = None,
        category: Optional[str] = None,
        active_only: bool = True,
        sort: str = "newest",
        page: int = 1,
        per_page: int = 20
    ) -> Dict[str, Any]:
        """
        Retrieves paginated, filtered coupons matching the query criteria.
        """
        query = Coupon.query
        now = datetime.utcnow()

        if active_only:
            query = query.filter(
                Coupon.is_active.is_(True),
                db.or_(Coupon.valid_until.is_(None), Coupon.valid_until >= now),
                db.or_(Coupon.valid_from.is_(None), Coupon.valid_from <= now)
            )

        if search and search.strip():
            s = f"%{search.strip().lower()}%"
            query = query.filter(
                db.or_(
                    db.func.lower(Coupon.code).like(s),
                    db.func.lower(Coupon.title).like(s),
                    db.func.lower(Coupon.description).like(s)
                )
            )

        if retailer_id is not None:
            # Match retailer-specific coupons OR platform-wide coupons (retailer_id is None)
            query = query.filter(db.or_(Coupon.retailer_id == retailer_id, Coupon.retailer_id.is_(None)))

        if discount_type:
            dt = discount_type.strip().lower()
            if dt in ("fixed", "fixed_amount"):
                query = query.filter(Coupon.discount_type.in_(["fixed", "fixed_amount"]))
            else:
                query = query.filter(Coupon.discount_type == dt)

        if verification_status:
            vs = verification_status.strip().lower()
            if vs == "expired":
                query = query.filter(Coupon.valid_until < now)
            else:
                query = query.filter(Coupon.verification_status == vs)

        # Product-specific or category-specific match
        if product_id is not None:
            prod = db.session.get(Product, product_id)
            if prod:
                query = query.filter(
                    db.or_(
                        Coupon.applicable_product_id == product_id,
                        Coupon.applicable_category == prod.category,
                        db.and_(
                            Coupon.applicable_product_id.is_(None),
                            Coupon.applicable_category.is_(None)
                        )
                    )
                )
        elif category:
            c = category.strip()
            query = query.filter(
                db.or_(
                    Coupon.applicable_category.ilike(f"%{c}%"),
                    Coupon.applicable_category.is_(None)
                )
            )

        # Sorting
        if sort == "discount_desc":
            query = query.order_by(Coupon.discount_value.desc())
        elif sort == "min_order_asc":
            query = query.order_by(Coupon.min_order_value.asc())
        elif sort == "expiring_soon":
            # Coupons with valid_until closest to now first
            query = query.order_by(Coupon.valid_until.asc().nulls_last())
        else:  # newest
            query = query.order_by(Coupon.created_at.desc())

        # Pagination
        page = max(1, page)
        per_page = min(max(1, per_page), 100)
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        coupons_list = [c.to_dict() for c in pagination.items]

        return {
            "items": coupons_list,
            "total_count": pagination.total,
            "page": pagination.page,
            "per_page": pagination.per_page,
            "total_pages": pagination.pages,
            "has_next": pagination.has_next,
            "has_prev": pagination.has_prev,
        }

    @classmethod
    def get_coupon(cls, coupon_id: int) -> Optional[Dict[str, Any]]:
        """Retrieve coupon details by ID."""
        coupon = db.session.get(Coupon, coupon_id)
        return coupon.to_dict() if coupon else None

    @classmethod
    def get_coupon_by_code(cls, code: str) -> Optional[Coupon]:
        """Find coupon model record by code (case-insensitive)."""
        if not code:
            return None
        return Coupon.query.filter(db.func.upper(Coupon.code) == code.strip().upper()).first()

    @classmethod
    def validate_coupon(
        cls,
        coupon_identifier: Any,
        purchase_amount: Optional[float] = None,
        product_id: Optional[int] = None,
        retailer_id: Optional[int] = None,
        quantity: int = 1,
        shipping_cost: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Evaluates a coupon against a purchase context.
        Determines eligibility, computes discounts with maximum caps,
        handles shipping transparency, and explains outcomes.
        """
        # 1. Resolve Coupon
        coupon = None
        if isinstance(coupon_identifier, int) or (isinstance(coupon_identifier, str) and coupon_identifier.isdigit()):
            coupon = db.session.get(Coupon, int(coupon_identifier))
        if not coupon and isinstance(coupon_identifier, str):
            coupon = cls.get_coupon_by_code(coupon_identifier)

        if not coupon:
            return {
                "is_eligible": False,
                "error": "COUPON_NOT_FOUND",
                "message": f"Coupon '{coupon_identifier}' was not found in the promotion registry.",
                "rejection_reason": "Invalid or unrecognized coupon code."
            }

        now = datetime.utcnow()

        # 2. Resolve Product if ID supplied
        product = db.session.get(Product, product_id) if product_id else None

        # 3. Resolve Purchase Amount if not directly supplied
        if purchase_amount is None:
            if product:
                # If retailer specified, look up retailer offer price
                if retailer_id:
                    offer = Offer.query.filter_by(product_id=product.id, retailer_id=retailer_id).first()
                    unit_price = float(offer.price) if offer and offer.price else float(product.base_mrp)
                    if shipping_cost is None and offer:
                        shipping_cost = offer.shipping_cost
                else:
                    unit_price = float(product.base_mrp)
                purchase_amount = unit_price * max(1, quantity)
            else:
                return {
                    "is_eligible": False,
                    "error": "MISSING_PURCHASE_AMOUNT",
                    "message": "Eligible purchase amount or product ID must be provided to validate coupon.",
                    "rejection_reason": "Purchase amount is required to evaluate minimum purchase requirements."
                }

        purchase_amount = float(purchase_amount)
        if purchase_amount < 0:
            return {
                "is_eligible": False,
                "error": "INVALID_AMOUNT",
                "message": "Purchase amount must be greater than or equal to ₹0.",
                "rejection_reason": "Invalid purchase amount."
            }

        # 4. Check Active Status
        if not coupon.is_active:
            return {
                "is_eligible": False,
                "coupon": coupon.to_dict(),
                "error": "COUPON_INACTIVE",
                "message": f"Coupon '{coupon.code}' is currently inactive or deactivated.",
                "rejection_reason": "Promotion has been paused or disabled."
            }

        # 5. Check Temporal Validity
        if coupon.valid_from and now < coupon.valid_from:
            return {
                "is_eligible": False,
                "coupon": coupon.to_dict(),
                "error": "COUPON_NOT_YET_ACTIVE",
                "message": f"Coupon '{coupon.code}' is not yet valid (starts on {coupon.valid_from.strftime('%d %b %Y')}).",
                "rejection_reason": "Upcoming promotion not yet active."
            }

        if coupon.valid_until and now > coupon.valid_until:
            return {
                "is_eligible": False,
                "coupon": coupon.to_dict(),
                "error": "COUPON_EXPIRED",
                "message": f"Coupon '{coupon.code}' expired on {coupon.valid_until.strftime('%d %b %Y')}.",
                "rejection_reason": "Promotion has expired."
            }

        # 6. Check Retailer Restriction
        if coupon.retailer_id is not None:
            if retailer_id is not None and retailer_id != coupon.retailer_id:
                ret_name = coupon.retailer.name if coupon.retailer else "Retailer"
                return {
                    "is_eligible": False,
                    "coupon": coupon.to_dict(),
                    "error": "RETAILER_MISMATCH",
                    "message": f"Coupon '{coupon.code}' is exclusively valid at {ret_name}.",
                    "rejection_reason": f"Only valid at {ret_name}."
                }

        # 7. Check Product Restriction
        if coupon.applicable_product_id is not None:
            if product_id is not None and product_id != coupon.applicable_product_id:
                app_prod = coupon.applicable_product.name if coupon.applicable_product else f"Product #{coupon.applicable_product_id}"
                return {
                    "is_eligible": False,
                    "coupon": coupon.to_dict(),
                    "error": "PRODUCT_MISMATCH",
                    "message": f"Coupon '{coupon.code}' applies exclusively to {app_prod}.",
                    "rejection_reason": f"Restricted to {app_prod}."
                }

        # 8. Check Category Restriction
        if coupon.applicable_category and product:
            prod_category = (product.category or "").strip().lower()
            coupon_category = coupon.applicable_category.strip().lower()
            if prod_category != coupon_category:
                return {
                    "is_eligible": False,
                    "coupon": coupon.to_dict(),
                    "error": "CATEGORY_MISMATCH",
                    "message": f"Coupon '{coupon.code}' applies only to {coupon.applicable_category} (product is in {product.category}).",
                    "rejection_reason": f"Restricted to {coupon.applicable_category} category."
                }

        # 9. Check Minimum Order Requirement
        if coupon.min_order_value and purchase_amount < float(coupon.min_order_value):
            shortfall = round(float(coupon.min_order_value) - purchase_amount, 2)
            return {
                "is_eligible": False,
                "coupon": coupon.to_dict(),
                "error": "MINIMUM_ORDER_NOT_MET",
                "message": (
                    f"Order amount of ₹{purchase_amount:,.2f} does not meet the minimum requirement of "
                    f"₹{coupon.min_order_value:,.2f} for coupon '{coupon.code}'. Add ₹{shortfall:,.2f} more to qualify."
                ),
                "rejection_reason": f"Minimum order value of ₹{coupon.min_order_value:,.2f} required."
            }

        # 10. Calculate Savings Breakdown
        discount_type = coupon.discount_type
        discount_amount = 0.0
        shipping_is_unknown = (shipping_cost is None)
        calculation_notes = []

        if discount_type == "percentage":
            calculated = (purchase_amount * float(coupon.discount_value)) / 100.0
            if coupon.max_discount_value and calculated > float(coupon.max_discount_value):
                discount_amount = float(coupon.max_discount_value)
                calculation_notes.append(
                    f"{coupon.discount_value}% discount reached the maximum cap of ₹{coupon.max_discount_value:,.2f}."
                )
            else:
                discount_amount = calculated
                calculation_notes.append(f"{coupon.discount_value}% discount applied.")
        elif discount_type in ("fixed", "fixed_amount"):
            discount_amount = min(float(coupon.discount_value), purchase_amount)
            calculation_notes.append(f"Flat ₹{discount_amount:,.2f} discount applied.")
        elif discount_type == "free_shipping":
            if shipping_is_unknown:
                discount_amount = 0.0
                calculation_notes.append(
                    "Free shipping promotion applies. Shipping fee is currently undisclosed by retailer and will be waived once confirmed."
                )
            else:
                discount_amount = float(shipping_cost)
                calculation_notes.append(f"Free delivery applied: ₹{discount_amount:,.2f} shipping waived.")
        else:
            discount_amount = 0.0

        # Ensure discount does not exceed purchase amount (plus known shipping if applicable)
        max_eligible_discount = purchase_amount + (float(shipping_cost) if shipping_cost is not None else 0.0)
        discount_amount = round(min(discount_amount, max_eligible_discount), 2)

        # 11. Final Payable Total & Subtotal
        subtotal_after_discount = max(0.0, round(purchase_amount - discount_amount, 2))

        if shipping_is_unknown:
            # When shipping is unknown, do not silently substitute zero.
            # The final purchase total cannot be computed with certainty; mark as incomplete.
            estimated_payable = None
            is_complete_total = False
            calculation_notes.append(
                "Final payable total cannot be determined with certainty because shipping cost is undisclosed by the retailer."
            )
        else:
            estimated_payable = max(0.0, round(subtotal_after_discount + float(shipping_cost), 2))
            is_complete_total = True

        return {
            "is_eligible": True,
            "coupon": coupon.to_dict(),
            "discount_type": discount_type,
            "discount_amount": discount_amount,
            "calculated_discount": discount_amount,
            "purchase_amount": round(purchase_amount, 2),
            "subtotal_after_discount": subtotal_after_discount,
            "shipping_cost": round(shipping_cost, 2) if shipping_cost is not None else None,
            "shipping_is_unknown": shipping_is_unknown,
            "estimated_payable_amount": estimated_payable,
            "is_complete_total": is_complete_total,
            "verification_status": coupon.verification_status,
            "provenance": coupon.source_type,
            "calculation_notes": calculation_notes,
            "message": f"Coupon '{coupon.code}' is eligible! Total estimated savings: ₹{discount_amount:,.2f}.",
            "explanation": f"Coupon '{coupon.code}' is eligible! Total estimated savings: ₹{discount_amount:,.2f}."
        }

    @classmethod
    def create_coupon(
        cls,
        code: str,
        title: str,
        discount_type: str,
        discount_value: float,
        retailer_id: Optional[int] = None,
        description: Optional[str] = None,
        min_order_value: float = 0.0,
        max_discount_value: Optional[float] = None,
        valid_from: Optional[datetime] = None,
        valid_until: Optional[datetime] = None,
        applicable_category: Optional[str] = None,
        applicable_product_id: Optional[int] = None,
        terms_and_conditions: Optional[str] = None,
        is_admin_verified: bool = False
    ) -> Dict[str, Any]:
        """
        Creates a new coupon with input validation.
        Demonstration/user submissions default to 'unverified'.
        """
        if not code or not code.strip():
            return {"error": "INVALID_CODE", "message": "Coupon code cannot be empty."}

        clean_code = code.strip().upper()
        if not re.match(r"^[A-Z0-9_\-]+$", clean_code):
            return {
                "error": "INVALID_CODE",
                "message": "Coupon code may only contain alphanumeric characters, hyphens, and underscores."
            }

        existing = Coupon.query.filter_by(code=clean_code).first()
        if existing:
            return {"error": "DUPLICATE_CODE", "message": f"Coupon code '{clean_code}' already exists."}

        if not title or not title.strip():
            return {"error": "INVALID_TITLE", "message": "Coupon title is required."}

        dt = (discount_type or "").strip().lower()
        if dt not in cls.SUPPORTED_DISCOUNT_TYPES:
            return {
                "error": "INVALID_DISCOUNT_TYPE",
                "message": f"Discount type must be one of: {', '.join(cls.SUPPORTED_DISCOUNT_TYPES)}."
            }

        try:
            d_val = float(discount_value)
            if d_val <= 0 and dt != "free_shipping":
                return {"error": "INVALID_DISCOUNT_VALUE", "message": "Discount value must be greater than 0."}
        except (ValueError, TypeError):
            return {"error": "INVALID_DISCOUNT_VALUE", "message": "Discount value must be a valid number."}

        if retailer_id is not None:
            ret = db.session.get(Retailer, retailer_id)
            if not ret:
                return {"error": "RETAILER_NOT_FOUND", "message": f"Retailer #{retailer_id} not found."}

        if applicable_product_id is not None:
            prod = db.session.get(Product, applicable_product_id)
            if not prod:
                return {"error": "PRODUCT_NOT_FOUND", "message": f"Product #{applicable_product_id} not found."}

        verification_status = "verified" if is_admin_verified else "unverified"

        new_coupon = Coupon(
            code=clean_code,
            title=title.strip(),
            discount_type=dt,
            discount_value=d_val,
            retailer_id=retailer_id,
            description=description.strip() if description else None,
            min_order_value=float(min_order_value or 0.0),
            max_discount_value=float(max_discount_value) if max_discount_value is not None else None,
            valid_from=valid_from or datetime.utcnow(),
            valid_until=valid_until,
            applicable_category=applicable_category.strip() if applicable_category else None,
            applicable_product_id=applicable_product_id,
            verification_status=verification_status,
            source_type="manual" if is_admin_verified else "demo",
            terms_and_conditions=terms_and_conditions.strip() if terms_and_conditions else None,
            created_at=datetime.utcnow(),
            is_active=True
        )

        db.session.add(new_coupon)
        db.session.commit()

        return {
            "coupon": new_coupon.to_dict(),
            "message": f"Coupon '{clean_code}' created successfully."
        }
