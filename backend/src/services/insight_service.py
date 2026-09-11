"""Insight services: self-awareness, good-times, quadrant notes."""

from __future__ import annotations

from collections import defaultdict
from datetime import date
from typing import Literal, cast
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.api.errors import bad_request, not_found
from src.db.models import QuadrantNote, Tag, User
from src.models.entries import TagRef
from src.models.insights import (
    QUADRANT_IDS,
    GoodTimesData,
    GoodTimesPoint,
    QuadrantId,
    QuadrantNoteCreate,
    QuadrantNoteList,
    QuadrantNotePublic,
    QuadrantNoteUpdate,
    SelfAwarenessData,
    SelfAwarenessItem,
)
from src.repositories import insight_repo
from src.services.entry_service import make_excerpt


def _tag_ref(tag: Tag) -> TagRef:
    return TagRef(
        id=tag.id,
        kind=cast(Literal["thinking", "emotion"], tag.kind),
        name=tag.name,
    )


def _to_quadrant(
    engagement: float, drain: float, engagement_split: float, drain_split: float
) -> QuadrantId:
    high_focus = engagement >= engagement_split
    high_drain = drain >= drain_split
    if high_focus and not high_drain:
        return "high_focus_low_drain"
    if high_focus and high_drain:
        return "high_focus_high_drain"
    if not high_focus and not high_drain:
        return "low_focus_low_drain"
    return "low_focus_high_drain"


def _note_public(note: QuadrantNote) -> QuadrantNotePublic:
    return QuadrantNotePublic(
        id=note.id,
        quadrant=cast(QuadrantId, note.quadrant),
        body=note.body,
        created_at=note.created_at,
        updated_at=note.updated_at,
    )


async def self_awareness(
    db: AsyncSession,
    user: User,
    *,
    tag_id: str | None,
    page: int,
    page_size: int,
) -> SelfAwarenessData:
    if page < 1:
        raise bad_request("page 须 ≥ 1")
    if page_size < 1 or page_size > 50:
        raise bad_request("page_size 须在 1–50")

    filter_uuid: UUID | None = None
    filter_tag: TagRef | None = None
    if tag_id and tag_id != "all":
        try:
            filter_uuid = UUID(tag_id)
        except ValueError as exc:
            raise bad_request("tag_id 无效") from exc
        tag = await insight_repo.get_thinking_tag(
            db, user_id=user.id, tag_id=filter_uuid
        )
        if tag is None:
            raise not_found("话题不存在")
        filter_tag = _tag_ref(tag)

    collected: list[SelfAwarenessItem] = []
    covered_tag_ids: dict[UUID, set[UUID]] = defaultdict(set)
    matched_entry_ids: set[UUID] = set()

    hl_rows = await insight_repo.list_topic_highlights_for_user(
        db, user_id=user.id, thinking_tag_id=filter_uuid
    )
    for entry, hl, thinking in hl_rows:
        matched_entry_ids.add(entry.id)
        for t in thinking:
            covered_tag_ids[entry.id].add(t.id)
        collected.append(
            SelfAwarenessItem(
                entry_id=entry.id,
                highlight_id=hl.id,
                event_date=entry.event_date,
                title=entry.title,
                excerpt=hl.quote_text or make_excerpt(entry.body),
                tag_names=[t.name for t in thinking],
            )
        )

    entry_rows = await insight_repo.list_entries_with_thinking_tags(
        db, user_id=user.id, thinking_tag_id=filter_uuid
    )
    for entry, thinking in entry_rows:
        if filter_uuid is not None:
            if entry.id in matched_entry_ids:
                continue
            body_tags = thinking
        else:
            covered = covered_tag_ids.get(entry.id, set())
            body_tags = [t for t in thinking if t.id not in covered]
            if not body_tags:
                continue

        collected.append(
            SelfAwarenessItem(
                entry_id=entry.id,
                highlight_id=None,
                event_date=entry.event_date,
                title=entry.title,
                excerpt=make_excerpt(entry.body),
                tag_names=[t.name for t in body_tags],
            )
        )

    collected.sort(key=lambda i: (i.event_date, str(i.entry_id)), reverse=True)
    total = len(collected)
    start = (page - 1) * page_size
    items = collected[start : start + page_size]
    return SelfAwarenessData(
        filter_tag=filter_tag,
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


async def good_times(
    db: AsyncSession,
    user: User,
    *,
    limit_entries: int | None,
    event_date_from: date | None,
    event_date_to: date | None,
    engagement_split: float,
    drain_split: float,
    quadrant: str | None,
    sort: str,
) -> GoodTimesData:
    if engagement_split <= 0 or engagement_split >= 5:
        raise bad_request("engagement_split 须在 (0, 5)")
    if drain_split <= 0 or drain_split >= 5:
        raise bad_request("drain_split 须在 (0, 5)")
    if sort not in ("asc", "desc"):
        raise bad_request("sort 须为 asc 或 desc")
    if quadrant is not None and quadrant not in QUADRANT_IDS:
        raise bad_request("quadrant 非法")
    if limit_entries is not None and (limit_entries < 1 or limit_entries > 50):
        raise bad_request("limit_entries 须在 1–50")
    if event_date_from and event_date_to and event_date_from > event_date_to:
        raise bad_request("event_date_from 不能晚于 event_date_to")

    rows = await insight_repo.list_energy_highlights_for_user(
        db,
        user_id=user.id,
        limit_entries=limit_entries,
        event_date_from=event_date_from,
        event_date_to=event_date_to,
    )

    points: list[GoodTimesPoint] = []
    for entry, hl in rows:
        eng = float(hl.engagement or 0)
        drain_v = float(hl.drain or 0)
        points.append(
            GoodTimesPoint(
                highlight_id=hl.id,
                entry_id=entry.id,
                title=entry.title,
                quote_text=hl.quote_text,
                engagement=eng,
                drain=drain_v,
                quadrant=_to_quadrant(eng, drain_v, engagement_split, drain_split),
                event_date=entry.event_date,
            )
        )

    reverse = sort == "desc"
    points.sort(key=lambda p: (p.event_date, str(p.highlight_id)), reverse=reverse)
    slices = (
        [p for p in points if p.quadrant == quadrant] if quadrant else list(points)
    )
    return GoodTimesData(
        engagement_split=engagement_split,
        drain_split=drain_split,
        points=points,
        slices=slices,
    )


async def list_quadrant_notes(
    db: AsyncSession, user: User, *, quadrant: str | None
) -> QuadrantNoteList:
    if quadrant is not None and quadrant not in QUADRANT_IDS:
        raise bad_request("quadrant 非法")
    notes = await insight_repo.list_quadrant_notes(
        db, user_id=user.id, quadrant=quadrant
    )
    return QuadrantNoteList(items=[_note_public(n) for n in notes])


async def create_quadrant_note(
    db: AsyncSession, user: User, body: QuadrantNoteCreate
) -> QuadrantNotePublic:
    text = body.body.strip()
    if not text:
        raise bad_request("body 不能为空")
    if body.quadrant not in QUADRANT_IDS:
        raise bad_request("quadrant 非法")
    note = await insight_repo.create_quadrant_note(
        db, user_id=user.id, quadrant=body.quadrant, body=text
    )
    return _note_public(note)


async def update_quadrant_note(
    db: AsyncSession, user: User, note_id: UUID, body: QuadrantNoteUpdate
) -> QuadrantNotePublic:
    note = await insight_repo.get_quadrant_note(
        db, user_id=user.id, note_id=note_id
    )
    if note is None:
        raise not_found("观察不存在")
    if body.body is not None:
        text = body.body.strip()
        if not text:
            raise bad_request("body 不能为空")
        note.body = text
    if body.quadrant is not None:
        if body.quadrant not in QUADRANT_IDS:
            raise bad_request("quadrant 非法")
        note.quadrant = body.quadrant
    note = await insight_repo.update_quadrant_note(db, note)
    return _note_public(note)


async def delete_quadrant_note(
    db: AsyncSession, user: User, note_id: UUID
) -> dict[str, bool]:
    note = await insight_repo.get_quadrant_note(
        db, user_id=user.id, note_id=note_id
    )
    if note is None:
        raise not_found("观察不存在")
    await insight_repo.delete_quadrant_note(db, note)
    return {"ok": True}
