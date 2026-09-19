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


    async def audit_query(self, request):
        """Handle Backend /api/v1/verification/ai-query without inventing ML inputs."""
        backend_record = {}
        if request.transaction is None:
            backend_record = await self.backend_client.get_expense_verification(request.expense_id)

        ml_result = request.ml_result or MLResult(
            available=False,
            status="unavailable",
            anomaly_signal="unknown",
            model_version=None,
        )

        evidence = {
            "expense_id": request.expense_id,
            "question": request.question,
            "transaction": request.transaction.model_dump(mode="json") if request.transaction else None,
            "ml_result": ml_result.model_dump(mode="json"),
            "rule_results": [r.model_dump(mode="json") for r in (request.rule_results or [])],
            "additional_evidence": {
                **(request.additional_evidence or {}),
                "backend_verification": backend_record,
            },
        }
        result = await self.bedrock.analyze(evidence)
        analysis = Analysis.model_validate(result)
        return AnalyzeResponse(
            request_id=str(uuid4()),
            invoice_id=(request.transaction.invoice_id if request.transaction else backend_record.get("invoiceId")),
            ml_result=ml_result,
            analysis=analysis,
            agent_metadata=AgentMetadata(
                provider=self.settings.ai_provider,
                model_id=self.settings.bedrock_model_id or None,
                service_version=self.settings.service_version,
            ),
        )
