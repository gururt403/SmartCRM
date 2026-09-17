"""Query-string parsing for pagination, sorting, filtering and search."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, Optional

from flask import current_app, request

from core.errors import ValidationError


@dataclass(frozen=True)
class QueryOptions:
    page: int = 1
    page_size: int = 20
    sort_by: Optional[str] = None
    sort_dir: str = "desc"
    search: Optional[str] = None
    filters: Dict[str, Any] = field(default_factory=dict)

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


def _positive_int(name: str, raw: Optional[str], default: int, maximum: Optional[int] = None) -> int:
    if raw is None or raw == "":
        return default
    try:
        value = int(raw)
    except (TypeError, ValueError):
        raise ValidationError(f"'{name}' must be an integer", {name: "expected an integer"})
    if value < 1:
        raise ValidationError(f"'{name}' must be at least 1", {name: "must be >= 1"})
    if maximum is not None and value > maximum:
        value = maximum
    return value


def parse_query_options(
    *,
    sortable: Iterable[str] = (),
    filterable: Iterable[str] = (),
    default_sort: Optional[str] = None,
) -> QueryOptions:
    cfg = current_app.config
    page = _positive_int("page", request.args.get("page"), 1)
    page_size = _positive_int("page_size", request.args.get("page_size"), cfg.get("DEFAULT_PAGE_SIZE", 20), cfg.get("MAX_PAGE_SIZE", 100))

    sortable = tuple(sortable)
    sort_by = (request.args.get("sort_by") or default_sort or "").strip() or None
    if sort_by and sortable and sort_by not in sortable:
        raise ValidationError(
            f"Cannot sort by '{sort_by}'",
            {"sort_by": f"allowed values: {', '.join(sortable)}"},
        )

    sort_dir = (request.args.get("sort_dir") or "desc").strip().lower()
    if sort_dir not in {"asc", "desc"}:
        raise ValidationError("'sort_dir' must be 'asc' or 'desc'", {"sort_dir": "asc | desc"})

    search = (request.args.get("search") or "").strip() or None

    filters = {}
    for key in filterable:
        raw = request.args.get(key)
        if raw is not None and raw.strip() != "":
            filters[key] = raw.strip()

    return QueryOptions(page=page, page_size=page_size, sort_by=sort_by, sort_dir=sort_dir, search=search, filters=filters)
