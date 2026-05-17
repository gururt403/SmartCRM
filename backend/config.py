from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
DATABASE_PATH = BASE_DIR / "database" / "smartcrm_ai.db"
LEAD_MODEL_PATH = BASE_DIR / "ml_models" / "lead_model.pkl"
CHURN_MODEL_PATH = BASE_DIR / "ml_models" / "churn_model.pkl"
LEAD_DATASET_PATH = PROJECT_ROOT / "datasets" / "leads_sample.csv"
CHURN_DATASET_PATH = PROJECT_ROOT / "datasets" / "churn_sample.csv"
SECRET_KEY = "smartcrm-ai-local-secret"
FRONTEND_ORIGIN = "http://localhost:3000"
