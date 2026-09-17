"""Machine-readable API description served at /api/v1/docs."""

from flask import Blueprint, current_app

from core.responses import success

bp = Blueprint("docs", __name__, url_prefix="/api/v1")


@bp.get("/docs")
def docs():
    routes = []
    for rule in sorted(current_app.url_map.iter_rules(), key=lambda r: str(r)):
        if not str(rule).startswith("/api/"):
            continue
        methods = sorted(rule.methods - {"HEAD", "OPTIONS"})
        view = current_app.view_functions.get(rule.endpoint)
        routes.append({
            "path": str(rule),
            "methods": methods,
            "summary": (view.__doc__ or "").strip().split("\n")[0] if view and view.__doc__ else "",
        })
    return success({
        "version": "1.0.0",
        "envelope": {
            "success": {"success": True, "data": {}, "message": "Success"},
            "error": {"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Invalid request", "details": {}}},
        },
        "query_parameters": {
            "page": "1-based page number",
            "page_size": f"items per page (max {current_app.config['MAX_PAGE_SIZE']})",
            "sort_by": "column to sort by (see each resource)",
            "sort_dir": "asc | desc",
            "search": "free-text search",
        },
        "routes": routes,
    })
