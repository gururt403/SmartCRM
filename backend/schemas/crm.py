"""Request schemas for every write endpoint (single source of truth for the
allowed fields, which is what stops mass assignment)."""

from __future__ import annotations

from schemas.fields import Field

LEAD_STATUSES = ("New", "Contacted", "Qualified", "Proposal", "Negotiation", "Converted", "Lost")
LEAD_PRIORITIES = ("Low", "Medium", "High")
COMPANY_TYPES = ("Startup", "SMB", "Mid-Market", "Enterprise")
LEAD_SOURCES = ("Website", "LinkedIn", "Referral", "Instagram", "Event", "Cold Call", "Other")
SENTIMENTS = ("Positive", "Neutral", "Negative")
CUSTOMER_STATUSES = ("Active", "At Risk", "Churned")
ACTIVITY_TYPES = ("Call", "Email", "Meeting", "Note", "Task")
TASK_STATUSES = ("Open", "In Progress", "Done", "Cancelled")
USER_ROLES = ("admin", "manager", "salesperson")

#: Lead status transitions the API accepts. Closed states are terminal.
LEAD_TRANSITIONS = {
    "New": {"New", "Contacted", "Qualified", "Lost"},
    "Contacted": {"Contacted", "Qualified", "Proposal", "Lost"},
    "Qualified": {"Qualified", "Proposal", "Negotiation", "Lost"},
    "Proposal": {"Proposal", "Negotiation", "Converted", "Lost"},
    "Negotiation": {"Negotiation", "Proposal", "Converted", "Lost"},
    "Converted": {"Converted"},
    "Lost": {"Lost", "Contacted"},
}

REGISTER_SCHEMA = {
    "name": Field("string", required=True, min_length=2, max_length=120),
    "email": Field("email", required=True),
    "password": Field("string", required=True, min_length=8, max_length=128, strip=False),
}

LOGIN_SCHEMA = {
    "email": Field("email", required=True),
    "password": Field("string", required=True, min_length=1, strip=False),
}

CHANGE_PASSWORD_SCHEMA = {
    "current_password": Field("string", required=True, strip=False),
    "new_password": Field("string", required=True, min_length=8, max_length=128, strip=False),
}

LEAD_SCHEMA = {
    "name": Field("string", required=True, min_length=2, max_length=120),
    "email": Field("email", required=True),
    "phone": Field("phone", default="", nullable=True),
    "company": Field("string", required=True, min_length=1, max_length=160),
    "company_type": Field("string", choices=COMPANY_TYPES, default="SMB"),
    "lead_source": Field("string", choices=LEAD_SOURCES, default="Website"),
    "status": Field("string", choices=LEAD_STATUSES, default="New"),
    "priority": Field("string", choices=LEAD_PRIORITIES, default="Medium"),
    "budget": Field("float", minimum=0, maximum=1_000_000_000, default=0.0),
    "follow_up_date": Field("date", nullable=True, default=None),
    "last_contact_date": Field("date", nullable=True, default=None),
    "interaction_count": Field("int", minimum=0, maximum=100_000, default=0),
    "response_rate": Field("float", minimum=0, maximum=1, default=0.0),
    "previous_purchases": Field("int", minimum=0, maximum=100_000, default=0),
    "sentiment_label": Field("string", choices=SENTIMENTS, default="Neutral"),
    "owner_id": Field("int", minimum=1, nullable=True, default=None),
}

CUSTOMER_SCHEMA = {
    "name": Field("string", required=True, min_length=2, max_length=120),
    "email": Field("email", required=True),
    "phone": Field("phone", default="", nullable=True),
    "company": Field("string", required=True, min_length=1, max_length=160),
    "status": Field("string", choices=CUSTOMER_STATUSES, default="Active"),
    "revenue": Field("float", minimum=0, default=0.0),
    "owner_id": Field("int", minimum=1, nullable=True, default=None),
}

DEAL_SCHEMA = {
    "title": Field("string", required=True, min_length=2, max_length=160),
    "customer_id": Field("int", minimum=1, nullable=True, default=None),
    "lead_id": Field("int", minimum=1, nullable=True, default=None),
    "stage_key": Field("string", required=True, min_length=1, max_length=40),
    "value": Field("float", minimum=0, default=0.0),
    "currency": Field("string", max_length=3, default="USD"),
    "expected_close_date": Field("date", nullable=True, default=None),
    "owner_id": Field("int", minimum=1, nullable=True, default=None),
}

DEAL_STAGE_SCHEMA = {
    "stage_key": Field("string", required=True, min_length=1, max_length=40),
}

ACTIVITY_SCHEMA = {
    "type": Field("string", required=True, choices=ACTIVITY_TYPES),
    "subject": Field("string", required=True, min_length=2, max_length=200),
    "notes": Field("string", max_length=5000, default="", nullable=True),
    "occurred_at": Field("datetime", nullable=True, default=None),
    "lead_id": Field("int", minimum=1, nullable=True, default=None),
    "customer_id": Field("int", minimum=1, nullable=True, default=None),
    "deal_id": Field("int", minimum=1, nullable=True, default=None),
}

TASK_SCHEMA = {
    "title": Field("string", required=True, min_length=2, max_length=200),
    "description": Field("string", max_length=5000, default="", nullable=True),
    "status": Field("string", choices=TASK_STATUSES, default="Open"),
    "priority": Field("string", choices=LEAD_PRIORITIES, default="Medium"),
    "due_date": Field("date", nullable=True, default=None),
    "assigned_to": Field("int", minimum=1, nullable=True, default=None),
    "lead_id": Field("int", minimum=1, nullable=True, default=None),
    "customer_id": Field("int", minimum=1, nullable=True, default=None),
    "deal_id": Field("int", minimum=1, nullable=True, default=None),
}

NOTE_SCHEMA = {
    "body": Field("string", required=True, min_length=1, max_length=10000),
    "lead_id": Field("int", minimum=1, nullable=True, default=None),
    "customer_id": Field("int", minimum=1, nullable=True, default=None),
    "deal_id": Field("int", minimum=1, nullable=True, default=None),
}

LEAD_SCORE_SCHEMA = {
    "lead_id": Field("int", minimum=1, nullable=True, default=None),
    "budget": Field("float", minimum=0, default=0.0),
    "interaction_count": Field("int", minimum=0, default=0),
    "company_type": Field("string", choices=COMPANY_TYPES, default="SMB"),
    "response_rate": Field("float", minimum=0, maximum=1, default=0.0),
    "previous_purchases": Field("int", minimum=0, default=0),
}

CHURN_SCHEMA = {
    "lead_id": Field("int", minimum=1, nullable=True, default=None),
    "engagement_score": Field("float", minimum=0, maximum=1, default=0.5),
    "support_tickets": Field("int", minimum=0, default=0),
    "days_since_last_purchase": Field("int", minimum=0, default=0),
}

SENTIMENT_SCHEMA = {
    "lead_id": Field("int", minimum=1, nullable=True, default=None),
    "text": Field("string", required=True, min_length=1, max_length=5000),
}

EMAIL_SUGGESTION_SCHEMA = {
    "lead_id": Field("int", minimum=1, nullable=True, default=None),
    "message": Field("string", required=True, min_length=1, max_length=5000),
}
