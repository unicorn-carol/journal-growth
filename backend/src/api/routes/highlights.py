"""Highlight HTTP routes."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter
from pycore.api.responses import success_response

from src.api.deps import CurrentUser, DbSession
from src.models.highlights import HighlightCreate, HighlightUpdate
from src.services import highlight_service

router = APIRouter(tags=["highlights"])


def _ok(data: Any) -> dict[str, Any]:
    payload = success_response(data=data).model_dump()
    assert isinstance(payload, dict)
    return payload


@router.post("/api/entries/{entry_id}/highlights")
async def create_highlight(
    entry_id: UUID, body: HighlightCreate, db: DbSession, user: CurrentUser
) -> dict[str, Any]:
    hl = await highlight_service.create_highlight(db, user, entry_id, body)
    return _ok(hl.model_dump(mode="json"))


@router.patch("/api/highlights/{highlight_id}")
async def update_highlight(
    highlight_id: UUID, body: HighlightUpdate, db: DbSession, user: CurrentUser
) -> dict[str, Any]:
    hl = await highlight_service.update_highlight(db, user, highlight_id, body)
    return _ok(hl.model_dump(mode="json"))


@router.delete("/api/highlights/{highlight_id}")
async def delete_highlight(
    highlight_id: UUID, db: DbSession, user: CurrentUser
) -> dict[str, Any]:
    result = await highlight_service.delete_highlight(db, user, highlight_id)
    return _ok(result.model_dump(mode="json"))
