from __future__ import annotations

from typing import Any, Dict, List, Optional

from database.db import now_iso
from repositories.base import BaseRepository, fetch_all, fetch_one

#: Never selected into an API response.
SENSITIVE_COLUMNS = ("password_hash",)

PUBLIC_COLUMNS = "id, name, email, role, is_active, last_login_at, created_at, updated_at"


class UserRepository(BaseRepository):
    table = "users"
    columns = ("name", "email", "password_hash", "role", "is_active", "last_login_at")
    sortable = ("created_at", "name", "email", "role")
    searchable = ("name", "email")

    def get_public(self, user_id: int) -> Optional[Dict[str, Any]]:
        return fetch_one(self.connection, f"SELECT {PUBLIC_COLUMNS} FROM users WHERE id = ?", (user_id,))

    def get_by_email_with_secret(self, email: str) -> Optional[Dict[str, Any]]:
        """Only the auth service may call this — it returns the password hash."""
        return fetch_one(self.connection, "SELECT * FROM users WHERE email = ? COLLATE NOCASE", (email,))

    def email_exists(self, email: str) -> bool:
        return fetch_one(self.connection, "SELECT id FROM users WHERE email = ? COLLATE NOCASE", (email,)) is not None

    def list_public(self) -> List[Dict[str, Any]]:
        return fetch_all(self.connection, f"SELECT {PUBLIC_COLUMNS} FROM users WHERE is_active = 1 ORDER BY name ASC")

    def touch_login(self, user_id: int) -> None:
        self.connection.execute(
            "UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?", (now_iso(), now_iso(), user_id)
        )

    def set_password(self, user_id: int, password_hash: str) -> None:
        self.connection.execute(
            "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?", (password_hash, now_iso(), user_id)
        )
