"""Tag repository."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import EntryTag, Highlight, HighlightTag, Tag


async def list_tags(
    db: AsyncSession, *, user_id: UUID, kind: str | None = None
) -> list[Tag]:
    stmt = select(Tag).where(Tag.user_id == user_id)
    if kind:
        stmt = stmt.where(Tag.kind == kind)
    stmt = stmt.order_by(Tag.kind.asc(), Tag.sort_order.asc(), Tag.name.asc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_tag_for_user(
    db: AsyncSession, *, user_id: UUID, tag_id: UUID
) -> Tag | None:
    result = await db.execute(
        select(Tag).where(Tag.id == tag_id, Tag.user_id == user_id)
    )
    tag: Tag | None = result.scalar_one_or_none()
    return tag


async def find_by_kind_name(
    db: AsyncSession, *, user_id: UUID, kind: str, name: str
) -> Tag | None:
    result = await db.execute(
        select(Tag).where(Tag.user_id == user_id, Tag.kind == kind, Tag.name == name)
    )
    tag: Tag | None = result.scalar_one_or_none()
    return tag


async def next_sort_order(db: AsyncSession, *, user_id: UUID, kind: str) -> int:
    tags = await list_tags(db, user_id=user_id, kind=kind)
    if not tags:
        return 10
    return int(max(t.sort_order for t in tags) + 10)


async def create_tag(
    db: AsyncSession,
    *,
    user_id: UUID,
    kind: str,
    name: str,
    color: str | None,
    shape: str | None,
    sort_order: int,
) -> Tag:
    tag = Tag(
        user_id=user_id,
        kind=kind,
        name=name,
        color=color,
        shape=shape,
        sort_order=sort_order,
        is_system_default=False,
    )
    db.add(tag)
    await db.flush()
    return tag


async def delete_tag(db: AsyncSession, tag: Tag) -> None:
    await db.delete(tag)


async def count_tag_usage(db: AsyncSession, *, tag_id: UUID) -> tuple[int, int, int]:
    """Return (entry_count_direct, highlight_count, content_count).

    content_count = distinct entries linked via entry_tags or highlight_tags.
    """
    entry_direct = (
        await db.execute(
            select(func.count()).select_from(EntryTag).where(EntryTag.tag_id == tag_id)
        )
    ).scalar_one()
    highlight_count = (
        await db.execute(
            select(func.count())
            .select_from(HighlightTag)
            .where(HighlightTag.tag_id == tag_id)
        )
    ).scalar_one()

    entry_ids_direct = select(EntryTag.entry_id).where(EntryTag.tag_id == tag_id)
    entry_ids_via_hl = (
        select(Highlight.entry_id)
        .join(HighlightTag, HighlightTag.highlight_id == Highlight.id)
        .where(HighlightTag.tag_id == tag_id)
    )
    content_count = (
        await db.execute(
            select(func.count()).select_from(
                entry_ids_direct.union(entry_ids_via_hl).subquery()
            )
        )
    ).scalar_one()

    return int(entry_direct), int(highlight_count), int(content_count)
