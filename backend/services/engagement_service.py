"""Activities, tasks and notes — thin services over their repositories."""

from __future__ import annotations

from typing import Any, Dict

from core.errors import NotFoundError, ValidationError
from core.pagination import QueryOptions
from core.security import is_privileged
from database.db import db_session, now_iso
from repositories.engagement import ActivityRepository, NoteRepository, TaskRepository


def _require_relation(data: Dict[str, Any]) -> None:
    if not any(data.get(key) for key in ("lead_id", "customer_id", "deal_id")):
        raise ValidationError(
            "Must be linked to a lead, customer or deal",
            {"lead_id": "provide one of lead_id, customer_id or deal_id"},
        )


def list_activities(options: QueryOptions):
    with db_session() as connection:
        return ActivityRepository(connection).search(options)


def create_activity(data: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
    _require_relation(data)
    with db_session(write=True) as connection:
        activities = ActivityRepository(connection)
        activity_id = activities.insert({**data, "user_id": user["user_id"], "occurred_at": data.get("occurred_at") or now_iso()})
        return activities.get(activity_id)


def list_tasks(options: QueryOptions, user: Dict[str, Any]):
    with db_session() as connection:
        scope = None if is_privileged(user) else user["user_id"]
        return TaskRepository(connection).search(options, assignee_scope=scope)


def create_task(data: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
    with db_session(write=True) as connection:
        tasks = TaskRepository(connection)
        payload = {**data, "created_by": user["user_id"]}
        payload.setdefault("assigned_to", user["user_id"])
        if payload.get("assigned_to") is None:
            payload["assigned_to"] = user["user_id"]
        if payload.get("status") == "Done":
            payload["completed_at"] = now_iso()
        task_id = tasks.insert(payload)
        return tasks.get(task_id)


def update_task(task_id: int, data: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
    with db_session(write=True) as connection:
        tasks = TaskRepository(connection)
        existing = tasks.get(task_id)
        if existing is None:
            raise NotFoundError("Task not found")
        if not is_privileged(user) and existing["assigned_to"] not in (None, user["user_id"]):
            raise NotFoundError("Task not found")
        if "status" in data:
            data["completed_at"] = now_iso() if data["status"] == "Done" else None
        tasks.update(task_id, data)
        return tasks.get(task_id)


def delete_task(task_id: int, user: Dict[str, Any]) -> None:
    with db_session(write=True) as connection:
        tasks = TaskRepository(connection)
        existing = tasks.get(task_id)
        if existing is None:
            raise NotFoundError("Task not found")
        if not is_privileged(user) and existing["assigned_to"] not in (None, user["user_id"]):
            raise NotFoundError("Task not found")
        tasks.delete(task_id)


def create_note(data: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
    _require_relation(data)
    with db_session(write=True) as connection:
        notes = NoteRepository(connection)
        note_id = notes.insert({**data, "author_id": user["user_id"]})
        return notes.get(note_id)


def delete_note(note_id: int, user: Dict[str, Any]) -> None:
    with db_session(write=True) as connection:
        notes = NoteRepository(connection)
        note = notes.get(note_id)
        if note is None:
            raise NotFoundError("Note not found")
        if not is_privileged(user) and note["author_id"] != user["user_id"]:
            raise NotFoundError("Note not found")
        notes.delete(note_id)
