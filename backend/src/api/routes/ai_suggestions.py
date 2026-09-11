"""AI tag suggestion HTTP routes."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter
from pycore.api.responses import success_response

from src.api.deps import CurrentUser, DbSession
from src.models.ai_suggestions import AiAcceptRequest, AiSuggestRequest
from src.services import ai_suggestion_service

router = APIRouter(tags=["ai-suggestions"])


def _ok(data: Any) -> dict[str, Any]:
    payload = success_response(data=data).model_dump()
    assert isinstance(payload, dict)
    return payload


@router.post("/api/entries/{entry_id}/ai-tag-suggestions")
async def create_ai_suggestion(
    entry_id: UUID,
    db: DbSession,
    user: CurrentUser,
    body: AiSuggestRequest | None = None,
) -> dict[str, Any]:
    req = body or AiSuggestRequest()
    data = await ai_suggestion_service.create_or_get_suggestion(
        db, user, entry_id, force=req.force
    )
    return _ok(data.model_dump(mode="json"))


@router.post("/api/entries/{entry_id}/ai-tag-suggestions/{suggestion_id}/accept")
async def accept_ai_suggestion(
    entry_id: UUID,
    suggestion_id: UUID,
    db: DbSession,
    user: CurrentUser,
    body: AiAcceptRequest | None = None,
) -> dict[str, Any]:
    req = body or AiAcceptRequest()
    data = await ai_suggestion_service.accept_suggestion(
        db, user, entry_id, suggestion_id, req.tag_ids
    )
    return _ok(data.model_dump(mode="json"))


@router.post("/api/entries/{entry_id}/ai-tag-suggestions/{suggestion_id}/dismiss")
async def dismiss_ai_suggestion(
    entry_id: UUID,
    suggestion_id: UUID,
    db: DbSession,
    user: CurrentUser,
) -> dict[str, Any]:
    data = await ai_suggestion_service.dismiss_suggestion(
        db, user, entry_id, suggestion_id
    )
    return _ok(data.model_dump(mode="json"))
