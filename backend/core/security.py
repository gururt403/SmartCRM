"""Authentication, authorization and lightweight rate limiting."""

from __future__ import annotations

import time
from collections import defaultdict, deque
from functools import wraps
from typing import Any, Callable, Dict, Optional

from flask import current_app, g, request, session

from core.errors import AuthenticationError, AuthorizationError, RateLimitError

ROLE_ADMIN = "admin"
ROLE_MANAGER = "manager"
ROLE_SALES = "salesperson"
ROLES = (ROLE_ADMIN, ROLE_MANAGER, ROLE_SALES)

#: Roles that may read and mutate records belonging to other users.
PRIVILEGED_ROLES = (ROLE_ADMIN, ROLE_MANAGER)

_SESSION_KEYS = ("user_id", "role", "email", "name")


def establish_session(user: Dict[str, Any]) -> None:
    session.clear()
    session["user_id"] = user["id"]
    session["role"] = user["role"]
    session["email"] = user["email"]
    session["name"] = user["name"]
    session.permanent = True


def destroy_session() -> None:
    session.clear()


def session_user() -> Optional[Dict[str, Any]]:
    user_id = session.get("user_id")
    if not user_id:
        return None
    return {key: session.get(key) for key in _SESSION_KEYS}


def current_user() -> Dict[str, Any]:
    user = session_user()
    if not user:
        raise AuthenticationError("Authentication required")
    return user


def is_privileged(user: Optional[Dict[str, Any]] = None) -> bool:
    user = user or session_user() or {}
    return user.get("role") in PRIVILEGED_ROLES


def login_required(view: Callable) -> Callable:
    @wraps(view)
    def wrapped(*args, **kwargs):
        g.user = current_user()
        return view(*args, **kwargs)

    return wrapped


def role_required(*allowed_roles: str) -> Callable:
    def decorator(view: Callable) -> Callable:
        @wraps(view)
        def wrapped(*args, **kwargs):
            user = current_user()
            g.user = user
            if user.get("role") not in allowed_roles:
                raise AuthorizationError("You do not have permission to perform this action")
            return view(*args, **kwargs)

        return wrapped

    return decorator


_hits: Dict[str, deque] = defaultdict(deque)


def rate_limit(bucket: str) -> Callable:
    """Fixed-window limiter, per client IP. In-process by design: this app runs
    as a single Flask process, so there is no reason to pull in Redis."""

    def decorator(view: Callable) -> Callable:
        @wraps(view)
        def wrapped(*args, **kwargs):
            limit = current_app.config.get("AUTH_RATE_LIMIT", 10)
            window = current_app.config.get("AUTH_RATE_WINDOW_SECONDS", 60)
            key = f"{bucket}:{request.remote_addr or 'unknown'}"
            now = time.monotonic()
            stamps = _hits[key]
            while stamps and now - stamps[0] > window:
                stamps.popleft()
            if len(stamps) >= limit:
                raise RateLimitError("Too many attempts. Please try again later.", {"retry_after_seconds": window})
            stamps.append(now)
            return view(*args, **kwargs)

        return wrapped

    return decorator


def reset_rate_limits() -> None:
    _hits.clear()
