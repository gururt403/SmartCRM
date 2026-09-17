"""Lead business rules: ownership scoping, status transitions and the
lead -> customer -> deal conversion flow."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from core.errors import ConflictError, NotFoundError, ValidationError
from core.pagination import QueryOptions
from core.security import is_privileged
from database.db import db_session, now_iso, today_iso
from repositories.customers import CustomerRepository
from repositories.deals import DealRepository, PipelineStageRepository
from repositories.engagement import ActivityRepository, AuditRepository, NoteRepository, TaskRepository
from repositories.leads import LeadRepository
from schemas.crm import LEAD_TRANSITIONS


def _scope(user: Dict[str, Any]) -> Optional[int]:
    """Salespeople only ever see their own records; managers/admins see all."""
    return None if is_privileged(user) else user["user_id"]


def _assert_visible(lead: Optional[Dict[str, Any]], user: Dict[str, Any]) -> Dict[str, Any]:
    if lead is None:
        raise NotFoundError("Lead not found")
    if not is_privileged(user) and lead.get("owner_id") not in (None, user["user_id"]):
        # Same response as "missing" so the API does not confirm the record exists.
        raise NotFoundError("Lead not found")
    return lead


def list_leads(options: QueryOptions, user: Dict[str, Any]):
    with db_session() as connection:
        return LeadRepository(connection).search(options, owner_scope=_scope(user))


def get_lead(lead_id: int, user: Dict[str, Any]) -> Dict[str, Any]:
    with db_session() as connection:
        lead = _assert_visible(LeadRepository(connection).get_detailed(lead_id), user)
        lead["activities"] = ActivityRepository(connection).for_record(lead_id=lead_id, limit=25)
        lead["tasks"] = TaskRepository(connection).for_record(lead_id=lead_id, limit=25)
        lead["notes"] = NoteRepository(connection).for_record(lead_id=lead_id, limit=25)
        deals, _ = DealRepository(connection).search(
            QueryOptions(page=1, page_size=25, sort_by="updated_at", filters={}), owner_scope=None
        )
        lead["deals"] = [deal for deal in deals if deal.get("lead_id") == lead_id]
        return lead


def create_lead(data: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
    with db_session(write=True) as connection:
        leads = LeadRepository(connection)
        if leads.email_exists(data["email"]):
            raise ConflictError("A lead with that email already exists", {"email": "already in use"})
        data = dict(data)
        if not is_privileged(user) or not data.get("owner_id"):
            data["owner_id"] = user["user_id"]
        data["created_by"] = user["user_id"]
        lead_id = leads.insert(data)
        if data.get("status") == "Converted":
            _convert(connection, lead_id, user)
        AuditRepository(connection).record(user_id=user["user_id"], action="lead.create", entity_type="lead", entity_id=lead_id)
        return leads.get_detailed(lead_id)


def update_lead(lead_id: int, data: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
    with db_session(write=True) as connection:
        leads = LeadRepository(connection)
        existing = _assert_visible(leads.get_detailed(lead_id), user)

        new_status = data.get("status")
        if new_status and new_status != existing["status"]:
            allowed = LEAD_TRANSITIONS.get(existing["status"], set())
            if new_status not in allowed:
                raise ValidationError(
                    f"Cannot move a lead from '{existing['status']}' to '{new_status}'",
                    {"status": f"allowed next states: {', '.join(sorted(allowed))}"},
                )

        if "email" in data and leads.email_exists(data["email"], exclude_id=lead_id):
            raise ConflictError("A lead with that email already exists", {"email": "already in use"})
        if "owner_id" in data and not is_privileged(user):
            data.pop("owner_id")  # reassignment is a manager action

        leads.update(lead_id, data)
        if new_status == "Converted":
            _convert(connection, lead_id, user)
        AuditRepository(connection).record(
            user_id=user["user_id"], action="lead.update", entity_type="lead", entity_id=lead_id,
            changes={"fields": sorted(data.keys())},
        )
        return leads.get_detailed(lead_id)


def delete_lead(lead_id: int, user: Dict[str, Any]) -> None:
    """Soft delete — the record stays for auditing and related history."""
    with db_session(write=True) as connection:
        leads = LeadRepository(connection)
        _assert_visible(leads.get_detailed(lead_id), user)
        leads.delete(lead_id)
        AuditRepository(connection).record(user_id=user["user_id"], action="lead.delete", entity_type="lead", entity_id=lead_id)


def log_activity(lead_id: int, data: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
    with db_session(write=True) as connection:
        leads = LeadRepository(connection)
        lead = _assert_visible(leads.get_detailed(lead_id), user)
        activities = ActivityRepository(connection)
        activity_id = activities.insert({
            **data,
            "lead_id": lead_id,
            "occurred_at": data.get("occurred_at") or now_iso(),
            "user_id": user["user_id"],
        })
        connection.execute(
            "UPDATE leads SET interaction_count = interaction_count + 1, last_contact_date = ?, updated_at = ? WHERE id = ?",
            (today_iso(), now_iso(), lead_id),
        )
        return activities.get(activity_id)


def _convert(connection, lead_id: int, user: Dict[str, Any]) -> None:
    """Promote a converted lead into a customer and a won deal, exactly once."""
    leads = LeadRepository(connection)
    customers = CustomerRepository(connection)
    lead = leads.get_detailed(lead_id)
    if lead is None:
        return

    existing = customers.get_by_lead(lead_id)
    customer_payload = {
        "lead_id": lead_id,
        "name": lead["name"],
        "email": lead["email"],
        "phone": lead["phone"],
        "company": lead["company"],
        "revenue": lead["budget"],
        "churn_probability": lead["churn_probability"],
        "owner_id": lead["owner_id"] or user["user_id"],
    }
    if existing:
        customers.update(existing["id"], customer_payload)
        customer_id = existing["id"]
    else:
        customer_id = customers.insert(customer_payload)

    deals = DealRepository(connection)
    stage = PipelineStageRepository(connection).get_by_key("won")
    open_deal = connection.execute(
        "SELECT id FROM deals WHERE lead_id = ? AND deleted_at IS NULL ORDER BY id LIMIT 1", (lead_id,)
    ).fetchone()
    deal_payload = {
        "title": f"{lead['company']} — {lead['name']}",
        "customer_id": customer_id,
        "lead_id": lead_id,
        "stage_id": stage["id"],
        "value": lead["budget"],
        "probability": stage["probability"],
        "closed_at": now_iso(),
        "owner_id": lead["owner_id"] or user["user_id"],
    }
    if open_deal:
        deals.update(open_deal["id"], deal_payload)
    else:
        deals.insert(deal_payload)
