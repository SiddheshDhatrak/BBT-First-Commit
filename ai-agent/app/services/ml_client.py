from typing import Any

import httpx

from app.config import Settings
from app.schemas.models import MLResult, Transaction


class MLClient:
    """HTTP adapter for the standalone RahatSetu ML service."""

    def __init__(self, settings: Settings):
        self.settings = settings

    async def predict(self, transaction: Transaction) -> MLResult:
        if self.settings.ml_provider == "mock":
            signal = "anomalous" if (transaction.price_deviation is not None and abs(transaction.price_deviation) >= 0.30) else "normal"
            score = 0.81 if signal == "anomalous" else 0.12
            return MLResult(available=True, status="available", anomaly_score=score, anomaly_signal=signal, model_version="mock-isolation-forest-v1")

        if self.settings.ml_provider != "http":
            return MLResult(available=False, status="unavailable", anomaly_signal="unknown")

        payload = transaction.model_dump(mode="json")
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
