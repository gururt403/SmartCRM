"""Dashboard metrics.

Every number here is computed from the database — there are no placeholder or
demo statistics. Metrics respect the caller's visibility scope.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from core.security import is_privileged
from database.db import db_session
from repositories.base import fetch_all, scalar
from repositories.engagement import ActivityRepository, PredictionRepository


def _scope_clause(column: str, user: Dict[str, Any], params: List[Any]) -> str:
    if is_privileged(user):
        return ""
    params.append(user["user_id"])
    return f" AND {column} = ?"


def summary(user: Dict[str, Any]) -> Dict[str, Any]:
    with db_session() as connection:
        lead_params: List[Any] = []
        lead_scope = _scope_clause("owner_id", user, lead_params)
        customer_params: List[Any] = []
        customer_scope = _scope_clause("owner_id", user, customer_params)
        deal_params: List[Any] = []
        deal_scope = _scope_clause("deals.owner_id", user, deal_params)
        task_params: List[Any] = []
        task_scope = _scope_clause("assigned_to", user, task_params)

        total_leads = scalar(connection, f"SELECT COUNT(*) FROM leads WHERE deleted_at IS NULL{lead_scope}", lead_params)
        open_leads = scalar(
            connection,
            f"SELECT COUNT(*) FROM leads WHERE deleted_at IS NULL AND status NOT IN ('Converted', 'Lost'){lead_scope}",
            lead_params,
        )
        converted_leads = scalar(
            connection,
            f"SELECT COUNT(*) FROM leads WHERE deleted_at IS NULL AND status = 'Converted'{lead_scope}",
            lead_params,
        )
        active_customers = scalar(
            connection,
            f"SELECT COUNT(*) FROM customers WHERE deleted_at IS NULL AND status = 'Active'{customer_scope}",
            customer_params,
        )
        revenue = scalar(
            connection,
            f"SELECT COALESCE(SUM(revenue), 0) FROM customers WHERE deleted_at IS NULL{customer_scope}",
            customer_params,
        )
        open_deals = scalar(
            connection,
            f"""SELECT COUNT(*) FROM deals JOIN pipeline_stages AS s ON s.id = deals.stage_id
                WHERE deals.deleted_at IS NULL AND s.is_won = 0 AND s.is_lost = 0{deal_scope}""",
            deal_params,
        )
        pipeline_value = scalar(
            connection,
            f"""SELECT COALESCE(SUM(deals.value), 0) FROM deals JOIN pipeline_stages AS s ON s.id = deals.stage_id
                WHERE deals.deleted_at IS NULL AND s.is_won = 0 AND s.is_lost = 0{deal_scope}""",
            deal_params,
        )
        weighted_pipeline = scalar(
            connection,
            f"""SELECT COALESCE(SUM(deals.value * deals.probability), 0) FROM deals JOIN pipeline_stages AS s ON s.id = deals.stage_id
                WHERE deals.deleted_at IS NULL AND s.is_won = 0 AND s.is_lost = 0{deal_scope}""",
            deal_params,
        )
        won_deals = scalar(
            connection,
            f"""SELECT COUNT(*) FROM deals JOIN pipeline_stages AS s ON s.id = deals.stage_id
                WHERE deals.deleted_at IS NULL AND s.is_won = 1{deal_scope}""",
            deal_params,
        )
        won_value = scalar(
            connection,
            f"""SELECT COALESCE(SUM(deals.value), 0) FROM deals JOIN pipeline_stages AS s ON s.id = deals.stage_id
                WHERE deals.deleted_at IS NULL AND s.is_won = 1{deal_scope}""",
            deal_params,
        )
        pending_tasks = scalar(
            connection,
            f"SELECT COUNT(*) FROM tasks WHERE status IN ('Open', 'In Progress'){task_scope}",
            task_params,
        )
        overdue_tasks = scalar(
            connection,
            f"""SELECT COUNT(*) FROM tasks WHERE status IN ('Open', 'In Progress')
                AND due_date IS NOT NULL AND due_date < date('now'){task_scope}""",
            task_params,
        )

        lead_sources = fetch_all(
            connection,
            f"""SELECT lead_source AS name, COUNT(*) AS value FROM leads
                WHERE deleted_at IS NULL{lead_scope} GROUP BY lead_source ORDER BY value DESC""",
            lead_params,
        )
        lead_status = fetch_all(
            connection,
            f"""SELECT status AS name, COUNT(*) AS value, COALESCE(SUM(budget), 0) AS budget
                FROM leads WHERE deleted_at IS NULL{lead_scope} GROUP BY status""",
            lead_params,
        )
        leads_over_time = fetch_all(
            connection,
            f"""SELECT substr(created_at, 1, 7) AS month, COUNT(*) AS leads,
                       SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END) AS converted
                FROM leads WHERE deleted_at IS NULL{lead_scope}
                GROUP BY month ORDER BY month ASC LIMIT 24""",
            lead_params,
        )
        revenue_over_time = fetch_all(
            connection,
            f"""SELECT substr(COALESCE(deals.closed_at, deals.created_at), 1, 7) AS month,
                       COALESCE(SUM(deals.value), 0) AS revenue
                FROM deals JOIN pipeline_stages AS s ON s.id = deals.stage_id
                WHERE deals.deleted_at IS NULL AND s.is_won = 1{deal_scope}
                GROUP BY month ORDER BY month ASC LIMIT 24""",
            deal_params,
        )
        pipeline_by_stage = fetch_all(
            connection,
            f"""SELECT s.name AS name, s.position, COUNT(deals.id) AS count,
                       COALESCE(SUM(deals.value), 0) AS value
                FROM pipeline_stages AS s
                LEFT JOIN deals ON deals.stage_id = s.id AND deals.deleted_at IS NULL{deal_scope}
                GROUP BY s.id ORDER BY s.position ASC""",
            deal_params,
        )

        conversion_rate = round(converted_leads / total_leads, 4) if total_leads else 0.0

        return {
            "kpis": {
                "total_leads": int(total_leads),
                "open_leads": int(open_leads),
                "converted_leads": int(converted_leads),
                "active_customers": int(active_customers),
                "open_deals": int(open_deals),
                "won_deals": int(won_deals),
                "pending_tasks": int(pending_tasks),
                "overdue_tasks": int(overdue_tasks),
                "revenue": round(float(revenue), 2),
                "won_value": round(float(won_value), 2),
                "pipeline_value": round(float(pipeline_value), 2),
                "weighted_pipeline_value": round(float(weighted_pipeline), 2),
                "conversion_rate": conversion_rate,
            },
            "lead_sources": lead_sources,
            "lead_status": lead_status,
            "leads_over_time": leads_over_time,
            "revenue_over_time": revenue_over_time,
            "pipeline_by_stage": pipeline_by_stage,
            "activity_trend": ActivityRepository(connection).daily_counts(30),
        }


def analytics(user: Dict[str, Any]) -> Dict[str, Any]:
    with db_session() as connection:
        params: List[Any] = []
        scope = _scope_clause("owner_id", user, params)
        base = f"FROM leads WHERE deleted_at IS NULL{scope}"

        return {
            "average_conversion_probability": round(float(scalar(connection, f"SELECT COALESCE(AVG(conversion_probability), 0) {base}", params)), 4),
            "average_churn_probability": round(float(scalar(connection, f"SELECT COALESCE(AVG(churn_probability), 0) {base}", params)), 4),
            "high_conversion_leads": int(scalar(connection, f"SELECT COUNT(*) {base} AND conversion_probability >= 0.7", params)),
            "high_churn_leads": int(scalar(connection, f"SELECT COUNT(*) {base} AND churn_probability >= 0.7", params)),
            "sentiment_breakdown": fetch_all(
                connection,
                f"SELECT sentiment_label AS name, COUNT(*) AS value {base} GROUP BY sentiment_label",
                params,
            ),
            "prediction_mix": [
                {"name": row["prediction_type"], "value": row["count"]}
                for row in PredictionRepository(connection).type_counts()
            ],
            "top_leads": fetch_all(
                connection,
                f"""SELECT id, name, company, budget, status, conversion_probability, churn_probability
                    {base} AND status NOT IN ('Converted', 'Lost')
                    ORDER BY conversion_probability DESC, budget DESC LIMIT 5""",
                params,
            ),
            "at_risk_leads": fetch_all(
                connection,
                f"""SELECT id, name, company, budget, status, churn_probability
                    {base} AND churn_probability >= 0.5 ORDER BY churn_probability DESC LIMIT 5""",
                params,
            ),
        }
