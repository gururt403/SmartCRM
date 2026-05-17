from flask import Blueprint, jsonify, request, session
from werkzeug.security import check_password_hash, generate_password_hash

from database.db import get_connection, now_iso, row_to_dict
from routes.helpers import current_user, login_required

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.post("/register")
def register():
    payload = request.get_json(silent=True) or {}
    name = payload.get("name", "").strip()
    email = payload.get("email", "").strip().lower()
    password = payload.get("password", "")
    role = payload.get("role", "salesperson")

    if not name or not email or not password:
        return jsonify({"message": "Name, email, and password are required"}), 400

    if role not in {"admin", "salesperson"}:
        role = "salesperson"

    with get_connection() as connection:
        existing_user = connection.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if existing_user:
            return jsonify({"message": "Email already registered"}), 409
        connection.execute(
            "INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)",
            (name, email, generate_password_hash(password), role, now_iso()),
        )
        connection.commit()

    return jsonify({"message": "Registration successful"}), 201


@auth_bp.post("/login")
def login():
    payload = request.get_json(silent=True) or {}
    email = payload.get("email", "").strip().lower()
    password = payload.get("password", "")

    with get_connection() as connection:
        user = connection.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()

    if user is None or not check_password_hash(user["password_hash"], password):
        return jsonify({"message": "Invalid email or password"}), 401

    session["user_id"] = user["id"]
    session["role"] = user["role"]
    session["email"] = user["email"]
    session["name"] = user["name"]

    return jsonify({"message": "Login successful", "user": row_to_dict(user)}), 200


@auth_bp.post("/logout")
@login_required
def logout():
    session.clear()
    return jsonify({"message": "Logged out successfully"}), 200


@auth_bp.get("/me")
@login_required
def me():
    user = current_user()
    return jsonify({"user": user}), 200
