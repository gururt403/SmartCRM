"""SQLite connection handling, transactions and the migration runner."""

from __future__ import annotations

import logging
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional

from config import settings

logger = logging.getLogger(__name__)

MIGRATIONS_DIR = Path(__file__).resolve().parent / "migrations"


def database_path() -> Path:
    return Path(settings.DATABASE_PATH)


def now_iso() -> str:
    """UTC, second precision, ISO-8601 with an explicit Z."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def today_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def get_connection() -> sqlite3.Connection:
    path = database_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path, timeout=10, isolation_level=None)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA journal_mode = WAL")
    connection.execute("PRAGMA busy_timeout = 5000")
    return connection


@contextmanager
def db_session(write: bool = False) -> Iterator[sqlite3.Connection]:
    """Yield a connection. When ``write`` is set the block runs in a single
    transaction that commits on success and rolls back on any exception."""
    connection = get_connection()
    try:
        if write:
            connection.execute("BEGIN IMMEDIATE")
        yield connection
        if write:
            connection.execute("COMMIT")
    except Exception:
        if write:
            try:
                connection.execute("ROLLBACK")
            except sqlite3.Error:  # pragma: no cover - rollback on a dead conn
                pass
        raise
    finally:
        connection.close()


def row_to_dict(row: Optional[sqlite3.Row]) -> Optional[Dict[str, Any]]:
    return dict(row) if row is not None else None


def rows_to_dicts(rows) -> List[Dict[str, Any]]:
    return [dict(row) for row in rows]


def run_migrations() -> List[str]:
    """Apply every unapplied .sql file in migrations/, in filename order."""
    applied: List[str] = []
    with db_session() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version    TEXT PRIMARY KEY,
                applied_at TEXT NOT NULL
            )
            """
        )
        done = {row["version"] for row in connection.execute("SELECT version FROM schema_migrations")}
        for script in sorted(MIGRATIONS_DIR.glob("*.sql")):
            if script.name in done:
                continue
            connection.executescript(f"BEGIN;\n{script.read_text(encoding='utf-8')}\nCOMMIT;")
            connection.execute(
                "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
                (script.name, now_iso()),
            )
            applied.append(script.name)
            logger.info("Applied migration %s", script.name)
    return applied
