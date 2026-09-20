import time
from uuid import uuid4
from app.config import Settings
from app.schemas.models import AgentMetadata, AnalyzeRequest, AnalyzeResponse, Analysis, MLResult, Transaction
from app.services.ml_client import MLClient
from app.services.backend_client import BackendClient
from app.services.bedrock import BedrockService

class Orchestrator:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.ml_client = MLClient(settings)
        self.backend_client = BackendClient(settings)
        self.bedrock = BedrockService(settings)

    async def analyze(self, request: AnalyzeRequest) -> AnalyzeResponse:
        started = time.perf_counter()
        request_id = str(uuid4())
        ml_result = request.ml_result or await self.ml_client.predict(request.transaction)
        evidence = {
            "transaction": request.transaction.model_dump(mode="json"),
            "ml_result": ml_result.model_dump(mode="json"),
            "rule_results": [r.model_dump(mode="json") for r in (request.rule_results or [])],
            "additional_evidence": request.additional_evidence or {},
        }
        result = await self.bedrock.analyze(evidence)
        analysis = Analysis.model_validate(result)
        # Metadata/logging intentionally excludes secrets and unnecessary invoice details.
        duration_ms = round((time.perf_counter() - started) * 1000, 2)
        print({"request_id": request_id, "invoice_id": request.transaction.invoice_id, "ml_status": ml_result.status, "bedrock_provider": self.settings.ai_provider, "processing_ms": duration_ms})
        return AnalyzeResponse(
            request_id=request_id,
            invoice_id=request.transaction.invoice_id,
            ml_result=ml_result,
            analysis=analysis,
            agent_metadata=AgentMetadata(provider=self.settings.ai_provider, model_id=self.settings.bedrock_model_id or None, service_version=self.settings.service_version),
        )


    def _transaction_from_backend_record(self, expense_id: str, record: dict) -> Transaction | None:
        """Best-effort Transaction reconstruction from a backend expense-verification
        record. Returns None when the record lacks a usable total_amount so the
        caller falls back to ML unavailable instead of inventing inputs."""
        if not isinstance(record, dict) or not record:
            return None
        # Search common nests: financial / invoice / transaction / expense / flat.
        candidates: list[dict] = [record]
        for key in ("transaction", "financial", "invoice", "expense"):
            nested = record.get(key)
            if isinstance(nested, dict):
                candidates.append(nested)

        def pick(*names: str):
            for cand in candidates:
                for name in names:
                    if cand.get(name) is not None:
                        return cand.get(name)
            return None

        total = pick("total_amount", "totalAmount", "amount")
        try:
            total_f = float(total) if total is not None else None
        except (TypeError, ValueError):
            total_f = None
        if total_f is None or total_f <= 0:
            return None

        def f(key: str, default=None):
            v = pick(key)
            return v if v is not None else default

        try:
            return Transaction(
                invoice_id=str(f("invoice_id", f("invoiceId", f("invoiceID", expense_id)))),
                vendor_id=str(f("vendor_id", f("vendorId", "unknown"))) if f("vendor_id", f("vendorId")) else None,
                total_amount=total_f,
                quantity=float(f("quantity", 1)) if f("quantity", 1) is not None else None,
                vendor_age_years=float(f("vendor_age_years", f("vendorAgeYears", 1))) if f("vendor_age_years", f("vendorAgeYears", 1)) is not None else None,
                unit_price=float(f("unit_price", f("unitPrice"))) if f("unit_price", f("unitPrice")) is not None else None,
                reference_unit_price=float(f("reference_unit_price", f("referenceUnitPrice"))) if f("reference_unit_price", f("referenceUnitPrice")) is not None else None,
                price_deviation=float(f("price_deviation", f("priceDeviation", 0))) if f("price_deviation", f("priceDeviation", 0)) is not None else None,
                invoice_datetime=f("invoice_datetime", f("invoiceDatetime")),
                category=f("category"),
                vendor_tier=f("vendor_tier", f("vendorTier")),
            )
        except Exception:
            return None

    async def audit_query(self, request, authorization: str | None = None):
        """Handle Backend /api/v1/verification/ai-query without inventing ML inputs."""
        backend_record = {}
        if request.transaction is None:
            backend_record = await self.backend_client.get_expense_verification(request.expense_id, authorization)

        # ML resolution order: explicit ml_result > live predict from explicit
        # transaction > live predict from backend-derived transaction > unavailable.
        # ML failures are fail-soft (unavailable) and never 503 the audit query.
        ml_result = request.ml_result
        if ml_result is None:
            txn = request.transaction
            if txn is None:
                txn = self._transaction_from_backend_record(request.expense_id, backend_record)
            if txn is not None:
                try:
                    ml_result = await self.ml_client.predict(txn)
                except Exception:
                    ml_result = None
        if ml_result is None:
            ml_result = MLResult(
                available=False,
                status="unavailable",
                anomaly_signal="unknown",
                model_version=None,
            )

        # Derive rule_results from backend alerts when the caller did not supply
        # them, so the Bedrock/mock summary can cite deterministic signals.
        rule_results = request.rule_results
        if (not rule_results) and isinstance(backend_record, dict):
            derived = []
            for alert in (backend_record.get("alerts") or []):
                if not isinstance(alert, dict):
                    continue
                ev = alert.get("evidence") if isinstance(alert.get("evidence"), dict) else {}
                sev = str(alert.get("severity") or "").upper()
                status = "fail" if sev == "HIGH" else ("warning" if sev == "MEDIUM" else "pass")
                derived.append(
                    {
                        "rule_id": str(ev.get("ruleId") or ev.get("rule_id") or alert.get("id") or "backend-alert"),
                        "status": status,
                        "message": str(ev.get("message") or alert.get("id") or "Backend alert"),
                    }
                )
            if derived:
                from app.schemas.models import RuleResult as _RuleResult

                try:
                    rule_results = [_RuleResult(**r) for r in derived[:20]]
                except Exception:
                    rule_results = request.rule_results

        evidence = {
            "expense_id": request.expense_id,
            "question": request.question,
            "transaction": request.transaction.model_dump(mode="json") if request.transaction else None,
            "ml_result": ml_result.model_dump(mode="json"),
            "rule_results": [r.model_dump(mode="json") for r in (rule_results or [])],
            "additional_evidence": {
                **(request.additional_evidence or {}),
                "backend_verification": backend_record,
            },
        }
        result = await self.bedrock.analyze(evidence)
        analysis = Analysis.model_validate(result)
        fallback_invoice = None
        if isinstance(backend_record, dict):
            fin = backend_record.get("financial") if isinstance(backend_record.get("financial"), dict) else {}
            fallback_invoice = (
                backend_record.get("invoiceId")
                or fin.get("invoiceId")
                or backend_record.get("invoice_id")
                or request.expense_id
            )
        return AnalyzeResponse(
            request_id=str(uuid4()),
            invoice_id=(request.transaction.invoice_id if request.transaction else fallback_invoice),
            ml_result=ml_result,
            analysis=analysis,
            agent_metadata=AgentMetadata(
                provider=self.settings.ai_provider,
                model_id=self.settings.bedrock_model_id or None,
                service_version=self.settings.service_version,
            ),
        )
