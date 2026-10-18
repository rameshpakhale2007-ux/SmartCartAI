from datetime import datetime
from app.services.alert_service import AlertService

def run_price_monitor_job(app=None):
    """
    Background price monitoring job that evaluates active target-price alerts.
    Can be scheduled via APScheduler or triggered manually via /api/alerts/check.
    """
    if app:
        with app.app_context():
            print(f"[{datetime.utcnow().isoformat()}] Starting scheduled price monitor scan...")
            summary = AlertService.evaluate_alerts()
            print(f"[{datetime.utcnow().isoformat()}] Price monitor finished: {summary['evaluated_count']} evaluated, {summary['triggered_count']} triggered.")
            return summary
    else:
        return AlertService.evaluate_alerts()
