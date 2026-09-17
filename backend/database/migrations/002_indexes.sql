-- Indexes chosen from the queries the API actually runs: list filters
-- (status/owner/priority), sorts (created_at/updated_at), joins (foreign keys)
-- and lookups (email).

CREATE INDEX IF NOT EXISTS idx_leads_status            ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_owner             ON leads (owner_id);
CREATE INDEX IF NOT EXISTS idx_leads_email             ON leads (email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at        ON leads (created_at);
CREATE INDEX IF NOT EXISTS idx_leads_updated_at        ON leads (updated_at);
CREATE INDEX IF NOT EXISTS idx_leads_follow_up         ON leads (follow_up_date);
CREATE INDEX IF NOT EXISTS idx_leads_active_status     ON leads (deleted_at, status);

CREATE INDEX IF NOT EXISTS idx_customers_owner         ON customers (owner_id);
CREATE INDEX IF NOT EXISTS idx_customers_email         ON customers (email);
CREATE INDEX IF NOT EXISTS idx_customers_status        ON customers (deleted_at, status);

CREATE INDEX IF NOT EXISTS idx_deals_stage             ON deals (stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_customer          ON deals (customer_id);
CREATE INDEX IF NOT EXISTS idx_deals_owner             ON deals (owner_id);
CREATE INDEX IF NOT EXISTS idx_deals_expected_close    ON deals (expected_close_date);
CREATE INDEX IF NOT EXISTS idx_deals_active            ON deals (deleted_at, stage_id);

CREATE INDEX IF NOT EXISTS idx_activities_lead         ON activities (lead_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_activities_customer     ON activities (customer_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_activities_deal         ON activities (deal_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_activities_user         ON activities (user_id);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status   ON tasks (assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date          ON tasks (due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_lead              ON tasks (lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_customer          ON tasks (customer_id);
CREATE INDEX IF NOT EXISTS idx_tasks_deal              ON tasks (deal_id);

CREATE INDEX IF NOT EXISTS idx_notes_lead              ON notes (lead_id);
CREATE INDEX IF NOT EXISTS idx_notes_customer          ON notes (customer_id);
CREATE INDEX IF NOT EXISTS idx_notes_deal              ON notes (deal_id);

CREATE INDEX IF NOT EXISTS idx_predictions_lead_type   ON predictions (lead_id, prediction_type);
CREATE INDEX IF NOT EXISTS idx_predictions_created_at  ON predictions (created_at);

CREATE INDEX IF NOT EXISTS idx_audit_entity            ON audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_user              ON audit_logs (user_id, created_at);
