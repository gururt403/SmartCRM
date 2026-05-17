from functools import wraps

from flask import jsonify, session

from database.db import get_connection, row_to_dict


def current_user():
    user_id = session.get("user_id")
    if not user_id:
        return None
    with get_connection() as connection:
        user = connection.execute("SELECT id, name, email, role, created_at FROM users WHERE id = ?", (user_id,)).fetchone()
        return row_to_dict(user)


def login_required(view_function):
    @wraps(view_function)
    def wrapped(*args, **kwargs):
        if not session.get("user_id"):
            return jsonify({"message": "Authentication required"}), 401
        return view_function(*args, **kwargs)

    return wrapped


def role_required(*allowed_roles):
    def decorator(view_function):
        @wraps(view_function)
        def wrapped(*args, **kwargs):
            user_role = session.get("role")
            if user_role not in allowed_roles:
                return jsonify({"message": "You do not have permission to access this resource"}), 403
            return view_function(*args, **kwargs)

        return wrapped

    return decorator
