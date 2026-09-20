from pathlib import Path

from fastapi.testclient import TestClient

from src.train import MODEL_PATH, train


if not MODEL_PATH.exists():
    train()

from src.api import app  # noqa: E402  (model must exist before this module imports)


client = TestClient(app)

NORMAL_INVOICE = {
    "invoice_id": "INV-NORMAL-001",
    "vendor_id": "VEND-001",
    "total_amount": 45000,
    "quantity": 100,
    "unit_price": 450,
    "reference_unit_price": 440,
    "price_deviation": 0.023,
    "vendor_age_years": 4.5,
    "vendor_tier": "core",
    "category": "Food & Nutrition",
    "invoice_datetime": "2026-09-18T14:00:00",
}


def test_health_reports_loaded_model():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "model_loaded": True}


def test_predict_returns_valid_normal_response():
    response = client.post("/api/v1/predict", json=NORMAL_INVOICE)
    assert response.status_code == 200
    body = response.json()
    assert body["invoice_id"] == NORMAL_INVOICE["invoice_id"]
    assert 0.0 <= body["ml_anomaly_score"] <= 1.0
    assert isinstance(body["is_anomaly"], bool)


def test_extreme_outlier_scores_higher_than_normal_invoice():
    normal = client.post("/api/v1/predict", json=NORMAL_INVOICE).json()
    outlier = {
        **NORMAL_INVOICE,
        "invoice_id": "INV-OUTLIER-001",
        "total_amount": 50_000_000,
        "quantity": 100_000,
        "unit_price": 500,
        "reference_unit_price": 50,
        "price_deviation": 9.0,
        "vendor_age_years": 0.01,
        "vendor_tier": "occasional",
        "invoice_datetime": "2026-09-18T03:00:00",
    }
    extreme = client.post("/api/v1/predict", json=outlier)
    assert extreme.status_code == 200
    assert extreme.json()["ml_anomaly_score"] > normal["ml_anomaly_score"]


def test_batch_prediction_returns_each_invoice():
    payload = [
        NORMAL_INVOICE,
        {**NORMAL_INVOICE, "invoice_id": "INV-BATCH-002", "category": "Unknown category", "vendor_tier": "new"},
        {**NORMAL_INVOICE, "invoice_id": "INV-BATCH-003", "total_amount": 90000},
    ]
    response = client.post("/api/v1/predict/batch", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 3
    assert [row["invoice_id"] for row in body] == [row["invoice_id"] for row in payload]
