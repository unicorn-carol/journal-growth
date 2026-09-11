"""Highlight domain service."""

from __future__ import annotations

from typing import Literal, cast
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.api.errors import bad_request, not_found
from src.db.models import Highlight, Tag, User
from src.models.entries import TagRef
from src.models.highlights import (
    HighlightCreate,
    HighlightPublic,
    HighlightUpdate,
    OkResult,
)
from src.repositories import entry_repo, highlight_repo


def _is_half_step(value: float) -> bool:
    scaled = value * 2
    return abs(scaled - round(scaled)) < 1e-9


def _validate_energy_scores(engagement: float | None, drain: float | None) -> None:
    if engagement is None or drain is None:
        raise bad_request("energy 类型必须提供 engagement 与 drain（0-5，步进 0.5）")
    for name, value in (("engagement", engagement), ("drain", drain)):
        if value < 0 or value > 5 or not _is_half_step(value):
            raise bad_request(f"{name} 须在 0–5 且步进 0.5")


def _tag_ref(tag: Tag) -> TagRef:
    return TagRef(
        id=tag.id,
        kind=cast(Literal["thinking", "emotion"], tag.kind),
        name=tag.name,
    )


def _to_public(hl: Highlight, tags: list[Tag]) -> HighlightPublic:
    return HighlightPublic(
        id=hl.id,
        entry_id=hl.entry_id,
        kind=cast(Literal["energy", "topic_emotion"], hl.kind),
        quote_text=hl.quote_text,
        start_offset=hl.start_offset,
        end_offset=hl.end_offset,
        engagement=hl.engagement,
        drain=hl.drain,
        tags=[_tag_ref(t) for t in tags],
        created_at=hl.created_at,
        updated_at=hl.updated_at,
    )


async def create_highlight(
    db: AsyncSession, user: User, entry_id: UUID, body: HighlightCreate
) -> HighlightPublic:
    entry = await entry_repo.get_entry_for_user(
        db, user_id=user.id, entry_id=entry_id
    )
    if entry is None:
        raise not_found("日记不存在")

    quote = body.quote_text.strip()
    if not quote:
        raise bad_request("quote_text 不能为空")
    if body.end_offset < body.start_offset:
        raise bad_request("end_offset 须 ≥ start_offset")

    engagement = body.engagement
    drain = body.drain
    tags: list[Tag] = []

    if body.kind == "energy":
        _validate_energy_scores(engagement, drain)
        if body.tag_ids:
            raise bad_request("energy 类型不应附带 tag_ids")
    else:
        engagement = None
        drain = None
        tag_ids = body.tag_ids or []
        tags = await entry_repo.load_tags_by_ids(
            db, user_id=user.id, tag_ids=tag_ids
        )
        if len(tags) != len(set(tag_ids)):
            raise bad_request("存在无效标签")

    hl = await highlight_repo.create_highlight(
        db,
        user_id=user.id,
        entry_id=entry_id,
        kind=body.kind,
        quote_text=quote,
        start_offset=body.start_offset,
        end_offset=body.end_offset,
        engagement=engagement,
        drain=drain,
    )
    if tags:
        await highlight_repo.replace_highlight_tags(db, highlight=hl, tags=tags)
        # also merge into entry-level tags for topic highlights
        entry_tag_map = await entry_repo.load_tags_for_entry_ids(
            db, entry_ids=[entry_id]
        )
        merged = {t.id: t for t in entry_tag_map.get(entry_id, [])}
        for t in tags:
            merged[t.id] = t
        await entry_repo.replace_entry_tags(
            db, entry=entry, tags=list(merged.values())
        )

    await db.commit()
    refreshed = await highlight_repo.get_highlight_for_user(
        db, user_id=user.id, highlight_id=hl.id
    )
    assert refreshed is not None
    tag_list = await highlight_repo.load_tags_for_highlight(
        db, highlight_id=refreshed.id
    )
    return _to_public(refreshed, tag_list)


async def update_highlight(
    db: AsyncSession, user: User, highlight_id: UUID, body: HighlightUpdate
) -> HighlightPublic:
    hl = await highlight_repo.get_highlight_for_user(
        db, user_id=user.id, highlight_id=highlight_id
    )
    if hl is None:
        raise not_found("标记不存在")

    if body.quote_text is not None:
        quote = body.quote_text.strip()
        if not quote:
            raise bad_request("quote_text 不能为空")
        hl.quote_text = quote
    if body.start_offset is not None:
        hl.start_offset = body.start_offset
    if body.end_offset is not None:
        hl.end_offset = body.end_offset
    if hl.end_offset < hl.start_offset:
        raise bad_request("end_offset 须 ≥ start_offset")

    if hl.kind == "energy":
        engagement = (
            body.engagement if body.engagement is not None else hl.engagement
        )
        drain = body.drain if body.drain is not None else hl.drain
        _validate_energy_scores(engagement, drain)
        hl.engagement = engagement
        hl.drain = drain
        if body.tag_ids is not None:
            raise bad_request("energy 类型不应附带 tag_ids")
    else:
        if body.tag_ids is not None:
            tags = await entry_repo.load_tags_by_ids(
                db, user_id=user.id, tag_ids=body.tag_ids
            )
            if len(tags) != len(set(body.tag_ids)):
                raise bad_request("存在无效标签")
            await highlight_repo.replace_highlight_tags(
                db, highlight=hl, tags=tags
            )
            entry = await entry_repo.get_entry_for_user(
                db, user_id=user.id, entry_id=hl.entry_id
            )
            if entry is not None:
                entry_tag_map = await entry_repo.load_tags_for_entry_ids(
                    db, entry_ids=[entry.id]
                )
                merged = {t.id: t for t in entry_tag_map.get(entry.id, [])}
                for t in tags:
                    merged[t.id] = t
                await entry_repo.replace_entry_tags(
                    db, entry=entry, tags=list(merged.values())
                )

    await db.commit()
    refreshed = await highlight_repo.get_highlight_for_user(
        db, user_id=user.id, highlight_id=highlight_id
    )
    assert refreshed is not None
    tag_list = await highlight_repo.load_tags_for_highlight(
        db, highlight_id=refreshed.id
    )
    return _to_public(refreshed, tag_list)


async def delete_highlight(
    db: AsyncSession, user: User, highlight_id: UUID
) -> OkResult:
    hl = await highlight_repo.get_highlight_for_user(
        db, user_id=user.id, highlight_id=highlight_id
    )
    if hl is None:
        raise not_found("标记不存在")
    await highlight_repo.delete_highlight(db, hl)
    await db.commit()
    return OkResult(ok=True)
