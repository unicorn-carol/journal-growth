"""Auth probe route for verifying route-level JWT dependency."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pycore.api.responses import success_response

from src.api.deps import CurrentUser

router = APIRouter(tags=["auth"])


@router.get("/api/auth/probe")
async def auth_probe(user: CurrentUser) -> dict[str, Any]:
    """Protected probe: requires valid Bearer token via get_current_user."""
    payload = success_response(
        data={"user_id": str(user.id), "email": user.email}
    ).model_dump()
    assert isinstance(payload, dict)
    return payload
