# SmartCart AI — Requirements Document

## 1. Project Overview
SmartCart AI is an intelligent shopping assistant and pricing intelligence platform that empowers consumers and analysts with transparency. It tracks prices across platforms, uncovers deceptive discount patterns ("Fake Discount Detector / Honesty Index"), optimizes multi-vendor shopping carts including shipping thresholds, calculates Total Cost of Ownership (TCO) with depreciation/resale value, analyzes review integrity, and forecasts price trajectory.

## 2. Functional Requirements

### FR-01: Multi-Platform Price Comparison
- Aggregate and compare product offers across multiple retailers (e.g., Amazon, Flipkart, Croma, Reliance Digital, Tata CLiQ).
- Display listed price, known shipping costs, applicable discounts, stock status, delivery time, and total landed cost.
- Sort offers by estimated total cost. Clearly label estimated vs confirmed shipping costs.
- Support data provenance indicators (Authorized Live API, Imported Dataset, Demonstration Data, Manual Input).

### FR-02: Historical Price Tracking
- Record daily/periodic price observations per product and retailer.
- Calculate 30-day, 60-day, and 90-day pricing statistics: Minimum, Maximum, Median, Average, and Current price.
- Expose endpoints to query price history over custom windows (30d, 60d, 90d, All).

### FR-03: Target-Price Alerts
- Allow users to set price drop alerts with target price threshold, notification email/webhook, and active/paused state.
- Support automated price checking and manual trigger checks against current lowest offers.
- Implement duplicate alert suppression and notify status tracking.

### FR-04: Coupon and Promotion Analysis
- Support percentage and fixed-value coupons, minimum order quantities/values, expiry dates, and retailer exclusions.
- Validate coupon applicability for individual products or baskets with detailed savings explanations.
- Never claim unverified automated redemption on 3rd-party sites.

### FR-05: Product Alternatives & Recommendations
- Recommend similar or alternative products based on category, specifications, brand, price tier, and value score.
- Provide transparent reasoning for alternative recommendations (e.g., "15% cheaper with comparable specs").

### FR-06: Fake Discount Detector & Honesty Index
- Compute an Honesty Index score (0 to 100) comparing the advertised "original/MRP" reference price with historical pricing observations.
- Metrics returned: Score, Confidence (Low/Medium/High), Current Price, Historical Median, Historical Low, Advertised Discount %, Historically Real Discount %, Valid Observations Count, and Explanation.
- Require sufficient data observations before asserting a score; otherwise return an explanatory insufficient data state.

### FR-07: Multi-Vendor Basket Optimization
- Allow users to build a multi-item shopping basket with quantities.
- Compare:
  1. Best single-retailer checkout total (items + retailer-specific shipping).
  2. Optimal split multi-retailer allocation (minimizing combined item cost + shipping overhead, considering free shipping thresholds).
- Return item-level allocation, retailer subtotals, shipping costs, discounts, and net savings.

### FR-08: Total Cost of Ownership (TCO) & Resale Forecasting
- Formula: `TCO = Purchase Price + Maintenance Costs + Consumable Costs - Estimated Resale Value`.
- Support 1-year, 2-year, and 3-year ownership scenarios.
- Provide transparent linear/category depreciation models and transparent regression estimations.

### FR-09: AI Review Integrity Analysis
- Ingest product reviews via documented samples or user-provided CSV.
- Analyze: sentiment polarity, duplicate or near-duplicate text detection, phrase repetition, rating-sentiment divergence, and temporal burst anomalies.
- Return integrity confidence, flagged patterns, and clear limitations.

### FR-10: Best Window to Buy & Price Forecasting
- Forecast future price movement over 7, 14, and 30-day horizons using time-series baselines (rolling trend, seasonal patterns, exponential smoothing/regression).
- Provide confidence rating, direction recommendation ("Buy Now", "Wait", "Neutral"), and explainability factors.
- Refuse to produce speculative forecasts when historical observations are insufficient.

## 3. Non-Functional Requirements
- **Performance**: Sub-500ms API response time for cached and analytical queries.
- **Reliability & Provenance**: Explicit labeling of data origin (`demo`, `dataset`, `manual`, `api`).
- **Security**: Strict input validation, parameterized database queries via SQLAlchemy, file upload size limits (max 5MB for CSVs), sanitized error messages.
- **Currency & Localization**: Indian Rupee (INR - ₹) formatting throughout the UI with consistent number formatting.
- **Responsiveness**: Fully responsive desktop, tablet, and mobile interface with clean dark/light SaaS aesthetic.

## 4. Technology Stack
- **Frontend**: React 18, Vite, React Router v6, Axios, Recharts, Lucide React, Modern CSS System (Variables + Flex/Grid).
- **Backend**: Python 3.10+, Flask, Flask-SQLAlchemy (SQLite initially, MySQL-compatible), Flask-CORS, Pandas, NumPy, Scikit-learn.
- **Testing**: Vitest + React Testing Library (Frontend), Pytest (Backend).
