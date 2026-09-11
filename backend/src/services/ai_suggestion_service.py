"""AI tag suggestion domain service."""

from __future__ import annotations

from typing import Literal, cast
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.api.errors import bad_request, not_found
from src.db.models import Tag, User
from src.models.ai_suggestions import AiAcceptResult, AiDismissResult
from src.models.entries import AiSuggestionPublic, TagRef
from src.repositories import ai_suggestion_repo, entry_repo, tag_repo
from src.services.llm_tags import deepseek_suggest_tag_ids, mock_suggest_tag_ids


def _tag_ref(tag: Tag) -> TagRef:
    return TagRef(
        id=tag.id,
        kind=cast(Literal["thinking", "emotion"], tag.kind),
        name=tag.name,
    )


async def _resolve_tags(
    db: AsyncSession, *, user_id: UUID, tag_ids: list[str] | list[UUID]
) -> list[Tag]:
    uuids: list[UUID] = []
    for item in tag_ids:
        try:
            uuids.append(item if isinstance(item, UUID) else UUID(str(item)))
        except ValueError:
            continue
    return await entry_repo.load_tags_by_ids(db, user_id=user_id, tag_ids=uuids)


async def suggestion_to_public(
    db: AsyncSession, *, user_id: UUID, row: object
) -> AiSuggestionPublic:
    from src.db.models import AiTagSuggestion

    assert isinstance(row, AiTagSuggestion)
    tags = await _resolve_tags(db, user_id=user_id, tag_ids=list(row.suggested_tag_ids or []))
    return AiSuggestionPublic(
        id=row.id,
        entry_id=row.entry_id,
        status=cast(Literal["pending", "accepted", "dismissed"], row.status),
        source=cast(Literal["mock", "deepseek"], row.source),
        suggested_tags=[_tag_ref(t) for t in tags],
        created_at=row.created_at,
    )


async def get_pending_public(
    db: AsyncSession, *, user_id: UUID, entry_id: UUID
) -> AiSuggestionPublic | None:
    row = await ai_suggestion_repo.get_pending_for_entry(db, entry_id=entry_id)
    if row is None:
        return None
    return await suggestion_to_public(db, user_id=user_id, row=row)


async def create_or_get_suggestion(
    db: AsyncSession, user: User, entry_id: UUID, *, force: bool
) -> AiSuggestionPublic:
    entry = await entry_repo.get_entry_for_user(
        db, user_id=user.id, entry_id=entry_id
    )
    if entry is None:
        raise not_found("日记不存在")

    if not force:
        pending = await ai_suggestion_repo.get_pending_for_entry(
            db, entry_id=entry_id
        )
        if pending is not None:
            return await suggestion_to_public(db, user_id=user.id, row=pending)

    tags = await tag_repo.list_tags(db, user_id=user.id, kind=None)
    deepseek = await deepseek_suggest_tag_ids(entry.body, tags)
    source = "mock"
    raw: str | None = None
    if deepseek is not None:
        tag_ids = list(deepseek[0])
        raw = deepseek[1]
        source = "deepseek"
        if not tag_ids:
            tag_ids = mock_suggest_tag_ids(entry.body, tags)
            source = "mock"
            raw = None
    else:
        tag_ids = mock_suggest_tag_ids(entry.body, tags)

    if not tag_ids:
        raise bad_request("词库为空，无法生成建议")

    # supersede previous pending
    pending = await ai_suggestion_repo.get_pending_for_entry(db, entry_id=entry_id)
    if pending is not None:
        pending.status = "dismissed"

    row = await ai_suggestion_repo.create_suggestion(
        db,
        entry_id=entry_id,
        suggested_tag_ids=[str(i) for i in tag_ids],
        source=source,
        raw_response=raw,
    )
    await db.commit()
    await db.refresh(row)
    return await suggestion_to_public(db, user_id=user.id, row=row)


async def accept_suggestion(
    db: AsyncSession,
    user: User,
    entry_id: UUID,
    suggestion_id: UUID,
    tag_ids: list[UUID] | None,
) -> AiAcceptResult:
    entry = await entry_repo.get_entry_for_user(
        db, user_id=user.id, entry_id=entry_id
    )
    if entry is None:
        raise not_found("日记不存在")
    row = await ai_suggestion_repo.get_for_entry(
        db, entry_id=entry_id, suggestion_id=suggestion_id
    )
    if row is None:
        raise not_found("建议不存在")
    if row.status != "pending":
        raise bad_request("建议已处理")

    suggested = await _resolve_tags(
        db, user_id=user.id, tag_ids=list(row.suggested_tag_ids or [])
    )
    if tag_ids is None:
        accept_tags = suggested
    else:
        allow = {t.id for t in suggested}
        accept_tags = [t for t in suggested if t.id in set(tag_ids) & allow]
        if not accept_tags:
            raise bad_request("tag_ids 须属于建议列表")

    existing_map = await entry_repo.load_tags_for_entry_ids(db, entry_ids=[entry_id])
    merged = {t.id: t for t in existing_map.get(entry_id, [])}
    for t in accept_tags:
        merged[t.id] = t
    await entry_repo.replace_entry_tags(db, entry=entry, tags=list(merged.values()))
    row.status = "accepted"
    await db.commit()
    return AiAcceptResult(tags=[_tag_ref(t) for t in merged.values()])


async def dismiss_suggestion(
    db: AsyncSession, user: User, entry_id: UUID, suggestion_id: UUID
) -> AiDismissResult:
    entry = await entry_repo.get_entry_for_user(
        db, user_id=user.id, entry_id=entry_id
    )
    if entry is None:
        raise not_found("日记不存在")
    row = await ai_suggestion_repo.get_for_entry(
        db, entry_id=entry_id, suggestion_id=suggestion_id
    )
    if row is None:
        raise not_found("建议不存在")
    if row.status != "pending":
        raise bad_request("建议已处理")
    row.status = "dismissed"
    await db.commit()
    return AiDismissResult()
