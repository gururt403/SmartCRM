"""Activities, tasks and notes."""

from flask import Blueprint, g, request

from core.pagination import parse_query_options
from core.responses import created, paginated, success
from core.security import login_required
from repositories.engagement import ActivityRepository, TaskRepository
from schemas.crm import ACTIVITY_SCHEMA, NOTE_SCHEMA, TASK_SCHEMA
from schemas.fields import validate
from services import engagement_service

activities_bp = Blueprint("activities", __name__, url_prefix="/activities")
tasks_bp = Blueprint("tasks", __name__, url_prefix="/tasks")
notes_bp = Blueprint("notes", __name__, url_prefix="/notes")


@activities_bp.get("")
@login_required
def list_activities():
    options = parse_query_options(
        sortable=ActivityRepository.sortable,
        filterable=("lead_id", "customer_id", "deal_id", "type", "user_id"),
        default_sort="occurred_at",
    )
    items, total = engagement_service.list_activities(options)
    return paginated(items, total, options.page, options.page_size)


@activities_bp.post("")
@login_required
def create_activity():
    data = validate(request.get_json(silent=True) or {}, ACTIVITY_SCHEMA)
    return created(engagement_service.create_activity(data, g.user), "Activity logged")


@tasks_bp.get("")
@login_required
def list_tasks():
    options = parse_query_options(
        sortable=TaskRepository.sortable,
        filterable=("status", "priority", "assigned_to", "lead_id", "customer_id", "deal_id", "due_before"),
        default_sort="due_date",
    )
    items, total = engagement_service.list_tasks(options, g.user)
    return paginated(items, total, options.page, options.page_size)


@tasks_bp.post("")
@login_required
def create_task():
    data = validate(request.get_json(silent=True) or {}, TASK_SCHEMA)
    return created(engagement_service.create_task(data, g.user), "Task created")


@tasks_bp.put("/<int:task_id>")
@tasks_bp.patch("/<int:task_id>")
@login_required
def update_task(task_id: int):
    data = validate(request.get_json(silent=True) or {}, TASK_SCHEMA, partial=True)
    return success(engagement_service.update_task(task_id, data, g.user), "Task updated")


@tasks_bp.delete("/<int:task_id>")
@login_required
def delete_task(task_id: int):
    engagement_service.delete_task(task_id, g.user)
    return success(None, "Task deleted")


@notes_bp.post("")
@login_required
def create_note():
    data = validate(request.get_json(silent=True) or {}, NOTE_SCHEMA)
    return created(engagement_service.create_note(data, g.user), "Note added")


@notes_bp.delete("/<int:note_id>")
@login_required
def delete_note(note_id: int):
    engagement_service.delete_note(note_id, g.user)
    return success(None, "Note deleted")
