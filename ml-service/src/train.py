"""Train and persist the RahatSetu Isolation Forest model."""

from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import IsolationForest

from src.features import FEATURE_COLUMNS, engineer_features


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATASET = PROJECT_ROOT / "data" / "rahatsetu_synthetic_transactions_v2.csv"
MODELS_DIR = PROJECT_ROOT / "models"
MODEL_PATH = MODELS_DIR / "isolation_forest_v1.joblib"
FEATURE_COLUMNS_PATH = MODELS_DIR / "feature_columns.joblib"
VENDOR_STATS_PATH = MODELS_DIR / "vendor_stats.joblib"


def train(dataset_path: Path = DEFAULT_DATASET) -> tuple[IsolationForest, int, int]:
    """Train the model without exposing test-only labels to feature engineering."""
    df = pd.read_csv(dataset_path)
    df = df.drop(columns=["is_anomaly_test_label", "anomaly_type_test_only"], errors="ignore")
    vendor_stats = df.groupby("vendor_id")["price_deviation"].mean().to_dict()
    X = engineer_features(df, vendor_stats=vendor_stats).reindex(columns=FEATURE_COLUMNS, fill_value=0)

    model = IsolationForest(n_estimators=200, contamination=0.05, random_state=42)
    model.fit(X)
    # Persist training decision-score bounds on the model for stable API score scaling.
    decision_scores = model.decision_function(X)
    model.score_min_ = float(decision_scores.min())
    model.score_max_ = float(decision_scores.max())

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    joblib.dump(FEATURE_COLUMNS, FEATURE_COLUMNS_PATH)
    joblib.dump(model, MODEL_PATH)
    joblib.dump(FEATURE_COLUMNS, FEATURE_COLUMNS_PATH)
    joblib.dump(vendor_stats, VENDOR_STATS_PATH)
    return model, len(X), X.shape[1]


def main() -> None:
    _, row_count, feature_count = train()
    print(f"Trained IsolationForest on {row_count} rows with {feature_count} features.")
    print(f"Saved model to {MODEL_PATH.relative_to(PROJECT_ROOT)} and feature columns to {FEATURE_COLUMNS_PATH.relative_to(PROJECT_ROOT)}.")
    print(f"Saved model to {MODEL_PATH.relative_to(PROJECT_ROOT)}, feature columns to {FEATURE_COLUMNS_PATH.relative_to(PROJECT_ROOT)}, and vendor stats to {VENDOR_STATS_PATH.relative_to(PROJECT_ROOT)}.")

if __name__ == "__main__":
    main()
