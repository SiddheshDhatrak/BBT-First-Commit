from typing import Any

import httpx

from app.config import Settings


class BackendClient:
    """Adapter for existing RahatSetu Backend routes; never calls the DB directly."""

    def __init__(self, settings: Settings):
        self.settings = settings

    async def get_expense_verification(self, expense_id: str, authorization: str | None = None) -> dict[str, Any]:
        if not self.settings.backend_url:
            raise RuntimeError("BACKEND_URL is not configured.")
        headers = {
            "x-role": self.settings.backend_role,
            "x-actor-id": self.settings.backend_actor_id,
        }
        # Forward the caller's credential when present so backend reads stay
        # authorized under real Cognito; demo x-role headers cover local runs.
        if authorization:
            headers["authorization"] = authorization
        try:
            async with httpx.AsyncClient(timeout=self.settings.backend_timeout_seconds) as client:
                response = await client.get(
                    f"{self.settings.backend_url}/api/v1/expenses/{expense_id}/verification",
                    headers=headers,
                )
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError as exc:
            raise RuntimeError(f"RahatSetu Backend verification request failed: {exc}") from exc
