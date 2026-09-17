"""Activities, tasks, notes, predictions and audit logs."""

from __future__ import annotations

import json
from typing import Any, Dict, List, Optional, Tuple

from core.pagination import QueryOptions
from repositories.base import BaseRepository, fetch_all

SELECT_ACTIVITY = """
SELECT activities.*, users.name AS user_name
FROM activities
LEFT JOIN users ON users.id = activities.user_id
"""

SELECT_TASK = """
SELECT tasks.*, assignee.name AS assignee_name, leads.name AS lead_name, customers.name AS customer_name
FROM tasks
LEFT JOIN users AS assignee ON assignee.id = tasks.assigned_to
LEFT JOIN leads ON leads.id = tasks.lead_id
LEFT JOIN customers ON customers.id = tasks.customer_id
"""


def _relation_clause(prefix: str, lead_id=None, customer_id=None, deal_id=None) -> Tuple[str, List[Any]]:
    clauses, params = [], []
    for column, value in (("lead_id", lead_id), ("customer_id", customer_id), ("deal_id", deal_id)):
        if value is not None:
            clauses.append(f"{prefix}.{column} = ?")
            params.append(value)
    if not clauses:
        return "", params
    return " AND (" + " OR ".join(clauses) + ")", params


class ActivityRepository(BaseRepository):
    table = "activities"
    columns = ("type", "subject", "notes", "occurred_at", "lead_id", "customer_id", "deal_id", "user_id")
    sortable = ("occurred_at", "created_at")
    searchable = ("subject", "notes")

    def for_record(self, *, lead_id=None, customer_id=None, deal_id=None, limit: int = 50) -> List[Dict[str, Any]]:
        clause, params = _relation_clause("activities", lead_id, customer_id, deal_id)
        return fetch_all(
            self.connection,
            f"{SELECT_ACTIVITY} WHERE 1=1{clause} ORDER BY activities.occurred_at DESC LIMIT ?",
            (*params, limit),
        )

    def search(self, options: QueryOptions) -> Tuple[List[Dict[str, Any]], int]:
        params: List[Any] = []
        clause = " WHERE 1=1"
        for key in ("lead_id", "customer_id", "deal_id", "type", "user_id"):
            if key in options.filters:
                clause += f" AND activities.{key} = ?"
                params.append(options.filters[key])
        clause += self._search_clause(options.search, params)
        total = self.connection.execute(f"SELECT COUNT(*) AS total FROM activities{clause}", tuple(params)).fetchone()["total"]
        order = self._order_clause(options.sort_by, options.sort_dir)
        rows = fetch_all(self.connection, f"{SELECT_ACTIVITY}{clause}{order} LIMIT ? OFFSET ?", (*params, options.page_size, options.offset))
        return rows, int(total)

    def daily_counts(self, days: int = 30) -> List[Dict[str, Any]]:
        return fetch_all(
            self.connection,
            """
            SELECT substr(occurred_at, 1, 10) AS day, COUNT(*) AS count
            FROM activities
            WHERE occurred_at >= strftime('%Y-%m-%dT%H:%M:%SZ', 'now', ?)
            GROUP BY day ORDER BY day ASC
            """,
            (f"-{int(days)} days",),
        )


class TaskRepository(BaseRepository):
    table = "tasks"
    columns = ("title", "description", "status", "priority", "due_date", "completed_at",
               "assigned_to", "lead_id", "customer_id", "deal_id", "created_by")
    sortable = ("due_date", "created_at", "priority", "status", "title")
    searchable = ("title", "description")

    def search(self, options: QueryOptions, assignee_scope: Optional[int] = None) -> Tuple[List[Dict[str, Any]], int]:
        params: List[Any] = []
        clause = " WHERE 1=1"
        for key in ("status", "priority", "assigned_to", "lead_id", "customer_id", "deal_id"):
            if key in options.filters:
                clause += f" AND tasks.{key} = ?"
                params.append(options.filters[key])
        if "due_before" in options.filters:
            clause += " AND tasks.due_date <= ?"
            params.append(options.filters["due_before"])
        if assignee_scope is not None:
            clause += " AND tasks.assigned_to = ?"
            params.append(assignee_scope)
        clause += self._search_clause(options.search, params)

        total = self.connection.execute(f"SELECT COUNT(*) AS total FROM tasks{clause}", tuple(params)).fetchone()["total"]
        order = self._order_clause(options.sort_by, options.sort_dir)
        rows = fetch_all(self.connection, f"{SELECT_TASK}{clause}{order} LIMIT ? OFFSET ?", (*params, options.page_size, options.offset))
        return rows, int(total)

    def for_record(self, *, lead_id=None, customer_id=None, deal_id=None, limit: int = 50) -> List[Dict[str, Any]]:
        clause, params = _relation_clause("tasks", lead_id, customer_id, deal_id)
        return fetch_all(self.connection, f"{SELECT_TASK} WHERE 1=1{clause} ORDER BY tasks.due_date IS NULL, tasks.due_date ASC LIMIT ?", (*params, limit))


class NoteRepository(BaseRepository):
    table = "notes"
    columns = ("body", "lead_id", "customer_id", "deal_id", "author_id")
    sortable = ("created_at",)
    searchable = ("body",)

    def for_record(self, *, lead_id=None, customer_id=None, deal_id=None, limit: int = 50) -> List[Dict[str, Any]]:
        clause, params = _relation_clause("notes", lead_id, customer_id, deal_id)
        return fetch_all(
            self.connection,
            f"""
            SELECT notes.*, users.name AS author_name
            FROM notes LEFT JOIN users ON users.id = notes.author_id
            WHERE 1=1{clause} ORDER BY notes.created_at DESC LIMIT ?
            """,
            (*params, limit),
        )


class PredictionRepository(BaseRepository):
    table = "predictions"
    timestamps = False
    columns = ("prediction_type", "input_data", "result_data", "lead_id", "user_id")
    sortable = ("created_at",)

    def record(self, prediction_type: str, input_data: Dict[str, Any], result_data: Dict[str, Any],
               lead_id: Optional[int], user_id: Optional[int]) -> int:
        safe_input = {k: v for k, v in input_data.items() if k not in {"password", "token"}}
        return self.insert({
            "prediction_type": prediction_type,
            "input_data": json.dumps(safe_input, default=str),
            "result_data": json.dumps(result_data, default=str),
            "lead_id": lead_id,
            "user_id": user_id,
        })

    def type_counts(self) -> List[Dict[str, Any]]:
        return fetch_all(self.connection, "SELECT prediction_type, COUNT(*) AS count FROM predictions GROUP BY prediction_type")

    def recent(self, limit: int = 10) -> List[Dict[str, Any]]:
        return fetch_all(
            self.connection,
            """
            SELECT predictions.id, predictions.prediction_type, predictions.result_data, predictions.created_at,
                   leads.name AS lead_name
            FROM predictions LEFT JOIN leads ON leads.id = predictions.lead_id
            ORDER BY predictions.created_at DESC LIMIT ?
            """,
            (limit,),
        )


class AuditRepository(BaseRepository):
    table = "audit_logs"
    timestamps = False
    columns = ("user_id", "action", "entity_type", "entity_id", "changes", "ip_address")
    sortable = ("created_at",)

    def record(self, *, user_id: Optional[int], action: str, entity_type: str,
               entity_id: Optional[int], changes: Optional[Dict[str, Any]] = None,
               ip_address: Optional[str] = None) -> None:
        self.insert({
            "user_id": user_id,
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "changes": json.dumps(changes, default=str) if changes else None,
            "ip_address": ip_address,
        })
