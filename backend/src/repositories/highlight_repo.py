"""Highlight repository."""

from __future__ import annotations

from typing import cast
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.db.models import Highlight, HighlightTag, Tag


async def get_highlight_for_user(
    db: AsyncSession, *, user_id: UUID, highlight_id: UUID
) -> Highlight | None:
    result = await db.execute(
        select(Highlight)
        .where(Highlight.id == highlight_id, Highlight.user_id == user_id)
        .options(selectinload(Highlight.highlight_tags))
    )
    return cast(Highlight | None, result.scalar_one_or_none())


async def create_highlight(
    db: AsyncSession,
    *,
    user_id: UUID,
    entry_id: UUID,
    kind: str,
    quote_text: str,
    start_offset: int,
    end_offset: int,
    engagement: float | None,
    drain: float | None,
) -> Highlight:
    hl = Highlight(
        user_id=user_id,
        entry_id=entry_id,
        kind=kind,
        quote_text=quote_text,
        start_offset=start_offset,
        end_offset=end_offset,
        engagement=engagement,
        drain=drain,
    )
    db.add(hl)
    await db.flush()
    return hl


async def replace_highlight_tags(
    db: AsyncSession, *, highlight: Highlight, tags: list[Tag]
) -> None:
    existing = (
        await db.execute(
            select(HighlightTag).where(HighlightTag.highlight_id == highlight.id)
        )
    ).scalars().all()
    for row in existing:
        await db.delete(row)
    await db.flush()
    for tag in tags:
        db.add(HighlightTag(highlight_id=highlight.id, tag_id=tag.id))
    await db.flush()


async def delete_highlight(db: AsyncSession, highlight: Highlight) -> None:
    await db.delete(highlight)


async def load_tags_for_highlight(
    db: AsyncSession, *, highlight_id: UUID
) -> list[Tag]:
    result = await db.execute(
        select(Tag)
        .join(HighlightTag, HighlightTag.tag_id == Tag.id)
        .where(HighlightTag.highlight_id == highlight_id)
    )
    return list(result.scalars().all())
