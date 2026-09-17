from flask import Blueprint, g, request

from core.responses import created, success
from core.security import ROLE_ADMIN, ROLE_MANAGER, destroy_session, establish_session, login_required, rate_limit, role_required
from schemas.crm import CHANGE_PASSWORD_SCHEMA, LOGIN_SCHEMA, REGISTER_SCHEMA
from schemas.fields import validate
from services import auth_service

bp = Blueprint("auth", __name__, url_prefix="/auth")


@bp.post("/register")
@rate_limit("register")
def register():
    data = validate(request.get_json(silent=True) or {}, REGISTER_SCHEMA)
    user = auth_service.register(**data)
    return created({"user": user}, "Registration successful")


@bp.post("/login")
@rate_limit("login")
def login():
    data = validate(request.get_json(silent=True) or {}, LOGIN_SCHEMA)
    user = auth_service.authenticate(data["email"], data["password"])
    establish_session(user)
    return success({"user": user}, "Login successful")


@bp.post("/logout")
@login_required
def logout():
    destroy_session()
    return success(None, "Logged out successfully")


@bp.get("/me")
@login_required
def me():
    return success({"user": auth_service.profile(g.user["user_id"])})


@bp.post("/change-password")
@login_required
def change_password():
    data = validate(request.get_json(silent=True) or {}, CHANGE_PASSWORD_SCHEMA)
    auth_service.change_password(g.user["user_id"], data["current_password"], data["new_password"])
    return success(None, "Password updated")


@bp.get("/users")
@role_required(ROLE_ADMIN, ROLE_MANAGER)
def users():
    """Used by the UI's owner/assignee pickers."""
    return success(auth_service.list_users())
