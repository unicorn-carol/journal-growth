"""Entry domain service."""

from __future__ import annotations

import re
from datetime import date
from html import unescape
from typing import Literal, cast
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.api.errors import bad_request, not_found
from src.db.models import Entry, Highlight, Tag, User
from src.models.entries import (
    EntryCreate,
    EntryDetail,
    EntryListData,
    EntryListItem,
    EntryUpdate,
    HighlightPublic,
    OkResult,
    TagRef,
)
from src.repositories import entry_repo
from src.services import ai_suggestion_service


def make_excerpt(body: str, n: int = 80) -> str:
    text = re.sub(r"<[^>]+>", " ", body or "")
    text = unescape(text).replace("\xa0", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return text[:n]


def _tag_ref(tag: Tag) -> TagRef:
    return TagRef(
        id=tag.id,
        kind=cast(Literal["thinking", "emotion"], tag.kind),
        name=tag.name,
    )


def _highlight_public(hl: Highlight, tags: list[Tag]) -> HighlightPublic:
    return HighlightPublic(
        id=hl.id,
        kind=cast(Literal["energy", "topic_emotion"], hl.kind),
        quote_text=hl.quote_text,
        start_offset=hl.start_offset,
        end_offset=hl.end_offset,
        engagement=hl.engagement,
        drain=hl.drain,
        tags=[_tag_ref(t) for t in tags],
    )


async def _detail_from_entry(db: AsyncSession, entry: Entry) -> EntryDetail:
    tag_map = await entry_repo.load_tags_for_entry_ids(db, entry_ids=[entry.id])
    entry_tags = tag_map.get(entry.id, [])
    highlights = list(entry.highlights or [])
    hl_tag_map = await entry_repo.load_highlight_tags(
        db, highlight_ids=[h.id for h in highlights]
    )
    ai = await ai_suggestion_service.get_pending_public(
        db, user_id=entry.user_id, entry_id=entry.id
    )
    return EntryDetail(
        id=entry.id,
        title=entry.title,
        body=entry.body,
        event_date=entry.event_date,
        tags=[_tag_ref(t) for t in entry_tags],
        highlights=[
            _highlight_public(h, hl_tag_map.get(h.id, [])) for h in highlights
        ],
        ai_suggestion=ai,
        created_at=entry.created_at,
        updated_at=entry.updated_at,
    )


async def list_entries(
    db: AsyncSession,
    user: User,
    *,
    page: int,
    page_size: int,
    tag_ids: list[UUID] | None,
    event_date_from: date | None,
    event_date_to: date | None,
) -> EntryListData:
    if page < 1:
        raise bad_request("page 须 ≥ 1")
    if page_size < 1 or page_size > 50:
        raise bad_request("page_size 须在 1–50")

    rows, total = await entry_repo.list_entries(
        db,
        user_id=user.id,
        page=page,
        page_size=page_size,
        tag_ids=tag_ids,
        event_date_from=event_date_from,
        event_date_to=event_date_to,
    )
    tag_map = await entry_repo.load_tags_for_entry_ids(
        db, entry_ids=[e.id for e in rows]
    )
    items = [
        EntryListItem(
            id=e.id,
            title=e.title,
            excerpt=make_excerpt(e.body),
            event_date=e.event_date,
            tags=[_tag_ref(t) for t in tag_map.get(e.id, [])],
            updated_at=e.updated_at,
        )
        for e in rows
    ]
    return EntryListData(items=items, total=total, page=page, page_size=page_size)


async def get_entry(db: AsyncSession, user: User, entry_id: UUID) -> EntryDetail:
    entry = await entry_repo.get_entry_for_user(
        db, user_id=user.id, entry_id=entry_id
    )
    if entry is None:
        raise not_found("日记不存在")
    return await _detail_from_entry(db, entry)


async def create_entry(
    db: AsyncSession, user: User, body: EntryCreate
) -> EntryDetail:
    title = (body.title or "").strip() or "无标题"
    event_date = body.event_date or date.today()
    entry = await entry_repo.create_entry(
        db,
        user_id=user.id,
        title=title,
        body=body.body or "",
        event_date=event_date,
    )
    if body.tag_ids:
        tags = await entry_repo.load_tags_by_ids(
            db, user_id=user.id, tag_ids=body.tag_ids
        )
        if len(tags) != len(set(body.tag_ids)):
            raise bad_request("存在无效标签")
        await entry_repo.replace_entry_tags(db, entry=entry, tags=tags)
    await db.commit()
    refreshed = await entry_repo.get_entry_for_user(
        db, user_id=user.id, entry_id=entry.id
    )
    assert refreshed is not None
    return await _detail_from_entry(db, refreshed)


async def update_entry(
    db: AsyncSession, user: User, entry_id: UUID, body: EntryUpdate
) -> EntryDetail:
    entry = await entry_repo.get_entry_for_user(
        db, user_id=user.id, entry_id=entry_id
    )
    if entry is None:
        raise not_found("日记不存在")

    if body.title is not None:
        entry.title = body.title.strip() or "无标题"
    if body.body is not None:
        entry.body = body.body
    if body.event_date is not None:
        entry.event_date = body.event_date
    if body.tag_ids is not None:
        tags = await entry_repo.load_tags_by_ids(
            db, user_id=user.id, tag_ids=body.tag_ids
        )
        if len(tags) != len(set(body.tag_ids)):
            raise bad_request("存在无效标签")
        await entry_repo.replace_entry_tags(db, entry=entry, tags=tags)

    await db.commit()
    refreshed = await entry_repo.get_entry_for_user(
        db, user_id=user.id, entry_id=entry_id
    )
    assert refreshed is not None
    return await _detail_from_entry(db, refreshed)


async def delete_entry(db: AsyncSession, user: User, entry_id: UUID) -> OkResult:
    entry = await entry_repo.get_entry_for_user(
        db, user_id=user.id, entry_id=entry_id
    )
    if entry is None:
        raise not_found("日记不存在")
    await entry_repo.soft_delete_entry(db, entry)
    await db.commit()
    return OkResult(ok=True)
