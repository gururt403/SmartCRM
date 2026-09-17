"""Application configuration, sourced from environment variables.

Nothing secret is hard-coded: every sensitive value is read from the
environment (optionally seeded by a local ``.env`` file) and the app refuses to
boot in production without an explicit ``SECRET_KEY``.
"""

from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent


def _load_dotenv() -> None:
    """Minimal .env loader so we do not add a dependency for 15 lines of code."""
    for candidate in (BASE_DIR / ".env", PROJECT_ROOT / ".env"):
        if not candidate.exists():
            continue
        for raw_line in candidate.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip().strip("'\""))


_load_dotenv()


def _bool(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


def _int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


class Config:
    ENV = os.getenv("FLASK_ENV", "development")
    DEBUG = _bool("FLASK_DEBUG", ENV == "development")
    TESTING = False

    SECRET_KEY = os.getenv("SECRET_KEY") or ("dev-only-insecure-key" if ENV != "production" else "")

    DATABASE_PATH = Path(os.getenv("DATABASE_PATH", BASE_DIR / "database" / "smartcrm.db"))

    LEAD_MODEL_PATH = Path(os.getenv("LEAD_MODEL_PATH", BASE_DIR / "ml_models" / "lead_model.pkl"))
    CHURN_MODEL_PATH = Path(os.getenv("CHURN_MODEL_PATH", BASE_DIR / "ml_models" / "churn_model.pkl"))
    LEAD_DATASET_PATH = Path(os.getenv("LEAD_DATASET_PATH", PROJECT_ROOT / "datasets" / "leads_sample.csv"))
    CHURN_DATASET_PATH = Path(os.getenv("CHURN_DATASET_PATH", PROJECT_ROOT / "datasets" / "churn_sample.csv"))

    CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",") if o.strip()]

    SESSION_COOKIE_NAME = "smartcrm_session"
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = os.getenv("SESSION_COOKIE_SAMESITE", "Lax")
    SESSION_COOKIE_SECURE = _bool("SESSION_COOKIE_SECURE", ENV == "production")
    PERMANENT_SESSION_LIFETIME = _int("SESSION_LIFETIME_SECONDS", 60 * 60 * 12)

    MAX_CONTENT_LENGTH = _int("MAX_CONTENT_LENGTH", 1 * 1024 * 1024)

    SEED_DEMO_DATA = _bool("SEED_DEMO_DATA", ENV != "production")
    DEMO_ADMIN_PASSWORD = os.getenv("DEMO_ADMIN_PASSWORD", "admin123")
    DEMO_SALES_PASSWORD = os.getenv("DEMO_SALES_PASSWORD", "sales123")

    # Simple in-process rate limiting for auth endpoints.
    AUTH_RATE_LIMIT = _int("AUTH_RATE_LIMIT", 10)
    AUTH_RATE_WINDOW_SECONDS = _int("AUTH_RATE_WINDOW_SECONDS", 60)

    DEFAULT_PAGE_SIZE = _int("DEFAULT_PAGE_SIZE", 20)
    MAX_PAGE_SIZE = _int("MAX_PAGE_SIZE", 100)

    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

    @classmethod
    def validate(cls) -> None:
        if cls.ENV == "production" and not cls.SECRET_KEY:
            raise RuntimeError("SECRET_KEY must be set when FLASK_ENV=production")


class TestConfig(Config):
    ENV = "testing"
    TESTING = True
    DEBUG = False
    SECRET_KEY = "test-secret"
    SEED_DEMO_DATA = False
    AUTH_RATE_LIMIT = 10_000


class _ActiveConfig:
    """Proxy to whichever config the running app was created with.

    Modules do ``from config import settings``; binding a proxy rather than the
    class means ``create_app(TestConfig)`` actually switches the database path
    and seeding behaviour for everything downstream.
    """

    _target = Config

    def __getattr__(self, name):
        return getattr(type(self)._target, name)


settings = _ActiveConfig()


def activate(config_object) -> None:
    _ActiveConfig._target = config_object
