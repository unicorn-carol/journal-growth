"""Entry repository."""

from __future__ import annotations

from datetime import UTC, date, datetime
from typing import cast
from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.db.models import Entry, EntryTag, Highlight, HighlightTag, Tag


def _base_entry_query(user_id: UUID) -> Select[tuple[Entry]]:
    return (
        select(Entry)
        .where(Entry.user_id == user_id, Entry.deleted_at.is_(None))
        .options(
            selectinload(Entry.entry_tags),
            selectinload(Entry.highlights).selectinload(Highlight.highlight_tags),
        )
    )


async def list_entries(
    db: AsyncSession,
    *,
    user_id: UUID,
    page: int,
    page_size: int,
    tag_ids: list[UUID] | None,
    event_date_from: date | None,
    event_date_to: date | None,
) -> tuple[list[Entry], int]:
    filters = [Entry.user_id == user_id, Entry.deleted_at.is_(None)]
    if event_date_from is not None:
        filters.append(Entry.event_date >= event_date_from)
    if event_date_to is not None:
        filters.append(Entry.event_date <= event_date_to)

    stmt = select(Entry).where(*filters)
    if tag_ids:
        for tid in tag_ids:
            stmt = stmt.where(
                Entry.id.in_(select(EntryTag.entry_id).where(EntryTag.tag_id == tid))
            )

    count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
    total = int((await db.execute(count_stmt)).scalar_one())

    stmt = (
        stmt.options(selectinload(Entry.entry_tags))
        .order_by(Entry.event_date.desc(), Entry.updated_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    rows = list((await db.execute(stmt)).scalars().unique().all())
    return rows, total


async def get_entry_for_user(
    db: AsyncSession, *, user_id: UUID, entry_id: UUID
) -> Entry | None:
    result = await db.execute(
        _base_entry_query(user_id).where(Entry.id == entry_id)
    )
    return cast(Entry | None, result.scalar_one_or_none())


async def create_entry(
    db: AsyncSession,
    *,
    user_id: UUID,
    title: str,
    body: str,
    event_date: date,
) -> Entry:
    entry = Entry(
        user_id=user_id,
        title=title,
        body=body,
        event_date=event_date,
    )
    db.add(entry)
    await db.flush()
    return entry


async def soft_delete_entry(db: AsyncSession, entry: Entry) -> None:
    entry.deleted_at = datetime.now(UTC)


async def replace_entry_tags(
    db: AsyncSession, *, entry: Entry, tags: list[Tag]
) -> None:
    existing = (
        await db.execute(select(EntryTag).where(EntryTag.entry_id == entry.id))
    ).scalars().all()
    for row in existing:
        await db.delete(row)
    await db.flush()
    for tag in tags:
        db.add(EntryTag(entry_id=entry.id, tag_id=tag.id))
    await db.flush()


async def load_tags_by_ids(
    db: AsyncSession, *, user_id: UUID, tag_ids: list[UUID]
) -> list[Tag]:
    if not tag_ids:
        return []
    result = await db.execute(
        select(Tag).where(Tag.user_id == user_id, Tag.id.in_(tag_ids))
    )
    found = list(result.scalars().all())
    by_id = {t.id: t for t in found}
    # preserve request order; drop missing
    return [by_id[i] for i in tag_ids if i in by_id]


async def load_tags_for_entry_ids(
    db: AsyncSession, *, entry_ids: list[UUID]
) -> dict[UUID, list[Tag]]:
    if not entry_ids:
        return {}
    result = await db.execute(
        select(EntryTag, Tag)
        .join(Tag, Tag.id == EntryTag.tag_id)
        .where(EntryTag.entry_id.in_(entry_ids))
    )
    mapping: dict[UUID, list[Tag]] = {eid: [] for eid in entry_ids}
    for et, tag in result.all():
        mapping.setdefault(et.entry_id, []).append(tag)
    return mapping


async def load_highlight_tags(
    db: AsyncSession, *, highlight_ids: list[UUID]
) -> dict[UUID, list[Tag]]:
    if not highlight_ids:
        return {}
    result = await db.execute(
        select(HighlightTag, Tag)
        .join(Tag, Tag.id == HighlightTag.tag_id)
        .where(HighlightTag.highlight_id.in_(highlight_ids))
    )
    mapping: dict[UUID, list[Tag]] = {hid: [] for hid in highlight_ids}
    for ht, tag in result.all():
        mapping.setdefault(ht.highlight_id, []).append(tag)
    return mapping
