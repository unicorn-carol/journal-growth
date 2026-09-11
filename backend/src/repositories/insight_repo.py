"""Insight repository helpers."""

from __future__ import annotations

from datetime import date
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.db.models import Entry, EntryTag, Highlight, HighlightTag, QuadrantNote, Tag


async def list_topic_highlights_for_user(
    db: AsyncSession, *, user_id: UUID, thinking_tag_id: UUID | None
) -> list[tuple[Entry, Highlight, list[Tag]]]:
    """Return (entry, highlight, thinking_tags_on_highlight) for topic_emotion marks."""
    stmt = (
        select(Entry, Highlight)
        .join(Highlight, Highlight.entry_id == Entry.id)
        .where(
            Entry.user_id == user_id,
            Entry.deleted_at.is_(None),
            Highlight.kind == "topic_emotion",
        )
        .options(selectinload(Highlight.highlight_tags))
        .order_by(Entry.event_date.desc(), Entry.updated_at.desc())
    )
    rows = (await db.execute(stmt)).all()
    if not rows:
        return []

    hl_ids = [h.id for _, h in rows]
    tag_rows = (
        await db.execute(
            select(HighlightTag, Tag)
            .join(Tag, Tag.id == HighlightTag.tag_id)
            .where(
                HighlightTag.highlight_id.in_(hl_ids),
                Tag.kind == "thinking",
            )
        )
    ).all()
    tags_by_hl: dict[UUID, list[Tag]] = {}
    for ht, tag in tag_rows:
        tags_by_hl.setdefault(ht.highlight_id, []).append(tag)

    out: list[tuple[Entry, Highlight, list[Tag]]] = []
    for entry, hl in rows:
        thinking = tags_by_hl.get(hl.id, [])
        # With filter: require matching thinking tag. Without: include all
        # topic_emotion marks (mock parity, even if no thinking tags).
        if thinking_tag_id is not None and not any(
            t.id == thinking_tag_id for t in thinking
        ):
            continue
        out.append((entry, hl, thinking))
    return out


async def list_entries_with_thinking_tags(
    db: AsyncSession, *, user_id: UUID, thinking_tag_id: UUID | None
) -> list[tuple[Entry, list[Tag]]]:
    """Entries that have thinking tags at entry level (body fallback)."""
    stmt = (
        select(Entry)
        .where(Entry.user_id == user_id, Entry.deleted_at.is_(None))
        .order_by(Entry.event_date.desc(), Entry.updated_at.desc())
    )
    entries = list((await db.execute(stmt)).scalars().all())
    if not entries:
        return []

    entry_ids = [e.id for e in entries]
    tag_rows = (
        await db.execute(
            select(EntryTag, Tag)
            .join(Tag, Tag.id == EntryTag.tag_id)
            .where(
                EntryTag.entry_id.in_(entry_ids),
                Tag.kind == "thinking",
            )
        )
    ).all()
    tags_by_entry: dict[UUID, list[Tag]] = {}
    for et, tag in tag_rows:
        tags_by_entry.setdefault(et.entry_id, []).append(tag)

    out: list[tuple[Entry, list[Tag]]] = []
    for entry in entries:
        thinking = tags_by_entry.get(entry.id, [])
        if thinking_tag_id is not None:
            if not any(t.id == thinking_tag_id for t in thinking):
                continue
        elif not thinking:
            continue
        out.append((entry, thinking))
    return out


async def get_thinking_tag(
    db: AsyncSession, *, user_id: UUID, tag_id: UUID
) -> Tag | None:
    result = await db.execute(
        select(Tag).where(
            Tag.id == tag_id,
            Tag.user_id == user_id,
            Tag.kind == "thinking",
        )
    )
    tag = result.scalar_one_or_none()
    return tag if isinstance(tag, Tag) else None


async def list_energy_highlights_for_user(
    db: AsyncSession,
    *,
    user_id: UUID,
    limit_entries: int | None,
    event_date_from: date | None,
    event_date_to: date | None,
) -> list[tuple[Entry, Highlight]]:
    """Energy highlights within recent N energy-bearing entries or date range."""
    entry_stmt = (
        select(Entry)
        .join(Highlight, Highlight.entry_id == Entry.id)
        .where(
            Entry.user_id == user_id,
            Entry.deleted_at.is_(None),
            Highlight.kind == "energy",
        )
        .distinct()
        .order_by(Entry.event_date.desc(), Entry.updated_at.desc())
    )
    if event_date_from is not None or event_date_to is not None:
        if event_date_from is not None:
            entry_stmt = entry_stmt.where(Entry.event_date >= event_date_from)
        if event_date_to is not None:
            entry_stmt = entry_stmt.where(Entry.event_date <= event_date_to)
        entries = list((await db.execute(entry_stmt)).scalars().all())
    else:
        lim = limit_entries if limit_entries is not None else 10
        entries = list((await db.execute(entry_stmt.limit(lim))).scalars().all())

    if not entries:
        return []

    entry_ids = [e.id for e in entries]
    by_id = {e.id: e for e in entries}
    hl_rows = (
        await db.execute(
            select(Highlight)
            .where(
                Highlight.entry_id.in_(entry_ids),
                Highlight.kind == "energy",
            )
            .order_by(Highlight.created_at.asc())
        )
    ).scalars().all()

    return [(by_id[h.entry_id], h) for h in hl_rows if h.entry_id in by_id]


async def list_quadrant_notes(
    db: AsyncSession, *, user_id: UUID, quadrant: str | None
) -> list[QuadrantNote]:
    stmt = (
        select(QuadrantNote)
        .where(QuadrantNote.user_id == user_id)
        .order_by(QuadrantNote.updated_at.desc())
    )
    if quadrant:
        stmt = stmt.where(QuadrantNote.quadrant == quadrant)
    return list((await db.execute(stmt)).scalars().all())


async def get_quadrant_note(
    db: AsyncSession, *, user_id: UUID, note_id: UUID
) -> QuadrantNote | None:
    result = await db.execute(
        select(QuadrantNote).where(
            QuadrantNote.id == note_id, QuadrantNote.user_id == user_id
        )
    )
    note = result.scalar_one_or_none()
    return note if isinstance(note, QuadrantNote) else None


async def create_quadrant_note(
    db: AsyncSession, *, user_id: UUID, quadrant: str, body: str
) -> QuadrantNote:
    note = QuadrantNote(user_id=user_id, quadrant=quadrant, body=body)
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return note


async def update_quadrant_note(db: AsyncSession, note: QuadrantNote) -> QuadrantNote:
    await db.commit()
    await db.refresh(note)
    return note


async def delete_quadrant_note(db: AsyncSession, note: QuadrantNote) -> None:
    await db.delete(note)
    await db.commit()
