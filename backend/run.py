import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import create_app
from app.extensions import db
from scripts.seed_data import seed_initial_data

app = create_app()

with app.app_context():
    # Initialize all database tables safely
    try:
        db.create_all()
    except Exception as e:
        print(f"Notice: db.create_all encountered note: {e}")

    # Seed initial demonstration fixtures only if AUTO_SEED is explicitly enabled (defaults to false in production)
    flask_env = os.environ.get("FLASK_ENV", "development").lower()
    default_auto_seed = "false" if flask_env == "production" else "true"
    auto_seed = os.environ.get("AUTO_SEED", default_auto_seed).lower() in ("true", "1", "yes")
    if auto_seed:
        try:
            seed_initial_data()
        except Exception as e:
            print(f"Notice: Seeding skipped or encountered note: {e}")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    host = os.environ.get("HOST", "0.0.0.0")
    debug = os.environ.get("FLASK_DEBUG", "0").lower() in ("true", "1", "yes")
    print(f"Starting SmartCart AI Flask API server on http://{host}:{port} (debug={debug})")
    app.run(host=host, port=port, debug=debug)
