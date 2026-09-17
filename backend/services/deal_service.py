from __future__ import annotations

from typing import Any, Dict, List, Optional

from core.errors import NotFoundError, ValidationError
from core.pagination import QueryOptions
from core.security import is_privileged
from database.db import db_session, now_iso
from repositories.deals import DealRepository, PipelineStageRepository
from repositories.engagement import ActivityRepository, AuditRepository, NoteRepository, TaskRepository


def _scope(user: Dict[str, Any]) -> Optional[int]:
    return None if is_privileged(user) else user["user_id"]


def _assert_visible(deal: Optional[Dict[str, Any]], user: Dict[str, Any]) -> Dict[str, Any]:
    if deal is None:
        raise NotFoundError("Deal not found")
    if not is_privileged(user) and deal.get("owner_id") not in (None, user["user_id"]):
        raise NotFoundError("Deal not found")
    return deal


def _stage_or_400(connection, stage_key: str) -> Dict[str, Any]:
    stage = PipelineStageRepository(connection).get_by_key(stage_key)
    if stage is None:
        valid = ", ".join(s["key"] for s in PipelineStageRepository(connection).list_all())
        raise ValidationError("Unknown pipeline stage", {"stage_key": f"allowed values: {valid}"})
    return stage


def list_stages() -> List[Dict[str, Any]]:
    with db_session() as connection:
        return PipelineStageRepository(connection).list_all()


def list_deals(options: QueryOptions, user: Dict[str, Any]):
    with db_session() as connection:
        return DealRepository(connection).search(options, owner_scope=_scope(user))


def pipeline(user: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Stage-grouped board, assembled from a single query."""
    with db_session() as connection:
        rows = DealRepository(connection).pipeline(owner_scope=_scope(user))

    stages: Dict[int, Dict[str, Any]] = {}
    for row in rows:
        stage = stages.setdefault(row["stage_id"], {
            "id": row["stage_id"],
            "key": row["stage_key"],
            "name": row["stage_name"],
            "position": row["stage_position"],
            "is_won": bool(row["is_won"]),
            "is_lost": bool(row["is_lost"]),
            "deals": [],
            "total_value": 0.0,
        })
        if row["deal_id"] is None:
            continue
        stage["deals"].append({
            "id": row["deal_id"],
            "title": row["title"],
            "value": row["value"],
            "currency": row["currency"],
            "probability": row["probability"],
            "expected_close_date": row["expected_close_date"],
            "updated_at": row["updated_at"],
            "customer_name": row["customer_name"],
            "lead_name": row["lead_name"],
            "owner_name": row["owner_name"],
        })
        stage["total_value"] += float(row["value"] or 0)

    return sorted(stages.values(), key=lambda stage: stage["position"])


def get_deal(deal_id: int, user: Dict[str, Any]) -> Dict[str, Any]:
    with db_session() as connection:
        deal = _assert_visible(DealRepository(connection).get_detailed(deal_id), user)
        deal["activities"] = ActivityRepository(connection).for_record(deal_id=deal_id, limit=25)
        deal["tasks"] = TaskRepository(connection).for_record(deal_id=deal_id, limit=25)
        deal["notes"] = NoteRepository(connection).for_record(deal_id=deal_id, limit=25)
        return deal


def create_deal(data: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
    with db_session(write=True) as connection:
        deals = DealRepository(connection)
        data = dict(data)
        stage = _stage_or_400(connection, data.pop("stage_key"))
        if not data.get("customer_id") and not data.get("lead_id"):
            raise ValidationError("A deal must reference a customer or a lead",
                                  {"customer_id": "provide customer_id or lead_id"})
        data["stage_id"] = stage["id"]
        data["probability"] = stage["probability"]
        if stage["is_won"] or stage["is_lost"]:
            data["closed_at"] = now_iso()
        if not is_privileged(user) or not data.get("owner_id"):
            data["owner_id"] = user["user_id"]
        deal_id = deals.insert(data)
        AuditRepository(connection).record(user_id=user["user_id"], action="deal.create", entity_type="deal", entity_id=deal_id)
        return deals.get_detailed(deal_id)


def update_deal(deal_id: int, data: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
    with db_session(write=True) as connection:
        deals = DealRepository(connection)
        _assert_visible(deals.get_detailed(deal_id), user)
        data = dict(data)
        if data.get("stage_key"):
            stage = _stage_or_400(connection, data.pop("stage_key"))
            data["stage_id"] = stage["id"]
            data["probability"] = stage["probability"]
            data["closed_at"] = now_iso() if (stage["is_won"] or stage["is_lost"]) else None
        data.pop("stage_key", None)
        if "owner_id" in data and not is_privileged(user):
            data.pop("owner_id")
        deals.update(deal_id, data)
        AuditRepository(connection).record(
            user_id=user["user_id"], action="deal.update", entity_type="deal",
            entity_id=deal_id, changes={"fields": sorted(data.keys())},
        )
        return deals.get_detailed(deal_id)


def move_deal(deal_id: int, stage_key: str, user: Dict[str, Any]) -> Dict[str, Any]:
    """Stage moves are validated server-side: a closed deal cannot silently
    reopen, and an unknown stage key is a 422 rather than a broken FK."""
    with db_session(write=True) as connection:
        deals = DealRepository(connection)
        deal = _assert_visible(deals.get_detailed(deal_id), user)
        stage = _stage_or_400(connection, stage_key)

        if deal["stage_is_won"] and not stage["is_won"]:
            raise ValidationError("A won deal cannot be moved back into the pipeline",
                                  {"stage_key": "won deals are final"})

        deals.update(deal_id, {
            "stage_id": stage["id"],
            "probability": stage["probability"],
            "closed_at": now_iso() if (stage["is_won"] or stage["is_lost"]) else None,
        })
        AuditRepository(connection).record(
            user_id=user["user_id"], action="deal.move", entity_type="deal", entity_id=deal_id,
            changes={"from": deal["stage_key"], "to": stage["key"]},
        )
        return deals.get_detailed(deal_id)


def delete_deal(deal_id: int, user: Dict[str, Any]) -> None:
    with db_session(write=True) as connection:
        deals = DealRepository(connection)
        _assert_visible(deals.get_detailed(deal_id), user)
        deals.delete(deal_id)
        AuditRepository(connection).record(user_id=user["user_id"], action="deal.delete", entity_type="deal", entity_id=deal_id)
