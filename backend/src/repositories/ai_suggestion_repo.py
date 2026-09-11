"""AI tag suggestion repository."""

from __future__ import annotations

from typing import cast
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import AiTagSuggestion


async def get_pending_for_entry(
    db: AsyncSession, *, entry_id: UUID
) -> AiTagSuggestion | None:
    result = await db.execute(
        select(AiTagSuggestion)
        .where(
            AiTagSuggestion.entry_id == entry_id,
            AiTagSuggestion.status == "pending",
        )
        .order_by(AiTagSuggestion.created_at.desc())
        .limit(1)
    )
    return cast(AiTagSuggestion | None, result.scalar_one_or_none())


async def get_for_entry(
    db: AsyncSession, *, entry_id: UUID, suggestion_id: UUID
) -> AiTagSuggestion | None:
    result = await db.execute(
        select(AiTagSuggestion).where(
            AiTagSuggestion.id == suggestion_id,
            AiTagSuggestion.entry_id == entry_id,
        )
    )
    return cast(AiTagSuggestion | None, result.scalar_one_or_none())


async def create_suggestion(
    db: AsyncSession,
    *,
    entry_id: UUID,
    suggested_tag_ids: list[str],
    source: str,
    raw_response: str | None,
) -> AiTagSuggestion:
    row = AiTagSuggestion(
        entry_id=entry_id,
        suggested_tag_ids=suggested_tag_ids,
        status="pending",
        source=source,
        raw_response=raw_response,
    )
    db.add(row)
    await db.flush()
    return row
