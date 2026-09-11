"""Health check route."""

from typing import Any

from fastapi import APIRouter
from pycore.api.responses import success_response

router = APIRouter(tags=["health"])


@router.get("/api/health")
async def health() -> dict[str, Any]:
    payload = success_response(data={"status": "ok"}).model_dump()
    assert isinstance(payload, dict)
    return payload
