from flask import Blueprint, g, request

from core.pagination import parse_query_options
from core.responses import created, paginated, success
from core.security import login_required
from repositories.customers import CustomerRepository
from schemas.crm import CUSTOMER_SCHEMA
from schemas.fields import validate
from services import customer_service

bp = Blueprint("customers", __name__, url_prefix="/customers")


@bp.get("")
@login_required
def list_customers():
    options = parse_query_options(sortable=CustomerRepository.sortable, filterable=("status", "owner_id"), default_sort="updated_at")
    items, total = customer_service.list_customers(options, g.user)
    return paginated(items, total, options.page, options.page_size)


@bp.get("/<int:customer_id>")
@login_required
def get_customer(customer_id: int):
    return success(customer_service.get_customer(customer_id, g.user))


@bp.post("")
@login_required
def create_customer():
    data = validate(request.get_json(silent=True) or {}, CUSTOMER_SCHEMA)
    return created(customer_service.create_customer(data, g.user), "Customer created")


@bp.put("/<int:customer_id>")
@bp.patch("/<int:customer_id>")
@login_required
def update_customer(customer_id: int):
    data = validate(request.get_json(silent=True) or {}, CUSTOMER_SCHEMA, partial=True)
    return success(customer_service.update_customer(customer_id, data, g.user), "Customer updated")


@bp.delete("/<int:customer_id>")
@login_required
def delete_customer(customer_id: int):
    customer_service.delete_customer(customer_id, g.user)
    return success(None, "Customer deleted")
