from flask import Blueprint, g, request

from core.pagination import parse_query_options
from core.responses import created, paginated, success
from core.security import login_required
from repositories.leads import LeadRepository
from schemas.crm import ACTIVITY_SCHEMA, LEAD_SCHEMA
from schemas.fields import only, validate
from services import lead_service

bp = Blueprint("leads", __name__, url_prefix="/leads")

FILTERABLE = ("status", "priority", "company_type", "lead_source", "owner_id",
              "created_from", "created_to", "follow_up_before", "min_budget", "max_budget")


@bp.get("")
@login_required
def list_leads():
    options = parse_query_options(sortable=LeadRepository.sortable, filterable=FILTERABLE, default_sort="updated_at")
    items, total = lead_service.list_leads(options, g.user)
    return paginated(items, total, options.page, options.page_size)


@bp.get("/<int:lead_id>")
@login_required
def get_lead(lead_id: int):
    return success(lead_service.get_lead(lead_id, g.user))


@bp.post("")
@login_required
def create_lead():
    data = validate(request.get_json(silent=True) or {}, LEAD_SCHEMA)
    return created(lead_service.create_lead(data, g.user), "Lead created")


@bp.put("/<int:lead_id>")
@bp.patch("/<int:lead_id>")
@login_required
def update_lead(lead_id: int):
    data = validate(request.get_json(silent=True) or {}, LEAD_SCHEMA, partial=True)
    return success(lead_service.update_lead(lead_id, data, g.user), "Lead updated")


@bp.delete("/<int:lead_id>")
@login_required
def delete_lead(lead_id: int):
    lead_service.delete_lead(lead_id, g.user)
    return success(None, "Lead deleted")


@bp.post("/<int:lead_id>/activities")
@login_required
def log_activity(lead_id: int):
    schema = only(("type", "subject", "notes", "occurred_at"), ACTIVITY_SCHEMA)
    data = validate(request.get_json(silent=True) or {}, schema)
    return created(lead_service.log_activity(lead_id, data, g.user), "Activity logged")
