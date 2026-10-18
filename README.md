# SmartCart AI — Intelligent Shopping Assistant

SmartCart AI is a comprehensive shopping intelligence platform that combines multi-vendor price comparison, historical price tracking, fake discount detection ("Honesty Index"), multi-vendor shopping basket optimization, total cost of ownership (TCO) calculation, AI review integrity analysis, and price trend forecasting.

## Architecture & Technology Stack

- **Frontend**: React 18, Vite, React Router v6, Axios, Recharts, Lucide React, CSS Variables Design System.
- **Backend**: Python 3.10+, Flask, Flask-SQLAlchemy, Flask-CORS, Pandas, NumPy, Scikit-learn.
- **Database**: SQLite (default) / MySQL compatible via SQLAlchemy ORM.

## Quick Start Guide (Windows PowerShell)

### Prerequisites
- Python 3.10 or higher
- Node.js 18 or higher (with npm)

### 1. Backend Setup

```powershell
# Navigate to backend directory
cd backend

# Create a virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Run the Flask backend
python run.py
```
Backend will start on: `http://127.0.0.1:5000`

### 2. Frontend Setup

```powershell
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Frontend will be available at: `http://localhost:3000` (proxied to Flask API at `http://127.0.0.1:5000/api`)

### 3. Running Automated Tests

#### Backend Tests (Pytest)
```powershell
cd backend
pytest
```

#### Frontend Tests (Vitest)
```powershell
cd frontend
npm test
```

## Available API Endpoints (Phases 1, 2 & 3)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check, version, and database connectivity status |
| `GET` | `/api/dashboard/summary` | Dashboard metrics, lowest offers, recent adjustments, and source health |
| `GET` | `/api/products` | Search, filter, and paginate products with offer summaries |
| `GET` | `/api/products/<id>` | Full product details, specifications, and offer counts |
| `GET` | `/api/products/<id>/offers` | Retailer offers evaluated via price comparison engine |
| `GET` | `/api/comparison?product_id=<id>` | Landed price comparison breakdown for specified product |
| `GET` | `/api/products/<id>/history` | 30/60/90-day chronological observations, median, min, max, and price delta |
| `GET` | `/api/alerts` | List configured price alerts with status and last observed price |
| `POST` | `/api/alerts` | Create a target-price alert with duplicate active alert suppression |
| `PATCH` | `/api/alerts/<id>` | Update target price or toggle active/inactive status |
| `DELETE` | `/api/alerts/<id>` | Permanently remove an alert trigger |
| `POST` | `/api/alerts/check` | Evaluate all active alerts against valid in-stock offers |
| `POST` | `/api/alerts/<id>/check` | Manually evaluate a single target-price alert |
| `GET` | `/api/coupons` | Search, filter, and paginate promotional vouchers and coupons |
| `GET` | `/api/coupons/<id>` | Full coupon details, restrictions, and verification status |
| `POST` | `/api/coupons/validate` | Interactive coupon eligibility evaluation & net savings calculation |
| `POST` | `/api/coupons` | Register a new coupon promotion (defaults to unverified) |
| `GET` | `/api/products/<id>/alternatives` | Ranked, explainable product alternatives with 0-100 similarity scores |
| `GET` | `/api/products/<id>/honesty` | Fake-Discount Detector & Honesty Index analysis (30/60/90 days) |
| `GET` | `/api/products/<id>/honesty/retailers` | Isolated per-retailer discount credibility analyses |
| `GET` | `/api/honesty/summary` | Catalog-wide honesty metrics and classification breakdown |
| `GET` | `/api/basket` | Active shopping basket items, quantities, and merchant offers |
| `POST` | `/api/basket/items` | Add product to basket with deduplication |
| `PATCH` | `/api/basket/items/<id>` | Update quantity of an item in active basket |
| `DELETE` | `/api/basket/items/<id>` | Remove individual item from basket |
| `DELETE` | `/api/basket` | Clear entire shopping basket |
| `POST` | `/api/basket/optimize` | Combinatorial single vs multi-vendor basket optimization |
| `POST` | `/api/tco/calculate` | Total Cost of Ownership (TCO) calculation over 6-60 months |
| `GET` | `/api/products/<id>/resale-forecast` | Resale value forecasting, compound depreciation, and scenarios |
| `POST` | `/api/tco/compare` | Multi-product TCO comparison with fair ranking safeguards |
| `GET` | `/api/products/<id>/resale-forecast/history` | Historical forecast snapshots for product |
| `GET` | `/api/products/<id>/buy-timing` | Best Time to Buy purchase timing intelligence & statistical metrics |
| `POST` | `/api/products/<id>/buy-timing/target-alert` | Establish evidence-based target-price alert from buy-timing recommendations |

### Phase 8: Best Time to Buy & Purchase Timing Intelligence

The Purchase Timing Intelligence engine analyzes historical price distributions to advise users whether buying now is reasonable, typical, or whether waiting/setting a target-price alert is advisable:

#### Key Capabilities & Methodological Rules:
1. **No Predictive Claims:** Historical analysis is transparently labeled as `HISTORICAL_ANALYSIS`. Historical lows do not guarantee future discounts or price floor recurrences.
2. **Statistical Distribution Metrics:** Calculates lowest, highest, median, mean, price spread, price change, percentage change, observation count, first/last observation dates, and recency.
3. **Flexible Historical Windows:** Supports 30, 60, 90, 180, and 365-day observation windows.
4. **Data-Quality Safeguards:** Excludes non-positive and future-dated records; deduplicates snapshots; flags observations older than 30 days as stale.
5. **Observation Thresholds:** Requires at least 3 valid observations; sparse history strictly classifies as `INSUFFICIENT_DATA`.
6. **Recommendation Categories:**
   - `GOOD_TIME_TO_BUY`: Price is near the window low (within 2%) or significantly below median ($\le 95\%$ of median, range position $\le 30\%$).
   - `CONSIDER_WAITING`: Price is near the window peak ($\ge 98\%$ of max, range position $\ge 75\%$) or substantially above median ($\ge 105\%$ of median).
   - `PRICE_IS_TYPICAL`: Price sits close to the historical median without significant deviation.
   - `INSUFFICIENT_DATA`: Fewer than 3 valid observations or data is stale.
   - `CURRENT_PRICE_UNAVAILABLE`: No valid current offer can be established.
7. **Target-Price Recommendations:** Provides evidence-backed conservative (historical median), moderate (5% below current/median), and aggressive (window low) target pricing. Integrates with the core Alert system for 1-click alert establishment.

The TCO & Resale Forecasting Engine models the full lifecycle expense of consumer electronics:
$$\text{Gross TCO} = \text{Purchase Price} + \text{Acquisition} + \text{Operating Costs} + \text{Maintenance} + \text{Repairs} + \text{Accessories} + \text{Financing}$$
$$\text{Net TCO} = \text{Gross TCO} - \text{Estimated Resale Proceeds (deducted once)}$$
$$\text{Effective Monthly Cost} = \frac{\text{Net TCO}}{\text{Ownership Months}}$$

#### Key Capabilities & Methodological Rules:
1. **Explicit Cost Handling:** Missing inputs are explicitly flagged as incomplete; SmartCart AI never silently converts unknown costs to zero.
2. **Empirical Resale Calibration:** Calibrated via compound annual depreciation from verified historical observations ($R_{obs} = 1 - (P_{last}/P_{first})^{1/\Delta t}$) when $\ge 3$ snapshots exist.
3. **Sparse Data Fallback:** If $< 3$ observations exist, flags `status: "insufficient_data"` and provides user-adjustable scenario models labeled as illustrative calculations, not market guarantees.
4. **Scenario Projections:** Evaluates Optimistic, Expected, and Pessimistic depreciation scenarios across 6M, 12M, 24M, 36M, 48M, and 60M horizons.
5. **Fair Multi-Product Comparison:** Does not rank products as confirmed cheapest unless all compared items have complete, comparable cost inputs.

### Phase 6: Multi-Vendor Basket Optimization Engine

The Basket Optimization Engine solves the multi-vendor procurement problem by evaluating whether splitting product purchases across multiple retailers yields net savings after factoring in delivery fees and threshold-based free shipping.

#### 1. Optimization Strategies
- **Strategy A: Single-Retailer Fulfillment:**
  - Evaluates retailers capable of fulfilling 100% of requested basket items with in-stock offers.
  - Consolidates shipment under the merchant's free delivery threshold or standard consolidated shipping charge.
  - Applies applicable verified merchant vouchers.
- **Strategy B: Multi-Retailer (Split-Order) Allocation:**
  - Solves the assignment of each item to an eligible merchant offering the lowest net landed cost.
  - Enforces a configurable `max_retailers` constraint (default 3, up to 5).
  - Uses exact branch-and-bound combinatorial evaluation for small-to-medium baskets, guaranteeing global mathematical optimality (`status: optimal`).
  - Employs bounded heuristic local search for large combinatorial problem spaces (`status: heuristic`).

#### 2. Shipping & Threshold Rules
- **Consolidation:** Items assigned to the same merchant are consolidated into a single parcel order.
- **Free Shipping Qualification:** If the merchant subtotal $\ge$ `retailer.free_shipping_threshold`, shipping is set to ₹0.
- **Unknown Shipping Transparency:** If a merchant offer does not disclose delivery costs, the shipping fee is marked `null` (`shipping_is_unknown: true`). It is **never** silently treated as zero. Totals are explicitly flagged as incomplete / estimated (`is_complete_total: false`).

#### 3. Promotion & Coupon Rules
- **Verified Coupons:** Verified promotions with satisfied minimum order values are deducted from confirmed checkout totals.
- **Conditional / Unverified Coupons:** Reported as potential savings with explicit caveats; excluded from guaranteed payable totals.

### Phase 5: Fake-Discount Detector & Honesty Index

The Honesty Index evaluates whether advertised strike-through discounts are supported by empirical price-history evidence. It never makes unsupported fraud accusations, strictly using objective findings such as *"Potentially Misleading Discount"*, *"Price Pattern Requires Review"*, and *"Insufficient Historical Evidence"*.

#### Scoring Framework & Component Weights (0–100 Scale)
$$\text{Honesty Index Score} = 0.35 \times C_{\text{consistency}} + 0.30 \times C_{\text{reference}} + 0.20 \times C_{\text{pre\_promo}} + 0.15 \times C_{\text{data\_quality}}$$

1. **Historical Price Consistency ($C_{\text{consistency}}$ - 35% Weight):**
   - Measures where the current listed price sits relative to observed historical prices:
     - At or below period minimum: **100**
     - Between minimum and median: **70–99** (scaled linearly)
     - Equal to median: **60**
     - Above median: **10–59** (penalized for being higher than typical observed price)
2. **Advertised Reference Price Credibility ($C_{\text{reference}}$ - 30% Weight):**
   - Assesses whether the reference / strike-through price reflects actual observed market prices:
     - Reference price $\le \text{Max Historical Price} \times 1.02$: **100**
     - Reference price exceeds maximum historical observation: Scaled downward based on percentage deviation $\left(\max\left(10, 100 - \frac{\text{Ref} - \text{Max}}{\text{Max}} \times 150\right)\right)$
     - When reference price is missing, defaults to catalog MRP or neutral baseline.
3. **Pre-Promotion Price Movement ($C_{\text{pre\_promo}}$ - 20% Weight):**
   - Inspects whether prices spiked abruptly in the window immediately preceding the promotional discount:
     - No pre-promo surge: **100**
     - Spike $\ge 8\%$ detected in preceding 25% of the observation window: Penalized to **30–65** and flagged for review.
4. **Data Quality & Observation Coverage ($C_{\text{data\_quality}}$ - 15% Weight):**
   - $\ge 20$ valid observations: **100**
   - $10–19$ observations: **85**
   - $5–9$ observations: **70**
   - $3–4$ observations: **50**
   - $< 3$ observations: Score calculation is bypassed, returning **Insufficient Historical Evidence**.

#### Classification Rules
- **Strong Historical Support:** Score $\ge 75$ with no major pre-promo spikes.
- **Moderate Historical Support:** Score $50–74$ with general consistency but minor benchmark variances.
- **Price Pattern Requires Review:** Flagged when pre-promo price surge $\ge 8\%$ is detected or reference price significantly exceeds historical peak.
- **Potentially Misleading Discount:** Score $< 50$ with substantial discrepancy between advertised discount and historical median.
- **Insufficient Historical Evidence:** Assigned when fewer than 3 observations exist, no current offer is active, or data coverage is inadequate.

### Phase 4: Coupon Savings Calculation Formulas
1. **Percentage Discounts:**
   $$\text{Discount} = \min\left(\frac{\text{Eligible Purchase} \times \text{Discount \%}}{100}, \text{Maximum Discount Cap}\right)$$
2. **Fixed Amount Discounts:**
   $$\text{Discount} = \min(\text{Fixed Amount}, \text{Eligible Purchase})$$
3. **Free Shipping Promotions:**
   * If shipping fee is known: $\text{Discount} = \text{Shipping Fee}$.
   * If shipping fee is unknown/undisclosed: $\text{Discount} = 0$, flagged with `shipping_is_unknown: true`.
4. **Estimated Final Payable Total:**
   $$\text{Payable} = \max(0, \text{Purchase Amount} - \text{Discount} + \text{Known Shipping Fee})$$

### Phase 4: Product Alternatives Similarity Methodology
The Alternatives Engine uses a transparent, deterministic multi-attribute scoring model:
* **Category Compatibility (35% Weight):** Strict category matching. Products from unrelated categories receive 0% and are excluded.
* **Technical Hardware Specifications (30% Weight):** Overlap and matching of key hardware specs (e.g., Storage, Display, Processor, Battery life, Driver, Noise Cancellation). Missing specifications are never assumed as matches.
* **Price Proximity (25% Weight):** Evaluates deviation against target reference price:
  $$\text{Price Score} = \max\left(0, 100 - \frac{|\text{Target Price} - \text{Alternative Price}|}{\text{Target Price}} \times 100\right)$$
* **Brand Alignment (10% Weight):** Same-brand models receive 100% brand score; cross-brand alternatives receive 50%.
* **Exclusions:** Source product is strictly excluded from its own recommendations.


### Historical Pricing Parameters (`GET /api/products/<id>/history`):
- `days`: 30, 60, or 90 days analysis window (default 30).
- `retailer_id`: Optional retailer filter ID to isolate store-specific historical movements.
- **Statistical Definitions:**
  - `current_observed_price`: Most recent valid observation captured within selected window.
  - `min_price` / `max_price`: Lowest and highest prices observed during the period.
  - `median_price`: Median observed price across all valid data points.
  - `price_change`: Net difference between latest observation and earliest observation in window.

### Target-Price Alert Trigger & Suppression Rules
1. **Trigger Condition:** Evaluated price must be less than or equal to `target_price`.
2. **Availability Safeguards:** Unavailable (Out of Stock) or unknown prices are never treated as successful triggers.
3. **Retailer-Specific vs Product-Wide:** Retailer-specific alerts evaluate only that store's price. Product-wide alerts evaluate the lowest valid in-stock offer.
4. **Duplicate Creation Suppression:** Identical active alerts for the same product, retailer, and target price are blocked from creating redundant rows.
5. **Duplicate Notification Suppression:** Repeated evaluations of already triggered alerts do not increment trigger counts or create duplicate notifications.

### Product Search Query Parameters (`GET /api/products`):
- `search`: Case-insensitive text search matching product name, brand, category, description, and SKU.
- `category`: Filter by exact category (e.g. `Smartphones`, `Audio`, `Laptops`).
- `brand`: Filter by brand name (e.g. `Apple`, `Sony`, `Dell`).
- `retailer`: Filter by retailer code or name.
- `min_price` / `max_price`: Numeric price range boundaries.
- `sort`: `price_asc`, `price_desc`, `name_asc`, `name_desc`, or `newest`.
- `page`: Page index (integer >= 1, default 1).
- `per_page`: Number of items per page (1 to 100, default 12).

## Data Provider Specifications & CSV Format

SmartCart AI supports multiple data provenance pipelines under `backend/app/providers/`:
- `DemoProductProvider`: Seeded demonstration fixtures tagged `source_type="demo"`.
- `CSVProductProvider`: Normalizes external or uploaded CSV datasets tagged `source_type="dataset"`.

### Required CSV Columns
When importing or analyzing products via CSV, the following headers are required:
```csv
sku,name,brand,category,base_mrp,retailer_code,price,shipping_cost,stock_status,product_url,delivery_days
```
- **sku**: Unique product identifier string (required)
- **name**: Product display name (required)
- **brand**: Manufacturer/brand name (required)
- **category**: Product category (required)
- **base_mrp**: Manufacturer suggested retail price in INR (required, float > 0)
- **retailer_code**: Retailer code e.g. `amazon`, `flipkart`, `croma` (required)
- **price**: Listed retailer price in INR (required, float > 0)
- **shipping_cost**: Shipping cost in INR (optional; empty string indicates unknown shipping)
- **stock_status**: `In Stock`, `Out of Stock`, `Available`, etc. (optional; defaults to `Unknown`)
- **product_url**: Valid HTTP/HTTPS product web link (optional)
- **delivery_days**: Estimated transit days (optional, integer >= 1)

### Pricing & Shipping Transparency Rules
1. **Landed Total Calculation:** `Estimated Total = Listed Price + Known Shipping Cost - Validated Discount`.
2. **Unknown Shipping Costs:** If a retailer does not disclose shipping costs upfront, SmartCart AI marks the total as incomplete rather than assuming free delivery (`shipping_is_unknown: true`).
3. **Availability Restrictions:** Out of Stock or Unknown availability items are never selected as the cheapest eligible offer recommendation.

## Phase 3 Verification & Operational Status

### 1. API Security & Ownership Model
- **Current State:** SmartCart AI currently operates in a single-tenant / guest-mode architecture using `user_identifier` (`guest_user` by default) and optional `X-User-Id` request headers.
- **Ownership Enforcement:** Alert mutations (`PATCH`, `DELETE`) and user-scoped evaluations verify `user_identifier` match.
- **Architectural Limitation:** Full cryptographic multi-user authentication (JWT / OAuth2 / session store) is not yet implemented. The API does not falsely claim multi-user cryptographic isolation.

### 2. Background Scheduler & Notifications Status
- **Callable Task Job:** `backend/app/tasks/price_monitor.py` implements `run_price_monitor_job(app)` for manual and programmatic alert evaluation.
- **Automatic Daemon:** Classified as **Not Yet Operational**. Continuous background scheduling (e.g., via APScheduler daemon or Celery beat) is not started by default in `create_app()`.
- **Notification Delivery:** Alert triggers are recorded in the database and surfaced via `/api/alerts` and the UI. External outbound email delivery (SMTP/SES) is **Not Yet Operational**.

### 3. Database Compatibility
- **Primary Database:** SQLite (`smartcart.db`) verified with foreign key relationships, compound indexes (`idx_price_hist_prod_date`, `idx_price_hist_prod_ret_date`, `idx_alert_user_active`), decimal price handling, and idempotent seeding.
- **MySQL Compatibility:** Configured via SQLAlchemy ORM dialect abstraction. Live MySQL testing requires an active MySQL server instance and connection string (`MYSQL_DATABASE_URI`).

