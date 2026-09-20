from typing import Any

import httpx

from app.config import Settings
from app.schemas.models import MLResult, Transaction


class MLClient:
    """HTTP adapter for the standalone RahatSetu ML service."""

    def __init__(self, settings: Settings):
        self.settings = settings

    def build_predict_payload(self, transaction: Transaction) -> dict:
        """Normalize the agent Transaction (many optional fields) to the strict
        ml-service InvoiceInput contract. Mirrors backend MLAdapter.buildInput
        defaults so live scoring never 422s on missing optionals."""
        from datetime import datetime, timezone

        data = transaction.model_dump(mode="json")
        total = float(data.get("total_amount") or 0)
        quantity = float(data.get("quantity") or 1)
        unit_price = data.get("unit_price")
        if unit_price is None:
            unit_price = (total / quantity) if quantity > 0 else total
        reference_unit_price = data.get("reference_unit_price")
        if reference_unit_price is None:
            reference_unit_price = unit_price
        invoice_dt = data.get("invoice_datetime") or datetime.now(timezone.utc).isoformat()
        return {
            "invoice_id": data.get("invoice_id") or "unknown",
            "vendor_id": data.get("vendor_id") or "unknown",
            "total_amount": total,
            "quantity": quantity,
            "unit_price": float(unit_price or 0),
            "reference_unit_price": float(reference_unit_price or 0),
            "price_deviation": float(data.get("price_deviation") or 0),
            "vendor_age_years": float(data.get("vendor_age_years") if data.get("vendor_age_years") is not None else 1),
            "vendor_tier": data.get("vendor_tier") or "regular",
            "category": data.get("category") or "Other",
            "invoice_datetime": invoice_dt if isinstance(invoice_dt, str) else str(invoice_dt),
        }

    async def predict(self, transaction: Transaction) -> MLResult:
        if self.settings.ml_provider == "mock":
            signal = "anomalous" if (transaction.price_deviation is not None and abs(transaction.price_deviation) >= 0.30) else "normal"
            score = 0.81 if signal == "anomalous" else 0.12
            return MLResult(available=True, status="available", anomaly_score=score, anomaly_signal=signal, model_version="mock-isolation-forest-v1")

        if self.settings.ml_provider != "http":
            return MLResult(available=False, status="unavailable", anomaly_signal="unknown")

        payload = self.build_predict_payload(transaction)
        try:
            async with httpx.AsyncClient(timeout=self.settings.ml_timeout_seconds) as client:
                response = await client.post(f"{self.settings.ml_service_url}/api/v1/predict", json=payload)
                response.raise_for_status()
                data: Any = response.json()
            # Adapt the ML service contract to the agent's stable internal schema.
            return MLResult(
                available=True,
                status="available",
                anomaly_score=float(data["ml_anomaly_score"]),
                anomaly_signal="anomalous" if bool(data["is_anomaly"]) else "normal",
                model_version=data.get("model_version", "isolation-forest-v1"),
            )
        except (httpx.HTTPError, ValueError, TypeError, KeyError):
            return MLResult(available=False, status="unavailable", anomaly_signal="unknown")
