"""Idempotent reference data and (optional) demo data.

Pipeline stages are reference data and are always ensured. Demo users/leads are
only inserted when ``SEED_DEMO_DATA`` is enabled and the tables are empty, so a
real deployment never gets fake records.
"""

from __future__ import annotations

import logging

from werkzeug.security import generate_password_hash

from config import settings
from database.db import db_session, now_iso

logger = logging.getLogger(__name__)

PIPELINE_STAGES = [
    ("new", "New", 1, 0.10, 0, 0),
    ("qualified", "Qualified", 2, 0.30, 0, 0),
    ("proposal", "Proposal", 3, 0.50, 0, 0),
    ("negotiation", "Negotiation", 4, 0.70, 0, 0),
    ("won", "Won", 5, 1.00, 1, 0),
    ("lost", "Lost", 6, 0.00, 0, 1),
]

DEMO_LEADS = [
    # name, email, phone, company, company_type, source, status, priority, budget, interactions, response_rate, purchases, sentiment, churn, conversion, days_ago
    ("Aarav Sharma", "aarav@techflow.io", "9000000011", "TechFlow", "Enterprise", "Website", "Negotiation", "High", 50000, 12, 0.68, 3, "Positive", 0.18, 0.72, 12),
    ("Neha Patel", "neha@retailpro.in", "9000000022", "RetailPro", "SMB", "LinkedIn", "Contacted", "Medium", 18000, 5, 0.45, 1, "Neutral", 0.41, 0.33, 26),
    ("Rohan Mehta", "rohan@finedge.com", "9000000033", "FinEdge", "Enterprise", "Referral", "Proposal", "High", 92000, 18, 0.83, 6, "Positive", 0.12, 0.88, 40),
    ("Sara Khan", "sara@studiospark.co", "9000000044", "StudioSpark", "Startup", "Instagram", "Lost", "Low", 12000, 3, 0.28, 0, "Negative", 0.64, 0.21, 55),
    ("Vikram Das", "vikram@medicore.com", "9000000055", "MediCore", "Mid-Market", "Website", "Converted", "High", 35000, 9, 0.77, 2, "Positive", 0.09, 0.91, 70),
    ("Priya Nair", "priya@urbanleaf.com", "9000000066", "UrbanLeaf", "SMB", "Event", "Qualified", "Medium", 24000, 7, 0.52, 1, "Neutral", 0.33, 0.47, 8),
    ("Imran Sheikh", "imran@northwind.io", "9000000077", "Northwind", "Mid-Market", "Cold Call", "New", "Low", 15000, 1, 0.12, 0, "Neutral", 0.48, 0.19, 3),
    ("Ananya Rao", "ananya@brightbyte.dev", "9000000088", "BrightByte", "Startup", "Referral", "Converted", "High", 41000, 14, 0.71, 4, "Positive", 0.15, 0.84, 95),
]


def ensure_pipeline_stages() -> None:
    with db_session(write=True) as connection:
        for key, name, position, probability, is_won, is_lost in PIPELINE_STAGES:
            connection.execute(
                """
                INSERT INTO pipeline_stages (key, name, position, probability, is_won, is_lost, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (key) DO UPDATE SET
                    name = excluded.name,
                    position = excluded.position,
                    probability = excluded.probability,
                    is_won = excluded.is_won,
                    is_lost = excluded.is_lost,
                    updated_at = excluded.updated_at
                """,
                (key, name, position, probability, is_won, is_lost, now_iso(), now_iso()),
            )


def seed_demo_data() -> None:
    if not settings.SEED_DEMO_DATA:
        return

    with db_session(write=True) as connection:
        if connection.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"] == 0:
            connection.execute(
                "INSERT INTO users (name, email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                ("Admin User", "admin@smartcrm.local", generate_password_hash(settings.DEMO_ADMIN_PASSWORD), "admin", now_iso(), now_iso()),
            )
            connection.execute(
                "INSERT INTO users (name, email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                ("Sales Demo", "sales@smartcrm.local", generate_password_hash(settings.DEMO_SALES_PASSWORD), "salesperson", now_iso(), now_iso()),
            )
            logger.info("Seeded demo users")

        if connection.execute("SELECT COUNT(*) AS c FROM leads").fetchone()["c"]:
            return

        owner = connection.execute("SELECT id FROM users ORDER BY id LIMIT 1").fetchone()
        owner_id = owner["id"] if owner else None

        for lead in DEMO_LEADS:
            (name, email, phone, company, company_type, source, status, priority, budget,
             interactions, response_rate, purchases, sentiment, churn, conversion, days_ago) = lead
            created_at = connection.execute(
                "SELECT strftime('%Y-%m-%dT%H:%M:%SZ', 'now', ?) AS ts", (f"-{days_ago} days",)
            ).fetchone()["ts"]
            cursor = connection.execute(
                """
                INSERT INTO leads (
                    name, email, phone, company, company_type, lead_source, status, priority, budget,
                    interaction_count, response_rate, previous_purchases, sentiment_label,
                    churn_probability, conversion_probability, owner_id, created_by, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (name, email, phone, company, company_type, source, status, priority, budget,
                 interactions, response_rate, purchases, sentiment, churn, conversion,
                 owner_id, owner_id, created_at, created_at),
            )
            lead_id = cursor.lastrowid
            connection.execute(
                """
                INSERT INTO activities (type, subject, notes, occurred_at, lead_id, user_id, created_at, updated_at)
                VALUES ('Call', ?, ?, ?, ?, ?, ?, ?)
                """,
                (f"Intro call with {name}", "Discussed requirements and budget.", created_at, lead_id, owner_id, created_at, created_at),
            )

            if status == "Converted":
                customer_cursor = connection.execute(
                    """
                    INSERT INTO customers (lead_id, name, email, phone, company, status, revenue, churn_probability, owner_id, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, 'Active', ?, ?, ?, ?, ?)
                    """,
                    (lead_id, name, email, phone, company, budget, churn, owner_id, created_at, created_at),
                )
                won_stage = connection.execute("SELECT id, probability FROM pipeline_stages WHERE key = 'won'").fetchone()
                connection.execute(
                    """
                    INSERT INTO deals (title, customer_id, lead_id, stage_id, value, probability, expected_close_date, closed_at, owner_id, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (f"{company} subscription", customer_cursor.lastrowid, lead_id, won_stage["id"], budget,
                     won_stage["probability"], created_at[:10], created_at, owner_id, created_at, created_at),
                )
            elif status in {"Qualified", "Proposal", "Negotiation"}:
                stage = connection.execute(
                    "SELECT id, probability FROM pipeline_stages WHERE key = ?", (status.lower(),)
                ).fetchone()
                connection.execute(
                    """
                    INSERT INTO deals (title, lead_id, stage_id, value, probability, expected_close_date, owner_id, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, date('now', '+21 days'), ?, ?, ?)
                    """,
                    (f"{company} opportunity", lead_id, stage["id"], budget, stage["probability"], owner_id, created_at, created_at),
                )
                connection.execute(
                    """
                    INSERT INTO tasks (title, description, status, priority, due_date, assigned_to, lead_id, created_by, created_at, updated_at)
                    VALUES (?, ?, 'Open', ?, date('now', '+3 days'), ?, ?, ?, ?, ?)
                    """,
                    (f"Follow up with {name}", "Send the updated proposal.", priority, owner_id, lead_id, owner_id, created_at, created_at),
                )
        logger.info("Seeded demo CRM data")
