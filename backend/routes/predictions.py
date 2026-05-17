import json

from flask import Blueprint, jsonify, request, session

from database.db import get_connection, now_iso
from ml_models.predictors import analyze_sentiment, predict_churn, predict_lead_conversion, suggest_email_replies
from routes.helpers import login_required

predictions_bp = Blueprint("predictions", __name__, url_prefix="/api/predictions")


def store_prediction(lead_id, prediction_type: str, input_data: dict, result_data: dict) -> None:
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO predictions (lead_id, user_id, prediction_type, input_data, result_data, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                lead_id,
                session.get("user_id"),
                prediction_type,
                json.dumps(input_data),
                json.dumps(result_data),
                now_iso(),
            ),
        )
        connection.commit()


@predictions_bp.post("/lead-score")
@login_required
def lead_score():
    payload = request.get_json(silent=True) or {}
    lead_id = payload.get("lead_id")
    result = predict_lead_conversion(payload)
    store_prediction(lead_id, "lead_scoring", payload, result)

    if lead_id:
        with get_connection() as connection:
            connection.execute(
                "UPDATE leads SET conversion_probability = ?, updated_at = ? WHERE id = ?",
                (result["probability"], now_iso(), lead_id),
            )
            connection.commit()

    return jsonify(result), 200


@predictions_bp.post("/sentiment")
@login_required
def sentiment():
    payload = request.get_json(silent=True) or {}
    lead_id = payload.get("lead_id")
    text = payload.get("text", "")
    result = analyze_sentiment(text)
    store_prediction(lead_id, "sentiment", payload, result)

    if lead_id:
        with get_connection() as connection:
            connection.execute(
                "UPDATE leads SET sentiment_label = ?, updated_at = ? WHERE id = ?",
                (result["label"], now_iso(), lead_id),
            )
            connection.commit()

    return jsonify(result), 200


@predictions_bp.post("/churn")
@login_required
def churn():
    payload = request.get_json(silent=True) or {}
    lead_id = payload.get("lead_id")
    result = predict_churn(payload)
    store_prediction(lead_id, "churn", payload, result)

    if lead_id:
        with get_connection() as connection:
            connection.execute(
                "UPDATE leads SET churn_probability = ?, updated_at = ? WHERE id = ?",
                (result["probability"], now_iso(), lead_id),
            )
            connection.commit()

    return jsonify(result), 200


@predictions_bp.post("/email-suggestions")
@login_required
def email_suggestions():
    payload = request.get_json(silent=True) or {}
    result = suggest_email_replies(payload.get("message", ""))
    store_prediction(payload.get("lead_id"), "email_suggestions", payload, result)
    return jsonify(result), 200
