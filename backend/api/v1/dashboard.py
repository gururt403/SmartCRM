from flask import Blueprint, g

from core.responses import success
from core.security import login_required
from services import dashboard_service

bp = Blueprint("dashboard", __name__, url_prefix="/dashboard")


@bp.get("/summary")
@login_required
def summary():
    return success(dashboard_service.summary(g.user))


@bp.get("/analytics")
@login_required
def analytics():
    return success(dashboard_service.analytics(g.user))
