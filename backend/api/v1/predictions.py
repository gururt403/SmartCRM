from flask import Blueprint, g, request

from core.responses import success
from core.security import login_required
from schemas.crm import CHURN_SCHEMA, EMAIL_SUGGESTION_SCHEMA, LEAD_SCORE_SCHEMA, SENTIMENT_SCHEMA
from schemas.fields import validate
from services import prediction_service

bp = Blueprint("predictions", __name__, url_prefix="/predictions")


@bp.post("/lead-score")
@login_required
def lead_score():
    data = validate(request.get_json(silent=True) or {}, LEAD_SCORE_SCHEMA)
    return success(prediction_service.score_lead(data, g.user), "Lead scored")


@bp.post("/churn")
@login_required
def churn():
    data = validate(request.get_json(silent=True) or {}, CHURN_SCHEMA)
    return success(prediction_service.score_churn(data, g.user), "Churn risk calculated")


@bp.post("/sentiment")
@login_required
def sentiment():
    data = validate(request.get_json(silent=True) or {}, SENTIMENT_SCHEMA)
    return success(prediction_service.score_sentiment(data, g.user), "Sentiment analysed")


@bp.post("/email-suggestions")
@login_required
def email_suggestions():
    data = validate(request.get_json(silent=True) or {}, EMAIL_SUGGESTION_SCHEMA)
    return success(prediction_service.email_suggestions(data, g.user), "Suggestions generated")


@bp.get("/history")
@login_required
def history():
    return success(prediction_service.history())
