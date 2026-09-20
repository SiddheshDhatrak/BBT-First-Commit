import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.config import get_settings

settings = get_settings()
app = FastAPI(title="RahatSetu AI Agent", version=settings.service_version)

origins = [o.strip() for o in os.getenv("AGENT_CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["content-type", "authorization", "x-role", "x-actor-id", "x-org-id"],
)
app.include_router(router)

@app.get("/")
async def root():
    return {"service": "rahatsetu-ai-agent", "version": settings.service_version, "docs": "/docs"}
