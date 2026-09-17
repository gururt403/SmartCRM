"""Consistent API envelopes used by every endpoint."""

from __future__ import annotations

from typing import Any, Dict, Optional, Tuple

from flask import jsonify


def success(data: Any = None, message: str = "Success", status: int = 200, meta: Optional[Dict[str, Any]] = None) -> Tuple[Any, int]:
    body: Dict[str, Any] = {"success": True, "data": data, "message": message}
    if meta is not None:
        body["meta"] = meta
    return jsonify(body), status


def created(data: Any = None, message: str = "Created") -> Tuple[Any, int]:
    return success(data, message, 201)


def error(code: str, message: str, status: int = 400, details: Any = None) -> Tuple[Any, int]:
    return jsonify(
        {
            "success": False,
            "error": {"code": code, "message": message, "details": details or {}},
        }
    ), status


def paginated(items, total: int, page: int, page_size: int, message: str = "Success") -> Tuple[Any, int]:
    total_pages = (total + page_size - 1) // page_size if page_size else 0
    return success(
        items,
        message,
        meta={
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_previous": page > 1,
            }
        },
    )
