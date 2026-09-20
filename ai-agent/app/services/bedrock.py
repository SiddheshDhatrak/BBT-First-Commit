import asyncio
import json
from typing import Any
import boto3
from botocore.config import Config
from app.config import Settings

SYSTEM_PROMPT = """You are an audit-support assistant for RahatSetu. You do not determine whether fraud occurred. Use only evidence supplied by the system. Distinguish factual transaction data, deterministic backend rule results, ML anomaly signals, interpretation, and recommendations. An Isolation Forest anomaly score is not a probability and must never be converted to a percentage. Never fabricate evidence. Never say fraud is confirmed based solely on ML or LLM output. Use language such as unusual pattern detected, elevated review priority, evidence warrants further review, or additional verification recommended. The final decision belongs to a human auditor. Return JSON with exactly these fields: summary, risk_factors, evidence, recommended_review_checks."""

class BedrockService:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._client = None

    def _get_client(self):
        if self._client is None:
            self._client = boto3.client(
                "bedrock-runtime",
                region_name=self.settings.aws_region,
                config=Config(read_timeout=self.settings.bedrock_timeout_seconds, connect_timeout=5),
            )
        return self._client

    def _mock(self, evidence: dict[str, Any]) -> dict[str, Any]:
        ml = evidence.get("ml_result", {})
        signal = ml.get("anomaly_signal", "unknown")
        risk_factors = []
        if signal == "anomalous":
            risk_factors.append("MODEL SIGNAL: anomaly detector returned an anomalous signal.")
        for rule in evidence.get("rule_results") or []:
            if rule.get("status") in {"fail", "warning"}:
                risk_factors.append(f"RULE RESULT: {rule.get('rule_id')} reported {rule.get('status')}.")
        if not risk_factors:
            risk_factors.append("No supplied rule or model signal indicates an unusual pattern.")
        return {
            "summary": "An evidence-based review summary was generated in development mock mode.",
            "risk_factors": risk_factors,
            "evidence": ["FACT: Transaction details were supplied by the caller.", f"MODEL SIGNAL: anomaly_signal={signal}."] ,
            "recommended_review_checks": ["Verify the invoice against source documents and vendor records.", "Review supporting evidence before making any fraud determination."],
        }

    async def analyze(self, evidence: dict[str, Any]) -> dict[str, Any]:
        if self.settings.ai_provider == "mock":
            return self._mock(evidence)
        if self.settings.ai_provider != "bedrock":
            raise RuntimeError("Unsupported AI_PROVIDER. Use 'mock' or 'bedrock'.")
        if not self.settings.bedrock_configured:
            raise RuntimeError("Bedrock is not configured: AWS_REGION and BEDROCK_MODEL_ID are required.")

        body = {
            "system": [{"text": SYSTEM_PROMPT}],
            "messages": [{"role": "user", "content": [{"text": json.dumps(evidence, default=str)}]}],
            "inferenceConfig": {"maxTokens": 800, "temperature": 0.1},
        }
        response = await asyncio.to_thread(
            self._get_client().converse, modelId=self.settings.bedrock_model_id, **body
        )
        text = response["output"]["message"]["content"][0]["text"]
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError as exc:
            raise RuntimeError("Bedrock returned non-JSON analysis output.") from exc
        return parsed
