import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from config import DATABASE_PATH

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'salesperson',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    company TEXT NOT NULL,
    budget REAL NOT NULL DEFAULT 0,
    lead_source TEXT,
    status TEXT NOT NULL DEFAULT 'New',
    last_contact_date TEXT,
    company_type TEXT DEFAULT 'SMB',
    interaction_count INTEGER NOT NULL DEFAULT 0,
    response_rate REAL NOT NULL DEFAULT 0,
    previous_purchases INTEGER NOT NULL DEFAULT 0,
    sentiment_label TEXT DEFAULT 'Neutral',
    churn_probability REAL DEFAULT 0,
    conversion_probability REAL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    name TEXT NOT NULL,
    email TEXT,
    company TEXT,
    revenue REAL DEFAULT 0,
    churn_probability REAL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (lead_id) REFERENCES leads (id)
);

CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    user_id INTEGER,
    prediction_type TEXT NOT NULL,
    input_data TEXT NOT NULL,
    result_data TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (lead_id) REFERENCES leads (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    user_id INTEGER,
    interaction_type TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (lead_id) REFERENCES leads (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
);
"""


def get_connection() -> sqlite3.Connection:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database() -> None:
    with get_connection() as connection:
        connection.executescript(SCHEMA_SQL)
        connection.commit()


def row_to_dict(row: Optional[sqlite3.Row]) -> Optional[Dict[str, Any]]:
    if row is None:
        return None
    return dict(row)


def rows_to_dicts(rows: List[sqlite3.Row]) -> List[Dict[str, Any]]:
    return [dict(row) for row in rows]


def now_iso() -> str:
    return datetime.utcnow().isoformat(timespec="seconds")


def seed_demo_data(password_hash_func) -> None:
    initialize_database()
    with get_connection() as connection:
        user_count = connection.execute("SELECT COUNT(*) AS count FROM users").fetchone()["count"]
        if user_count == 0:
            connection.execute(
                "INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)",
                (
                    "Admin User",
                    "admin@smartcrm.local",
                    password_hash_func("admin123"),
                    "admin",
                    now_iso(),
                ),
            )
            connection.execute(
                "INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)",
                (
                    "Sales Demo",
                    "sales@smartcrm.local",
                    password_hash_func("sales123"),
                    "salesperson",
                    now_iso(),
                ),
            )

        lead_count = connection.execute("SELECT COUNT(*) AS count FROM leads").fetchone()["count"]
        if lead_count == 0:
            sample_leads = [
                ("Aarav Sharma", "aarav@techflow.io", "9000000011", "TechFlow", 50000, "Website", "New", "2026-05-02", "Enterprise", 12, 0.68, 3, "Positive", 0.18, 0.72, "2026-05-02T10:15:00"),
                ("Neha Patel", "neha@retailpro.in", "9000000022", "RetailPro", 18000, "LinkedIn", "Contacted", "2026-04-18", "SMB", 5, 0.45, 1, "Neutral", 0.41, 0.33, "2026-04-18T09:05:00"),
                ("Rohan Mehta", "rohan@finedge.com", "9000000033", "FinEdge", 92000, "Referral", "Negotiation", "2026-03-21", "Enterprise", 18, 0.83, 6, "Positive", 0.12, 0.88, "2026-03-21T14:30:00"),
                ("Sara Khan", "sara@studiospark.co", "9000000044", "StudioSpark", 12000, "Instagram", "Lost", "2026-02-28", "Startup", 3, 0.28, 0, "Negative", 0.64, 0.21, "2026-02-28T11:45:00"),
                ("Vikram Das", "vikram@medicore.com", "9000000055", "MediCore", 35000, "Website", "Converted", "2026-01-11", "Mid-Market", 9, 0.77, 2, "Positive", 0.09, 0.91, "2026-01-11T16:10:00"),
            ]
            for lead in sample_leads:
                connection.execute(
                    """
                    INSERT INTO leads (
                        name, email, phone, company, budget, lead_source, status,
                        last_contact_date, company_type, interaction_count, response_rate,
                        previous_purchases, sentiment_label, churn_probability,
                        conversion_probability, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (*lead, lead[-1]),
                )

        customer_count = connection.execute("SELECT COUNT(*) AS count FROM customers").fetchone()["count"]
        if customer_count == 0:
            connection.execute(
                "INSERT INTO customers (lead_id, name, email, company, revenue, churn_probability, created_at) SELECT id, name, email, company, budget, churn_probability, created_at FROM leads WHERE status = 'Converted' LIMIT 3"
            )

        connection.commit()
