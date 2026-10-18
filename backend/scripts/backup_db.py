"""
SmartCart AI - Non-destructive Database Backup Utility
Creates a timestamped, verified copy of backend/smartcart.db in backend/backups/
Performs multi-layer verification:
1. SHA-256 cryptographic hash match.
2. SQLite PRAGMA integrity_check.
3. Table catalog and record count verification.
"""

import os
import shutil
import sqlite3
import hashlib
from datetime import datetime
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
source_db = backend_dir / "smartcart.db"
backup_dir = backend_dir / "backups"

def compute_sha256(file_path: Path) -> str:
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            hasher.update(chunk)
    return hasher.hexdigest()

def verify_sqlite_integrity(backup_path: Path):
    """Executes SQLite internal integrity check on the backup file."""
    conn = sqlite3.connect(f"file:{backup_path}?mode=ro", uri=True)
    cursor = conn.cursor()
    cursor.execute("PRAGMA integrity_check;")
    result = cursor.fetchone()
    
    # Query tables present in backup
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    tables = [row[0] for row in cursor.fetchall()]
    
    table_counts = {}
    for t in tables:
        cursor.execute(f"SELECT COUNT(*) FROM `{t}`;")
        table_counts[t] = cursor.fetchone()[0]
        
    conn.close()
    return result[0] if result else "failed", table_counts

def create_backup():
    print("=" * 60)
    print(" SmartCart AI - Database Backup & Integrity Verification")
    print("=" * 60)

    if not source_db.exists():
        print(f"[FATAL] Source database not found at {source_db}")
        return None

    backup_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    backup_file = backup_dir / f"smartcart_backup_{timestamp}.db"

    # Step 1: Compute source hash before copying
    print("\n[1/3] Computing source database SHA-256 hash...")
    source_size = source_db.stat().st_size
    source_hash = compute_sha256(source_db)
    print(f" Source size: {source_size:,} bytes")
    print(f" Source hash: {source_hash}")

    # Step 2: Copy with metadata preservation
    print("\n[2/3] Creating physical backup copy...")
    shutil.copy2(source_db, backup_file)
    backup_size = backup_file.stat().st_size
    backup_hash = compute_sha256(backup_file)
    print(f" Backup size: {backup_size:,} bytes")
    print(f" Backup hash: {backup_hash}")

    if source_hash != backup_hash or source_size != backup_size:
        print(f"[ERROR] Cryptographic hash or size mismatch! Backup is corrupted.")
        backup_file.unlink(missing_ok=True)
        return None

    # Step 3: SQLite internal integrity check & table counts
    print("\n[3/3] Running SQLite PRAGMA integrity_check on backup...")
    status, counts = verify_sqlite_integrity(backup_file)
    print(f" SQLite Integrity Check: {status.upper()}")
    if status.lower() != "ok":
        print(f"[ERROR] SQLite PRAGMA integrity_check failed on backup: {status}")
        return None

    print(f"\n Verified Table Inventory ({len(counts)} tables):")
    total_records = 0
    for tbl, cnt in counts.items():
        print(f"  - {tbl:<20}: {cnt:>5} records")
        total_records += cnt
    print(f" Total records verified: {total_records}")

    print("\n" + "=" * 60)
    print(f" BACKUP VERIFIED & READY: {backup_file}")
    print("=" * 60)
    return str(backup_file)

if __name__ == "__main__":
    create_backup()
