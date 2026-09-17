"""Shared SQL building blocks for the repositories.

All identifiers (table, column, sort keys) come from constants defined in the
repositories themselves and are never taken from user input; all *values* go
through bound parameters. That combination is what keeps the dynamic query
building here injection-safe.
"""

from __future__ import annotations

import sqlite3
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

from database.db import now_iso, rows_to_dicts


class BaseRepository:
    table: str = ""
    #: Columns that may be written through the API.
    columns: Tuple[str, ...] = ()
    #: Columns a client may sort by.
    sortable: Tuple[str, ...] = ("created_at",)
    #: Columns included in free-text search.
    searchable: Tuple[str, ...] = ()
    soft_delete: bool = False
    #: Whether the table carries an ``updated_at`` column.
    timestamps: bool = True

    def __init__(self, connection: sqlite3.Connection):
        self.connection = connection

    # -- helpers ---------------------------------------------------------
    def _active_clause(self) -> str:
        return f" AND {self.table}.deleted_at IS NULL" if self.soft_delete else ""

    def _search_clause(self, search: Optional[str], params: List[Any], alias: Optional[str] = None) -> str:
        if not search or not self.searchable:
            return ""
        prefix = alias or self.table
        parts = [f"{prefix}.{column} LIKE ? COLLATE NOCASE" for column in self.searchable]
        params.extend([f"%{search}%"] * len(self.searchable))
        return f" AND ({' OR '.join(parts)})"

    def _order_clause(self, sort_by: Optional[str], sort_dir: str, alias: Optional[str] = None) -> str:
        column = sort_by if sort_by in self.sortable else self.sortable[0]
        direction = "ASC" if sort_dir == "asc" else "DESC"
        prefix = alias or self.table
        return f" ORDER BY {prefix}.{column} {direction}, {prefix}.id {direction}"

    def _writable(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return {key: value for key, value in data.items() if key in self.columns}

    # -- CRUD ------------------------------------------------------------
    def get(self, record_id: int) -> Optional[Dict[str, Any]]:
        row = self.connection.execute(
            f"SELECT * FROM {self.table} WHERE id = ?{self._active_clause()}",
            (record_id,),
        ).fetchone()
        return dict(row) if row else None

    def insert(self, data: Dict[str, Any]) -> int:
        payload = self._writable(data)
        payload["created_at"] = data.get("created_at") or now_iso()
        if self.timestamps:
            payload["updated_at"] = data.get("updated_at") or payload["created_at"]
        columns = ", ".join(payload)
        placeholders = ", ".join("?" for _ in payload)
        cursor = self.connection.execute(
            f"INSERT INTO {self.table} ({columns}) VALUES ({placeholders})",
            tuple(payload.values()),
        )
        return int(cursor.lastrowid)

    def update(self, record_id: int, data: Dict[str, Any]) -> None:
        payload = self._writable(data)
        if not payload:
            return
        if self.timestamps:
            payload["updated_at"] = now_iso()
        assignments = ", ".join(f"{column} = ?" for column in payload)
        self.connection.execute(
            f"UPDATE {self.table} SET {assignments} WHERE id = ?",
            (*payload.values(), record_id),
        )

    def delete(self, record_id: int) -> None:
        if self.soft_delete:
            self.connection.execute(
                f"UPDATE {self.table} SET deleted_at = ?, updated_at = ? WHERE id = ?",
                (now_iso(), now_iso(), record_id),
            )
        else:
            self.connection.execute(f"DELETE FROM {self.table} WHERE id = ?", (record_id,))

    def count(self, where: str = "", params: Sequence[Any] = ()) -> int:
        clause = f" WHERE 1=1{self._active_clause()}{where}"
        row = self.connection.execute(f"SELECT COUNT(*) AS total FROM {self.table}{clause}", tuple(params)).fetchone()
        return int(row["total"])


def fetch_all(connection: sqlite3.Connection, sql: str, params: Iterable[Any] = ()) -> List[Dict[str, Any]]:
    return rows_to_dicts(connection.execute(sql, tuple(params)).fetchall())


def fetch_one(connection: sqlite3.Connection, sql: str, params: Iterable[Any] = ()) -> Optional[Dict[str, Any]]:
    row = connection.execute(sql, tuple(params)).fetchone()
    return dict(row) if row else None


def scalar(connection: sqlite3.Connection, sql: str, params: Iterable[Any] = (), default: Any = 0) -> Any:
    row = connection.execute(sql, tuple(params)).fetchone()
    if row is None:
        return default
    value = row[0]
    return default if value is None else value
