import pickle
import sys
from pathlib import Path

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from config import LEAD_DATASET_PATH, LEAD_MODEL_PATH


def train_lead_model(dataset_path: Path = LEAD_DATASET_PATH, model_path: Path = LEAD_MODEL_PATH):
    dataset = pd.read_csv(dataset_path)
    features = dataset[["budget", "interaction_count", "company_type", "response_rate", "previous_purchases"]]
    target = dataset["converted"]

    categorical_features = ["company_type"]
    numeric_features = ["budget", "interaction_count", "response_rate", "previous_purchases"]

    preprocessor = ColumnTransformer(
        transformers=[
            ("categorical", OneHotEncoder(handle_unknown="ignore"), categorical_features),
            ("numeric", "passthrough", numeric_features),
        ]
    )

    pipeline = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("classifier", RandomForestClassifier(n_estimators=200, random_state=42)),
        ]
    )

    x_train, x_test, y_train, y_test = train_test_split(features, target, test_size=0.25, random_state=42, stratify=target)
    pipeline.fit(x_train, y_train)
    predictions = pipeline.predict(x_test)
    accuracy = accuracy_score(y_test, predictions)

    model_path.parent.mkdir(parents=True, exist_ok=True)
    with model_path.open("wb") as file:
        pickle.dump(pipeline, file)

    report = classification_report(y_test, predictions, zero_division=0)
    print(f"Lead model saved to {model_path}")
    print(f"Lead model accuracy: {accuracy:.4f}")
    print(report)
    return pipeline


if __name__ == "__main__":
    train_lead_model()
