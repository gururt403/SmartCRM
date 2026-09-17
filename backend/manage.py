#!/usr/bin/env python3
"""Developer CLI: migrations, seeding and model training.

    python manage.py migrate
    python manage.py seed
    python manage.py train
    python manage.py reset
"""

from __future__ import annotations

import sys

from config import settings
from database.db import database_path, run_migrations
from database.seed import ensure_pipeline_stages, seed_demo_data


def cmd_migrate() -> None:
    applied = run_migrations()
    print("\n".join(f"applied {name}" for name in applied) or "database already up to date")


def cmd_seed() -> None:
    run_migrations()
    ensure_pipeline_stages()
    seed_demo_data()
    print("reference data ensured; demo data seeded" if settings.SEED_DEMO_DATA else "reference data ensured (demo seeding disabled)")


def cmd_train() -> None:
    from ml_models.train_churn_model import train_churn_model
    from ml_models.train_lead_model import train_lead_model

    train_lead_model()
    train_churn_model()


def cmd_reset() -> None:
    path = database_path()
    for suffix in ("", "-wal", "-shm"):
        candidate = path.with_name(path.name + suffix)
        if candidate.exists():
            candidate.unlink()
    print(f"removed {path}")
    cmd_seed()


COMMANDS = {"migrate": cmd_migrate, "seed": cmd_seed, "train": cmd_train, "reset": cmd_reset}


if __name__ == "__main__":
    command = sys.argv[1] if len(sys.argv) > 1 else ""
    handler = COMMANDS.get(command)
    if handler is None:
        print(__doc__)
        sys.exit(1)
    handler()
