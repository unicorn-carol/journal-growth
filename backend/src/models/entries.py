"""Entry API / domain Pydantic models."""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class TagRef(BaseModel):
    id: UUID
    kind: Literal["thinking", "emotion"]
    name: str


class HighlightPublic(BaseModel):
    id: UUID
    kind: Literal["energy", "topic_emotion"]
    quote_text: str
    start_offset: int
    end_offset: int
    engagement: float | None = None
    drain: float | None = None
    tags: list[TagRef] = Field(default_factory=list)


class AiSuggestionPublic(BaseModel):
    id: UUID
    entry_id: UUID | None = None
    status: Literal["pending", "accepted", "dismissed"]
    source: Literal["mock", "deepseek"]
    suggested_tags: list[TagRef] = Field(default_factory=list)
    created_at: datetime | None = None


class EntryListItem(BaseModel):
    id: UUID
    title: str
    excerpt: str
    event_date: date
    tags: list[TagRef]
    updated_at: datetime


class EntryListData(BaseModel):
    items: list[EntryListItem]
    total: int
    page: int
    page_size: int


class EntryDetail(BaseModel):
    id: UUID
    title: str
    body: str
    event_date: date
    tags: list[TagRef]
    highlights: list[HighlightPublic]
    ai_suggestion: AiSuggestionPublic | None = None
    created_at: datetime
    updated_at: datetime


class EntryCreate(BaseModel):
    title: str | None = Field(None, max_length=255)
    body: str = ""
    event_date: date | None = None
    tag_ids: list[UUID] | None = None


class EntryUpdate(BaseModel):
    title: str | None = Field(None, max_length=255)
    body: str | None = None
    event_date: date | None = None
    tag_ids: list[UUID] | None = None


class OkResult(BaseModel):
    ok: bool = True
