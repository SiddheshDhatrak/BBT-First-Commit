from functools import lru_cache
import os
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseModel):
    app_env: str = Field(default_factory=lambda: os.getenv("APP_ENV", "development"))
    agent_port: int = Field(default_factory=lambda: int(os.getenv("AGENT_PORT", "8002")))
    ai_provider: str = Field(default_factory=lambda: os.getenv("AI_PROVIDER", "mock").lower())
    aws_region: str = Field(default_factory=lambda: os.getenv("AWS_REGION", ""))
    bedrock_model_id: str = Field(default_factory=lambda: os.getenv("BEDROCK_MODEL_ID", ""))
    ml_provider: str = Field(default_factory=lambda: os.getenv("ML_PROVIDER", "mock").lower())
    ml_service_url: str = Field(default_factory=lambda: os.getenv("ML_SERVICE_URL", "http://localhost:8001").rstrip("/"))
    backend_url: str = Field(default_factory=lambda: os.getenv("BACKEND_URL", "http://localhost:3000").rstrip("/"))
    backend_role: str = Field(default_factory=lambda: os.getenv("BACKEND_ROLE", "GOVT"))
    backend_actor_id: str = Field(default_factory=lambda: os.getenv("BACKEND_ACTOR_ID", "ai-agent"))
    backend_timeout_seconds: float = Field(default_factory=lambda: float(os.getenv("BACKEND_TIMEOUT_SECONDS", "5")))
    agent_service_url: str = Field(default_factory=lambda: os.getenv("AGENT_SERVICE_URL", "http://localhost:8002").rstrip("/"))
    ml_timeout_seconds: float = Field(default_factory=lambda: float(os.getenv("ML_TIMEOUT_SECONDS", "5")))
    bedrock_timeout_seconds: float = Field(default_factory=lambda: float(os.getenv("BEDROCK_TIMEOUT_SECONDS", "30")))
    service_version: str = Field(default_factory=lambda: os.getenv("SERVICE_VERSION", "0.1.0"))

    @property
    def bedrock_configured(self) -> bool:
        return bool(self.aws_region and self.bedrock_model_id)

    @property
    def ml_service_configured(self) -> bool:
        return self.ml_provider == "mock" or bool(self.ml_service_url)

@lru_cache
def get_settings() -> Settings:
    return Settings()
