from __future__ import annotations

from typing import Any, Dict, Optional

from core.errors import NotFoundError
from core.pagination import QueryOptions
from core.security import is_privileged
from database.db import db_session
from repositories.customers import CustomerRepository
from repositories.deals import DealRepository
from repositories.engagement import ActivityRepository, AuditRepository, NoteRepository, TaskRepository


def _scope(user: Dict[str, Any]) -> Optional[int]:
    return None if is_privileged(user) else user["user_id"]


def _assert_visible(customer: Optional[Dict[str, Any]], user: Dict[str, Any]) -> Dict[str, Any]:
    if customer is None:
        raise NotFoundError("Customer not found")
    if not is_privileged(user) and customer.get("owner_id") not in (None, user["user_id"]):
        raise NotFoundError("Customer not found")
    return customer


def list_customers(options: QueryOptions, user: Dict[str, Any]):
    with db_session() as connection:
        return CustomerRepository(connection).search(options, owner_scope=_scope(user))


def get_customer(customer_id: int, user: Dict[str, Any]) -> Dict[str, Any]:
    with db_session() as connection:
        customer = _assert_visible(CustomerRepository(connection).get_detailed(customer_id), user)
        customer["activities"] = ActivityRepository(connection).for_record(customer_id=customer_id, limit=25)
        customer["tasks"] = TaskRepository(connection).for_record(customer_id=customer_id, limit=25)
        customer["notes"] = NoteRepository(connection).for_record(customer_id=customer_id, limit=25)
        deals, _ = DealRepository(connection).search(
            QueryOptions(page=1, page_size=25, sort_by="updated_at", filters={"customer_id": customer_id})
        )
        customer["deals"] = deals
        return customer


def create_customer(data: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
    with db_session(write=True) as connection:
        customers = CustomerRepository(connection)
        data = dict(data)
        if not is_privileged(user) or not data.get("owner_id"):
            data["owner_id"] = user["user_id"]
        customer_id = customers.insert(data)
        AuditRepository(connection).record(user_id=user["user_id"], action="customer.create", entity_type="customer", entity_id=customer_id)
        return customers.get_detailed(customer_id)


def update_customer(customer_id: int, data: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
    with db_session(write=True) as connection:
        customers = CustomerRepository(connection)
        _assert_visible(customers.get_detailed(customer_id), user)
        if "owner_id" in data and not is_privileged(user):
            data.pop("owner_id")
        customers.update(customer_id, data)
        AuditRepository(connection).record(
            user_id=user["user_id"], action="customer.update", entity_type="customer",
            entity_id=customer_id, changes={"fields": sorted(data.keys())},
        )
        return customers.get_detailed(customer_id)


def delete_customer(customer_id: int, user: Dict[str, Any]) -> None:
    with db_session(write=True) as connection:
        customers = CustomerRepository(connection)
        _assert_visible(customers.get_detailed(customer_id), user)
        customers.delete(customer_id)
        AuditRepository(connection).record(user_id=user["user_id"], action="customer.delete", entity_type="customer", entity_id=customer_id)
