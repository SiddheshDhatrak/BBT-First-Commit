from fastapi import APIRouter, Depends, HTTPException, Request

from app.config import Settings, get_settings
from app.schemas.models import AnalyzeRequest, AnalyzeResponse, AuditQueryRequest
from app.services.orchestrator import Orchestrator

router = APIRouter(prefix="/api/v1")


def get_orchestrator(settings: Settings = Depends(get_settings)) -> Orchestrator:
    return Orchestrator(settings)


@router.get("/health")
async def health(settings: Settings = Depends(get_settings)):
    return {
        "status": "ok",
        "service": "rahatsetu-ai-agent",
        "bedrock_configured": settings.bedrock_configured,
        "ml_service_configured": settings.ml_service_configured,
        "backend_configured": bool(settings.backend_url),
    }


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest, orchestrator: Orchestrator = Depends(get_orchestrator)):
    try:
        return await orchestrator.analyze(request)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=502, detail="Invalid upstream analysis response.") from exc


@router.post("/verification/ai-query", response_model=AnalyzeResponse)
async def verification_ai_query(
    request: AuditQueryRequest, http_request: Request, orchestrator: Orchestrator = Depends(get_orchestrator)
):
    """Route aligned with RahatSetu Backend /api/v1/verification/ai-query."""
    try:
        return await orchestrator.audit_query(request, http_request.headers.get("authorization"))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=502, detail="Invalid upstream analysis response.") from exc


@router.post("/ai/audit", response_model=AnalyzeResponse)
async def ai_audit(
    request: AuditQueryRequest, http_request: Request, orchestrator: Orchestrator = Depends(get_orchestrator)
):
    """Compatibility route matching RahatSetu Backend's /api/v1/ai/audit concept."""
    try:
        return await orchestrator.audit_query(request, http_request.headers.get("authorization"))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=502, detail="Invalid upstream analysis response.") from exc
