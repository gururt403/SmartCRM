"""Model inference with graceful degradation.

pandas/scikit-learn/TextBlob are *optional*: if a model file or a library is
missing the app falls back to a transparent heuristic instead of failing the
request, and the response says which path produced the number.
"""

from __future__ import annotations

import logging
import pickle
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from config import settings

logger = logging.getLogger(__name__)

_model_cache: Dict[str, Any] = {}


def _load_model(model_path: Path) -> Optional[Any]:
    """Load and cache a pickled pipeline. Cached because unpickling a
    RandomForest on every request is the single most expensive thing here."""
    key = str(model_path)
    if key in _model_cache:
        return _model_cache[key]
    if not model_path.exists():
        return None
    try:
        with model_path.open("rb") as file:
            model = pickle.load(file)
    except Exception as exc:  # corrupt pickle, version skew, missing sklearn
        logger.warning("Could not load model %s: %s", model_path, exc)
        model = None
    _model_cache[key] = model
    return model


def clear_model_cache() -> None:
    _model_cache.clear()


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def _predict_with(model_path: Path, features: Dict[str, Any]) -> Optional[float]:
    model = _load_model(model_path)
    if model is None:
        return None
    try:
        import pandas as pd  # imported lazily so the API runs without pandas
    except ImportError:
        return None
    try:
        return _clamp(model.predict_proba(pd.DataFrame([features]))[0][1])
    except Exception as exc:
        logger.warning("Inference failed for %s: %s", model_path.name, exc)
        return None


def classify_conversion(probability: float) -> str:
    if probability >= 0.7:
        return "High conversion"
    return "Medium conversion" if probability >= 0.4 else "Low conversion"


def classify_churn(probability: float) -> str:
    if probability >= 0.7:
        return "High risk"
    return "Medium risk" if probability >= 0.4 else "Low risk"


def predict_lead_conversion(payload: Dict[str, Any]) -> Dict[str, Any]:
    features = {
        "budget": float(payload.get("budget") or 0),
        "interaction_count": int(payload.get("interaction_count") or 0),
        "company_type": payload.get("company_type") or "SMB",
        "response_rate": float(payload.get("response_rate") or 0),
        "previous_purchases": int(payload.get("previous_purchases") or 0),
    }
    probability = _predict_with(settings.LEAD_MODEL_PATH, features)
    source = "model"
    if probability is None:
        source = "heuristic"
        probability = _clamp(
            min(features["budget"] / 100_000, 1.0) * 0.40
            + features["response_rate"] * 0.35
            + min(features["interaction_count"], 20) * 0.01
            + min(features["previous_purchases"], 10) * 0.02
        )
    return {
        "probability": round(probability, 4),
        "percentage": round(probability * 100, 2),
        "label": classify_conversion(probability),
        "badge": classify_conversion(probability),
        "source": source,
    }


def predict_churn(payload: Dict[str, Any]) -> Dict[str, Any]:
    features = {
        "engagement_score": float(payload.get("engagement_score") or 0),
        "support_tickets": int(payload.get("support_tickets") or 0),
        "days_since_last_purchase": int(payload.get("days_since_last_purchase") or 0),
    }
    probability = _predict_with(settings.CHURN_MODEL_PATH, features)
    source = "model"
    if probability is None:
        source = "heuristic"
        probability = _clamp(
            0.15
            + (0.5 - features["engagement_score"]) * 0.5
            + features["support_tickets"] * 0.02
            + features["days_since_last_purchase"] * 0.002
        )
    return {
        "probability": round(probability, 4),
        "percentage": round(probability * 100, 2),
        "risk_level": classify_churn(probability),
        "source": source,
    }


POSITIVE_WORDS = {
    "great", "excellent", "happy", "love", "good", "interested", "perfect", "amazing",
    "thanks", "thank", "awesome", "excited", "impressed", "helpful", "yes", "keen",
}
NEGATIVE_WORDS = {
    "bad", "poor", "unhappy", "angry", "expensive", "disappointed", "cancel", "refund",
    "terrible", "slow", "issue", "problem", "never", "worst", "not", "delay",
}


def analyze_sentiment(text: str) -> Dict[str, Any]:
    text = text or ""
    try:
        from textblob import TextBlob

        polarity = float(TextBlob(text).sentiment.polarity)
        source = "textblob"
    except Exception:
        # Lexicon fallback keeps the feature usable without the NLP corpus.
        tokens = re.findall(r"[a-z']+", text.lower())
        if not tokens:
            polarity, source = 0.0, "lexicon"
        else:
            positive = sum(token in POSITIVE_WORDS for token in tokens)
            negative = sum(token in NEGATIVE_WORDS for token in tokens)
            polarity = _clamp_signed((positive - negative) / max(len(tokens) ** 0.5, 1))
            source = "lexicon"

    if polarity > 0.1:
        label = "Positive"
    elif polarity < -0.1:
        label = "Negative"
    else:
        label = "Neutral"

    return {
        "score": round(polarity, 4),
        "label": label,
        "confidence": round(min(abs(polarity), 1.0) * 100, 2),
        "source": source,
    }


def _clamp_signed(value: float) -> float:
    return max(-1.0, min(1.0, float(value)))


EMAIL_TEMPLATE_RULES: List[Tuple[str, str]] = [
    ("pricing", "Thanks for your interest — I'll send over our pricing breakdown today."),
    ("price", "Happy to help with pricing. I've attached the options that fit your team size."),
    ("demo", "I'd be glad to walk you through a demo. Would this week work for a 30-minute call?"),
    ("meeting", "Thanks for reaching out — share a couple of times that suit you and I'll send an invite."),
    ("discount", "Appreciate you asking. Let me check what we can do on price and come back to you today."),
    ("support", "Thanks for flagging this. I'm looping in our support team and will follow up with an update."),
    ("proposal", "I'll put together a tailored proposal and have it with you within two business days."),
    ("contract", "I'll send the contract over for review and flag anything that needs your sign-off."),
    ("cancel", "I'm sorry to hear that. Could we set up a short call so I can understand what went wrong?"),
]

DEFAULT_SUGGESTIONS = [
    "Thanks for getting in touch — I've received your message and will come back to you shortly.",
    "Appreciate the note. I'll pull the details together and follow up today.",
    "Thanks for reaching out. Let me know a good time to talk through next steps.",
]


def suggest_email_replies(message: str) -> Dict[str, Any]:
    normalized = (message or "").lower()
    matches = [template for keyword, template in EMAIL_TEMPLATE_RULES if keyword in normalized]
    suggestions = (matches or DEFAULT_SUGGESTIONS)[:3]
    sentiment = analyze_sentiment(message)
    return {"suggestions": suggestions, "detected_sentiment": sentiment["label"], "matched_rules": len(matches)}
