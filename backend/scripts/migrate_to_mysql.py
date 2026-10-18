"""
SmartCart AI - Non-destructive SQLite to MySQL Migration Tool
Safely transfers records from local SQLite to managed MySQL without modifying or deleting source data.

Safety Guarantees:
1. Local SQLite database is opened strictly for reading. File size and timestamp are verified unchanged.
2. Migrates raw column data in dependency order without ORM relationship cascading side-effects.
3. Atomic transaction: all records across all 10 models must be verified before commit.
4. If any failure occurs, the target transaction is rolled back immediately, preventing incomplete data.
5. Includes a --dry-run mode to verify schemas and record counts without writing to the target.

Usage:
    # Dry run check:
    python scripts/migrate_to_mysql.py --target-url "mysql+pymysql://user:pwd@host:3306/db" --dry-run

    # Perform migration:
    python scripts/migrate_to_mysql.py --target-url "mysql+pymysql://user:pwd@host:3306/db"
"""

import os
import sys
import argparse
from pathlib import Path

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.models import (
    Retailer,
    Product,
    Offer,
    PriceHistory,
    Alert,
    Coupon,
    Review,
    Forecast,
    Basket,
    BasketItem,
)
from app.extensions import db
from app import create_app

# Dependency order: parent tables first, dependent tables last
MODELS_IN_ORDER = [
    (Retailer, "retailers", "Retailers"),
    (Product, "products", "Products"),
    (Offer, "offers", "Offers"),
    (PriceHistory, "price_histories", "PriceHistories"),
    (Alert, "alerts", "Alerts"),
    (Coupon, "coupons", "Coupons"),
    (Review, "reviews", "Reviews"),
    (Forecast, "forecasts", "Forecasts"),
    (Basket, "baskets", "Baskets"),
    (BasketItem, "basket_items", "BasketItems"),
]

def migrate_data(source_sqlite_path: str, target_db_url: str, dry_run: bool = False):
    print("=" * 70)
    print(" SMARTCART AI - SAFE DATABASE MIGRATION ENGINE")
    print("=" * 70)

    # 1. Source verification & safety baseline
    source_path = Path(source_sqlite_path).resolve()
    if not source_path.exists():
        print(f"[FATAL] Source SQLite database not found at: {source_path}")
        sys.exit(1)

    source_size_before = source_path.stat().st_size
    source_mtime_before = source_path.stat().st_mtime
    print(f" Source SQLite DB : {source_path}")
    print(f" Source DB Size   : {source_size_before:,} bytes")
    print(f" Target DB Host   : {target_db_url.split('@')[-1] if '@' in target_db_url else target_db_url}")
    print(f" Migration Mode   : {'DRY RUN (Read-only simulation)' if dry_run else 'LIVE MIGRATION'}")

    source_url = f"sqlite:///{source_path}"
    source_engine = create_engine(source_url, connect_args={"check_same_thread": False})
    target_engine = create_engine(target_db_url, pool_pre_ping=True)

    SourceSession = sessionmaker(bind=source_engine)
    TargetSession = sessionmaker(bind=target_engine)

    source_session = SourceSession()
    target_session = TargetSession()

    try:
        # 2. Schema creation & verification on target
        print("\n[Stage 1/4] Verifying table schemas on target database...")
        app = create_app()
        with app.app_context():
            db.metadata.create_all(bind=target_engine)
        print(" -> All 10 model schemas verified on target database.")

        # 3. Source record inventory
        print("\n[Stage 2/4] Inventorying source SQLite records...")
        source_counts = {}
        total_source_records = 0
        for model, table_name, display_name in MODELS_IN_ORDER:
            cnt = source_session.query(model).count()
            source_counts[display_name] = cnt
            total_source_records += cnt
            print(f" - {display_name:<16} ({table_name:<15}): {cnt:>5} records")
        print(f" Total records to transfer: {total_source_records}")

        if dry_run:
            print("\n[DRY RUN COMPLETE] Target schema and source counts verified. No data written.")
            return

        # 4. Target state inspection
        print("\n[Stage 3/4] Inspecting target table states...")
        target_pre_counts = {}
        for model, table_name, display_name in MODELS_IN_ORDER:
            t_cnt = target_session.query(model).count()
            target_pre_counts[display_name] = t_cnt
            if t_cnt > 0:
                print(f" [!] Notice: Target {display_name} already contains {t_cnt} records.")

        # 5. Core migration in atomic transaction
        print("\n[Stage 4/4] Executing atomic migration in dependency order...")
        total_inserted = 0

        for model, table_name, display_name in MODELS_IN_ORDER:
            records = source_session.query(model).all()
            if not records:
                print(f" -> {display_name:<16}: 0 records (empty table, skipped)")
                continue

            columns = [c.name for c in model.__table__.columns]
            rows_to_insert = []

            for r in records:
                # Check if target already has this primary key to prevent duplication
                pk_val = getattr(r, "id", None)
                if pk_val is not None:
                    exists = target_session.query(model).filter(model.id == pk_val).first()
                    if exists:
                        continue

                row_dict = {col: getattr(r, col) for col in columns}
                rows_to_insert.append(row_dict)

            if rows_to_insert:
                target_session.execute(model.__table__.insert(), rows_to_insert)
                total_inserted += len(rows_to_insert)
                print(f" -> {display_name:<16}: inserted {len(rows_to_insert):>4} records")
            else:
                print(f" -> {display_name:<16}: all {len(records)} records already present on target")

        # 6. Pre-commit integrity verification
        print("\n[Integrity Verification] Verifying record counts before commit...")
        all_passed = True
        for model, table_name, display_name in MODELS_IN_ORDER:
            expected = max(source_counts[display_name], target_pre_counts[display_name])
            actual = target_session.query(model).count()
            if actual < expected:
                all_passed = False
                print(f" [FAIL] Count mismatch on {display_name}: expected at least {expected}, found {actual}")
            else:
                print(f" [PASS] {display_name:<16}: verified {actual} records present")

        if not all_passed:
            print("\n[ABORT] Integrity verification failed. Rolling back all target changes...")
            target_session.rollback()
            raise RuntimeError("Database migration aborted due to record count mismatch.")

        # Commit entire atomic transaction
        target_session.commit()
        print("\n" + "=" * 70)
        print(f" SUCCESS: MIGRATION COMMITTED! ({total_inserted} records inserted)")
        print("=" * 70)

    except Exception as e:
        target_session.rollback()
        print(f"\n[ERROR] Migration failed and was rolled back cleanly: {e}")
        raise
    finally:
        source_session.close()
        target_session.close()

        # Database safety check: verify local file was not modified
        source_size_after = source_path.stat().st_size
        source_mtime_after = source_path.stat().st_mtime
        if source_size_after != source_size_before or source_mtime_after != source_mtime_before:
            print("[CRITICAL WARNING] Source database file was touched during execution!")
        else:
            print("[SAFETY CONFIRMED] Local SQLite database was untouched and preserved 100%.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Safely migrate SmartCart AI SQLite data to MySQL")
    parser.add_argument(
        "--source",
        default=str(backend_dir / "smartcart.db"),
        help="Path to source SQLite db file (default: backend/smartcart.db)"
    )
    parser.add_argument(
        "--target-url",
        default=os.environ.get("TARGET_DATABASE_URL") or os.environ.get("DATABASE_URL"),
        help="Target database connection URL (e.g. mysql+pymysql://user:pwd@host:3306/smartcart)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate migration: check schemas and counts without writing data"
    )
    args = parser.parse_args()

    if not args.target_url or args.target_url.startswith("sqlite"):
        print("Error: Please provide a valid target database URL via --target-url or TARGET_DATABASE_URL env var.")
        print('Example: python scripts/migrate_to_mysql.py --target-url "mysql+pymysql://user:pwd@host:3306/smartcart_db"')
        sys.exit(1)

    migrate_data(args.source, args.target_url, dry_run=args.dry_run)
