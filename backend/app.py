from flask import Flask, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash

from config import CHURN_MODEL_PATH, FRONTEND_ORIGIN, LEAD_MODEL_PATH, SECRET_KEY
from database.db import initialize_database, seed_demo_data
from ml_models.train_churn_model import train_churn_model
from ml_models.train_lead_model import train_lead_model
from routes.auth import auth_bp
from routes.dashboard import dashboard_bp
from routes.leads import leads_bp
from routes.predictions import predictions_bp


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["SECRET_KEY"] = SECRET_KEY
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    CORS(app, supports_credentials=True, origins=[FRONTEND_ORIGIN])

    initialize_database()
    seed_demo_data(generate_password_hash)

    try:
        if not LEAD_MODEL_PATH.exists():
            train_lead_model()
        if not CHURN_MODEL_PATH.exists():
            train_churn_model()
    except Exception as exc:
        app.logger.warning("Model training skipped during startup: %s", exc)

    app.register_blueprint(auth_bp)
    app.register_blueprint(leads_bp)
    app.register_blueprint(predictions_bp)
    app.register_blueprint(dashboard_bp)

    @app.get("/")
    def health_check():
        return jsonify({"message": "SmartCRM AI backend is running locally"}), 200

    return app


app = create_app()


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
