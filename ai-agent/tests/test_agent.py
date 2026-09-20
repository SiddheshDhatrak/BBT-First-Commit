from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_analyze_mock_flow():
    response = client.post("/api/v1/analyze", json={
        "transaction": {
            "invoice_id": "INV-TEST-001",
            "vendor_id": "VEND-TEST-001",
            "total_amount": 850000,
            "quantity": 1000,
            "vendor_age_years": 2.4,
            "price_deviation": 0.371,
            "invoice_datetime": "2026-08-15T23:17:10",
            "category": "Food & Nutrition",
            "vendor_tier": "regular",
        },
        "rule_results": [{"rule_id": "late_invoice", "status": "warning", "message": "Invoice submitted outside normal hours."}]
    })
    assert response.status_code == 200
    data = response.json()
    assert data["ml_result"]["available"] is True
    assert data["ml_result"]["anomaly_score"] is not None
    assert data["analysis"]["summary"]
    assert data["request_id"]


def test_invalid_transaction():
    response = client.post("/api/v1/analyze", json={"transaction": {"total_amount": -1}})
    assert response.status_code == 422
