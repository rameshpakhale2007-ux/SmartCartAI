import csv
import io
import re
from typing import List, Dict, Any, Optional, Tuple
from app.providers.base_provider import BaseProvider

REQUIRED_CSV_COLUMNS = [
    "sku",
    "name",
    "brand",
    "category",
    "base_mrp",
    "retailer_code",
    "price"
]

OPTIONAL_CSV_COLUMNS = [
    "description",
    "image_url",
    "shipping_cost",
    "stock_status",
    "product_url",
    "delivery_days"
]

URL_REGEX = re.compile(
    r'^(?:http|ftp)s?://'  # http:// or https://
    r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+(?:[A-Z]{2,6}\.?|[A-Z0-9-]{2,}\.?)|'  # domain...
    r'localhost|'  # localhost...
    r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
    r'(?::\d+)?'  # optional port
    r'(?:/?|[/?]\S+)$', re.IGNORECASE)

class CSVProductProvider(BaseProvider):
    """
    Ingests, validates, and normalizes product and offer datasets from CSV.
    All imported data is tagged with source_type='dataset'.
    """

    def __init__(self, csv_content: Optional[str] = None):
        super().__init__(source_name="Imported CSV Dataset", source_type="dataset")
        self.csv_content = csv_content
        self.normalized_products: Dict[str, Dict[str, Any]] = {}
        self.normalized_offers: List[Dict[str, Any]] = []
        self.validation_errors: List[str] = []
        self.validation_warnings: List[str] = []

        if csv_content:
            self.parse_and_validate(csv_content)

    def parse_and_validate(self, csv_text: str) -> Tuple[bool, Dict[str, Any]]:
        """
        Parses CSV string, validates required columns, checks prices, URLs, duplicate SKUs,
        and retailer codes.
        """
        self.normalized_products = {}
        self.normalized_offers = []
        self.validation_errors = []
        self.validation_warnings = []

        if not csv_text or not csv_text.strip():
            self.validation_errors.append("Dataset is completely empty.")
            return False, {"errors": self.validation_errors}

        try:
            reader = csv.DictReader(io.StringIO(csv_text.strip()))
        except Exception as e:
            self.validation_errors.append(f"Failed to parse CSV format: {str(e)}")
            return False, {"errors": self.validation_errors}

        if not reader.fieldnames:
            self.validation_errors.append("CSV has no header row or field names.")
            return False, {"errors": self.validation_errors}

        # Check for missing required columns
        fieldnames = [f.strip().lower() for f in reader.fieldnames if f]
        missing_columns = [col for col in REQUIRED_CSV_COLUMNS if col not in fieldnames]
        if missing_columns:
            self.validation_errors.append(f"Missing required CSV column(s): {', '.join(missing_columns)}")
            return False, {"errors": self.validation_errors}

        seen_rows = set()
        row_num = 1  # 1 is header

        for raw_row in reader:
            row_num += 1
            # Clean keys and values
            row = {k.strip().lower(): (v.strip() if v else "") for k, v in raw_row.items() if k}

            # Check duplicate rows
            row_tuple = tuple(sorted(row.items()))
            if row_tuple in seen_rows:
                self.validation_warnings.append(f"Row {row_num}: Duplicate row skipped.")
                continue
            seen_rows.add(row_tuple)

            # Validate SKU
            sku = row.get("sku", "").strip()
            if not sku:
                self.validation_errors.append(f"Row {row_num}: Missing SKU.")
                continue

            # Validate Product Name
            name = row.get("name", "").strip()
            if not name:
                self.validation_errors.append(f"Row {row_num}: Missing product name for SKU '{sku}'.")
                continue

            brand = row.get("brand", "").strip() or "Generic"
            category = row.get("category", "").strip() or "Uncategorized"

            # Validate MRP
            try:
                base_mrp = float(row.get("base_mrp", 0))
                if base_mrp <= 0:
                    self.validation_errors.append(f"Row {row_num}: Invalid base_mrp '{row.get('base_mrp')}' for SKU '{sku}'. Must be > 0.")
                    continue
            except (ValueError, TypeError):
                self.validation_errors.append(f"Row {row_num}: Non-numeric base_mrp '{row.get('base_mrp')}' for SKU '{sku}'.")
                continue

            # Validate Retailer code
            retailer_code = row.get("retailer_code", "").strip().lower()
            if not retailer_code:
                self.validation_errors.append(f"Row {row_num}: Missing retailer_code for SKU '{sku}'.")
                continue

            # Validate Listed Price
            try:
                price = float(row.get("price", 0))
                if price <= 0:
                    self.validation_errors.append(f"Row {row_num}: Invalid price '{row.get('price')}' for SKU '{sku}'. Must be > 0.")
                    continue
            except (ValueError, TypeError):
                self.validation_errors.append(f"Row {row_num}: Non-numeric price '{row.get('price')}' for SKU '{sku}'.")
                continue

            # Validate Shipping Cost (nullable/optional)
            shipping_raw = row.get("shipping_cost", "").strip()
            shipping_cost = None
            if shipping_raw != "":
                try:
                    s_cost = float(shipping_raw)
                    if s_cost < 0:
                        self.validation_errors.append(f"Row {row_num}: Negative shipping cost '{shipping_raw}'.")
                        continue
                    shipping_cost = s_cost
                except (ValueError, TypeError):
                    self.validation_warnings.append(f"Row {row_num}: Invalid shipping_cost '{shipping_raw}' treated as unknown.")
                    shipping_cost = None

            # Validate Stock Status
            stock_status_raw = row.get("stock_status", "").strip()
            if not stock_status_raw:
                stock_status = "Unknown"
            else:
                stock_status = stock_status_raw

            # Validate Product URL
            product_url = row.get("product_url", "").strip()
            if product_url and not URL_REGEX.match(product_url):
                self.validation_warnings.append(f"Row {row_num}: Malformed product URL '{product_url}' ignored.")
                product_url = None

            # Validate Image URL
            image_url = row.get("image_url", "").strip()
            if image_url and not URL_REGEX.match(image_url):
                self.validation_warnings.append(f"Row {row_num}: Malformed image URL '{image_url}' ignored.")
                image_url = None

            # Delivery days
            delivery_days = 3
            try:
                if row.get("delivery_days"):
                    delivery_days = max(1, int(row.get("delivery_days")))
            except (ValueError, TypeError):
                pass

            # Store normalized product
            if sku not in self.normalized_products:
                self.normalized_products[sku] = {
                    "sku": sku,
                    "name": name,
                    "brand": brand,
                    "category": category,
                    "description": row.get("description", "").strip(),
                    "image_url": image_url,
                    "base_mrp": base_mrp,
                    "currency": "INR",
                    "source_type": self.source_type,
                }

            # Store normalized offer
            discount_pct = round(max(0.0, ((base_mrp - price) / base_mrp) * 100), 1) if base_mrp > price else 0.0

            self.normalized_offers.append({
                "sku": sku,
                "retailer_code": retailer_code,
                "price": price,
                "original_price": base_mrp,
                "shipping_cost": shipping_cost,
                "shipping_is_unknown": shipping_cost is None,
                "stock_status": stock_status,
                "delivery_days": delivery_days,
                "product_url": product_url,
                "discount_pct": discount_pct,
                "source_type": self.source_type,
            })

        is_valid = len(self.validation_errors) == 0 and len(self.normalized_products) > 0
        return is_valid, {
            "products_count": len(self.normalized_products),
            "offers_count": len(self.normalized_offers),
            "errors": self.validation_errors,
            "warnings": self.validation_warnings
        }

    def search_products(self, query: Optional[str] = None, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        filters = filters or {}
        matches = []
        for p in self.normalized_products.values():
            if query:
                q = query.lower()
                if q not in p["name"].lower() and q not in p["brand"].lower() and q not in p["category"].lower():
                    continue
            if filters.get("category") and filters["category"].lower() != p["category"].lower():
                continue
            if filters.get("brand") and filters["brand"].lower() != p["brand"].lower():
                continue
            matches.append(p)
        return matches

    def get_product_details(self, product_id: int) -> Optional[Dict[str, Any]]:
        for idx, p in enumerate(self.normalized_products.values()):
            if idx + 1 == product_id or p["sku"] == str(product_id):
                return p
        return None

    def get_offers(self, product_id: int) -> List[Dict[str, Any]]:
        target_sku = None
        for idx, p in enumerate(self.normalized_products.values()):
            if idx + 1 == product_id or p["sku"] == str(product_id):
                target_sku = p["sku"]
                break
        if not target_sku:
            return []
        return [o for o in self.normalized_offers if o["sku"] == target_sku]

    def get_current_price(self, product_id: int) -> Optional[float]:
        offers = self.get_offers(product_id)
        if not offers:
            return None
        return min(o["price"] for o in offers)
