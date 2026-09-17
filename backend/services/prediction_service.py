"""Prediction endpoints: run the model, persist the result, sync the lead."""

from __future__ import annotations

from typing import Any, Dict, Optional

from core.errors import NotFoundError
from core.security import is_privileged
from database.db import db_session, now_iso
from ml_models.predictors import analyze_sentiment, predict_churn, predict_lead_conversion, suggest_email_replies
from repositories.engagement import PredictionRepository
from repositories.leads import LeadRepository


def _lead_or_none(connection, lead_id: Optional[int], user: Dict[str, Any]):
    if not lead_id:
        return None
    lead = LeadRepository(connection).get_detailed(lead_id)
    if lead is None:
        raise NotFoundError("Lead not found")
    if not is_privileged(user) and lead.get("owner_id") not in (None, user["user_id"]):
        raise NotFoundError("Lead not found")
    return lead


def _run(kind: str, data: Dict[str, Any], user: Dict[str, Any], compute, lead_updates) -> Dict[str, Any]:
    lead_id = data.get("lead_id")
    with db_session(write=True) as connection:
        lead = _lead_or_none(connection, lead_id, user)
        # Fall back to the lead's stored attributes for anything not supplied.
        features = dict(data)
        if lead:
            for key, value in features.items():
                if value in (None, 0, 0.0, "") and key in lead and lead[key] not in (None, ""):
                    features[key] = lead[key]
        result = compute(features)
        PredictionRepository(connection).record(kind, features, result, lead_id, user["user_id"])
        if lead:
            updates = lead_updates(result)
            if updates:
                connection.execute(
                    f"UPDATE leads SET {', '.join(f'{k} = ?' for k in updates)}, updated_at = ? WHERE id = ?",
                    (*updates.values(), now_iso(), lead_id),
                )
        return result


def score_lead(data: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
    return _run("lead_scoring", data, user, predict_lead_conversion,
                lambda result: {"conversion_probability": result["probability"]})


def score_churn(data: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
    return _run("churn", data, user, predict_churn,
                lambda result: {"churn_probability": result["probability"]})


def score_sentiment(data: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
    return _run("sentiment", data, user, lambda features: analyze_sentiment(features.get("text", "")),
                lambda result: {"sentiment_label": result["label"], "sentiment_score": result["score"]})


def email_suggestions(data: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
    return _run("email_suggestions", data, user,
                lambda features: suggest_email_replies(features.get("message", "")), lambda result: {})


def history(limit: int = 10) -> list:
    with db_session() as connection:
        return PredictionRepository(connection).recent(limit)
