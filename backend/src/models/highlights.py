"""Highlight API / domain Pydantic models."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from src.models.entries import TagRef

HighlightKind = Literal["energy", "topic_emotion"]


class HighlightCreate(BaseModel):
    kind: HighlightKind
    quote_text: str = Field(..., min_length=1)
    start_offset: int = Field(0, ge=0)
    end_offset: int = Field(0, ge=0)
    engagement: float | None = None
    drain: float | None = None
    tag_ids: list[UUID] | None = None


class HighlightUpdate(BaseModel):
    quote_text: str | None = Field(None, min_length=1)
    start_offset: int | None = Field(None, ge=0)
    end_offset: int | None = Field(None, ge=0)
    engagement: float | None = None
    drain: float | None = None
    tag_ids: list[UUID] | None = None


class HighlightPublic(BaseModel):
    id: UUID
    entry_id: UUID
    kind: HighlightKind
    quote_text: str
    start_offset: int
    end_offset: int
    engagement: float | None = None
    drain: float | None = None
    tags: list[TagRef] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class OkResult(BaseModel):
    ok: bool = True
