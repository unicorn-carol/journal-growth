"""Tag HTTP routes."""

from __future__ import annotations

from typing import Any, Literal
from uuid import UUID

from fastapi import APIRouter, Query
from pycore.api.responses import success_response

from src.api.deps import CurrentUser, DbSession
from src.models.tags import TagCreate, TagUpdate
from src.services import tag_service

router = APIRouter(tags=["tags"])


def _ok(data: Any) -> dict[str, Any]:
    payload = success_response(data=data).model_dump()
    assert isinstance(payload, dict)
    return payload


@router.get("/api/tags")
async def list_tags(
    db: DbSession,
    user: CurrentUser,
    kind: Literal["thinking", "emotion"] | None = Query(default=None),
) -> dict[str, Any]:
    items = await tag_service.list_tags(db, user, kind)
    return _ok({"items": [i.model_dump(mode="json") for i in items]})


@router.post("/api/tags")
async def create_tag(
    body: TagCreate, db: DbSession, user: CurrentUser
) -> dict[str, Any]:
    tag = await tag_service.create_tag(db, user, body)
    return _ok(tag.model_dump(mode="json"))


@router.patch("/api/tags/{tag_id}")
async def update_tag(
    tag_id: UUID, body: TagUpdate, db: DbSession, user: CurrentUser
) -> dict[str, Any]:
    tag = await tag_service.update_tag(db, user, tag_id, body)
    return _ok(tag.model_dump(mode="json"))


@router.get("/api/tags/{tag_id}/usage")
async def get_tag_usage(
    tag_id: UUID, db: DbSession, user: CurrentUser
) -> dict[str, Any]:
    usage = await tag_service.get_tag_usage(db, user, tag_id)
    return _ok(usage.model_dump(mode="json"))


@router.delete("/api/tags/{tag_id}")
async def delete_tag(
    tag_id: UUID, db: DbSession, user: CurrentUser
) -> dict[str, Any]:
    result = await tag_service.delete_tag(db, user, tag_id)
    return _ok(result.model_dump(mode="json"))
