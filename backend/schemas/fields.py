"""A tiny declarative validator.

Deliberately dependency-free: the payloads here are small and flat, so a
100-line validator beats adding a schema library to the install surface. Every
failure is collected, so the client gets all field errors in one response.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any, Callable, Dict, Iterable, Optional, Sequence

from core.errors import ValidationError

MISSING = object()

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$")
PHONE_RE = re.compile(r"^[0-9+\-()\s]{6,20}$")


@dataclass
class Field:
    type: str = "string"
    required: bool = False
    default: Any = MISSING
    choices: Optional[Sequence[Any]] = None
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    minimum: Optional[float] = None
    maximum: Optional[float] = None
    nullable: bool = False
    strip: bool = True
    transform: Optional[Callable[[Any], Any]] = None

    def clean(self, name: str, raw: Any) -> Any:
        if raw is None:
            if self.nullable or not self.required:
                return None
            raise ValueError("must not be null")

        if self.type == "string":
            if not isinstance(raw, str):
                raw = str(raw)
            value = raw.strip() if self.strip else raw
            if self.min_length is not None and len(value) < self.min_length:
                raise ValueError(f"must be at least {self.min_length} characters")
            if self.max_length is not None and len(value) > self.max_length:
                raise ValueError(f"must be at most {self.max_length} characters")
        elif self.type == "email":
            value = str(raw).strip().lower()
            if not EMAIL_RE.match(value):
                raise ValueError("must be a valid email address")
        elif self.type == "phone":
            value = str(raw).strip()
            if value and not PHONE_RE.match(value):
                raise ValueError("must be a valid phone number")
        elif self.type == "int":
            try:
                value = int(raw)
            except (TypeError, ValueError):
                raise ValueError("must be an integer")
        elif self.type == "float":
            try:
                value = float(raw)
            except (TypeError, ValueError):
                raise ValueError("must be a number")
        elif self.type == "bool":
            if isinstance(raw, bool):
                value = raw
            else:
                value = str(raw).strip().lower() in {"1", "true", "yes", "on"}
        elif self.type == "date":
            value = str(raw).strip()
            if value:
                try:
                    date.fromisoformat(value[:10])
                except ValueError:
                    raise ValueError("must be an ISO date (YYYY-MM-DD)")
                value = value[:10]
            else:
                value = None
        elif self.type == "datetime":
            value = str(raw).strip()
            if value:
                try:
                    datetime.fromisoformat(value.replace("Z", "+00:00"))
                except ValueError:
                    raise ValueError("must be an ISO-8601 timestamp")
            else:
                value = None
        else:  # pragma: no cover - guarded by developer usage
            raise ValueError(f"unknown field type {self.type}")

        if self.type in {"int", "float"}:
            if self.minimum is not None and value < self.minimum:
                raise ValueError(f"must be >= {self.minimum}")
            if self.maximum is not None and value > self.maximum:
                raise ValueError(f"must be <= {self.maximum}")

        if self.choices is not None and value not in self.choices:
            raise ValueError(f"must be one of: {', '.join(map(str, self.choices))}")

        if self.required and self.type in {"string", "email", "phone"} and not value:
            raise ValueError("is required")

        return self.transform(value) if self.transform else value


def validate(payload: Any, schema: Dict[str, Field], *, partial: bool = False) -> Dict[str, Any]:
    """Validate ``payload`` against ``schema``.

    ``partial=True`` (used by PATCH/PUT) only validates the keys present, which
    also blocks mass assignment: unknown keys are dropped in both modes.
    """
    if not isinstance(payload, dict):
        raise ValidationError("Request body must be a JSON object")

    cleaned: Dict[str, Any] = {}
    errors: Dict[str, str] = {}

    for name, field in schema.items():
        present = name in payload
        if not present:
            if partial:
                continue
            if field.required:
                errors[name] = "is required"
                continue
            if field.default is not MISSING:
                cleaned[name] = field.default
            continue
        try:
            cleaned[name] = field.clean(name, payload[name])
        except ValueError as exc:
            errors[name] = str(exc)

    if errors:
        raise ValidationError("Invalid request", errors)

    return cleaned


def require_json(payload: Any) -> Dict[str, Any]:
    if not isinstance(payload, dict):
        raise ValidationError("Request body must be a JSON object")
    return payload


def only(keys: Iterable[str], schema: Dict[str, Field]) -> Dict[str, Field]:
    keys = set(keys)
    return {name: field for name, field in schema.items() if name in keys}
