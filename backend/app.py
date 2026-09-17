"""SmartCRM application factory."""

from __future__ import annotations

import logging

from flask import Flask, jsonify, request
from flask_cors import CORS

from api.docs import bp as docs_bp
from api.v1 import build_v1_blueprint
from config import Config, activate
from core.errors import register_error_handlers
from core.responses import success
from database.db import run_migrations
from database.seed import ensure_pipeline_stages, seed_demo_data


def configure_logging(app: Flask) -> None:
    logging.basicConfig(
        level=getattr(logging, app.config.get("LOG_LEVEL", "INFO"), logging.INFO),
        format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
    )


def create_app(config_object=Config) -> Flask:
    config_object.validate()
    activate(config_object)

    app = Flask(__name__)
    app.config.from_object(config_object)
    configure_logging(app)

    CORS(
        app,
        supports_credentials=True,
        origins=app.config["CORS_ORIGINS"],
        allow_headers=["Content-Type", "X-Requested-With"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    )

    run_migrations()
    ensure_pipeline_stages()
    seed_demo_data()

    app.register_blueprint(build_v1_blueprint())
    app.register_blueprint(docs_bp)
    register_error_handlers(app)

    @app.after_request
    def security_headers(response):
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault("Cache-Control", "no-store")
        return response

    @app.get("/api/health")
    def health():
        """Liveness probe."""
        return success({"status": "ok", "version": "1.0.0"})

    @app.get("/")
    def root():
        return jsonify({
            "name": "SmartCRM API",
            "version": "1.0.0",
            "docs": "/api/v1/docs",
            "health": "/api/health",
        })

    return app


if __name__ == "__main__":
    # `python app.py` stays the documented way to run the dev server, but the
    # factory is NOT invoked at import time so tests can configure it first.
    application = create_app()
    application.run(debug=application.config["DEBUG"], host="127.0.0.1", port=5000)
