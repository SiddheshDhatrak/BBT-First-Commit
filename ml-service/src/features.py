"""Shared, deterministic feature engineering for training and inference."""

import numpy as np
import pandas as pd


CATEGORIES = [
    "Shelter & NFI",
    "Medical & Health",
    "Food & Nutrition",
    "WASH",
    "Clothing & Bedding",
    "Logistics & Transport",
]
VENDOR_TIERS = ["core", "regular", "occasional"]

# This order is the model contract. Training persists it and inference reindexes to it.
FEATURE_COLUMNS = [
    "log_total_amount",
    "log_quantity",
    "price_deviation",
    "amount_consistency",
    "vendor_avg_price_deviation",
    "deviation_from_own_baseline",
    "log_vendor_age",
    "hour",
    "day_of_week",
    *[f"category_{category}" for category in CATEGORIES],
    *[f"vendor_tier_{tier}" for tier in VENDOR_TIERS],
]


def engineer_features(df: pd.DataFrame, vendor_stats: dict[str, float] | None = None) -> pd.DataFrame:
    """Convert raw invoice rows into the fixed numeric Isolation Forest feature matrix.

    Unknown categories and tiers deliberately encode to all zeroes so a new value does
    not break a live prediction request or change the model input schema.
    """
    required = {
    "invoice_datetime",
    "total_amount",
    "quantity",
    "price_deviation",
    "vendor_age_years",
    "category",
    "vendor_tier",
    "unit_price",
    "vendor_id",
}
    missing = required.difference(df.columns)
    if missing:
        raise ValueError(f"Missing required raw feature columns: {sorted(missing)}")

    raw = df.copy()
    timestamp = pd.to_datetime(raw["invoice_datetime"], errors="coerce")
    if timestamp.isna().any():
        raise ValueError("invoice_datetime contains an invalid or missing value")

    features = pd.DataFrame(index=raw.index)
    features["log_total_amount"] = np.log1p(pd.to_numeric(raw["total_amount"], errors="raise"))
    features["log_quantity"] = np.log1p(pd.to_numeric(raw["quantity"], errors="raise"))
    features["price_deviation"] = pd.to_numeric(raw["price_deviation"], errors="raise")
    features["amount_consistency"] = np.abs(
    pd.to_numeric(raw["total_amount"], errors="raise")
    - (pd.to_numeric(raw["quantity"], errors="raise") * pd.to_numeric(raw["unit_price"], errors="raise"))
) / (pd.to_numeric(raw["total_amount"], errors="raise") + 1)
    vendor_stats = vendor_stats or {}
    features["vendor_avg_price_deviation"] = raw["vendor_id"].map(vendor_stats).fillna(0.0)
    features["deviation_from_own_baseline"] = (
    pd.to_numeric(raw["price_deviation"], errors="raise") - features["vendor_avg_price_deviation"]
)
    features["log_vendor_age"] = np.log1p(pd.to_numeric(raw["vendor_age_years"], errors="raise"))
    features["hour"] = timestamp.dt.hour
    features["day_of_week"] = timestamp.dt.dayofweek

    for category in CATEGORIES:
        features[f"category_{category}"] = (raw["category"] == category).astype(int)
    for tier in VENDOR_TIERS:
        features[f"vendor_tier_{tier}"] = (raw["vendor_tier"] == tier).astype(int)

    return features.loc[:, FEATURE_COLUMNS].astype(float)
