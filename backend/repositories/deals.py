from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from core.pagination import QueryOptions
from repositories.base import BaseRepository, fetch_all, fetch_one

SELECT_DEAL = """
SELECT deals.*,
       stage.key AS stage_key, stage.name AS stage_name, stage.position AS stage_position,
       stage.is_won AS stage_is_won, stage.is_lost AS stage_is_lost,
       customer.name AS customer_name, customer.company AS customer_company,
       lead.name AS lead_name,
       owner.name AS owner_name
FROM deals
JOIN pipeline_stages AS stage ON stage.id = deals.stage_id
LEFT JOIN customers AS customer ON customer.id = deals.customer_id
LEFT JOIN leads AS lead ON lead.id = deals.lead_id
LEFT JOIN users AS owner ON owner.id = deals.owner_id
"""


class DealRepository(BaseRepository):
    table = "deals"
    soft_delete = True
    columns = ("title", "customer_id", "lead_id", "stage_id", "value", "currency", "probability",
               "expected_close_date", "closed_at", "owner_id")
    sortable = ("updated_at", "created_at", "value", "expected_close_date", "title")
    searchable = ("title",)

    FILTERS = {
        "stage_id": "deals.stage_id = ?",
        "owner_id": "deals.owner_id = ?",
        "customer_id": "deals.customer_id = ?",
        "close_from": "deals.expected_close_date >= ?",
        "close_to": "deals.expected_close_date <= ?",
    }

    def get_detailed(self, deal_id: int) -> Optional[Dict[str, Any]]:
        rows = fetch_all(self.connection, f"{SELECT_DEAL} WHERE deals.id = ? AND deals.deleted_at IS NULL", (deal_id,))
        return rows[0] if rows else None

    def search(self, options: QueryOptions, owner_scope: Optional[int] = None) -> Tuple[List[Dict[str, Any]], int]:
        params: List[Any] = []
        clause = " WHERE deals.deleted_at IS NULL"
        for key, fragment in self.FILTERS.items():
            if key in options.filters:
                clause += f" AND {fragment}"
                params.append(options.filters[key])
        if "stage_key" in options.filters:
            clause += " AND stage.key = ?"
            params.append(options.filters["stage_key"])
        if owner_scope is not None:
            clause += " AND deals.owner_id = ?"
            params.append(owner_scope)
        clause += self._search_clause(options.search, params)

        total = self.connection.execute(
            f"SELECT COUNT(*) AS total FROM deals JOIN pipeline_stages AS stage ON stage.id = deals.stage_id{clause}",
            tuple(params),
        ).fetchone()["total"]
        order = self._order_clause(options.sort_by, options.sort_dir)
        rows = fetch_all(self.connection, f"{SELECT_DEAL}{clause}{order} LIMIT ? OFFSET ?", (*params, options.page_size, options.offset))
        return rows, int(total)

    def pipeline(self, owner_scope: Optional[int] = None) -> List[Dict[str, Any]]:
        """Every stage with its deals, in one pass — no per-stage query loop."""
        params: List[Any] = []
        clause = ""
        if owner_scope is not None:
            clause = " AND deals.owner_id = ?"
            params.append(owner_scope)
        return fetch_all(
            self.connection,
            f"""
            SELECT stage.id AS stage_id, stage.key AS stage_key, stage.name AS stage_name,
                   stage.position AS stage_position, stage.is_won, stage.is_lost,
                   deals.id AS deal_id, deals.title, deals.value, deals.currency, deals.probability,
                   deals.expected_close_date, deals.updated_at,
                   customer.name AS customer_name, lead.name AS lead_name, owner.name AS owner_name
            FROM pipeline_stages AS stage
            LEFT JOIN deals ON deals.stage_id = stage.id AND deals.deleted_at IS NULL{clause}
            LEFT JOIN customers AS customer ON customer.id = deals.customer_id
            LEFT JOIN leads AS lead ON lead.id = deals.lead_id
            LEFT JOIN users AS owner ON owner.id = deals.owner_id
            ORDER BY stage.position ASC, deals.updated_at DESC
            """,
            params,
        )


class PipelineStageRepository(BaseRepository):
    table = "pipeline_stages"
    columns = ("key", "name", "position", "probability", "is_won", "is_lost")
    sortable = ("position",)

    def list_all(self) -> List[Dict[str, Any]]:
        return fetch_all(self.connection, "SELECT * FROM pipeline_stages ORDER BY position ASC")

    def get_by_key(self, key: str) -> Optional[Dict[str, Any]]:
        return fetch_one(self.connection, "SELECT * FROM pipeline_stages WHERE key = ?", (key,))
