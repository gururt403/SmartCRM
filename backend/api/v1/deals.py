from flask import Blueprint, g, request

from core.pagination import parse_query_options
from core.responses import created, paginated, success
from core.security import login_required
from repositories.deals import DealRepository
from schemas.crm import DEAL_SCHEMA, DEAL_STAGE_SCHEMA
from schemas.fields import validate
from services import deal_service

bp = Blueprint("deals", __name__, url_prefix="/deals")


@bp.get("")
@login_required
def list_deals():
    options = parse_query_options(
        sortable=DealRepository.sortable,
        filterable=("stage_id", "stage_key", "owner_id", "customer_id", "close_from", "close_to"),
        default_sort="updated_at",
    )
    items, total = deal_service.list_deals(options, g.user)
    return paginated(items, total, options.page, options.page_size)


@bp.get("/pipeline")
@login_required
def pipeline():
    return success(deal_service.pipeline(g.user))


@bp.get("/stages")
@login_required
def stages():
    return success(deal_service.list_stages())


@bp.get("/<int:deal_id>")
@login_required
def get_deal(deal_id: int):
    return success(deal_service.get_deal(deal_id, g.user))


@bp.post("")
@login_required
def create_deal():
    data = validate(request.get_json(silent=True) or {}, DEAL_SCHEMA)
    return created(deal_service.create_deal(data, g.user), "Deal created")


@bp.put("/<int:deal_id>")
@bp.patch("/<int:deal_id>")
@login_required
def update_deal(deal_id: int):
    data = validate(request.get_json(silent=True) or {}, DEAL_SCHEMA, partial=True)
    return success(deal_service.update_deal(deal_id, data, g.user), "Deal updated")


@bp.post("/<int:deal_id>/stage")
@login_required
def move_deal(deal_id: int):
    data = validate(request.get_json(silent=True) or {}, DEAL_STAGE_SCHEMA)
    return success(deal_service.move_deal(deal_id, data["stage_key"], g.user), "Deal moved")


@bp.delete("/<int:deal_id>")
@login_required
def delete_deal(deal_id: int):
    deal_service.delete_deal(deal_id, g.user)
    return success(None, "Deal deleted")
