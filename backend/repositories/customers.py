from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from core.pagination import QueryOptions
from repositories.base import BaseRepository, fetch_all

SELECT_CUSTOMER = """
SELECT customers.*,
       owner.name AS owner_name,
       (SELECT COUNT(*) FROM deals WHERE deals.customer_id = customers.id AND deals.deleted_at IS NULL) AS deal_count,
       (SELECT COALESCE(SUM(value), 0) FROM deals WHERE deals.customer_id = customers.id AND deals.deleted_at IS NULL) AS deal_value
FROM customers
LEFT JOIN users AS owner ON owner.id = customers.owner_id
"""


class CustomerRepository(BaseRepository):
    table = "customers"
    soft_delete = True
    columns = ("lead_id", "name", "email", "phone", "company", "status", "revenue", "churn_probability", "owner_id")
    sortable = ("updated_at", "created_at", "name", "company", "revenue", "status")
    searchable = ("name", "email", "company")

    FILTERS = {
        "status": "customers.status = ?",
        "owner_id": "customers.owner_id = ?",
    }

    def get_detailed(self, customer_id: int) -> Optional[Dict[str, Any]]:
        rows = fetch_all(self.connection, f"{SELECT_CUSTOMER} WHERE customers.id = ? AND customers.deleted_at IS NULL", (customer_id,))
        return rows[0] if rows else None

    def search(self, options: QueryOptions, owner_scope: Optional[int] = None) -> Tuple[List[Dict[str, Any]], int]:
        params: List[Any] = []
        clause = " WHERE customers.deleted_at IS NULL"
        for key, fragment in self.FILTERS.items():
            if key in options.filters:
                clause += f" AND {fragment}"
                params.append(options.filters[key])
        if owner_scope is not None:
            clause += " AND customers.owner_id = ?"
            params.append(owner_scope)
        clause += self._search_clause(options.search, params)

        total = self.connection.execute(f"SELECT COUNT(*) AS total FROM customers{clause}", tuple(params)).fetchone()["total"]
        order = self._order_clause(options.sort_by, options.sort_dir)
        rows = fetch_all(
            self.connection,
            f"{SELECT_CUSTOMER}{clause}{order} LIMIT ? OFFSET ?",
            (*params, options.page_size, options.offset),
        )
        return rows, int(total)

    def get_by_lead(self, lead_id: int) -> Optional[Dict[str, Any]]:
        row = self.connection.execute(
            "SELECT * FROM customers WHERE lead_id = ? AND deleted_at IS NULL", (lead_id,)
        ).fetchone()
        return dict(row) if row else None
