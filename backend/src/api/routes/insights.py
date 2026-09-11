"""Insight HTTP routes."""

from __future__ import annotations

from datetime import date
from typing import Annotated, Any, Literal
from uuid import UUID

from fastapi import APIRouter, Query
from pycore.api.responses import success_response

from src.api.deps import CurrentUser, DbSession
from src.models.insights import QuadrantNoteCreate, QuadrantNoteUpdate
from src.services import insight_service

router = APIRouter(tags=["insights"])

QuadrantQuery = Literal[
    "high_focus_low_drain",
    "high_focus_high_drain",
    "low_focus_low_drain",
    "low_focus_high_drain",
]


def _ok(data: Any) -> dict[str, Any]:
    payload = success_response(data=data).model_dump()
    assert isinstance(payload, dict)
    return payload


@router.get("/api/insights/self-awareness")
async def self_awareness(
    db: DbSession,
    user: CurrentUser,
    tag_id: Annotated[str | None, Query()] = "all",
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=50)] = 20,
) -> dict[str, Any]:
    data = await insight_service.self_awareness(
        db, user, tag_id=tag_id, page=page, page_size=page_size
    )
    return _ok(data.model_dump(mode="json"))


@router.get("/api/insights/good-times")
async def good_times(
    db: DbSession,
    user: CurrentUser,
    limit_entries: Annotated[int | None, Query(ge=1, le=50)] = 10,
    event_date_from: Annotated[date | None, Query()] = None,
    event_date_to: Annotated[date | None, Query()] = None,
    engagement_split: Annotated[float, Query()] = 2.5,
    drain_split: Annotated[float, Query()] = 2.5,
    quadrant: Annotated[QuadrantQuery | None, Query()] = None,
    sort: Annotated[Literal["asc", "desc"], Query()] = "desc",
) -> dict[str, Any]:
    # Date range takes priority over limit when either bound is provided.
    effective_limit = (
        None if (event_date_from is not None or event_date_to is not None) else limit_entries
    )
    data = await insight_service.good_times(
        db,
        user,
        limit_entries=effective_limit,
        event_date_from=event_date_from,
        event_date_to=event_date_to,
        engagement_split=engagement_split,
        drain_split=drain_split,
        quadrant=quadrant,
        sort=sort,
    )
    return _ok(data.model_dump(mode="json"))


@router.get("/api/insights/quadrant-notes")
async def list_quadrant_notes(
    db: DbSession,
    user: CurrentUser,
    quadrant: Annotated[QuadrantQuery | None, Query()] = None,
) -> dict[str, Any]:
    data = await insight_service.list_quadrant_notes(db, user, quadrant=quadrant)
    return _ok(data.model_dump(mode="json"))


@router.post("/api/insights/quadrant-notes")
async def create_quadrant_note(
    body: QuadrantNoteCreate, db: DbSession, user: CurrentUser
) -> dict[str, Any]:
    data = await insight_service.create_quadrant_note(db, user, body)
    return _ok(data.model_dump(mode="json"))


@router.patch("/api/insights/quadrant-notes/{note_id}")
async def update_quadrant_note(
    note_id: UUID, body: QuadrantNoteUpdate, db: DbSession, user: CurrentUser
) -> dict[str, Any]:
    data = await insight_service.update_quadrant_note(db, user, note_id, body)
    return _ok(data.model_dump(mode="json"))


@router.delete("/api/insights/quadrant-notes/{note_id}")
async def delete_quadrant_note(
    note_id: UUID, db: DbSession, user: CurrentUser
) -> dict[str, Any]:
    data = await insight_service.delete_quadrant_note(db, user, note_id)
    return _ok(data)
