from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from core.pagination import QueryOptions
from repositories.base import BaseRepository, fetch_all

SELECT_LEAD = """
SELECT leads.*, owner.name AS owner_name, owner.email AS owner_email
FROM leads
LEFT JOIN users AS owner ON owner.id = leads.owner_id
"""


class LeadRepository(BaseRepository):
    table = "leads"
    soft_delete = True
    columns = (
        "name", "email", "phone", "company", "company_type", "lead_source", "status", "priority",
        "budget", "follow_up_date", "last_contact_date", "interaction_count", "response_rate",
        "previous_purchases", "sentiment_label", "sentiment_score", "churn_probability",
        "conversion_probability", "owner_id", "created_by",
    )
    sortable = ("updated_at", "created_at", "name", "company", "budget", "status", "priority", "follow_up_date", "conversion_probability")
    searchable = ("name", "email", "company", "lead_source", "phone")

    #: filter key -> SQL fragment. Keys are fixed here, values stay bound.
    FILTERS = {
        "status": "leads.status = ?",
        "priority": "leads.priority = ?",
        "company_type": "leads.company_type = ?",
        "lead_source": "leads.lead_source = ?",
        "owner_id": "leads.owner_id = ?",
        "created_from": "leads.created_at >= ?",
        "created_to": "leads.created_at <= ?",
        "follow_up_before": "leads.follow_up_date <= ?",
        "min_budget": "leads.budget >= ?",
        "max_budget": "leads.budget <= ?",
    }

    def _where(self, options: QueryOptions, owner_scope: Optional[int]) -> Tuple[str, List[Any]]:
        params: List[Any] = []
        clause = " WHERE leads.deleted_at IS NULL"
        for key, fragment in self.FILTERS.items():
            if key in options.filters:
                clause += f" AND {fragment}"
                params.append(options.filters[key])
        if owner_scope is not None:
            clause += " AND leads.owner_id = ?"
            params.append(owner_scope)
        clause += self._search_clause(options.search, params)
        return clause, params

    def get_detailed(self, lead_id: int) -> Optional[Dict[str, Any]]:
        rows = fetch_all(self.connection, f"{SELECT_LEAD} WHERE leads.id = ? AND leads.deleted_at IS NULL", (lead_id,))
        return rows[0] if rows else None

    def search(self, options: QueryOptions, owner_scope: Optional[int] = None) -> Tuple[List[Dict[str, Any]], int]:
        clause, params = self._where(options, owner_scope)
        total = self.connection.execute(f"SELECT COUNT(*) AS total FROM leads{clause}", tuple(params)).fetchone()["total"]
        order = self._order_clause(options.sort_by, options.sort_dir)
        rows = fetch_all(
            self.connection,
            f"{SELECT_LEAD}{clause}{order} LIMIT ? OFFSET ?",
            (*params, options.page_size, options.offset),
        )
        return rows, int(total)

    def status_counts(self, owner_scope: Optional[int] = None) -> List[Dict[str, Any]]:
        clause = " WHERE deleted_at IS NULL"
        params: List[Any] = []
        if owner_scope is not None:
            clause += " AND owner_id = ?"
            params.append(owner_scope)
        return fetch_all(
            self.connection,
            f"SELECT status, COUNT(*) AS count, COALESCE(SUM(budget), 0) AS value FROM leads{clause} GROUP BY status",
            params,
        )

    def email_exists(self, email: str, exclude_id: Optional[int] = None) -> bool:
        sql = "SELECT id FROM leads WHERE email = ? COLLATE NOCASE AND deleted_at IS NULL"
        params: List[Any] = [email]
        if exclude_id:
            sql += " AND id != ?"
            params.append(exclude_id)
        return self.connection.execute(sql, tuple(params)).fetchone() is not None
