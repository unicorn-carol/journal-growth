"""Entry HTTP routes."""

from __future__ import annotations

from datetime import date
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Query
from pycore.api.responses import success_response

from src.api.deps import CurrentUser, DbSession
from src.models.entries import EntryCreate, EntryUpdate
from src.services import entry_service

router = APIRouter(tags=["entries"])


def _ok(data: Any) -> dict[str, Any]:
    payload = success_response(data=data).model_dump()
    assert isinstance(payload, dict)
    return payload


def _parse_tag_ids(raw: str | None) -> list[UUID] | None:
    if raw is None or not raw.strip():
        return None
    parts = [p.strip() for p in raw.split(",") if p.strip()]
    return [UUID(p) for p in parts]


@router.get("/api/entries")
async def list_entries(
    db: DbSession,
    user: CurrentUser,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=50)] = 20,
    tag_ids: Annotated[str | None, Query()] = None,
    event_date_from: Annotated[date | None, Query()] = None,
    event_date_to: Annotated[date | None, Query()] = None,
) -> dict[str, Any]:
    data = await entry_service.list_entries(
        db,
        user,
        page=page,
        page_size=page_size,
        tag_ids=_parse_tag_ids(tag_ids),
        event_date_from=event_date_from,
        event_date_to=event_date_to,
    )
    return _ok(data.model_dump(mode="json"))


@router.get("/api/entries/{entry_id}")
async def get_entry(
    entry_id: UUID, db: DbSession, user: CurrentUser
) -> dict[str, Any]:
    detail = await entry_service.get_entry(db, user, entry_id)
    return _ok(detail.model_dump(mode="json"))


@router.post("/api/entries")
async def create_entry(
    body: EntryCreate, db: DbSession, user: CurrentUser
) -> dict[str, Any]:
    detail = await entry_service.create_entry(db, user, body)
    return _ok(detail.model_dump(mode="json"))


@router.patch("/api/entries/{entry_id}")
async def update_entry(
    entry_id: UUID, body: EntryUpdate, db: DbSession, user: CurrentUser
) -> dict[str, Any]:
    detail = await entry_service.update_entry(db, user, entry_id, body)
    return _ok(detail.model_dump(mode="json"))


@router.delete("/api/entries/{entry_id}")
async def delete_entry(
    entry_id: UUID, db: DbSession, user: CurrentUser
) -> dict[str, Any]:
    result = await entry_service.delete_entry(db, user, entry_id)
    return _ok(result.model_dump(mode="json"))
