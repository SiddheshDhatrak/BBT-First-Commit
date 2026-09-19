from datetime import datetime
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field

class Transaction(BaseModel):
    model_config = ConfigDict(extra="forbid")
    invoice_id: str | None = None
    vendor_id: str | None = None
    total_amount: float = Field(gt=0)
    quantity: float | None = Field(default=None, gt=0)
    vendor_age_years: float | None = Field(default=None, ge=0)
    unit_price: float | None = Field(default=None, ge=0)
    reference_unit_price: float | None = Field(default=None, ge=0)
    price_deviation: float | None = None
    invoice_datetime: datetime | None = None
    category: str | None = None
    vendor_tier: str | None = None

class MLResult(BaseModel):
    available: bool = True
    status: Literal["available", "unavailable", "invalid"] = "available"
    anomaly_score: float | None = None
    anomaly_signal: Literal["anomalous", "normal", "unknown"] = "unknown"
    model_version: str | None = None

class RuleResult(BaseModel):
    rule_id: str
    status: Literal["pass", "fail", "warning", "unavailable"]
    message: str | None = None

class AnalyzeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    transaction: Transaction
    ml_result: MLResult | None = None
    rule_results: list[RuleResult] | None = None
    additional_evidence: dict[str, Any] | None = None

class Analysis(BaseModel):
    summary: str
    risk_factors: list[str]
    evidence: list[str]
    recommended_review_checks: list[str]

class AgentMetadata(BaseModel):
    provider: str
    model_id: str | None = None
    service_version: str

class AnalyzeResponse(BaseModel):
    request_id: str
    invoice_id: str | None
    ml_result: MLResult
    analysis: Analysis
    agent_metadata: AgentMetadata


class AuditQueryRequest(BaseModel):
    """Contract aligned with RahatSetu Backend /api/v1/verification/ai-query.

    The optional transaction/evidence fields allow standalone development; in the
    integrated deployment the agent can retrieve the expense verification record
    from BACKEND_URL before calling Bedrock.
    """
    expense_id: str
    question: str | None = None
    transaction: Transaction | None = None
    ml_result: MLResult | None = None
    rule_results: list[RuleResult] | None = None
    additional_evidence: dict[str, Any] | None = None
