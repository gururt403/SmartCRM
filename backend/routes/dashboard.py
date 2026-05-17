from collections import defaultdict
from datetime import datetime

from flask import Blueprint, jsonify

from database.db import get_connection
from routes.helpers import login_required

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")


@dashboard_bp.get("/summary")
@login_required
def summary():
    with get_connection() as connection:
        total_leads = connection.execute("SELECT COUNT(*) AS count FROM leads").fetchone()["count"]
        converted_leads = connection.execute(
            "SELECT COUNT(*) AS count FROM leads WHERE LOWER(status) = 'converted'"
        ).fetchone()["count"]
        revenue = connection.execute("SELECT COALESCE(SUM(revenue), 0) AS total FROM customers").fetchone()["total"]
        lead_sources = connection.execute(
            "SELECT COALESCE(lead_source, 'Unknown') AS source, COUNT(*) AS count FROM leads GROUP BY COALESCE(lead_source, 'Unknown') ORDER BY count DESC"
        ).fetchall()
        status_rows = connection.execute("SELECT status, COUNT(*) AS count FROM leads GROUP BY status").fetchall()
        prediction_rows = connection.execute(
            "SELECT prediction_type, COUNT(*) AS count FROM predictions GROUP BY prediction_type"
        ).fetchall()
        monthly_rows = connection.execute(
            "SELECT created_at, budget, status FROM leads ORDER BY created_at ASC"
        ).fetchall()

    monthly_sales = defaultdict(float)
    for row in monthly_rows:
        created_at = row["created_at"] or ""
        month_label = created_at[:7] if len(created_at) >= 7 else "2026-05"
        monthly_sales[month_label] += float(row["budget"] or 0)

    return jsonify(
        {
            "totals": {
                "leads": total_leads,
                "converted_leads": converted_leads,
                "revenue": round(float(revenue or 0), 2),
            },
            "lead_sources": [{"name": row["source"], "value": row["count"]} for row in lead_sources],
            "lead_status": [{"name": row["status"], "value": row["count"]} for row in status_rows],
            "prediction_mix": [{"name": row["prediction_type"], "value": row["count"]} for row in prediction_rows],
            "monthly_sales": [
                {"month": month, "revenue": round(amount, 2)}
                for month, amount in sorted(monthly_sales.items())
            ],
        }
    ), 200


@dashboard_bp.get("/analytics")
@login_required
def analytics():
    with get_connection() as connection:
        avg_conversion = connection.execute("SELECT COALESCE(AVG(conversion_probability), 0) AS avg_score FROM leads").fetchone()["avg_score"]
        avg_churn = connection.execute("SELECT COALESCE(AVG(churn_probability), 0) AS avg_score FROM leads").fetchone()["avg_score"]
        high_conversion = connection.execute(
            "SELECT COUNT(*) AS count FROM leads WHERE conversion_probability >= 0.7"
        ).fetchone()["count"]
        high_churn = connection.execute(
            "SELECT COUNT(*) AS count FROM leads WHERE churn_probability >= 0.7"
        ).fetchone()["count"]

    return jsonify(
        {
            "average_conversion_probability": round(float(avg_conversion or 0), 4),
            "average_churn_probability": round(float(avg_churn or 0), 4),
            "high_conversion_leads": high_conversion,
            "high_churn_leads": high_churn,
        }
    ), 200
