"""Evaluate the trained model using labels only for post-training reporting."""

import numpy as np
import joblib
import pandas as pd

from src.features import engineer_features
from src.train import DEFAULT_DATASET, FEATURE_COLUMNS_PATH, MODEL_PATH, VENDOR_STATS_PATH


def anomaly_scores(model, X: pd.DataFrame) -> np.ndarray:
    """Min-max normalize inverted sklearn decision scores: 1 means most anomalous."""
    inverted = -model.decision_function(X)
    lower, upper = float(inverted.min()), float(inverted.max())
    if np.isclose(lower, upper):
        return np.zeros_like(inverted, dtype=float)
    return (inverted - lower) / (upper - lower)


def evaluate() -> dict:
    df = pd.read_csv(DEFAULT_DATASET)
    labels = df["is_anomaly_test_label"].astype(int)
    anomaly_types = df["anomaly_type_test_only"].fillna("normal")
    raw = df.drop(columns=["is_anomaly_test_label", "anomaly_type_test_only"])
    feature_columns = joblib.load(FEATURE_COLUMNS_PATH)
    vendor_stats = joblib.load(VENDOR_STATS_PATH)
    X = engineer_features(raw, vendor_stats=vendor_stats).reindex(columns=feature_columns, fill_value=0)
    model = joblib.load(MODEL_PATH)

    scores = anomaly_scores(model, X)
    predicted_anomaly = model.predict(X) == -1
    normal_mask = labels == 0
    anomaly_mask = labels == 1
    per_type = (
        pd.DataFrame({"type": anomaly_types[anomaly_mask], "score": scores[anomaly_mask]})
        .groupby("type", sort=True)["score"]
        .mean()
    )
    report = {
        "anomaly_mean": float(scores[anomaly_mask].mean()),
        "normal_mean": float(scores[normal_mask].mean()),
        "per_type": per_type.to_dict(),
        "caught": int(predicted_anomaly[anomaly_mask].sum()),
        "total_anomalies": int(anomaly_mask.sum()),
        "false_positives": int(predicted_anomaly[normal_mask].sum()),
        "normal_rows": int(normal_mask.sum()),
    }
    return report


def main() -> None:
    report = evaluate()
    print("Evaluation (scores normalized so 1.0 = most anomalous)")
    print(f"Mean anomaly score — labeled anomalies: {report['anomaly_mean']:.4f}; labeled normals: {report['normal_mean']:.4f}")
    print("Mean anomaly score by labeled anomaly type:")
    for anomaly_type, score in report["per_type"].items():
        suffix = " (expected honest limitation: subtle combinations can be harder)" if anomaly_type == "subtle_combination_anomaly" else ""
        print(f"  - {anomaly_type}: {score:.4f}{suffix}")
    recall = report["caught"] / report["total_anomalies"] if report["total_anomalies"] else 0
    false_positive_rate = report["false_positives"] / report["normal_rows"] if report["normal_rows"] else 0
    print(f"IsolationForest catch rate: {report['caught']}/{report['total_anomalies']} ({recall:.1%})")
    print(f"False-positive rate on normal rows: {report['false_positives']}/{report['normal_rows']} ({false_positive_rate:.1%})")


if __name__ == "__main__":
    main()
