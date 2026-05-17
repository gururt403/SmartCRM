from flask import Blueprint, jsonify, request, session

from database.db import get_connection, now_iso, row_to_dict, rows_to_dicts
from routes.helpers import login_required

leads_bp = Blueprint("leads", __name__, url_prefix="/api/leads")


def to_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def to_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def upsert_customer_from_lead(connection, lead_id: int, lead_row) -> None:
    if lead_row["status"].lower() != "converted":
        return

    existing_customer = connection.execute("SELECT id FROM customers WHERE lead_id = ?", (lead_id,)).fetchone()
    if existing_customer:
        connection.execute(
            """
            UPDATE customers
            SET name = ?, email = ?, company = ?, revenue = ?, churn_probability = ?
            WHERE lead_id = ?
            """,
            (
                lead_row["name"],
                lead_row["email"],
                lead_row["company"],
                lead_row["budget"],
                lead_row["churn_probability"],
                lead_id,
            ),
        )
        return

    connection.execute(
        """
        INSERT INTO customers (lead_id, name, email, company, revenue, churn_probability, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            lead_id,
            lead_row["name"],
            lead_row["email"],
            lead_row["company"],
            lead_row["budget"],
            lead_row["churn_probability"],
            now_iso(),
        ),
    )


@leads_bp.get("")
@login_required
def list_leads():
    search = request.args.get("search", "").strip().lower()
    status = request.args.get("status", "").strip().lower()
    company_type = request.args.get("company_type", "").strip().lower()

    query = "SELECT * FROM leads WHERE 1=1"
    params = []

    if search:
        query += " AND (LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(company) LIKE ? OR LOWER(lead_source) LIKE ?)"
        wildcard = f"%{search}%"
        params.extend([wildcard, wildcard, wildcard, wildcard])

    if status:
        query += " AND LOWER(status) = ?"
        params.append(status)

    if company_type:
        query += " AND LOWER(company_type) = ?"
        params.append(company_type)

    query += " ORDER BY datetime(updated_at) DESC"

    with get_connection() as connection:
        rows = connection.execute(query, params).fetchall()

    return jsonify({"leads": rows_to_dicts(rows)}), 200


@leads_bp.post("")
@login_required
def create_lead():
    payload = request.get_json(silent=True) or {}
    required_fields = ["name", "email", "company"]
    missing_fields = [field for field in required_fields if not payload.get(field)]
    if missing_fields:
        return jsonify({"message": f"Missing fields: {', '.join(missing_fields)}"}), 400

    lead_data = {
        "name": payload.get("name", "").strip(),
        "email": payload.get("email", "").strip(),
        "phone": payload.get("phone", "").strip(),
        "company": payload.get("company", "").strip(),
        "budget": to_float(payload.get("budget")),
        "lead_source": payload.get("lead_source", "Website").strip(),
        "status": payload.get("status", "New").strip(),
        "last_contact_date": payload.get("last_contact_date") or None,
        "company_type": payload.get("company_type", "SMB").strip(),
        "interaction_count": to_int(payload.get("interaction_count")),
        "response_rate": to_float(payload.get("response_rate")),
        "previous_purchases": to_int(payload.get("previous_purchases")),
        "sentiment_label": payload.get("sentiment_label", "Neutral").strip(),
        "churn_probability": to_float(payload.get("churn_probability")),
        "conversion_probability": to_float(payload.get("conversion_probability")),
    }

    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO leads (
                name, email, phone, company, budget, lead_source, status,
                last_contact_date, company_type, interaction_count, response_rate,
                previous_purchases, sentiment_label, churn_probability,
                conversion_probability, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                lead_data["name"],
                lead_data["email"],
                lead_data["phone"],
                lead_data["company"],
                lead_data["budget"],
                lead_data["lead_source"],
                lead_data["status"],
                lead_data["last_contact_date"],
                lead_data["company_type"],
                lead_data["interaction_count"],
                lead_data["response_rate"],
                lead_data["previous_purchases"],
                lead_data["sentiment_label"],
                lead_data["churn_probability"],
                lead_data["conversion_probability"],
                now_iso(),
                now_iso(),
            ),
        )
        lead_id = cursor.lastrowid
        row = connection.execute("SELECT * FROM leads WHERE id = ?", (lead_id,)).fetchone()
        upsert_customer_from_lead(connection, lead_id, row)
        connection.commit()

    return jsonify({"message": "Lead created successfully", "lead": row_to_dict(row)}), 201


@leads_bp.put("/<int:lead_id>")
@login_required
def update_lead(lead_id: int):
    payload = request.get_json(silent=True) or {}
    with get_connection() as connection:
        existing = connection.execute("SELECT * FROM leads WHERE id = ?", (lead_id,)).fetchone()
        if existing is None:
            return jsonify({"message": "Lead not found"}), 404

        updated = {
            "name": payload.get("name", existing["name"]),
            "email": payload.get("email", existing["email"]),
            "phone": payload.get("phone", existing["phone"]),
            "company": payload.get("company", existing["company"]),
            "budget": to_float(payload.get("budget", existing["budget"])),
            "lead_source": payload.get("lead_source", existing["lead_source"]),
            "status": payload.get("status", existing["status"]),
            "last_contact_date": payload.get("last_contact_date", existing["last_contact_date"]),
            "company_type": payload.get("company_type", existing["company_type"]),
            "interaction_count": to_int(payload.get("interaction_count", existing["interaction_count"])),
            "response_rate": to_float(payload.get("response_rate", existing["response_rate"])),
            "previous_purchases": to_int(payload.get("previous_purchases", existing["previous_purchases"])),
            "sentiment_label": payload.get("sentiment_label", existing["sentiment_label"]),
            "churn_probability": to_float(payload.get("churn_probability", existing["churn_probability"])),
            "conversion_probability": to_float(payload.get("conversion_probability", existing["conversion_probability"])),
        }

        connection.execute(
            """
            UPDATE leads
            SET name = ?, email = ?, phone = ?, company = ?, budget = ?, lead_source = ?, status = ?,
                last_contact_date = ?, company_type = ?, interaction_count = ?, response_rate = ?,
                previous_purchases = ?, sentiment_label = ?, churn_probability = ?, conversion_probability = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                updated["name"],
                updated["email"],
                updated["phone"],
                updated["company"],
                updated["budget"],
                updated["lead_source"],
                updated["status"],
                updated["last_contact_date"],
                updated["company_type"],
                updated["interaction_count"],
                updated["response_rate"],
                updated["previous_purchases"],
                updated["sentiment_label"],
                updated["churn_probability"],
                updated["conversion_probability"],
                now_iso(),
                lead_id,
            ),
        )
        row = connection.execute("SELECT * FROM leads WHERE id = ?", (lead_id,)).fetchone()
        upsert_customer_from_lead(connection, lead_id, row)
        connection.commit()

    return jsonify({"message": "Lead updated successfully", "lead": row_to_dict(row)}), 200


@leads_bp.delete("/<int:lead_id>")
@login_required
def delete_lead(lead_id: int):
    with get_connection() as connection:
        row = connection.execute("SELECT id FROM leads WHERE id = ?", (lead_id,)).fetchone()
        if row is None:
            return jsonify({"message": "Lead not found"}), 404
        connection.execute("DELETE FROM customers WHERE lead_id = ?", (lead_id,))
        connection.execute("DELETE FROM predictions WHERE lead_id = ?", (lead_id,))
        connection.execute("DELETE FROM interactions WHERE lead_id = ?", (lead_id,))
        connection.execute("DELETE FROM leads WHERE id = ?", (lead_id,))
        connection.commit()
    return jsonify({"message": "Lead deleted successfully"}), 200


@leads_bp.post("/<int:lead_id>/interactions")
@login_required
def create_interaction(lead_id: int):
    payload = request.get_json(silent=True) or {}
    interaction_type = payload.get("interaction_type", "Call").strip()
    notes = payload.get("notes", "").strip()

    with get_connection() as connection:
        lead = connection.execute("SELECT id, interaction_count FROM leads WHERE id = ?", (lead_id,)).fetchone()
        if lead is None:
            return jsonify({"message": "Lead not found"}), 404
        connection.execute(
            "INSERT INTO interactions (lead_id, user_id, interaction_type, notes, created_at) VALUES (?, ?, ?, ?, ?)",
            (lead_id, session.get("user_id"), interaction_type, notes, now_iso()),
        )
        connection.execute(
            "UPDATE leads SET interaction_count = ?, last_contact_date = ?, updated_at = ? WHERE id = ?",
            (lead["interaction_count"] + 1, now_iso().split("T")[0], now_iso(), lead_id),
        )
        connection.commit()

    return jsonify({"message": "Interaction logged successfully"}), 201
