import datetime
from app.extensions import db
from app.models import Product, Retailer, Offer, PriceHistory, Alert, Coupon, Review

def seed_initial_data():
    """
    Populates deterministic demonstration retailers, products, offers, and price histories.
    Safe and idempotent to rerun: verifies existing records before inserting.
    All data generated is explicitly tagged with source_type='demo'.
    """
    # 1. Seed Retailers
    retailer_definitions = [
        {
            "name": "Amazon India",
            "code": "amazon",
            "website_url": "https://www.amazon.in",
            "logo_url": "https://images.unsplash.com/photo-1523474255658-4af61b1684c3?w=100&auto=format&fit=crop&q=60",
            "default_shipping_cost": 40.0,
            "free_shipping_threshold": 499.0,
        },
        {
            "name": "Flipkart",
            "code": "flipkart",
            "website_url": "https://www.flipkart.com",
            "logo_url": "https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=100&auto=format&fit=crop&q=60",
            "default_shipping_cost": 50.0,
            "free_shipping_threshold": 500.0,
        },
        {
            "name": "Croma",
            "code": "croma",
            "website_url": "https://www.croma.com",
            "logo_url": "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=100&auto=format&fit=crop&q=60",
            "default_shipping_cost": 0.0,
            "free_shipping_threshold": 0.0,
        },
        {
            "name": "Reliance Digital",
            "code": "reliance_digital",
            "website_url": "https://www.reliancedigital.in",
            "logo_url": "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=100&auto=format&fit=crop&q=60",
            "default_shipping_cost": 49.0,
            "free_shipping_threshold": 1000.0,
        },
        {
            "name": "Tata CLiQ",
            "code": "tatacliq",
            "website_url": "https://www.tatacliq.com",
            "logo_url": "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=100&auto=format&fit=crop&q=60",
            "default_shipping_cost": 59.0,
            "free_shipping_threshold": 999.0,
        },
    ]

    for r_data in retailer_definitions:
        existing_r = Retailer.query.filter_by(code=r_data["code"]).first()
        if not existing_r:
            new_r = Retailer(
                name=r_data["name"],
                code=r_data["code"],
                website_url=r_data["website_url"],
                logo_url=r_data["logo_url"],
                default_shipping_cost=r_data["default_shipping_cost"],
                free_shipping_threshold=r_data["free_shipping_threshold"],
                is_active=True
            )
            db.session.add(new_r)
    db.session.flush()

    ret_map = {r.code: r.id for r in Retailer.query.all()}

    # 2. Seed Products
    product_definitions = [
        {
            "sku": "APPL-IP15-128",
            "name": "Apple iPhone 15 (128 GB) - Blue",
            "brand": "Apple",
            "category": "Smartphones",
            "description": "Dynamic Island, 48MP main camera with 2x Telephoto, durable color-infused glass and aluminum design with USB-C connector.",
            "image_url": "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=500&auto=format&fit=crop&q=60",
            "base_mrp": 79900.0,
            "specs_json": {"Storage": "128GB", "Display": "6.1 Super Retina XDR", "Chip": "A16 Bionic", "Battery": "Up to 20h video playback"}
        },
        {
            "sku": "SNY-WH1000XM5",
            "name": "Sony WH-1000XM5 Wireless Noise Cancelling Headphones",
            "brand": "Sony",
            "category": "Audio",
            "description": "Industry-leading noise cancellation with two processors and 8 microphones. Up to 30 hours of battery life with quick charge.",
            "image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=60",
            "base_mrp": 34990.0,
            "specs_json": {"Battery": "30 Hours", "Bluetooth": "5.2", "Noise Cancelling": "Active Dual Processor", "Driver": "30mm precision-engineered"}
        },
        {
            "sku": "DEL-XPS13-PLUS",
            "name": "Dell XPS 13 Plus Laptop (Intel i7 13th Gen, 16GB, 512GB SSD)",
            "brand": "Dell",
            "category": "Laptops",
            "description": "Zero-lattice keyboard, capacitive touch function row, and borderless seamless glass touchpad with 3.5K OLED touch display.",
            "image_url": "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&auto=format&fit=crop&q=60",
            "base_mrp": 159990.0,
            "specs_json": {"Processor": "Intel Core i7-1360P", "RAM": "16GB LPDDR5", "Storage": "512GB PCIe NVMe SSD", "Display": "13.4 OLED 3.5K Touch"}
        },
        {
            "sku": "KNDL-PPRWHT-16G",
            "name": "Kindle Paperwhite (16 GB) - 6.8 inch Display with Warm Light",
            "brand": "Amazon",
            "category": "E-Readers",
            "description": "6.8 inch glare-free display with thinner borders, adjustable warm light, up to 10 weeks of battery life, and IPX8 waterproofing.",
            "image_url": "https://images.unsplash.com/photo-1592496431122-2349e0fbc666?w=500&auto=format&fit=crop&q=60",
            "base_mrp": 14999.0,
            "specs_json": {"Display": "6.8 inch 300 ppi glare-free", "Storage": "16GB", "Battery": "Up to 10 weeks", "Waterproof": "IPX8 (2m fresh water)"}
        },
        {
            "sku": "SAM-GW6-44MM",
            "name": "Samsung Galaxy Watch 6 LTE (44mm, Graphite)",
            "brand": "Samsung",
            "category": "Smartwatches",
            "description": "Advanced sleep coaching, ECG and blood pressure monitoring, Sapphire crystal glass with 20% larger screen and slim bezel.",
            "image_url": "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=500&auto=format&fit=crop&q=60",
            "base_mrp": 36999.0,
            "specs_json": {"Size": "44mm", "Connectivity": "LTE + Bluetooth", "Display": "1.5 Super AMOLED", "Sensors": "BioActive Sensor (HR, ECG, BIA)"}
        },
        {
            "sku": "ECH-DOT-5TH",
            "name": "Amazon Echo Dot (5th Gen) Smart Speaker with Alexa",
            "brand": "Amazon",
            "category": "Smart Home",
            "description": "Best-sounding Echo Dot yet with clearer vocals, deeper bass, and vibrant sound in any room with temperature and motion sensors.",
            "image_url": "https://images.unsplash.com/photo-1543512214-318c7553f230?w=500&auto=format&fit=crop&q=60",
            "base_mrp": 5499.0,
            "specs_json": {"Voice Assistant": "Alexa Built-in", "Audio": "1.73 Front-firing speaker", "Connectivity": "Dual-band Wi-Fi + BLE Mesh"}
        },
        # Additional Phase 4 products to exercise alternatives and similarity
        {
            "sku": "SAM-S24-128",
            "name": "Samsung Galaxy S24 (128 GB) - Onyx Black",
            "brand": "Samsung",
            "category": "Smartphones",
            "description": "Galaxy AI, 50MP triple camera system with 3x optical zoom, Armor Aluminum 2.0 frame, and dynamic 120Hz display.",
            "image_url": "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=500&auto=format&fit=crop&q=60",
            "base_mrp": 74999.0,
            "specs_json": {"Storage": "128GB", "Display": "6.2 Dynamic AMOLED 2X", "Chip": "Exynos 2400", "Battery": "4000 mAh"}
        },
        {
            "sku": "ONEP-12R-128",
            "name": "OnePlus 12R (128 GB) - Cool Blue",
            "brand": "OnePlus",
            "category": "Smartphones",
            "description": "Snapdragon 8 Gen 2, 4th Gen LTPO 120Hz display, 5500 mAh battery with 100W SUPERVOOC charging.",
            "image_url": "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=500&auto=format&fit=crop&q=60",
            "base_mrp": 39999.0,
            "specs_json": {"Storage": "128GB", "Display": "6.78 AMOLED 120Hz", "Chip": "Snapdragon 8 Gen 2", "Battery": "5500 mAh"}
        },
        {
            "sku": "APPL-IP14-128",
            "name": "Apple iPhone 14 (128 GB) - Midnight",
            "brand": "Apple",
            "category": "Smartphones",
            "description": "6.1-inch Super Retina XDR display, advanced dual-camera system, Action mode, Crash Detection, and all-day battery life.",
            "image_url": "https://images.unsplash.com/photo-1663499482523-1c0c1bae4ce1?w=500&auto=format&fit=crop&q=60",
            "base_mrp": 69900.0,
            "specs_json": {"Storage": "128GB", "Display": "6.1 Super Retina XDR", "Chip": "A15 Bionic", "Battery": "Up to 20h video playback"}
        },
        {
            "sku": "BOSE-QC45-BLK",
            "name": "Bose QuietComfort 45 Wireless Noise Cancelling Headphones",
            "brand": "Bose",
            "category": "Audio",
            "description": "TriPort acoustic architecture, Quiet and Aware modes, lightweight comfort with plush synthetic leather, and 24-hour battery.",
            "image_url": "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=500&auto=format&fit=crop&q=60",
            "base_mrp": 29900.0,
            "specs_json": {"Battery": "24 Hours", "Bluetooth": "5.1", "Noise Cancelling": "Acoustic Noise Cancelling", "Driver": "TriPort acoustic architecture"}
        },
        {
            "sku": "SNY-WHCH720N",
            "name": "Sony WH-CH720N Wireless Noise Cancelling Headphones",
            "brand": "Sony",
            "category": "Audio",
            "description": "Integrated Processor V1 for active noise cancellation, lightweight 192g build, dual noise sensor technology, and 35-hour battery.",
            "image_url": "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=500&auto=format&fit=crop&q=60",
            "base_mrp": 9990.0,
            "specs_json": {"Battery": "35 Hours", "Bluetooth": "5.2", "Noise Cancelling": "Integrated Processor V1", "Driver": "30mm dynamic"}
        },
        {
            "sku": "APPL-MBA-M2",
            "name": "Apple MacBook Air 13.6-inch (M2 Chip, 8GB Unified, 256GB SSD)",
            "brand": "Apple",
            "category": "Laptops",
            "description": "Strikingly thin design, M2 chip with 8-core CPU and up to 10-core GPU, 13.6 Liquid Retina display, MagSafe charging, and 18h battery.",
            "image_url": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&auto=format&fit=crop&q=60",
            "base_mrp": 114900.0,
            "specs_json": {"Processor": "Apple M2 Chip", "RAM": "8GB Unified", "Storage": "256GB SSD", "Display": "13.6 Liquid Retina"}
        },
        {
            "sku": "LEN-YOGA-SLIM7",
            "name": "Lenovo Yoga Slim 7 Carbon (Intel i7 13th Gen, 16GB, 1TB SSD)",
            "brand": "Lenovo",
            "category": "Laptops",
            "description": "Ultralight carbon fiber chassis, 13.3-inch 2.5K 90Hz PureSight display, Harman Kardon speakers with Dolby Atmos, and rapid charge.",
            "image_url": "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=500&auto=format&fit=crop&q=60",
            "base_mrp": 134990.0,
            "specs_json": {"Processor": "Intel Core i7-1360P", "RAM": "16GB LPDDR5", "Storage": "1TB PCIe SSD", "Display": "13.3 2.5K OLED"}
        },
        # Product with missing specifications to exercise sparse-spec guardrails
        {
            "sku": "GEN-BT-SPK",
            "name": "AcousticBass Portable Bluetooth Speaker",
            "brand": "Generic",
            "category": "Audio",
            "description": "Compact wireless speaker for outdoor music streaming with IPX5 splash protection.",
            "image_url": "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500&auto=format&fit=crop&q=60",
            "base_mrp": 1499.0,
            "specs_json": {}
        },
        # Product with no offers to exercise no-offer handling
        {
            "sku": "NOTH-PHN2-512",
            "name": "Nothing Phone (2) (512 GB) - Dark Grey",
            "brand": "Nothing",
            "category": "Smartphones",
            "description": "Glyph Interface, Snapdragon 8+ Gen 1, 50MP dual rear cameras with Sony IMX890, and Nothing OS 2.5.",
            "image_url": "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=500&auto=format&fit=crop&q=60",
            "base_mrp": 54999.0,
            "specs_json": {"Storage": "512GB", "Display": "6.7 LTPO OLED", "Chip": "Snapdragon 8+ Gen 1", "Battery": "4700 mAh"}
        },
    ]

    for p_data in product_definitions:
        existing_p = Product.query.filter_by(sku=p_data["sku"]).first()
        if not existing_p:
            new_p = Product(
                sku=p_data["sku"],
                name=p_data["name"],
                brand=p_data["brand"],
                category=p_data["category"],
                description=p_data["description"],
                image_url=p_data["image_url"],
                base_mrp=p_data["base_mrp"],
                specs_json=p_data["specs_json"],
                source_type="demo"
            )
            db.session.add(new_p)
    db.session.flush()

    prod_map = {p.sku: p.id for p in Product.query.all()}

    # 3. Seed Offers (Deterministic demonstration data)
    offer_definitions = [
        # iPhone 15 Offers
        {
            "sku": "APPL-IP15-128", "ret": "flipkart", "price": 68499.0, "orig": 79900.0,
            "shipping": 40.0, "status": "In Stock", "delivery": 3, "url": "https://www.flipkart.com/item/1"
        },
        {
            "sku": "APPL-IP15-128", "ret": "amazon", "price": 69999.0, "orig": 79900.0,
            "shipping": 0.0, "status": "In Stock", "delivery": 2, "url": "https://www.amazon.in/dp/B0CHX1W1XY"
        },
        {
            "sku": "APPL-IP15-128", "ret": "croma", "price": 71990.0, "orig": 79900.0,
            "shipping": 0.0, "status": "In Stock", "delivery": 1, "url": "https://www.croma.com/p/1"
        },
        {
            "sku": "APPL-IP15-128", "ret": "reliance_digital", "price": 70900.0, "orig": 79900.0,
            "shipping": None, "status": "In Stock", "delivery": 2, "url": "https://www.reliancedigital.in/p/1"
            # Note: Shipping is unknown (None) to demonstrate unknown shipping cost handling!
        },
        {
            "sku": "APPL-IP15-128", "ret": "tatacliq", "price": 67999.0, "orig": 79900.0,
            "shipping": 0.0, "status": "Out of Stock", "delivery": 4, "url": "https://www.tatacliq.com/p/1"
            # Note: Lower listed price, but Out of Stock to demonstrate exclusion from cheapest eligible offer!
        },

        # Sony Headphones Offers
        {
            "sku": "SNY-WH1000XM5", "ret": "amazon", "price": 26990.0, "orig": 34990.0,
            "shipping": 0.0, "status": "In Stock", "delivery": 2, "url": "https://www.amazon.in/dp/B09XS7JWHH"
        },
        {
            "sku": "SNY-WH1000XM5", "ret": "croma", "price": 28990.0, "orig": 34990.0,
            "shipping": 0.0, "status": "In Stock", "delivery": 1, "url": "https://www.croma.com/p/2"
        },
        {
            "sku": "SNY-WH1000XM5", "ret": "flipkart", "price": 27499.0, "orig": 34990.0,
            "shipping": 50.0, "status": "In Stock", "delivery": 3, "url": "https://www.flipkart.com/item/2"
        },

        # Dell Laptop Offers
        {
            "sku": "DEL-XPS13-PLUS", "ret": "amazon", "price": 149990.0, "orig": 159990.0,
            "shipping": 0.0, "status": "In Stock", "delivery": 3, "url": "https://www.amazon.in/dp/B0B5XPS13"
        },
        {
            "sku": "DEL-XPS13-PLUS", "ret": "croma", "price": 152990.0, "orig": 159990.0,
            "shipping": 0.0, "status": "In Stock", "delivery": 1, "url": "https://www.croma.com/p/3"
        },

        # Kindle Paperwhite Offers
        {
            "sku": "KNDL-PPRWHT-16G", "ret": "amazon", "price": 13999.0, "orig": 14999.0,
            "shipping": 0.0, "status": "In Stock", "delivery": 1, "url": "https://www.amazon.in/dp/B08N3TCP2F"
        },
        {
            "sku": "KNDL-PPRWHT-16G", "ret": "croma", "price": 14499.0, "orig": 14999.0,
            "shipping": 0.0, "status": "In Stock", "delivery": 2, "url": "https://www.croma.com/p/4"
        },

        # Samsung Watch 6 Offers
        {
            "sku": "SAM-GW6-44MM", "ret": "flipkart", "price": 29999.0, "orig": 36999.0,
            "shipping": 40.0, "status": "In Stock", "delivery": 2, "url": "https://www.flipkart.com/item/5"
        },
        {
            "sku": "SAM-GW6-44MM", "ret": "amazon", "price": 31499.0, "orig": 36999.0,
            "shipping": 0.0, "status": "In Stock", "delivery": 1, "url": "https://www.amazon.in/dp/B0C7SG6W44"
        },

        # Echo Dot 5th Gen Offers
        {
            "sku": "ECH-DOT-5TH", "ret": "amazon", "price": 4499.0, "orig": 5499.0,
            "shipping": 0.0, "status": "In Stock", "delivery": 1, "url": "https://www.amazon.in/dp/B09B8V1LZ3"
        },
        {
            "sku": "ECH-DOT-5TH", "ret": "croma", "price": 4999.0, "orig": 5499.0,
            "shipping": 0.0, "status": "In Stock", "delivery": 2, "url": "https://www.croma.com/p/6"
        },

        # Samsung S24 Offers
        {
            "sku": "SAM-S24-128", "ret": "amazon", "price": 71999.0, "orig": 74999.0,
            "shipping": 0.0, "status": "In Stock", "delivery": 1, "url": "https://www.amazon.in/dp/B0CQ7699F9"
        },
        {
            "sku": "SAM-S24-128", "ret": "croma", "price": 72999.0, "orig": 74999.0,
            "shipping": 0.0, "status": "In Stock", "delivery": 2, "url": "https://www.croma.com/p/s24"
        },

        # OnePlus 12R Offers
        {
            "sku": "ONEP-12R-128", "ret": "amazon", "price": 38999.0, "orig": 39999.0,
            "shipping": 40.0, "status": "In Stock", "delivery": 1, "url": "https://www.amazon.in/dp/B0CSKPT5M4"
        },
        {
            "sku": "ONEP-12R-128", "ret": "flipkart", "price": 37999.0, "orig": 39999.0,
            "shipping": 40.0, "status": "In Stock", "delivery": 2, "url": "https://www.flipkart.com/item/12r"
        },

        # iPhone 14 Offers
        {
            "sku": "APPL-IP14-128", "ret": "flipkart", "price": 61999.0, "orig": 69900.0,
            "shipping": 40.0, "status": "In Stock", "delivery": 2, "url": "https://www.flipkart.com/item/ip14"
        },
        {
            "sku": "APPL-IP14-128", "ret": "amazon", "price": 62999.0, "orig": 69900.0,
            "shipping": 0.0, "status": "In Stock", "delivery": 1, "url": "https://www.amazon.in/dp/B0BDK62PDX"
        },

        # Bose QC45 Offers
        {
            "sku": "BOSE-QC45-BLK", "ret": "amazon", "price": 24900.0, "orig": 29900.0,
            "shipping": 0.0, "status": "In Stock", "delivery": 1, "url": "https://www.amazon.in/dp/B098FKXT8L"
        },
        {
            "sku": "BOSE-QC45-BLK", "ret": "croma", "price": 25900.0, "orig": 29900.0,
            "shipping": 0.0, "status": "In Stock", "delivery": 2, "url": "https://www.croma.com/p/qc45"
        },

        # Sony WH-CH720N Offers
        {
            "sku": "SNY-WHCH720N", "ret": "amazon", "price": 8990.0, "orig": 9990.0,
            "shipping": 40.0, "status": "In Stock", "delivery": 1, "url": "https://www.amazon.in/dp/B0BS1PRP94"
        },
        {
            "sku": "SNY-WHCH720N", "ret": "reliance_digital", "price": 8490.0, "orig": 9990.0,
            "shipping": 49.0, "status": "In Stock", "delivery": 2, "url": "https://www.reliancedigital.in/p/ch720"
        },

        # MacBook Air M2 Offers
        {
            "sku": "APPL-MBA-M2", "ret": "croma", "price": 99900.0, "orig": 114900.0,
            "shipping": 0.0, "status": "In Stock", "delivery": 2, "url": "https://www.croma.com/p/mbam2"
        },
        {
            "sku": "APPL-MBA-M2", "ret": "amazon", "price": 102900.0, "orig": 114900.0,
            "shipping": 0.0, "status": "In Stock", "delivery": 1, "url": "https://www.amazon.in/dp/B0B3BQA1L1"
        },

        # Lenovo Yoga Slim 7 Offers
        {
            "sku": "LEN-YOGA-SLIM7", "ret": "croma", "price": 128990.0, "orig": 134990.0,
            "shipping": 0.0, "status": "In Stock", "delivery": 2, "url": "https://www.croma.com/p/yoga"
        },

        # Speaker with Unknown Shipping
        {
            "sku": "GEN-BT-SPK", "ret": "amazon", "price": 999.0, "orig": 1499.0,
            "shipping": None, "status": "In Stock", "delivery": 3, "url": "https://www.amazon.in/dp/speaker"
        },
    ]

    for o_data in offer_definitions:
        p_id = prod_map.get(o_data["sku"])
        r_id = ret_map.get(o_data["ret"])
        if p_id and r_id:
            existing_o = Offer.query.filter_by(product_id=p_id, retailer_id=r_id).first()
            orig = o_data["orig"]
            price = o_data["price"]
            disc = round(max(0.0, ((orig - price) / orig) * 100), 1) if orig > price else 0.0

            if not existing_o:
                new_o = Offer(
                    product_id=p_id,
                    retailer_id=r_id,
                    price=price,
                    original_price=orig,
                    shipping_cost=o_data["shipping"],
                    shipping_is_estimated=(o_data["shipping"] is None),
                    discount_pct=disc,
                    stock_status=o_data["status"],
                    delivery_days=o_data["delivery"],
                    product_url=o_data["url"],
                    source_type="demo"
                )
                db.session.add(new_o)

    # 4. Seed historical price records covering 90 days
    p_iphone = prod_map.get("APPL-IP15-128")
    p_sony = prod_map.get("SNY-WH1000XM5")
    r_flipkart = ret_map.get("flipkart")
    r_amazon = ret_map.get("amazon")
    r_croma = ret_map.get("croma")
    r_reliance = ret_map.get("reliance_digital")

    base_date = datetime.datetime.utcnow()

    # Seed 90 days for iPhone 15 on Flipkart if count < 60
    if p_iphone and r_flipkart and PriceHistory.query.filter_by(product_id=p_iphone, retailer_id=r_flipkart).count() < 60:
        for day_offset in range(89, -1, -1):
            rec_time = base_date - datetime.timedelta(days=day_offset)
            if day_offset > 60:
                day_price = 76900.0 - ((90 - day_offset) * 100)
            elif day_offset > 30:
                day_price = 73900.0 - ((60 - day_offset) * 110)
            else:
                day_price = 70600.0 - ((30 - day_offset) * 70)
            
            snapped_price = float(round(day_price / 100.0) * 100 - 1)  # ends in 99
            
            existing_record = PriceHistory.query.filter(
                PriceHistory.product_id == p_iphone,
                PriceHistory.retailer_id == r_flipkart,
                PriceHistory.recorded_at >= rec_time - datetime.timedelta(hours=12),
                PriceHistory.recorded_at <= rec_time + datetime.timedelta(hours=12)
            ).first()

            if not existing_record:
                db.session.add(PriceHistory(
                    product_id=p_iphone,
                    retailer_id=r_flipkart,
                    price=snapped_price,
                    original_price=79900.0,
                    recorded_at=rec_time,
                    source_type="demo"
                ))

    # Also seed 30 days for iPhone 15 on Amazon to support multi-retailer filter
    if p_iphone and r_amazon:
        for day_offset in range(29, -1, -1):
            rec_time = base_date - datetime.timedelta(days=day_offset)
            snapped_price = 71999.0 - ((30 - day_offset) * 65)
            existing_record = PriceHistory.query.filter(
                PriceHistory.product_id == p_iphone,
                PriceHistory.retailer_id == r_amazon,
                PriceHistory.recorded_at >= rec_time - datetime.timedelta(hours=12),
                PriceHistory.recorded_at <= rec_time + datetime.timedelta(hours=12)
            ).first()
            if not existing_record:
                db.session.add(PriceHistory(
                    product_id=p_iphone,
                    retailer_id=r_amazon,
                    price=float(round(snapped_price)),
                    original_price=79900.0,
                    recorded_at=rec_time,
                    source_type="demo"
                ))

    # Seed 30 days for Sony Headphones on Amazon
    if p_sony and r_amazon:
        for day_offset in range(29, -1, -1):
            rec_time = base_date - datetime.timedelta(days=day_offset)
            snapped_price = 29990.0 - ((30 - day_offset) * 100)
            existing_record = PriceHistory.query.filter(
                PriceHistory.product_id == p_sony,
                PriceHistory.retailer_id == r_amazon,
                PriceHistory.recorded_at >= rec_time - datetime.timedelta(hours=12),
                PriceHistory.recorded_at <= rec_time + datetime.timedelta(hours=12)
            ).first()
            if not existing_record:
                db.session.add(PriceHistory(
                    product_id=p_sony,
                    retailer_id=r_amazon,
                    price=float(round(snapped_price)),
                    original_price=34990.0,
                    recorded_at=rec_time,
                    source_type="demo"
                ))

    # 5. Seed Demonstration Coupons
    coupon_definitions = [
        {
            "code": "SMARTCART500",
            "title": "SmartCart Welcome Bonus",
            "description": "Flat ₹500 off on electronics purchases above ₹5,000",
            "discount_type": "fixed_amount",
            "discount_value": 500.0,
            "min_order_value": 5000.0,
            "max_discount_value": 500.0,
            "retailer_id": r_amazon,
            "applicable_category": None,
            "applicable_product_id": None,
            "verification_status": "verified",
            "source_type": "demo",
            "valid_from": base_date - datetime.timedelta(days=30),
            "valid_until": base_date + datetime.timedelta(days=60),
            "terms": "Valid once per user on eligible electronics over ₹5,000."
        },
        {
            "code": "ELECTRO10",
            "title": "Tech Fest 10% Off",
            "description": "10% discount on all electronics, capped at ₹3,000",
            "discount_type": "percentage",
            "discount_value": 10.0,
            "min_order_value": 10000.0,
            "max_discount_value": 3000.0,
            "retailer_id": None,  # Platform-wide
            "applicable_category": None,
            "applicable_product_id": None,
            "verification_status": "verified",
            "source_type": "demo",
            "valid_from": base_date - datetime.timedelta(days=15),
            "valid_until": base_date + datetime.timedelta(days=45),
            "terms": "Maximum savings ₹3,000. Applicable across all supported retailers."
        },
        {
            "code": "FLIPMOB15",
            "title": "Flipkart Smartphone Bonanza",
            "description": "15% off smartphones on Flipkart above ₹20,000",
            "discount_type": "percentage",
            "discount_value": 15.0,
            "min_order_value": 20000.0,
            "max_discount_value": 5000.0,
            "retailer_id": r_flipkart,
            "applicable_category": "Smartphones",
            "applicable_product_id": None,
            "verification_status": "unverified",
            "source_type": "demo",
            "valid_from": base_date - datetime.timedelta(days=5),
            "valid_until": base_date + datetime.timedelta(days=25),
            "terms": "Requires minimum order of ₹20,000 in Smartphones category on Flipkart."
        },
        {
            "code": "FREESHIP",
            "title": "Croma Free Express Delivery",
            "description": "100% shipping fee waiver on Croma orders over ₹1,000",
            "discount_type": "free_shipping",
            "discount_value": 0.0,
            "min_order_value": 1000.0,
            "max_discount_value": None,
            "retailer_id": r_croma,
            "applicable_category": None,
            "applicable_product_id": None,
            "verification_status": "verified",
            "source_type": "demo",
            "valid_from": base_date - datetime.timedelta(days=10),
            "valid_until": base_date + datetime.timedelta(days=50),
            "terms": "Waives shipping charges on verified in-stock items above ₹1,000."
        },
        {
            "code": "IPHONEFEST",
            "title": "iPhone 15 Exclusive Savings",
            "description": "Flat ₹4,000 off Apple iPhone 15 on Amazon India",
            "discount_type": "fixed_amount",
            "discount_value": 4000.0,
            "min_order_value": 65000.0,
            "max_discount_value": 4000.0,
            "retailer_id": r_amazon,
            "applicable_category": "Smartphones",
            "applicable_product_id": p_iphone,
            "verification_status": "unverified",
            "source_type": "demo",
            "valid_from": base_date - datetime.timedelta(days=7),
            "valid_until": base_date + datetime.timedelta(days=21),
            "terms": "Restricted exclusively to Apple iPhone 15 on Amazon India."
        },
        {
            "code": "DIWALI2025",
            "title": "Past Festival 20% Celebration",
            "description": "20% off all catalog electronics (Expired promotion)",
            "discount_type": "percentage",
            "discount_value": 20.0,
            "min_order_value": 5000.0,
            "max_discount_value": 4000.0,
            "retailer_id": None,
            "applicable_category": None,
            "applicable_product_id": None,
            "verification_status": "expired",
            "source_type": "demo",
            "valid_from": base_date - datetime.timedelta(days=60),
            "valid_until": base_date - datetime.timedelta(days=15),
            "terms": "Promotion concluded on historical festival timeline."
        },
        {
            "code": "LAPTOP2000",
            "title": "Reliance Digital Laptop Special",
            "description": "Flat ₹2,000 instant discount on laptops above ₹50,000",
            "discount_type": "fixed_amount",
            "discount_value": 2000.0,
            "min_order_value": 50000.0,
            "max_discount_value": 2000.0,
            "retailer_id": r_reliance,
            "applicable_category": "Laptops",
            "applicable_product_id": None,
            "verification_status": "unverified",
            "source_type": "demo",
            "valid_from": base_date - datetime.timedelta(days=12),
            "valid_until": base_date + datetime.timedelta(days=30),
            "terms": "Valid exclusively on Laptops over ₹50,000 at Reliance Digital."
        },
    ]

    for c_data in coupon_definitions:
        existing_c = Coupon.query.filter_by(code=c_data["code"]).first()
        if not existing_c:
            db.session.add(Coupon(
                code=c_data["code"],
                title=c_data["title"],
                description=c_data["description"],
                discount_type=c_data["discount_type"],
                discount_value=c_data["discount_value"],
                min_order_value=c_data["min_order_value"],
                max_discount_value=c_data["max_discount_value"],
                retailer_id=c_data["retailer_id"],
                applicable_category=c_data["applicable_category"],
                applicable_product_id=c_data["applicable_product_id"],
                verification_status=c_data["verification_status"],
                source_type=c_data["source_type"],
                valid_from=c_data["valid_from"],
                valid_until=c_data["valid_until"],
                terms_and_conditions=c_data["terms"],
                is_active=True
            ))

    # 6. Sample Alerts if missing
    if p_iphone and not Alert.query.filter_by(product_id=p_iphone, contact_email="shopper@example.com").first():
        db.session.add(Alert(
            product_id=p_iphone,
            target_price=65000.0,
            contact_email="shopper@example.com",
            user_identifier="guest_user",
            is_active=True,
            trigger_status="active",
            last_checked_at=datetime.datetime.utcnow(),
            last_observed_price=68499.0
        ))

    if p_sony and not Alert.query.filter_by(product_id=p_sony, contact_email="shopper@example.com").first():
        db.session.add(Alert(
            product_id=p_sony,
            target_price=28000.0,
            contact_email="shopper@example.com",
            user_identifier="guest_user",
            is_active=True,
            trigger_status="triggered",
            trigger_count=1,
            last_checked_at=datetime.datetime.utcnow(),
            last_triggered_at=datetime.datetime.utcnow(),
            last_observed_price=26990.0
        ))

    # 7. Sample Demonstration Reviews for iPhone 15
    if p_iphone and Review.query.filter_by(product_id=p_iphone).count() == 0:
        sample_reviews_iphone = [
            Review(
                product_id=p_iphone,
                author="Aarav Sharma",
                rating=5.0,
                title="Superb build quality and camera",
                content="The battery life and Dynamic Island are great improvements. Display is bright and cameras capture natural skin tones.",
                review_date=base_date - datetime.timedelta(days=20),
                verified_purchase=True,
                source_type="demo"
            ),
            Review(
                product_id=p_iphone,
                author="Priya Patel",
                rating=5.0,
                title="Worth every rupee",
                content="Upgraded from iPhone 11 and the difference is night and day. USB-C makes charging so convenient.",
                review_date=base_date - datetime.timedelta(days=18),
                verified_purchase=True,
                source_type="demo"
            ),
            Review(
                product_id=p_iphone,
                author="TechShopper99",
                rating=4.0,
                title="Good performance but warm under load",
                content="Solid daily phone. Can get slightly warm during fast charging or gaming, but overall battery is reliable.",
                review_date=base_date - datetime.timedelta(days=15),
                verified_purchase=False,
                source_type="demo"
            ),
            Review(
                product_id=p_iphone,
                author="Reviewer_Delhi",
                rating=5.0,
                title="Amazing deal best phone ever",
                content="Amazing deal best phone ever. Fast delivery and excellent packaging. Highly recommended to everyone.",
                review_date=base_date - datetime.timedelta(days=8),
                verified_purchase=False,
                source_type="demo"
            ),
            Review(
                product_id=p_iphone,
                author="Reviewer_Mumbai",
                rating=5.0,
                title="Amazing deal best phone ever",
                content="Amazing deal best phone ever. Fast delivery and excellent packaging. Highly recommended to everyone.",
                review_date=base_date - datetime.timedelta(days=8),
                verified_purchase=False,
                source_type="demo"
            ),
            Review(
                product_id=p_iphone,
                author="Rohan Mehta",
                rating=4.0,
                title="Terrible experience broken screen",
                content="The phone screen arrived completely cracked and battery drain is terrible. Highly disappointed with this seller.",
                review_date=base_date - datetime.timedelta(days=5),
                verified_purchase=True,
                source_type="demo"
            ),
            Review(
                product_id=p_iphone,
                author="Sneha K.",
                rating=3.0,
                title="Average upgrade",
                content="Decent phone but feels very similar to iPhone 14. 60Hz display is disappointing at this price point.",
                review_date=base_date - datetime.timedelta(days=2),
                verified_purchase=True,
                source_type="demo"
            )
        ]
        db.session.add_all(sample_reviews_iphone)

    db.session.commit()
    print("Database seeding completed cleanly and idempotently.")

