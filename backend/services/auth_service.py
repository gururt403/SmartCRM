from __future__ import annotations

from typing import Any, Dict

from werkzeug.security import check_password_hash, generate_password_hash

from core.errors import AuthenticationError, ConflictError, NotFoundError, ValidationError
from core.security import ROLE_SALES
from database.db import db_session
from repositories.engagement import AuditRepository
from repositories.users import UserRepository


def register(name: str, email: str, password: str) -> Dict[str, Any]:
    with db_session(write=True) as connection:
        users = UserRepository(connection)
        if users.email_exists(email):
            raise ConflictError("That email is already registered", {"email": "already in use"})
        # Role is never taken from the request body: self-registration is always
        # the lowest-privilege role, and elevation is an admin-only action.
        user_id = users.insert({
            "name": name,
            "email": email,
            "password_hash": generate_password_hash(password),
            "role": ROLE_SALES,
            "is_active": 1,
        })
        AuditRepository(connection).record(user_id=user_id, action="user.register", entity_type="user", entity_id=user_id)
        return users.get_public(user_id)


def authenticate(email: str, password: str) -> Dict[str, Any]:
    with db_session(write=True) as connection:
        users = UserRepository(connection)
        record = users.get_by_email_with_secret(email)
        # Same error and roughly the same work for unknown email vs bad password,
        # so the endpoint cannot be used to enumerate accounts.
        if record is None or not check_password_hash(record["password_hash"], password):
            raise AuthenticationError("Invalid email or password")
        if not record["is_active"]:
            raise AuthenticationError("This account has been deactivated")
        users.touch_login(record["id"])
        AuditRepository(connection).record(user_id=record["id"], action="user.login", entity_type="user", entity_id=record["id"])
        return users.get_public(record["id"])


def profile(user_id: int) -> Dict[str, Any]:
    with db_session() as connection:
        user = UserRepository(connection).get_public(user_id)
        if user is None:
            raise NotFoundError("User not found")
        return user


def change_password(user_id: int, current_password: str, new_password: str) -> None:
    with db_session(write=True) as connection:
        users = UserRepository(connection)
        record = users.get_by_email_with_secret((users.get_public(user_id) or {}).get("email", ""))
        if record is None or not check_password_hash(record["password_hash"], current_password):
            raise AuthenticationError("Current password is incorrect")
        if current_password == new_password:
            raise ValidationError("New password must be different", {"new_password": "must differ from the current password"})
        users.set_password(user_id, generate_password_hash(new_password))
        AuditRepository(connection).record(user_id=user_id, action="user.password_change", entity_type="user", entity_id=user_id)


def list_users() -> list:
    with db_session() as connection:
        return UserRepository(connection).list_public()
