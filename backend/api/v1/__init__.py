"""API v1 — every blueprint is mounted under /api/v1."""

from flask import Blueprint

from api.v1 import auth, customers, dashboard, deals, engagement, leads, predictions


def build_v1_blueprint() -> Blueprint:
    v1 = Blueprint("v1", __name__, url_prefix="/api/v1")
    for blueprint in (
        auth.bp,
        leads.bp,
        customers.bp,
        deals.bp,
        dashboard.bp,
        predictions.bp,
        engagement.activities_bp,
        engagement.tasks_bp,
        engagement.notes_bp,
    ):
        v1.register_blueprint(blueprint)
    return v1
