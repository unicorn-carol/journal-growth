"""Tag domain service."""

from __future__ import annotations

from typing import Literal, cast
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.api.errors import bad_request, not_found
from src.db.models import Tag, User
from src.domain.default_tags import THINKING_DEFAULTS, default_color_for
from src.models.tags import OkResult, TagCreate, TagPublic, TagUpdate, TagUsage
from src.repositories import tag_repo

_THINKING_COLOR_BY_NAME = dict(THINKING_DEFAULTS)


def _to_public(tag: Tag) -> TagPublic:
    return TagPublic(
        id=tag.id,
        kind=cast(Literal["thinking", "emotion"], tag.kind),
        name=tag.name,
        color=tag.color,
        shape=tag.shape,
        sort_order=tag.sort_order,
        is_system_default=tag.is_system_default,
    )


def _default_color(kind: str, name: str) -> str:
    if kind == "thinking":
        return _THINKING_COLOR_BY_NAME.get(name, "#7C6FF0")
    return default_color_for("emotion", name) or "#A855F7"


async def _sync_system_default_colors(db: AsyncSession, tags: list[Tag]) -> None:
    """Keep system-default colors aligned with icon palette for existing users."""
    dirty = False
    for tag in tags:
        if not tag.is_system_default:
            continue
        expected = default_color_for(tag.kind, tag.name)
        if expected and tag.color != expected:
            tag.color = expected
            dirty = True
    if dirty:
        await db.commit()


async def list_tags(
    db: AsyncSession, user: User, kind: str | None
) -> list[TagPublic]:
    if kind is not None and kind not in {"thinking", "emotion"}:
        raise bad_request("kind 须为 thinking 或 emotion")
    tags = await tag_repo.list_tags(db, user_id=user.id, kind=kind)
    await _sync_system_default_colors(db, tags)
    return [_to_public(t) for t in tags]


async def create_tag(db: AsyncSession, user: User, body: TagCreate) -> TagPublic:
    name = body.name.strip()
    if not name:
        raise bad_request("标签名不能为空")
    existing = await tag_repo.find_by_kind_name(
        db, user_id=user.id, kind=body.kind, name=name
    )
    if existing is not None:
        raise bad_request("同名标签已存在")

    color = body.color or _default_color(body.kind, name)
    shape = body.shape if body.kind == "emotion" else None
    sort_order = await tag_repo.next_sort_order(db, user_id=user.id, kind=body.kind)
    tag = await tag_repo.create_tag(
        db,
        user_id=user.id,
        kind=body.kind,
        name=name,
        color=color,
        shape=shape,
        sort_order=sort_order,
    )
    await db.commit()
    await db.refresh(tag)
    return _to_public(tag)


async def update_tag(
    db: AsyncSession, user: User, tag_id: UUID, body: TagUpdate
) -> TagPublic:
    tag = await tag_repo.get_tag_for_user(db, user_id=user.id, tag_id=tag_id)
    if tag is None:
        raise not_found("标签不存在")

    if body.name is not None:
        name = body.name.strip()
        if not name:
            raise bad_request("标签名不能为空")
        clash = await tag_repo.find_by_kind_name(
            db, user_id=user.id, kind=tag.kind, name=name
        )
        if clash is not None and clash.id != tag.id:
            raise bad_request("同名标签已存在")
        tag.name = name
    if body.color is not None:
        tag.color = body.color
    if body.shape is not None:
        tag.shape = body.shape if tag.kind == "emotion" else None
    if body.sort_order is not None:
        tag.sort_order = body.sort_order

    await db.commit()
    await db.refresh(tag)
    return _to_public(tag)


async def get_tag_usage(db: AsyncSession, user: User, tag_id: UUID) -> TagUsage:
    tag = await tag_repo.get_tag_for_user(db, user_id=user.id, tag_id=tag_id)
    if tag is None:
        raise not_found("标签不存在")
    _entry_direct, highlight_count, content_count = await tag_repo.count_tag_usage(
        db, tag_id=tag_id
    )
    return TagUsage(
        entry_count=_entry_direct,
        highlight_count=highlight_count,
        content_count=content_count,
    )


async def delete_tag(db: AsyncSession, user: User, tag_id: UUID) -> OkResult:
    tag = await tag_repo.get_tag_for_user(db, user_id=user.id, tag_id=tag_id)
    if tag is None:
        raise not_found("标签不存在")
    await tag_repo.delete_tag(db, tag)
    await db.commit()
    return OkResult(ok=True)
