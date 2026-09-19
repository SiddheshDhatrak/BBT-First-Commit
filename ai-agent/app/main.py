from fastapi import FastAPI
from app.api.routes import router
from app.config import get_settings

settings = get_settings()
app = FastAPI(title="RahatSetu AI Agent", version=settings.service_version)
app.include_router(router)

@app.get("/")
async def root():
    return {"service": "rahatsetu-ai-agent", "version": settings.service_version, "docs": "/docs"}
