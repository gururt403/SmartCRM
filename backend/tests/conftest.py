from __future__ import annotations

import sys
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from config import TestConfig  # noqa: E402
from core.security import reset_rate_limits  # noqa: E402


@pytest.fixture()
def app(tmp_path, monkeypatch):
    db_path = tmp_path / "test.db"
    monkeypatch.setattr(TestConfig, "DATABASE_PATH", db_path, raising=False)
    reset_rate_limits()

    from app import create_app

    application = create_app(TestConfig)
    application.config.update(TESTING=True)
    yield application


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def admin(app):
    """A privileged user, created directly so tests do not depend on seeds."""
    from werkzeug.security import generate_password_hash

    from database.db import db_session
    from repositories.users import UserRepository

    with db_session(write=True) as connection:
        UserRepository(connection).insert({
            "name": "Admin",
            "email": "admin@test.local",
            "password_hash": generate_password_hash("Password123"),
            "role": "admin",
            "is_active": 1,
        })
    return {"email": "admin@test.local", "password": "Password123"}


@pytest.fixture()
def auth_client(client, admin):
    response = client.post("/api/v1/auth/login", json=admin)
    assert response.status_code == 200
    return client


def api(response):
    return response.get_json()
