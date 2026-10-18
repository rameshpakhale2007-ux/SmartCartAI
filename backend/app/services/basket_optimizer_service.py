import itertools
from datetime import datetime
from typing import Dict, Any, Optional, List, Tuple
from app.models import Basket, BasketItem, Product, Retailer, Offer, Coupon
from app.services.coupon_service import CouponService
from app.extensions import db

class BasketOptimizerService:
    """
    Multi-Vendor Basket Optimization Engine:
    - Basket CRUD and item deduplication
    - Real-time multi-retailer offer discovery & availability filtering
    - Exact and bounded combinatorial basket optimization
    - Single-Retailer vs. Multi-Retailer (Split-Order) cost comparison
    - Order-level shipping threshold aggregation and transparent unknown shipping handling
    - Verified coupon eligibility and conditional promotion reporting
    """

    MAX_BASKET_QUANTITY = 50
    DEFAULT_MAX_RETAILERS = 3

    # ==========================================
    # 1. BASKET CRUD & MANAGEMENT
    # ==========================================

    @classmethod
    def get_or_create_basket(cls, user_identifier: str = "guest_user") -> Basket:
        """
        Retrieves the active basket for the specified user or creates a new one.
        """
        user_identifier = (user_identifier or "guest_user").strip()
        basket = Basket.query.filter_by(user_identifier=user_identifier, status="active").first()
        if not basket:
            basket = Basket(user_identifier=user_identifier, status="active")
            db.session.add(basket)
            db.session.commit()
        return basket

    @classmethod
    def get_basket_details(cls, user_identifier: str = "guest_user") -> Dict[str, Any]:
        """
        Returns full details of the active basket including items, product info,
        and current available offers across all retailers.
        """
        basket = cls.get_or_create_basket(user_identifier)
        items_payload = []
        total_mrp_sum = 0.0

        for item in basket.items:
            product = item.product
            if not product:
                continue

            # Gather all offers for this product
            offers = Offer.query.filter_by(product_id=product.id).all()
            offers_data = [o.to_dict() for o in offers]
            available_offers = [o for o in offers if o.is_available]

            lowest_offer = None
            if available_offers:
                # Lowest listed unit price among in-stock offers
                lowest_offer = min(available_offers, key=lambda o: float(o.price)).to_dict()

            item_dict = item.to_dict()
            item_dict["product"] = product.to_dict() if product else None
            item_dict["available_offers_count"] = len(available_offers)
            item_dict["total_offers_count"] = len(offers)
            item_dict["lowest_offer"] = lowest_offer
            item_dict["all_offers"] = offers_data
            item_dict["item_mrp_subtotal"] = round(float(product.base_mrp or 0.0) * item.quantity, 2)
            total_mrp_sum += item_dict["item_mrp_subtotal"]

            items_payload.append(item_dict)

        return {
            "basket_id": basket.id,
            "user_identifier": basket.user_identifier,
            "status": basket.status,
            "items": items_payload,
            "total_items": sum(i["quantity"] for i in items_payload),
            "unique_products_count": len(items_payload),
            "catalog_mrp_total": round(total_mrp_sum, 2),
            "updated_at": basket.updated_at.isoformat() if basket.updated_at else None,
        }

    @classmethod
    def add_item(
        cls,
        user_identifier: str = "guest_user",
        product_id: Optional[int] = None,
        quantity: int = 1,
        preferred_retailer_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Adds a product to the basket. If the product already exists,
        its quantity is incremented (deduplication rule).
        """
        if not product_id:
            return {"error": "MISSING_PRODUCT_ID", "message": "Product ID is required."}

        try:
            quantity = int(quantity)
        except (ValueError, TypeError):
            return {"error": "INVALID_QUANTITY", "message": "Quantity must be a positive integer."}

        if quantity <= 0:
            return {"error": "INVALID_QUANTITY", "message": "Quantity must be greater than zero."}

        if quantity > cls.MAX_BASKET_QUANTITY:
            return {
                "error": "QUANTITY_EXCEEDED",
                "message": f"Quantity exceeds maximum allowed limit of {cls.MAX_BASKET_QUANTITY} units per item."
            }

        product = db.session.get(Product, product_id)
        if not product:
            return {"error": "PRODUCT_NOT_FOUND", "message": f"Product with ID {product_id} was not found."}

        if preferred_retailer_id is not None:
            retailer = db.session.get(Retailer, preferred_retailer_id)
            if not retailer:
                return {"error": "RETAILER_NOT_FOUND", "message": f"Retailer with ID {preferred_retailer_id} not found."}

        basket = cls.get_or_create_basket(user_identifier)

        # Check existing item for deduplication
        existing_item = BasketItem.query.filter_by(basket_id=basket.id, product_id=product.id).first()
        if existing_item:
            new_qty = existing_item.quantity + quantity
            if new_qty > cls.MAX_BASKET_QUANTITY:
                return {
                    "error": "QUANTITY_EXCEEDED",
                    "message": f"Total quantity ({new_qty}) would exceed maximum allowed limit of {cls.MAX_BASKET_QUANTITY}."
                }
            existing_item.quantity = new_qty
            if preferred_retailer_id is not None:
                existing_item.preferred_retailer_id = preferred_retailer_id
            db.session.commit()
            return {"success": True, "message": f"Updated quantity for '{product.name}' to {new_qty}.", "item": existing_item.to_dict()}
        else:
            new_item = BasketItem(
                basket_id=basket.id,
                product_id=product.id,
                quantity=quantity,
                preferred_retailer_id=preferred_retailer_id
            )
            db.session.add(new_item)
            db.session.commit()
            return {"success": True, "message": f"Added '{product.name}' to basket.", "item": new_item.to_dict()}

    @classmethod
    def update_item_quantity(
        cls,
        user_identifier: str,
        item_id: int,
        quantity: int
    ) -> Dict[str, Any]:
        """
        Updates the quantity of an existing basket item.
        """
        try:
            quantity = int(quantity)
        except (ValueError, TypeError):
            return {"error": "INVALID_QUANTITY", "message": "Quantity must be a positive integer."}

        if quantity <= 0:
            return {"error": "INVALID_QUANTITY", "message": "Quantity must be greater than zero."}

        if quantity > cls.MAX_BASKET_QUANTITY:
            return {
                "error": "QUANTITY_EXCEEDED",
                "message": f"Quantity exceeds maximum allowed limit of {cls.MAX_BASKET_QUANTITY}."
            }

        basket = cls.get_or_create_basket(user_identifier)
        item = BasketItem.query.filter_by(id=item_id, basket_id=basket.id).first()
        if not item:
            return {"error": "ITEM_NOT_FOUND", "message": f"Basket item {item_id} not found in active basket."}

        item.quantity = quantity
        db.session.commit()
        return {"success": True, "message": f"Updated quantity to {quantity}.", "item": item.to_dict()}

    @classmethod
    def remove_item(cls, user_identifier: str, item_id: int) -> Dict[str, Any]:
        """
        Removes an item from the active basket.
        """
        basket = cls.get_or_create_basket(user_identifier)
        item = BasketItem.query.filter_by(id=item_id, basket_id=basket.id).first()
        if not item:
            return {"error": "ITEM_NOT_FOUND", "message": f"Basket item {item_id} not found in active basket."}

        db.session.delete(item)
        db.session.commit()
        return {"success": True, "message": "Item removed from basket."}

    @classmethod
    def clear_basket(cls, user_identifier: str) -> Dict[str, Any]:
        """
        Clears all items from the active basket.
        """
        basket = cls.get_or_create_basket(user_identifier)
        count = len(basket.items)
        for item in basket.items:
            db.session.delete(item)
        db.session.commit()
        return {"success": True, "message": f"Cleared {count} item(s) from basket."}

    # ==========================================
    # 2. COST CALCULATION ENGINE
    # ==========================================

    @classmethod
    def evaluate_retailer_shipment(
        cls,
        retailer_id: int,
        items_assigned: List[Dict[str, Any]],
        apply_coupons: bool = True
    ) -> Dict[str, Any]:
        """
        Calculates the complete order cost for a shipment fulfilled by a single retailer:
        - Items subtotal: sum(unit_price * quantity)
        - Consolidated shipping fee based on retailer threshold & offer fees
        - Applicable verified coupons & conditional vouchers
        - Distinguishes complete totals from incomplete/unknown shipping totals
        """
        retailer = db.session.get(Retailer, retailer_id)
        if not retailer:
            raise ValueError(f"Retailer {retailer_id} does not exist.")

        shipment_items = []
        subtotal = 0.0
        has_unknown_shipping = False
        shipping_candidates = []
        provenances = set()

        for alloc in items_assigned:
            offer: Offer = alloc["offer"]
            qty = alloc["quantity"]
            product: Product = alloc["product"]

            line_subtotal = round(float(offer.price) * qty, 2)
            subtotal += line_subtotal
            provenances.add(offer.source_type)

            if offer.shipping_cost is None:
                has_unknown_shipping = True
            else:
                shipping_candidates.append(float(offer.shipping_cost))

            shipment_items.append({
                "product_id": product.id,
                "product_name": product.name,
                "product_sku": product.sku,
                "quantity": qty,
                "unit_price": round(float(offer.price), 2),
                "original_price": round(float(offer.original_price or offer.price), 2),
                "line_subtotal": line_subtotal,
                "shipping_cost": float(offer.shipping_cost) if offer.shipping_cost is not None else None,
                "shipping_is_unknown": offer.shipping_is_unknown,
                "stock_status": offer.stock_status,
                "source_type": offer.source_type,
            })

        subtotal = round(subtotal, 2)

        # Determine shipping cost
        shipping_fee = 0.0
        qualified_free_shipping = False
        shipping_explanation = ""

        if has_unknown_shipping:
            shipping_fee = None
            shipping_explanation = "At least one item has undisclosed shipping fees; order shipping cannot be calculated with certainty."
        else:
            # Check free shipping threshold
            if retailer.free_shipping_threshold is not None and subtotal >= float(retailer.free_shipping_threshold):
                shipping_fee = 0.0
                qualified_free_shipping = True
                shipping_explanation = f"Qualified for free delivery (Subtotal ₹{subtotal:,.2f} ≥ ₹{retailer.free_shipping_threshold:,.2f} threshold)."
            else:
                # Order shipping: max individual offer fee or retailer default shipping cost
                base_fee = max(shipping_candidates) if shipping_candidates else float(retailer.default_shipping_cost or 0.0)
                shipping_fee = round(base_fee, 2)
                threshold_info = f" (Free shipping on orders ≥ ₹{retailer.free_shipping_threshold:,.2f})" if retailer.free_shipping_threshold else ""
                shipping_explanation = f"Standard consolidated delivery fee: ₹{shipping_fee:,.2f}{threshold_info}."

        # Evaluate potential coupons for this retailer
        applied_coupon = None
        coupon_discount = 0.0
        conditional_coupons = []

        if apply_coupons:
            coupons_query = Coupon.query.filter(
                Coupon.is_active.is_(True),
                db.or_(Coupon.retailer_id == retailer.id, Coupon.retailer_id.is_(None))
            ).all()

            verified_retailer_candidates = []
            verified_platform_candidates = []

            for c in coupons_query:
                # 1. Product Restriction Check: Must match at least one item in shipment
                if c.applicable_product_id is not None:
                    matching_items = [alloc for alloc in items_assigned if alloc["product"].id == c.applicable_product_id]
                    if not matching_items:
                        continue
                    eligible_amount = sum(round(float(alloc["offer"].price) * alloc["quantity"], 2) for alloc in matching_items)
                    eval_product_id = c.applicable_product_id
                # 2. Category Restriction Check: Must match category of at least one item
                elif c.applicable_category:
                    c_cat = c.applicable_category.strip().lower()
                    matching_items = [
                        alloc for alloc in items_assigned
                        if (alloc["product"].category or "").strip().lower() == c_cat
                    ]
                    if not matching_items:
                        continue
                    eligible_amount = sum(round(float(alloc["offer"].price) * alloc["quantity"], 2) for alloc in matching_items)
                    eval_product_id = matching_items[0]["product"].id
                else:
                    eligible_amount = subtotal
                    eval_product_id = items_assigned[0]["product"].id if items_assigned else None

                val = CouponService.validate_coupon(
                    coupon_identifier=c.id,
                    purchase_amount=eligible_amount,
                    retailer_id=retailer.id,
                    product_id=eval_product_id,
                    shipping_cost=shipping_fee
                )
                if val.get("is_eligible"):
                    calc_discount = float(
                        val.get("discount_amount") if val.get("discount_amount") is not None
                        else val.get("calculated_discount", 0.0)
                    )

                    if c.verification_status == "verified":
                        candidate_data = {
                            "code": c.code,
                            "title": c.title,
                            "discount_type": c.discount_type,
                            "discount_amount": calc_discount,
                            "verification_status": "verified",
                            "explanation": val.get("explanation") or val.get("message"),
                        }
                        if c.retailer_id == retailer.id:
                            verified_retailer_candidates.append(candidate_data)
                        else:
                            verified_platform_candidates.append(candidate_data)
                    else:
                        conditional_coupons.append({
                            "code": c.code,
                            "title": c.title,
                            "potential_discount": calc_discount,
                            "verification_status": c.verification_status,
                            "note": "Unverified promotional code; excluded from confirmed optimization totals."
                        })

            # Selection Policy: Retailer-specific verified coupons take priority over platform-wide vouchers
            best_candidate = None
            if verified_retailer_candidates:
                best_candidate = max(verified_retailer_candidates, key=lambda x: x["discount_amount"])
            elif verified_platform_candidates:
                best_candidate = max(verified_platform_candidates, key=lambda x: x["discount_amount"])

            if best_candidate and best_candidate["discount_amount"] > 0:
                applied_coupon = best_candidate
                coupon_discount = best_candidate["discount_amount"]

        coupon_discount = round(coupon_discount, 2)

        # Landed total for this retailer shipment
        if shipping_fee is None:
            order_total = round(subtotal - coupon_discount, 2)
            is_complete_total = False
        else:
            order_total = round(subtotal + shipping_fee - coupon_discount, 2)
            is_complete_total = True

        return {
            "retailer_id": retailer.id,
            "retailer_name": retailer.name,
            "retailer_code": retailer.code,
            "retailer_logo": retailer.logo_url,
            "items": shipment_items,
            "items_count": sum(i["quantity"] for i in shipment_items),
            "subtotal": subtotal,
            "shipping_fee": shipping_fee,
            "shipping_is_unknown": has_unknown_shipping,
            "qualified_free_shipping": qualified_free_shipping,
            "shipping_explanation": shipping_explanation,
            "applied_coupon": applied_coupon,
            "coupon_discount": coupon_discount,
            "conditional_coupons": conditional_coupons,
            "order_total": order_total,
            "is_complete_total": is_complete_total,
            "provenances": list(provenances),
        }

    # ==========================================
    # 3. OPTIMIZATION ALGORITHMS
    # ==========================================

    @classmethod
    def optimize_basket(
        cls,
        user_identifier: str = "guest_user",
        allow_split_orders: bool = True,
        max_retailers: int = DEFAULT_MAX_RETAILERS
    ) -> Dict[str, Any]:
        """
        Executes multi-vendor basket optimization:
        1. Compiles all active basket items and eligible in-stock offers.
        2. Evaluates Strategy A (Single-Retailer Basket) for all retailers that can fulfill 100% of items.
        3. Evaluates Strategy B (Multi-Retailer / Split-Order Basket) respecting max_retailers constraint.
        4. Compares complete totals, computes verifiable savings, and returns explainable strategy.
        """
        basket = cls.get_or_create_basket(user_identifier)
        if not basket.items:
            return {
                "status": "empty_basket",
                "message": "Basket is empty. Add products to run optimization.",
                "basket_id": basket.id,
                "single_retailer_strategy": None,
                "multi_retailer_strategy": None,
                "recommended_strategy": None,
                "potential_savings": 0.0,
            }

        try:
            max_retailers = min(max(1, int(max_retailers)), 5)
        except (ValueError, TypeError):
            max_retailers = cls.DEFAULT_MAX_RETAILERS

        # Gather eligible in-stock offers for each basket item
        items_catalog = []
        unavailable_products = []

        for item in basket.items:
            product = item.product
            if not product:
                continue

            # Query all offers for this product
            offers = Offer.query.filter_by(product_id=product.id).all()
            # Filter strictly for available, in-stock offers with valid positive prices
            eligible_offers = [
                o for o in offers
                if o.is_available and o.price is not None and float(o.price) > 0.0
            ]

            if not eligible_offers:
                unavailable_products.append({
                    "product_id": product.id,
                    "product_name": product.name,
                    "reason": "No in-stock verified offers available across any retailer."
                })
            else:
                items_catalog.append({
                    "basket_item_id": item.id,
                    "product": product,
                    "quantity": item.quantity,
                    "offers": eligible_offers,
                })

        # If any item in the basket is completely unavailable, a complete strategy is impossible
        if unavailable_products:
            return {
                "status": "no_feasible_solution",
                "message": f"{len(unavailable_products)} product(s) in your basket have no available in-stock offers.",
                "basket_id": basket.id,
                "unavailable_products": unavailable_products,
                "single_retailer_strategy": None,
                "multi_retailer_strategy": None,
                "recommended_strategy": None,
                "potential_savings": 0.0,
                "limitations": [
                    "All items in the basket must have at least one in-stock offer to calculate complete checkout strategies.",
                    "Review or remove out-of-stock items to optimize remaining products."
                ]
            }

        # ----------------------------------------------------
        # STRATEGY A: Single-Retailer Full Basket Optimization
        # ----------------------------------------------------
        all_retailers = Retailer.query.filter_by(is_active=True).all()
        single_retailer_options = []
        unfeasible_single_retailers = []

        for ret in all_retailers:
            can_fulfill = True
            missing_items = []
            assigned_offers = []

            for item_spec in items_catalog:
                ret_offer = next((o for o in item_spec["offers"] if o.retailer_id == ret.id), None)
                if ret_offer:
                    assigned_offers.append({
                        "product": item_spec["product"],
                        "quantity": item_spec["quantity"],
                        "offer": ret_offer,
                    })
                else:
                    can_fulfill = False
                    missing_items.append(item_spec["product"].name)

            if can_fulfill:
                shipment = cls.evaluate_retailer_shipment(ret.id, assigned_offers, apply_coupons=True)
                single_retailer_options.append({
                    "retailer_id": ret.id,
                    "retailer_name": ret.name,
                    "retailer_code": ret.code,
                    "retailer_logo": ret.logo_url,
                    "shipments": [shipment],
                    "total_items_cost": shipment["subtotal"],
                    "total_shipping": shipment["shipping_fee"],
                    "total_discounts": shipment["coupon_discount"],
                    "final_payable_total": shipment["order_total"],
                    "is_complete_total": shipment["is_complete_total"],
                    "retailers_count": 1,
                    "status": "feasible",
                })
            else:
                unfeasible_single_retailers.append({
                    "retailer_id": ret.id,
                    "retailer_name": ret.name,
                    "missing_products": missing_items,
                    "reason": f"Cannot fulfill {len(missing_items)} item(s) in basket."
                })

        # Rank single retailer options
        best_single_strategy = None
        if single_retailer_options:
            # Deterministic sort: complete totals first, then lowest payable total, then lowest retailer ID
            single_retailer_options.sort(
                key=lambda s: (
                    0 if s["is_complete_total"] else 1,
                    s["final_payable_total"],
                    s["retailer_id"]
                )
            )
            best_single_strategy = single_retailer_options[0]

        # ----------------------------------------------------
        # STRATEGY B: Multi-Retailer (Split-Order) Optimization
        # ----------------------------------------------------
        best_multi_strategy = None
        optimization_status = "optimal"

        if not allow_split_orders or max_retailers <= 1:
            best_multi_strategy = best_single_strategy
        else:
            # Exact Combinatorial Search for small baskets
            # items_catalog has N items. Each item has a list of eligible offers.
            offer_lists = [item_spec["offers"] for item_spec in items_catalog]
            total_combinations = 1
            for ol in offer_lists:
                total_combinations *= len(ol)

            candidate_allocations = []

            # If combinatorial search space is small (<= 15,000 combinations), run exact exhaustive evaluation
            if total_combinations <= 15000:
                for assignment in itertools.product(*offer_lists):
                    # Check unique retailers count
                    ret_ids = {o.retailer_id for o in assignment}
                    if len(ret_ids) > max_retailers:
                        continue

                    # Group assignment by retailer
                    retailer_groups: Dict[int, List[Dict[str, Any]]] = {}
                    for idx, chosen_offer in enumerate(assignment):
                        r_id = chosen_offer.retailer_id
                        if r_id not in retailer_groups:
                            retailer_groups[r_id] = []
                        retailer_groups[r_id].append({
                            "product": items_catalog[idx]["product"],
                            "quantity": items_catalog[idx]["quantity"],
                            "offer": chosen_offer,
                        })

                    # Evaluate shipments
                    shipments = []
                    total_items_cost = 0.0
                    total_shipping = 0.0
                    total_discounts = 0.0
                    total_payable = 0.0
                    is_complete = True
                    has_unknown_ship = False

                    for r_id, assigned_items in retailer_groups.items():
                        shipment = cls.evaluate_retailer_shipment(r_id, assigned_items, apply_coupons=True)
                        shipments.append(shipment)
                        total_items_cost += shipment["subtotal"]
                        total_discounts += shipment["coupon_discount"]
                        total_payable += shipment["order_total"]

                        if shipment["shipping_fee"] is None:
                            has_unknown_ship = True
                            is_complete = False
                        else:
                            total_shipping += shipment["shipping_fee"]

                    candidate_allocations.append({
                        "retailers_count": len(retailer_groups),
                        "shipments": shipments,
                        "total_items_cost": round(total_items_cost, 2),
                        "total_shipping": round(total_shipping, 2) if not has_unknown_ship else None,
                        "total_discounts": round(total_discounts, 2),
                        "final_payable_total": round(total_payable, 2),
                        "is_complete_total": is_complete,
                        "status": "feasible",
                    })

                optimization_status = "optimal"
            else:
                # Bounded heuristic optimization for larger baskets:
                # 1. Start with best item-level unit prices
                # 2. Iteratively explore top combinations within max_retailers limit
                optimization_status = "heuristic"
                # Greedy baseline: assign each item to retailer with lowest landed unit price
                greedy_assignment = []
                for item_spec in items_catalog:
                    best_off = min(
                        item_spec["offers"],
                        key=lambda o: (
                            float(o.price) + (float(o.shipping_cost) if o.shipping_cost is not None else 50.0)
                        )
                    )
                    greedy_assignment.append(best_off)

                ret_ids = {o.retailer_id for o in greedy_assignment}
                # If unique retailers > max_retailers, prune to top max_retailers by item count
                if len(ret_ids) > max_retailers:
                    ret_counts = {}
                    for o in greedy_assignment:
                        ret_counts[o.retailer_id] = ret_counts.get(o.retailer_id, 0) + 1
                    top_ret_ids = sorted(ret_counts.keys(), key=lambda r: -ret_counts[r])[:max_retailers]

                    # Reassign items outside top retailers to best offer among top retailers
                    adjusted_assignment = []
                    for idx, item_spec in enumerate(items_catalog):
                        avail_in_top = [o for o in item_spec["offers"] if o.retailer_id in top_ret_ids]
                        if avail_in_top:
                            adjusted_assignment.append(min(avail_in_top, key=lambda o: float(o.price)))
                        else:
                            adjusted_assignment.append(greedy_assignment[idx])
                    greedy_assignment = adjusted_assignment

                # Evaluate greedy assignment
                retailer_groups = {}
                for idx, chosen_offer in enumerate(greedy_assignment):
                    r_id = chosen_offer.retailer_id
                    if r_id not in retailer_groups:
                        retailer_groups[r_id] = []
                    retailer_groups[r_id].append({
                        "product": items_catalog[idx]["product"],
                        "quantity": items_catalog[idx]["quantity"],
                        "offer": chosen_offer,
                    })

                shipments = []
                total_items_cost = 0.0
                total_shipping = 0.0
                total_discounts = 0.0
                total_payable = 0.0
                has_unknown_ship = False

                for r_id, assigned_items in retailer_groups.items():
                    shipment = cls.evaluate_retailer_shipment(r_id, assigned_items, apply_coupons=True)
                    shipments.append(shipment)
                    total_items_cost += shipment["subtotal"]
                    total_discounts += shipment["coupon_discount"]
                    total_payable += shipment["order_total"]
                    if shipment["shipping_fee"] is None:
                        has_unknown_ship = True
                    else:
                        total_shipping += shipment["shipping_fee"]

                candidate_allocations.append({
                    "retailers_count": len(retailer_groups),
                    "shipments": shipments,
                    "total_items_cost": round(total_items_cost, 2),
                    "total_shipping": round(total_shipping, 2) if not has_unknown_ship else None,
                    "total_discounts": round(total_discounts, 2),
                    "final_payable_total": round(total_payable, 2),
                    "is_complete_total": not has_unknown_ship,
                    "status": "feasible",
                })

            # Pick best multi-retailer strategy
            if candidate_allocations:
                # Deterministic sort: complete totals first, then lowest final total, then fewest retailers
                candidate_allocations.sort(
                    key=lambda s: (
                        0 if s["is_complete_total"] else 1,
                        s["final_payable_total"],
                        s["retailers_count"]
                    )
                )
                best_multi_strategy = candidate_allocations[0]

        # ----------------------------------------------------
        # 4. STRATEGY COMPARISON & RECOMMENDATION
        # ----------------------------------------------------
        potential_savings = 0.0
        recommendation_type = "single_retailer"
        explanation = ""

        if best_multi_strategy and best_single_strategy:
            # Both strategies are available
            if best_multi_strategy["is_complete_total"] and best_single_strategy["is_complete_total"]:
                diff = round(best_single_strategy["final_payable_total"] - best_multi_strategy["final_payable_total"], 2)
                if diff > 0.0 and best_multi_strategy["retailers_count"] > 1:
                    potential_savings = diff
                    recommendation_type = "multi_retailer"
                    explanation = (
                        f"Splitting your order across {best_multi_strategy['retailers_count']} retailers saves ₹{diff:,.2f} "
                        f"compared to purchasing everything from {best_single_strategy['retailer_name']}."
                    )
                else:
                    recommendation_type = "single_retailer"
                    savings_vs_multi = round(best_multi_strategy["final_payable_total"] - best_single_strategy["final_payable_total"], 2)
                    if savings_vs_multi >= 0:
                        explanation = (
                            f"Buying entirely from {best_single_strategy['retailer_name']} is the most economical strategy. "
                            f"Consolidated shipping avoids paying multiple separate delivery fees."
                        )
                    else:
                        explanation = f"Buying from {best_single_strategy['retailer_name']} provides the simplest single-store checkout."
            elif not best_multi_strategy["is_complete_total"] or not best_single_strategy["is_complete_total"]:
                # Incomplete shipping comparison
                explanation = (
                    "One or more evaluated offers have unknown shipping fees. "
                    "Calculated totals are estimated; final payable amounts may vary at checkout."
                )
                recommendation_type = "single_retailer" if best_single_strategy else "multi_retailer"
        elif best_multi_strategy and not best_single_strategy:
            recommendation_type = "multi_retailer"
            explanation = (
                f"No single retailer stocks all {len(items_catalog)} items in your basket. "
                f"Splitting across {best_multi_strategy['retailers_count']} retailers is required to complete this order."
            )
        elif best_single_strategy and not best_multi_strategy:
            recommendation_type = "single_retailer"
            explanation = f"Order fulfilled via {best_single_strategy['retailer_name']}."
        else:
            recommendation_type = "no_feasible_solution"
            explanation = "Unable to compute a complete purchase strategy with available stock."

        return {
            "status": "success",
            "basket_id": basket.id,
            "items_count": len(items_catalog),
            "allow_split_orders": allow_split_orders,
            "max_retailers": max_retailers,
            "optimization_algorithm": optimization_status,
            "recommendation_type": recommendation_type,
            "explanation": explanation,
            "potential_savings": potential_savings,
            "single_retailer_strategy": best_single_strategy,
            "multi_retailer_strategy": best_multi_strategy,
            "all_single_retailer_options": single_retailer_options,
            "unfeasible_single_retailers": unfeasible_single_retailers,
            "unavailable_products": unavailable_products,
            "timestamp": datetime.utcnow().isoformat(),
            "limitations": [
                "Shipping fees assume consolidated parcel dispatch per retailer.",
                "Demonstration offers and prices reflect test catalog observations and do not represent verified live merchant APIs.",
                "Unverified coupons are reported conditionally and excluded from guaranteed checkout totals."
            ]
        }
