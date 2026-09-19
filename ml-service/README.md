# RahatSetu ML Service

This standalone Python service assigns an Isolation Forest anomaly score to structured
relief-procurement invoices. It is deliberately limited to ML anomaly scoring: it does
not call the Node/Express backend, process OCR documents, run deterministic fraud rules,
or generate LLM explanations.

In the wider RahatSetu architecture, its score is intended to feed the
`mlAnomalyScore` component of the Node backend's `OversightService.calculateRiskScore`.
That integration is intentionally not implemented in this repository.

## Setup

The supplied synthetic CSV is stored at `data/rahatsetu_synthetic_transactions_v2.csv`.
Use Python 3.11 or newer:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Train and evaluate

```powershell
python -m src.train
python -m src.evaluate
```

Training writes `models/isolation_forest_v1.joblib` and the immutable model-input
order in `models/feature_columns.joblib`. Both are intentionally ignored by Git.

The shared `src.features.engineer_features` function is used by training, evaluation,
and API inference. Its ordered inputs are log total amount, log quantity, price
deviation, log vendor age, invoice hour, day of week, six fixed category columns, and
three fixed vendor-tier columns. Unknown categories or tiers produce zeroes for that
field's one-hot columns instead of failing inference.

## Run the API

Train first, then run:

```powershell
uvicorn src.api:app --reload
```

Example:

```powershell
curl -X POST http://127.0.0.1:8000/predict ^
  -H "Content-Type: application/json" ^
  -d "{\"invoice_id\":\"INV-1001\",\"total_amount\":45000,\"quantity\":100,\"unit_price\":450,\"reference_unit_price\":440,\"price_deviation\":0.023,\"vendor_age_years\":4.5,\"vendor_tier\":\"core\",\"category\":\"Food & Nutrition\",\"invoice_datetime\":\"2026-09-18T14:00:00\"}"
```

`POST /predict/batch` accepts a JSON array of the same invoice objects. `GET /health`
confirms whether artifacts were loaded when the process started.

## Tests

```powershell
pytest
```

The tests cover health, single prediction shape, extreme-outlier scoring, and batch
scoring. They train a model if its ignored local artifacts are absent.

## Container

```powershell
docker build -t rahatsetu-ml-service .
docker run -p 8000:8000 rahatsetu-ml-service
```
