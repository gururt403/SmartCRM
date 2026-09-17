-- SmartCRM relational schema.
-- Conventions: snake_case names, integer surrogate PKs, UTC ISO-8601 timestamps,
-- created_at/updated_at on every mutable table, soft deletes via deleted_at.

CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL,
    email           TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    password_hash   TEXT    NOT NULL,
    role            TEXT    NOT NULL DEFAULT 'salesperson'
                            CHECK (role IN ('admin', 'manager', 'salesperson')),
    is_active       INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    last_login_at   TEXT,
    created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS pipeline_stages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    key         TEXT    NOT NULL UNIQUE,
    name        TEXT    NOT NULL,
    position    INTEGER NOT NULL,
    probability REAL    NOT NULL DEFAULT 0 CHECK (probability BETWEEN 0 AND 1),
    is_won      INTEGER NOT NULL DEFAULT 0 CHECK (is_won IN (0, 1)),
    is_lost     INTEGER NOT NULL DEFAULT 0 CHECK (is_lost IN (0, 1)),
    created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS leads (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    name                    TEXT    NOT NULL,
    email                   TEXT    NOT NULL COLLATE NOCASE,
    phone                   TEXT,
    company                 TEXT    NOT NULL,
    company_type            TEXT    NOT NULL DEFAULT 'SMB'
                                    CHECK (company_type IN ('Startup', 'SMB', 'Mid-Market', 'Enterprise')),
    lead_source             TEXT    NOT NULL DEFAULT 'Website',
    status                  TEXT    NOT NULL DEFAULT 'New'
                                    CHECK (status IN ('New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Converted', 'Lost')),
    priority                TEXT    NOT NULL DEFAULT 'Medium'
                                    CHECK (priority IN ('Low', 'Medium', 'High')),
    budget                  REAL    NOT NULL DEFAULT 0 CHECK (budget >= 0),
    follow_up_date          TEXT,
    last_contact_date       TEXT,
    interaction_count       INTEGER NOT NULL DEFAULT 0 CHECK (interaction_count >= 0),
    response_rate           REAL    NOT NULL DEFAULT 0 CHECK (response_rate BETWEEN 0 AND 1),
    previous_purchases      INTEGER NOT NULL DEFAULT 0 CHECK (previous_purchases >= 0),
    sentiment_label         TEXT    NOT NULL DEFAULT 'Neutral'
                                    CHECK (sentiment_label IN ('Positive', 'Neutral', 'Negative')),
    sentiment_score         REAL    NOT NULL DEFAULT 0,
    churn_probability       REAL    NOT NULL DEFAULT 0 CHECK (churn_probability BETWEEN 0 AND 1),
    conversion_probability  REAL    NOT NULL DEFAULT 0 CHECK (conversion_probability BETWEEN 0 AND 1),
    owner_id                INTEGER REFERENCES users (id) ON DELETE SET NULL,
    created_by              INTEGER REFERENCES users (id) ON DELETE SET NULL,
    created_at              TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at              TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    deleted_at              TEXT
);

CREATE TABLE IF NOT EXISTS customers (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id             INTEGER UNIQUE REFERENCES leads (id) ON DELETE SET NULL,
    name                TEXT    NOT NULL,
    email               TEXT    NOT NULL COLLATE NOCASE,
    phone               TEXT,
    company             TEXT    NOT NULL,
    status              TEXT    NOT NULL DEFAULT 'Active'
                                CHECK (status IN ('Active', 'At Risk', 'Churned')),
    revenue             REAL    NOT NULL DEFAULT 0 CHECK (revenue >= 0),
    churn_probability   REAL    NOT NULL DEFAULT 0 CHECK (churn_probability BETWEEN 0 AND 1),
    owner_id            INTEGER REFERENCES users (id) ON DELETE SET NULL,
    created_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    deleted_at          TEXT
);

CREATE TABLE IF NOT EXISTS deals (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    title               TEXT    NOT NULL,
    customer_id         INTEGER REFERENCES customers (id) ON DELETE CASCADE,
    lead_id             INTEGER REFERENCES leads (id) ON DELETE SET NULL,
    stage_id            INTEGER NOT NULL REFERENCES pipeline_stages (id) ON DELETE RESTRICT,
    value               REAL    NOT NULL DEFAULT 0 CHECK (value >= 0),
    currency            TEXT    NOT NULL DEFAULT 'USD',
    probability         REAL    NOT NULL DEFAULT 0 CHECK (probability BETWEEN 0 AND 1),
    expected_close_date TEXT,
    closed_at           TEXT,
    owner_id            INTEGER REFERENCES users (id) ON DELETE SET NULL,
    created_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    deleted_at          TEXT
);

CREATE TABLE IF NOT EXISTS activities (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    type        TEXT    NOT NULL CHECK (type IN ('Call', 'Email', 'Meeting', 'Note', 'Task')),
    subject     TEXT    NOT NULL,
    notes       TEXT,
    occurred_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    lead_id     INTEGER REFERENCES leads (id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES customers (id) ON DELETE CASCADE,
    deal_id     INTEGER REFERENCES deals (id) ON DELETE CASCADE,
    user_id     INTEGER REFERENCES users (id) ON DELETE SET NULL,
    created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    CHECK (lead_id IS NOT NULL OR customer_id IS NOT NULL OR deal_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS tasks (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    title        TEXT    NOT NULL,
    description  TEXT,
    status       TEXT    NOT NULL DEFAULT 'Open'
                         CHECK (status IN ('Open', 'In Progress', 'Done', 'Cancelled')),
    priority     TEXT    NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
    due_date     TEXT,
    completed_at TEXT,
    assigned_to  INTEGER REFERENCES users (id) ON DELETE SET NULL,
    lead_id      INTEGER REFERENCES leads (id) ON DELETE CASCADE,
    customer_id  INTEGER REFERENCES customers (id) ON DELETE CASCADE,
    deal_id      INTEGER REFERENCES deals (id) ON DELETE CASCADE,
    created_by   INTEGER REFERENCES users (id) ON DELETE SET NULL,
    created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS notes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    body        TEXT    NOT NULL,
    lead_id     INTEGER REFERENCES leads (id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES customers (id) ON DELETE CASCADE,
    deal_id     INTEGER REFERENCES deals (id) ON DELETE CASCADE,
    author_id   INTEGER REFERENCES users (id) ON DELETE SET NULL,
    created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    CHECK (lead_id IS NOT NULL OR customer_id IS NOT NULL OR deal_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS predictions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    prediction_type TEXT    NOT NULL CHECK (prediction_type IN ('lead_scoring', 'churn', 'sentiment', 'email_suggestions')),
    input_data      TEXT    NOT NULL,
    result_data     TEXT    NOT NULL,
    lead_id         INTEGER REFERENCES leads (id) ON DELETE CASCADE,
    user_id         INTEGER REFERENCES users (id) ON DELETE SET NULL,
    created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER REFERENCES users (id) ON DELETE SET NULL,
    action      TEXT    NOT NULL,
    entity_type TEXT    NOT NULL,
    entity_id   INTEGER,
    changes     TEXT,
    ip_address  TEXT,
    created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
