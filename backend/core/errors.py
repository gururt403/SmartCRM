"""Typed application errors plus the Flask error handlers that render them.

Internal details (stack traces, SQL messages) never reach the client: they are
logged server-side and replaced with a stable error code.
"""

from __future__ import annotations

import logging
import sqlite3
import uuid
from typing import Any, Dict, Optional

from werkzeug.exceptions import HTTPException

from core.responses import error

logger = logging.getLogger(__name__)


class AppError(Exception):
    status = 400
    code = "BAD_REQUEST"

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None, *, code: Optional[str] = None, status: Optional[int] = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}
        if code:
            self.code = code
        if status:
            self.status = status


class ValidationError(AppError):
    status = 422
    code = "VALIDATION_ERROR"


class AuthenticationError(AppError):
    status = 401
    code = "AUTHENTICATION_ERROR"


class AuthorizationError(AppError):
    status = 403
    code = "AUTHORIZATION_ERROR"


class NotFoundError(AppError):
    status = 404
    code = "NOT_FOUND"


class ConflictError(AppError):
    status = 409
    code = "CONFLICT"


class RateLimitError(AppError):
    status = 429
    code = "RATE_LIMITED"


_HTTP_CODES = {
    400: "BAD_REQUEST",
    401: "AUTHENTICATION_ERROR",
    403: "AUTHORIZATION_ERROR",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    409: "CONFLICT",
    413: "PAYLOAD_TOO_LARGE",
    415: "UNSUPPORTED_MEDIA_TYPE",
    429: "RATE_LIMITED",
}


def register_error_handlers(app) -> None:
    @app.errorhandler(AppError)
    def _app_error(exc: AppError):
        return error(exc.code, exc.message, exc.status, exc.details)

    @app.errorhandler(HTTPException)
    def _http_error(exc: HTTPException):
        code = _HTTP_CODES.get(exc.code or 500, "HTTP_ERROR")
        message = exc.description if exc.code and exc.code < 500 else "Something went wrong"
        return error(code, message, exc.code or 500)

    @app.errorhandler(sqlite3.Error)
    def _db_error(exc: sqlite3.Error):
        incident = uuid.uuid4().hex[:12]
        logger.exception("Database error [%s]", incident)
        return error("DATABASE_ERROR", "A database error occurred", 500, {"incident_id": incident})

    @app.errorhandler(Exception)
    def _unhandled(exc: Exception):
        incident = uuid.uuid4().hex[:12]
        logger.exception("Unhandled error [%s]", incident)
        return error("INTERNAL_SERVER_ERROR", "Something went wrong", 500, {"incident_id": incident})
