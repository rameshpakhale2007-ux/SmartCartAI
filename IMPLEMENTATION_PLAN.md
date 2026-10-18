# SmartCart AI — Implementation Plan

## Phase Summary & Progress Tracker

- [x] **Phase 0: Workspace Inspection & Architecture Documentation**
  - [x] Inspect workspace (clean directory `d:\Data_Science`).
  - [x] Formulate requirements in `REQUIREMENTS.md`.
  - [x] Document architecture in `ARCHITECTURE.md`.
  - [x] Initialize implementation tracking in `IMPLEMENTATION_PLAN.md`.
  - [x] Set up `.gitignore` and `.env.example`.

- [x] **Phase 1: Foundations (Frontend + Backend + Dashboard Shell)**
  - [x] Initialize Python Flask backend application structure (`backend/app`).
  - [x] Configure database extension (`Flask-SQLAlchemy`), models skeleton, and configuration layer.
  - [x] Set up Flask REST API endpoints foundation with `/api/health` and `/api/dashboard/summary`.
  - [x] Initialize React + Vite frontend with standard dependencies (`package.json`, `vite.config.js` with proxy).
  - [x] Create design tokens, CSS styling foundation (`variables.css`, `global.css`, `layout.css`, `components.css`).
  - [x] Build reusable layout components (`AppLayout`, `Sidebar`, `Topbar`, `PageHeader`, `MetricCard`, `LoadingSpinner`, `ErrorMessage`).
  - [x] Implement central Axios client with base URL `/api` and error interceptors.
  - [x] Set up React Router with complete route map for all 14 screens.
  - [x] Build functional Dashboard page connecting to `/api/dashboard/summary`.
  - [x] Set up testing harnesses: Pytest test suite for Flask (`backend/tests/test_foundation.py`) and Vitest test suite for React (`frontend/src/test/Dashboard.test.jsx`).

- [x] **Phase 2: Product Catalog, Providers, Search & Comparison**
  - [x] Implement provider interfaces (`BaseProvider`, `DemoProductProvider`, `CSVProductProvider` with dataset validation).
  - [x] Implement Product and Offer models with `source_type`, explicit unknown shipping (`shipping_cost=None`), and availability.
  - [x] Implement PriceComparisonService calculating landed totals (`Listed Price + Known Shipping - Discount`) with out-of-stock and unknown shipping safeguards.
  - [x] Implement REST API routes: `/api/products` (search, filters, pagination, sorting), `/api/products/:id` (details, specs), `/api/products/:id/offers`, `/api/comparison`.
  - [x] Implement frontend reusable components: `ProductCard`, `ProductSearch`, `ProductFilters`, `PriceComparisonTable`, `ProductSpecifications`.
  - [x] Implement full React pages: `Products.jsx` (debounced search, multi-filter, pagination), `ProductDetails.jsx`, `PriceComparison.jsx` (comparison table, best landed price callout, shipping transparency alerts).
  - [x] Expand deterministic seeding with realistic consumer tech, out-of-stock items, and unknown shipping items.
  - [x] Implement comprehensive backend tests (`test_products.py`) and frontend tests (`Products.test.jsx`, `PriceComparison.test.jsx`).

- [x] **Phase 3: Price History Tracking & Target-Price Alerts**
  - [x] Update `PriceHistory` model with compound indexes (`idx_price_hist_prod_date`, `idx_price_hist_prod_ret_date`).
  - [x] Extend `Alert` model with `retailer_id`, `trigger_status`, `last_checked_at`, and `last_observed_price`.
  - [x] Implement `HistoricalPriceService` computing 30/60/90-day min, max, median, and price change metrics with chronological sorting.
  - [x] Implement `AlertService` with input validation, duplicate active alert suppression, and idempotent trigger evaluation.
  - [x] Implement REST routes: `/api/products/<id>/history`, `/api/alerts` (CRUD), `/api/alerts/check`, and `/api/alerts/<id>/check`.
  - [x] Create interactive `PriceHistoryChart` with Recharts (tooltips, median/all-time low reference lines).
  - [x] Implement `PriceHistory.jsx` with 30/60/90-day controls, retailer filtering, statistics cards, and methodology disclaimers.
  - [x] Implement `PriceAlerts.jsx` with alert creation form, active/triggered/inactive statuses, and "Check All Alerts" trigger action.
  - [x] Update `ProductDetails.jsx` with direct "Set Price Alert" action link.
  - [x] Implement comprehensive backend tests (`test_history_and_alerts.py`) and frontend tests (`PriceHistory.test.jsx`, `PriceAlerts.test.jsx`).

- [x] **Phase 4: Coupons & Product Alternatives**
  - [x] Extend `Coupon` model with verification status, restrictions, provenance, typed constructor, and helper properties.
  - [x] Implement `CouponService` for filtering, validation, discount capping, and payable total calculation.
  - [x] Implement REST routes: `/api/coupons`, `/api/coupons/<id>`, `/api/coupons/validate`.
  - [x] Implement `AlternativeService` with multi-attribute weighted similarity model (35% category, 30% specs, 25% price, 10% brand) and explanations.
  - [x] Implement REST routes: `/api/products/<id>/alternatives`, `/api/products/<id>/alternatives/compare`.
  - [x] Create React Coupons page (`Coupons.jsx`, `CouponCard.jsx`, `CouponFilters.jsx`, `CouponValidationForm.jsx`, `CouponSavingsSummary.jsx`).
  - [x] Create React Alternatives page (`Alternatives.jsx`, `AlternativeCard.jsx`, `AlternativeFilters.jsx`, `SimilarityBadge.jsx`, `AlternativeComparison.jsx`).
  - [x] Update `ProductDetails.jsx` with direct navigation to similar alternatives and applicable coupons.
  - [x] Seed realistic demonstration coupons, alternative products, and multi-retailer offers idempotently.
  - [x] Implement comprehensive backend tests (`test_coupons.py`, `test_alternatives.py`) and frontend tests (`Coupons.test.jsx`, `Alternatives.test.jsx`).


- [x] **Phase 5: Fake Discount Detector & Honesty Index**
  - [x] Implement `HonestyIndexService` with 4-pillar scoring engine (35% Consistency, 30% Reference Credibility, 20% Pre-Promo Stability, 15% Data Quality).
  - [x] Implement advertised vs historical median savings comparison and pre-promotion price surge detection.
  - [x] Enforce strict guardrails: minimum 3 observations required, zero score fabrication, clear `Insufficient Historical Evidence` classification.
  - [x] Implement REST routes: `/api/products/<id>/honesty`, `/api/products/<id>/honesty/retailers`, `/api/honesty/summary`.
  - [x] Create React Honesty Index page (`HonestyIndex.jsx`) with catalog selector, retailer filter, and 30/60/90-day controls.
  - [x] Create modular honesty components: `HonestyScoreCard`, `DiscountBreakdown`, `HonestyFactors`, `HistoricalPriceEvidence` (Recharts), `HonestyEvidenceTable`.
  - [x] Integrate direct "Honesty Index" navigation action in `ProductDetails.jsx`.
  - [x] Fix previous alternative price sorting test failure in `alternative_service.py`.
  - [x] Add comprehensive backend tests (`test_honesty_index.py`) and frontend tests (`HonestyIndex.test.jsx`).

- [x] **Phase 6: Multi-Vendor Basket Optimization**
  - [x] Enrich `BasketItem` model `to_dict` with brand, category, and sku.
  - [x] Implement `BasketOptimizerService` with basket CRUD, quantity bounds ($1 \le \text{qty} \le 50$), and deduplication.
  - [x] Implement combinatorial optimization engine: exact branch-and-bound search for small baskets and bounded heuristic for large problem spaces.
  - [x] Evaluate Strategy A (Single-Retailer) vs Strategy B (Multi-Retailer Split) with configurable `max_retailers`.
  - [x] Implement order-level consolidated shipping and free delivery threshold qualification.
  - [x] Safe unknown shipping handling: preserve `shipping_cost = null`, mark total estimated/incomplete (`is_complete_total: false`), never assume ₹0.
  - [x] Integrate `CouponService` for merchant shipments: deduct verified coupons; flag unverified coupons as conditional.
  - [x] Implement REST routes: `/api/basket` (GET, DELETE), `/api/basket/items` (POST), `/api/basket/items/<id>` (PATCH, DELETE), `/api/basket/optimize` (POST).
  - [x] Implement frontend API client (`basketApi.js`) and UI components (`BasketItemCard`, `BasketSummary`, `OptimizationStrategyCard`, `RetailerCostBreakdown`).
  - [x] Implement full interactive `BasketOptimizer.jsx` page with quick-add catalog bar, empty states, and strategy cards.
  - [x] Integrate Basket Optimizer action link in `ProductDetails.jsx`.
  - [x] Implement comprehensive backend tests (`test_basket_optimizer.py`, 20 tests) and frontend tests (`BasketOptimizer.test.jsx`).

- [x] **Phase 7: Total Cost of Ownership (TCO) & Resale Engine**
  - [x] Extend `Forecast` model non-destructively with resale attributes, status, observation counts, and migration helper.
  - [x] Implement `TCOService` with 7 cost buckets, single resale deduction, data completeness detection, and fair multi-product comparison.
  - [x] Implement `ResaleForecastService` with compound annual depreciation ($P_{ref} \times (1-r)^{months/12}$), empirical trend calibration, and condition adjustments.
  - [x] Strict insufficient data safeguards: require $\ge 3$ snapshots, mark `insufficient_data`, label scenarios as illustrative calculations, not market quotes.
  - [x] Multi-scenario modeling: Optimistic, Expected, and Pessimistic scenarios across 6M, 12M, 24M, 36M, 48M, and 60M horizons.
  - [x] Implement REST routes: `/api/tco/calculate`, `/api/products/<id>/resale-forecast`, `/api/tco/compare`, `/api/products/<id>/resale-forecast/history`.
  - [x] Implement frontend API client (`tcoApi.js`) and UI components (`TCOInputForm`, `TCOBreakdown`, `ResaleForecastChart`, `ResaleScenarioCards`, `ForecastEvidencePanel`, `TCOComparisonTable`).
  - [x] Build full interactive `TCOAnalysis.jsx` page with catalog search, quick offer injection, scenario injection, and side-by-side product comparison.
  - [x] Implement comprehensive backend tests (`test_tco_resale.py`, 22 tests) and frontend tests (`TCOAnalysis.test.jsx`, 8 tests).

- [x] **Phase 8: Best Time to Buy & Purchase Timing Intelligence**
  - [x] Extend `HistoricalPriceService` and `history_routes.py` to support comprehensive observation windows: 30, 60, 90, 180, and 365 days.
  - [x] Implement `BuyTimingService` (`backend/app/services/buy_timing_service.py`):
    - [x] Statistical metrics calculation: current, min, max, median, mean, range, price change, percentage change, observation count, dates, recency.
    - [x] Rigorous data-quality filtering: positive price filtering, future date exclusion, snapshot deduplication, and stale threshold detection (> 30 days).
    - [x] Recommendation classification engine (`GOOD_TIME_TO_BUY`, `CONSIDER_WAITING`, `PRICE_IS_TYPICAL`, `INSUFFICIENT_DATA`, `CURRENT_PRICE_UNAVAILABLE`).
    - [x] Retailer isolation avoiding cross-store data contamination.
    - [x] Evidence-based target-price recommendations (Conservative, Moderate, Aggressive).
    - [x] Integration with `AlertService.create_alert` with input validation and duplicate active alert suppression.
  - [x] Implement REST routes (`backend/app/routes/buy_timing_routes.py`):
    - [x] `GET /api/products/<id>/buy-timing`
    - [x] `POST /api/products/<id>/buy-timing/target-alert`
  - [x] Register `buy_timing_bp` in backend application factory (`backend/app/__init__.py`).
  - [x] Create frontend API client (`frontend/src/api/buyTimingApi.js`).
  - [x] Build modular frontend timing components:
    - [x] `BuyTimingBadge.jsx` (status indicator with confidence badges)
    - [x] `BuyTimingPanel.jsx` (summary banner, window selector, metrics grid, range position bar)
    - [x] `BuyTimingChart.jsx` (Recharts price trajectory with median and current price reference lines)
    - [x] `TargetPriceAdvisor.jsx` (one-click preset targets and interactive target-price alert form)
    - [x] `BuyTimingEvidencePanel.jsx` (density, freshness, and explicit methodology/limitation disclosures)
  - [x] Upgrade `PriceForecast.jsx` page with full purchase timing intelligence workflow.
  - [x] Integrate direct navigation to "Best Time to Buy" in `ProductDetails.jsx`.
  - [x] Add comprehensive backend test suite (`backend/tests/test_buy_timing.py`, 20 tests).
  - [x] Add comprehensive frontend Vitest suite (`frontend/src/test/BuyTiming.test.jsx`, 10 tests).

- [x] **Phase 9: AI Review Integrity & Analysis Engine**
  - [x] Implement `ReviewIntegrityService` (`backend/app/services/review_integrity_service.py`):
    - [x] Text normalization stripping formatting while preserving excerpts.
    - [x] TF-IDF vectorization and cosine similarity pairwise duplicate detection ($\ge 0.85$ threshold).
    - [x] Rating versus text sentiment polarity divergence calculation.
    - [x] Chronological review velocity tracking and burst anomaly detection.
    - [x] Verified, unverified, and unknown purchaser distribution metrics.
    - [x] 0–100 Pattern Consistency Score with $\ge 5$ review minimum guardrail.
  - [x] Implement REST routes (`backend/app/routes/review_routes.py`):
    - [x] `GET /api/products/<id>/reviews/integrity` (comprehensive integrity analysis)
    - [x] `GET /api/products/<id>/reviews` (paginated, with rating/verified filtering)
    - [x] `POST /api/reviews/analyze` (ad-hoc JSON and multipart CSV file ingestion with 5MB limit)
  - [x] Register `review_bp` in backend application factory (`backend/app/__init__.py`).
  - [x] Seed realistic demonstration reviews in `backend/scripts/seed_data.py`.
  - [x] Create frontend API client (`frontend/src/api/reviewApi.js`).
  - [x] Build modular review UI components:
    - [x] `ReviewIntegrityScoreCard.jsx` (consistency index, pillar metrics, methodology notes)
    - [x] `ReviewDistributionChart.jsx` (star distribution, sentiment polarity, divergence flags)
    - [x] `DuplicatePhrasesCard.jsx` (near-duplicate clusters, matching snippets)
    - [x] `ReviewTemporalBurstChart.jsx` (daily volume timeline, burst warnings)
    - [x] `ReviewList.jsx` (search, rating filters, verified badges, sentiment/duplicate tags)
  - [x] Upgrade `ReviewAnalysis.jsx` page from placeholder stub to full interactive workbench.
  - [x] Integrate direct navigation to "Review Integrity" in `ProductDetails.jsx`.
  - [x] Implement comprehensive backend test suite (`backend/tests/test_review_integrity.py`, 20 tests).
  - [x] Implement comprehensive frontend Vitest suite (`frontend/src/test/ReviewAnalysis.test.jsx`, 10 tests).


