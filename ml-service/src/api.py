"""FastAPI surface for scoring structured RahatSetu invoices."""

from pathlib import Path
from typing import Annotated

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from src.features import engineer_features


PROJECT_ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = PROJECT_ROOT / "models" / "isolation_forest_v1.joblib"
FEATURE_COLUMNS_PATH = PROJECT_ROOT / "models" / "feature_columns.joblib"
VENDOR_STATS_PATH = PROJECT_ROOT / "models" / "vendor_stats.joblib"

class InvoiceInput(BaseModel):
    invoice_id: str
    vendor_id: str
    total_amount: Annotated[float, Field(ge=0)]
    quantity: Annotated[float, Field(ge=0)]
    unit_price: Annotated[float, Field(ge=0)]
    reference_unit_price: Annotated[float, Field(ge=0)]
    price_deviation: float
    vendor_age_years: Annotated[float, Field(ge=0)]
    vendor_tier: str
    category: str
    invoice_datetime: str


class PredictionResponse(BaseModel):
    invoice_id: str
    ml_anomaly_score: float
    is_anomaly: bool
    model_version: str = "isolation-forest-v1"


def _load_artifacts():
    if not MODEL_PATH.exists() or not FEATURE_COLUMNS_PATH.exists() or not VENDOR_STATS_PATH.exists():
        return None, None, None
    return joblib.load(MODEL_PATH), joblib.load(FEATURE_COLUMNS_PATH), joblib.load(VENDOR_STATS_PATH)


# Artifacts are loaded exactly once when this module starts, never per request.
MODEL, FEATURE_COLUMNS, VENDOR_STATS = _load_artifacts()
app = FastAPI(title="RahatSetu ML Service", version="1.0.0")
API_PREFIX = "/api/v1"


def _require_model() -> tuple:
    if MODEL is None or FEATURE_COLUMNS is None or VENDOR_STATS is None:
        raise HTTPException(status_code=503, detail="Model artifacts are unavailable; run python -m src.train first.")
    return MODEL, FEATURE_COLUMNS, VENDOR_STATS


def _score_rows(invoices: list[InvoiceInput]) -> list[PredictionResponse]:
    model, feature_columns, vendor_stats = _require_model()
    raw = pd.DataFrame([invoice.model_dump() for invoice in invoices])
    try:
        X = engineer_features(raw, vendor_stats=vendor_stats).reindex(columns=feature_columns, fill_value=0)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    decisions = model.decision_function(X)
    lower = getattr(model, "score_min_", float(np.min(decisions)))
    upper = getattr(model, "score_max_", float(np.max(decisions)))
    # sklearn gives high decision values to normal points; invert, normalize, and clamp.
    denominator = upper - lower
    scores = np.ones_like(decisions, dtype=float) if np.isclose(denominator, 0) else (upper - decisions) / denominator
    scores = np.clip(scores, 0.0, 1.0)
    predictions = model.predict(X) == -1
    return [
        PredictionResponse(
            invoice_id=invoice.invoice_id,
            ml_anomaly_score=float(score),
            is_anomaly=bool(prediction),
            model_version="isolation-forest-v1",
        )
        for invoice, score, prediction in zip(invoices, scores, predictions, strict=True)
    ]


@app.get(f"{API_PREFIX}/health")
def health() -> dict:
    return {"status": "ok", "model_loaded": all(x is not None for x in (MODEL, FEATURE_COLUMNS, VENDOR_STATS))}


@app.post(f"{API_PREFIX}/predict", response_model=PredictionResponse)
def predict(invoice: InvoiceInput) -> PredictionResponse:
    return _score_rows([invoice])[0]


@app.post(f"{API_PREFIX}/predict/batch", response_model=list[PredictionResponse])
def predict_batch(invoices: list[InvoiceInput]) -> list[PredictionResponse]:
    if not invoices:
        raise HTTPException(status_code=422, detail="At least one invoice is required.")
    return _score_rows(invoices)
