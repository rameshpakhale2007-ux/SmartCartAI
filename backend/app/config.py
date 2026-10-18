import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "smartcart-ai-insecure-dev-key")
    
    # SQLite default, easily switchable to MySQL (e.g. mysql+pymysql://user:pwd@host/db) or PostgreSQL
    raw_db_url = os.getenv("DATABASE_URL")
    if not raw_db_url:
        db_path = BASE_DIR / "smartcart.db"
        DATABASE_URL = f"sqlite:///{db_path}"
    else:
        # Normalize postgres:// -> postgresql:// for modern SQLAlchemy
        if raw_db_url.startswith("postgres://"):
            raw_db_url = raw_db_url.replace("postgres://", "postgresql://", 1)
        # Normalize mysql:// -> mysql+pymysql:// if driver not explicitly specified
        elif raw_db_url.startswith("mysql://"):
            raw_db_url = raw_db_url.replace("mysql://", "mysql+pymysql://", 1)
        elif raw_db_url.startswith("sqlite:///") and not os.path.isabs(raw_db_url.replace("sqlite:///", "")):
            rel_path = raw_db_url.replace("sqlite:///", "")
            raw_db_url = f"sqlite:///{BASE_DIR / rel_path}"
        DATABASE_URL = raw_db_url

    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Production database connection pooling and pre-ping to withstand idle timeouts
    if DATABASE_URL.startswith("sqlite"):
        SQLALCHEMY_ENGINE_OPTIONS = {}
    else:
        SQLALCHEMY_ENGINE_OPTIONS = {
            "pool_pre_ping": True,
            "pool_recycle": 300,
        }
    
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5 MB max upload for safety

    # Parse CORS origins: '*' or list of allowed domains
    cors_raw = os.getenv("CORS_ORIGINS", "*").strip()
    if cors_raw == "*" or not cors_raw:
        CORS_ORIGINS = "*"
    else:
        CORS_ORIGINS = [orig.strip() for orig in cors_raw.split(",") if orig.strip()]

    JSON_SORT_KEYS = False

    # Administrative Secret Configuration
    ADMIN_API_KEY = os.getenv("SMARTCART_ADMIN_API_KEY") or os.getenv("ADMIN_API_KEY") or None

class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SQLALCHEMY_ENGINE_OPTIONS = {}
    WTF_CSRF_ENABLED = False
    ADMIN_API_KEY = "test-secret-admin-key"
