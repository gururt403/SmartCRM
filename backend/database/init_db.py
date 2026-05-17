import sys
from pathlib import Path

from werkzeug.security import generate_password_hash

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from database.db import initialize_database, seed_demo_data


if __name__ == "__main__":
    initialize_database()
    seed_demo_data(generate_password_hash)
    print("SmartCRM AI SQLite database initialized.")
