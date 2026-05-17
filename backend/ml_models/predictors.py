import json
import pickle
from pathlib import Path
from typing import Dict, List, Tuple

import pandas as pd
from textblob import TextBlob

from config import CHURN_MODEL_PATH, LEAD_MODEL_PATH


def load_model(model_path: Path):
    if not model_path.exists():
        return None
    with model_path.open("rb") as file:
        return pickle.load(file)


def ensure_probability(probability: float) -> float:
    return max(0.0, min(1.0, float(probability)))


def classify_conversion(probability: float) -> str:
    if probability >= 0.7:
        return "High conversion"
    if probability >= 0.4:
        return "Medium conversion"
    return "Low conversion"


def classify_churn(probability: float) -> str:
    if probability >= 0.7:
        return "High risk"
    if probability >= 0.4:
        return "Medium risk"
    return "Low risk"


def predict_lead_conversion(payload: Dict) -> Dict:
    model = load_model(LEAD_MODEL_PATH)
    if model is None:
        probability = ensure_probability(
            (payload.get("budget", 0) / 100000) * 0.4
            + payload.get("response_rate", 0) * 0.35
            + min(payload.get("interaction_count", 0), 20) * 0.01
            + min(payload.get("previous_purchases", 0), 10) * 0.02
        )
    else:
        input_frame = pd.DataFrame([payload])
        probability = ensure_probability(model.predict_proba(input_frame)[0][1])
    return {
        "probability": round(probability, 4),
        "percentage": round(probability * 100, 2),
        "badge": classify_conversion(probability),
        "label": classify_conversion(probability),
    }


def predict_churn(payload: Dict) -> Dict:
    model = load_model(CHURN_MODEL_PATH)
    if model is None:
        probability = ensure_probability(
            0.15
            + (0.5 - payload.get("engagement_score", 0.5)) * 0.5
            + payload.get("support_tickets", 0) * 0.02
            + payload.get("days_since_last_purchase", 0) * 0.002
        )
    else:
        input_frame = pd.DataFrame([payload])
        probability = ensure_probability(model.predict_proba(input_frame)[0][1])
    return {
        "probability": round(probability, 4),
        "percentage": round(probability * 100, 2),
        "risk_level": classify_churn(probability),
    }


def analyze_sentiment(text: str) -> Dict:
    polarity = TextBlob(text or "").sentiment.polarity
    if polarity > 0.1:
        label = "Positive"
    elif polarity < -0.1:
        label = "Negative"
    else:
        label = "Neutral"
    return {
        "score": round(polarity, 4),
        "label": label,
        "confidence": round(abs(polarity) * 100, 2),
    }


EMAIL_TEMPLATE_RULES: List[Tuple[str, str]] = [
    ("pricing", "Thank you for your interest. We will share pricing details shortly."),
    ("price", "Thank you for reaching out. Our pricing options are attached below for your review."),
    ("demo", "We would be happy to schedule a product demo at your convenience."),
    ("meeting", "Thank you. Please share your preferred time and we will arrange a meeting."),
    ("discount", "We appreciate your interest. We will review the best available offer and get back to you."),
    ("support", "Thank you for contacting us. Our support team will follow up shortly."),
    ("proposal", "We will prepare a tailored proposal and send it to you soon."),
]


def suggest_email_replies(message: str) -> Dict:
    normalized = (message or "").lower()
    matches = [template for keyword, template in EMAIL_TEMPLATE_RULES if keyword in normalized]
    if not matches:
        matches = [
            "Thank you for contacting SmartCRM AI. We have received your message and will respond shortly.",
            "We appreciate your inquiry and will share the requested information soon.",
            "Thank you for reaching out. Our team will get back to you with next steps shortly.",
        ]
    return {"suggestions": matches[:3]}
