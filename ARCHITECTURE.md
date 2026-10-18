# SmartCart AI — System Architecture

## 1. High-Level Architecture

SmartCart AI is built using a decoupled client-server architecture consisting of a **React + Vite single-page application (SPA)** on the frontend and a **Python Flask REST API** backed by **SQLAlchemy** on the backend.

```
+--------------------------------------------------------------------------+
|                              Frontend (React SPA)                        |
|  React Router + Context API + Axios Client + Recharts + Lucide Icons    |
+--------------------------------------------------------------------------+
                                     | HTTP / JSON (via Vite Proxy /api/*)
                                     v
+--------------------------------------------------------------------------+
|                              Backend (Flask REST API)                     |
|  Routes (Blueprints) -> Services -> Intelligence Engines -> Models       |
+--------------------------------------------------------------------------+
          |                                              |
          v                                              v
+-----------------------+                    +-----------------------+
|  SQLite / MySQL DB    |                    | Data Providers        |
|  SQLAlchemy ORM       |                    | (Demo, CSV, Live API) |
+-----------------------+                    +-----------------------+
```

## 2. Directory Layout

```
smartcart-ai/
  frontend/
    package.json
    vite.config.js
    index.html
    src/
      main.jsx
      App.jsx
      api/
        axiosClient.js
        productApi.js
        historyApi.js
        alertApi.js
        couponApi.js
        basketApi.js
        intelligenceApi.js
      components/
        layout/
          AppLayout.jsx
          Sidebar.jsx
          Topbar.jsx
          PageHeader.jsx
        common/
          LoadingSpinner.jsx
          ErrorMessage.jsx
          EmptyState.jsx
          DataSourceBadge.jsx
          MetricCard.jsx
          ConfirmDialog.jsx
        products/
          ProductCard.jsx
          ProductSearch.jsx
          PriceComparisonTable.jsx
          AlternativeProducts.jsx
        charts/
          PriceHistoryChart.jsx
          RetailerComparisonChart.jsx
          SentimentChart.jsx
          TCOChart.jsx
          ForecastChart.jsx
        basket/
          BasketItems.jsx
          BasketOptimizationResult.jsx
        alerts/
          AlertForm.jsx
          AlertList.jsx
      pages/
        Dashboard.jsx
        Products.jsx
        ProductDetails.jsx
        PriceComparison.jsx
        PriceHistory.jsx
        PriceAlerts.jsx
        Coupons.jsx
        Alternatives.jsx
        BasketOptimizer.jsx
        HonestyIndex.jsx
        ReviewAnalysis.jsx
        TCOAnalysis.jsx
        PriceForecast.jsx
        Settings.jsx
        NotFound.jsx
      hooks/
        useProducts.js
        usePriceHistory.js
        useAlerts.js
        useBasket.js
      context/
        AppContext.jsx
      utils/
        currency.js
        dates.js
        validation.js
      styles/
        variables.css
        global.css
        layout.css
        components.css
      test/
        setup.js
  backend/
    app/
      __init__.py
      config.py
      extensions.py
      models/
        product.py
        retailer.py
        offer.py
        price_history.py
        alert.py
        coupon.py
        basket.py
        notification.py
        review.py
        forecast.py
      routes/
        dashboard_routes.py
        product_routes.py
        comparison_routes.py
        history_routes.py
        alert_routes.py
        coupon_routes.py
        alternative_routes.py
        basket_routes.py
        intelligence_routes.py
        review_routes.py
        tco_routes.py
      services/
        product_service.py
        price_service.py
        alert_service.py
        coupon_service.py
        alternative_service.py
      intelligence/
        honesty_index.py
        basket_optimizer.py
        tco_engine.py
        review_analyzer.py
        price_forecaster.py
        recommendation_engine.py
      providers/
        base_provider.py
        demo_provider.py
        csv_provider.py
      tasks/
        price_monitor.py
        scheduled_jobs.py
    datasets/
      sample_products.json
      sample_reviews.csv
    tests/
      conftest.py
      test_products.py
      test_alerts.py
      test_basket.py
      test_honesty.py
      test_tco.py
      test_reviews.py
      test_forecasting.py
    scripts/
      seed_data.py
    requirements.txt
    run.py
```

## 3. Database Schema Overview

1. **products**: id, sku, name, brand, category, description, image_url, base_mrp, created_at, updated_at
2. **retailers**: id, name, code, website_url, logo_url, default_shipping_cost, free_shipping_threshold, active
3. **offers**: id, product_id, retailer_id, price, original_price, shipping_cost, discount_pct, stock_status, product_url, source_type, updated_at
4. **price_history**: id, product_id, retailer_id, price, recorded_at, source_type
5. **alerts**: id, product_id, retailer_id, target_price, contact_email, user_identifier, is_active, trigger_status, last_checked_at, last_observed_price, last_triggered_at, trigger_count, created_at
6. **coupons**: id, retailer_id, code, description, discount_type, discount_value, min_order_value, max_discount, valid_from, valid_to, is_active
7. **baskets**: id, user_identifier, status, created_at, updated_at
8. **basket_items**: id, basket_id, product_id, quantity, target_retailer_id
9. **reviews**: id, product_id, author, rating, title, content, review_date, verified_purchase, source_type
10. **forecasts**: id, product_id, horizon_days, predicted_price, lower_bound, upper_bound, confidence, model_name, created_at

## 4. API Design Standards

- Base path: `/api`
- All responses return JSON with consistent top-level format:
  ```json
  {
    "success": true,
    "data": { ... },
    "message": "Optional human-readable message",
    "timestamp": "2026-10-10T21:54:00Z"
  }
  ```
- Error format:
  ```json
  {
    "success": false,
    "error": {
      "code": "RESOURCE_NOT_FOUND",
      "message": "Detailed message"
    },
    "timestamp": "2026-10-10T21:54:00Z"
  }
  ```

## 5. Security & Provenance Controls
- Data provenance labeled on all offer and price records (`demo`, `dataset`, `manual`, `api`).
- File upload limits enforced in Flask (max 5MB).
- Strict separation between frontend consumption and backend validation.

## 6. Fake-Discount Detector & Honesty Index Architecture (Phase 5)

The Fake-Discount Detector provides shoppers with an empirical, evidence-based assessment of advertised discounts.

### Architecture & Service Design
- **Service Layer (`backend/app/services/honesty_index_service.py`):**
  - Consumes existing `Product`, `Offer`, `Retailer`, and `PriceHistory` models without duplicating tables.
  - Queries indexed historical snapshots with strict parameterization, isolating observation windows (30, 60, 90 days).
  - Isolates retailer observations to avoid cross-store contamination.
  - Excludes non-positive and future-dated price anomalies.
- **Scoring Framework (4-Pillar Transparent Model):**
  - **Historical Price Consistency (35%):** Positional evaluation of current price against historical minimum and median.
  - **Advertised Reference Price Credibility (30%):** Measures inflation of strike-through reference prices above observed historical maximums.
  - **Pre-Promotion Price Movement (20%):** Detects pre-promotional artificial price spikes ($\ge 8\%$) prior to the sale event.
  - **Data Quality & Coverage (15%):** Rewards higher observation density; requires $\ge 3$ observations for scoring eligibility.
- **Result Classifications:**
  - `Strong Historical Support` (Score $\ge 75$)
  - `Moderate Historical Support` (Score $50–74$)
  - `Price Pattern Requires Review` (Triggered by pre-promo surges or abnormal strike-through discrepancies)
  - `Potentially Misleading Discount` (Score $< 50$)
  - `Insufficient Historical Evidence` (Fewer than 3 observations, missing offer, or sparse history)
- **Frontend Presentation Layer (`frontend/src/pages/HonestyIndex.jsx`):**
  - Modularized into `HonestyScoreCard`, `DiscountBreakdown`, `HonestyFactors`, `HistoricalPriceEvidence` (Recharts time series), and `HonestyEvidenceTable`.
  - Integrated with `ProductDetails.jsx` for one-click navigation.

## 7. Multi-Vendor Basket Optimization Architecture (Phase 6)

The Basket Optimization Engine solves multi-vendor checkout allocation, balancing unit pricing against merchant parcel shipping fees.

### Architecture & Service Design
- **Service Layer (`backend/app/services/basket_optimizer_service.py`):**
  - Consumes existing `Basket`, `BasketItem`, `Product`, `Retailer`, `Offer`, and `Coupon` models.
  - Implements basket CRUD with quantity bounds ($1 \le \text{qty} \le 50$) and deduplication.
  - Filters strictly for in-stock, available merchant offers (`offer.is_available: true`).
- **Combinatorial Optimization Engine:**
  - **Strategy A (Single-Retailer):** Filters for merchants capable of fulfilling 100% of basket items.
  - **Strategy B (Multi-Retailer):** Evaluates all permutations of offer assignments across up to `max_retailers` merchants.
  - **Algorithm Scalability:** Employs exact branch-and-bound search for small baskets ($\le 15,000$ permutations) guaranteeing mathematical optimality (`status: optimal`), with bounded heuristic fallback for larger problem spaces.
- **Landed Shipping & Coupon Aggregation:**
  - Consolidates products per retailer into a single shipment.
  - Evaluates retailer `free_shipping_threshold`; grants free shipping when order subtotal qualifies.
  - Preserves undisclosed shipping fees as `null` (`shipping_is_unknown: true`), flagging affected strategies as estimated (`is_complete_total: false`).
  - Evaluates verified merchant coupons via `CouponService`; unverified vouchers are surfaced conditionally without inflating guaranteed savings.
- **Frontend Presentation Layer (`frontend/src/pages/BasketOptimizer.jsx`):**
  - Modularized into `BasketItemCard`, `BasketSummary`, `OptimizationStrategyCard`, and `RetailerCostBreakdown`.
  - Integrated with quick-add catalog selector and product details navigation.

## 8. Total Cost of Ownership (TCO) & Resale Forecasting Architecture (Phase 7)

Phase 7 implements life-cycle financial modeling for consumer hardware and electronics.

### Architecture & Service Design
- **TCO Service Layer (`backend/app/services/tco_service.py`):**
  - Evaluates gross expenditures across 7 distinct cost buckets:
    $$\text{Gross} = \text{Purchase} + \text{Acquisition} + (\text{Monthly Operating} \times \text{Months}) + \text{Maintenance} + \text{Repairs} + \text{Accessories} + \text{Financing}$$
  - Enforces single-deduction resale recovery: $\text{Net TCO} = \text{Gross} - \text{Resale Proceeds}$.
  - Strict completeness safeguards: Missing parameters are flagged in `missing_fields` and marked `incomplete`; missing expenses are never silently assumed to be zero.
  - Multi-Product Comparison: Enforces that incomplete products are not falsely ranked as cheaper than fully modeled products.
- **Resale Forecasting Layer (`backend/app/services/resale_forecast_service.py`):**
  - Empirical trend calibration from verified historical snapshots ($\ge 3$ required) combined with category heuristics.
  - Multi-horizon compound depreciation: $P_{resale} = P_{ref} \times (1 - r)^{months / 12} \times \text{condition\_multiplier}$.
  - Multi-scenario generator: Expected (baseline), Optimistic (low decay), and Pessimistic (rapid decay).
  - Sparse data handling: Flags `status: "insufficient_data"` if $< 3$ observations exist, offering user-adjustable illustrative scenarios clearly demarcated from empirical market quotes.
- **Frontend Presentation Layer (`frontend/src/pages/TCOAnalysis.jsx`):**
  - Modularized into `TCOInputForm`, `TCOBreakdown`, `ResaleForecastChart` (Recharts trajectory), `ResaleScenarioCards`, `ForecastEvidencePanel`, and `TCOComparisonTable`.
  - Seamless scenario injection ("Apply to TCO") and interactive multi-product comparison.

## 9. Best Time to Buy & Purchase Timing Intelligence (Phase 8)

Phase 8 implements an evidence-based purchase-timing intelligence system that analyzes historical price distributions to advise users whether buying now is reasonable, typical, or whether waiting/setting target alerts is advisable.

### Architecture & Service Design
- **Service Layer (`backend/app/services/buy_timing_service.py`):**
  - Consumes existing `Product`, `Offer`, `Retailer`, `PriceHistory`, and `Alert` models without creating redundant tables or duplicate data stores.
  - Reuses and extends historical price aggregation to support windows: 30, 60, 90, 180, and 365 days.
  - Calculates comprehensive statistical metrics:
    - Current observed price ($P_{\text{curr}}$) from active in-stock offers or latest verified snapshot.
    - Historical minimum ($P_{\text{min}}$), maximum ($P_{\text{max}}$), mean ($\mu$), and median ($M$).
    - Historical range ($P_{\text{max}} - P_{\text{min}}$) and relative range position ($\frac{P_{\text{curr}} - P_{\text{min}}}{P_{\text{range}}} \times 100\%$).
    - Net change and percentage change across the observation window.
    - Observation count, first/last snapshot dates, and observation age (recency).
- **Data-Quality & Integrity Safeguards:**
  - Strict exclusion of non-positive prices ($\le 0$) and future-dated records ($t > \text{now}$).
  - Exact timestamp-price deduplication within retailer scopes.
  - Retailer isolation: Prevents conflating cross-retailer pricing with single-store price movements when a retailer filter is specified.
  - Staleness detection: Flags snapshots $> 30$ days old as stale, preventing outdated prices from driving high-confidence recommendations.
  - Insufficient data threshold: Requires at least 3 valid observations; never fabricates trend confidence from 1 or 2 sparse observations.
  - No predictive claims: Explicitly discloses that historical lows do not guarantee future discounts or price floor recurrences.
- **Timing Assessment Rules:**
  - `CURRENT_PRICE_UNAVAILABLE`: When no valid current price or active in-stock offer exists.
  - `INSUFFICIENT_DATA`: When valid observations $< 3$ or data is excessively stale.
  - `GOOD_TIME_TO_BUY`: Current price is within 2% of the historical window low or substantially below median ($\le 95\%$ of median and range position $\le 30\%$).
  - `CONSIDER_WAITING`: Current price is near the window peak ($\ge 98\%$ of max or range position $\ge 75\%$) or significantly above median ($\ge 105\%$ of median).
  - `PRICE_IS_TYPICAL`: Current price hovers near historical median without marked deviation.
- **Evidence-Based Target-Price Advisor:**
  - Computes 3 statistical targets: Conservative (historical median), Moderate (5% below current/median), and Aggressive (historical window low).
  - Integrates seamlessly with existing `AlertService.create_alert`, enforcing positive target prices, valid emails, and duplicate active alert suppression.
- **REST Endpoints (`backend/app/routes/buy_timing_routes.py`):**
  - `GET /api/products/<id>/buy-timing`: Computes timing assessment and statistical evidence across customizable observation windows.
  - `POST /api/products/<id>/buy-timing/target-alert`: Establishes target-price alerts leveraging the core Alert system.
- **Frontend Presentation Layer (`frontend/src/pages/PriceForecast.jsx`):**
  - `BuyTimingBadge`: Color-coded badge with confidence rating and icon.
  - `BuyTimingPanel`: Metric grid, observation window selector (30D, 60D, 90D, 180D, 365D), and price position range bar.
  - `BuyTimingChart`: Recharts area visualization with historical median and current price reference lines.
  - `TargetPriceAdvisor`: 1-click preset target selection and interactive alert subscription form with error/success feedback.
  - `BuyTimingEvidencePanel`: Observation density, data freshness indicator, and explicit methodology/limitation disclosures.

