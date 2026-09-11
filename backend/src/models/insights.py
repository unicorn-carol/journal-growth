"""Insight API models."""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from src.models.entries import TagRef

QuadrantId = Literal[
    "high_focus_low_drain",
    "high_focus_high_drain",
    "low_focus_low_drain",
    "low_focus_high_drain",
]

QUADRANT_IDS: set[str] = {
    "high_focus_low_drain",
    "high_focus_high_drain",
    "low_focus_low_drain",
    "low_focus_high_drain",
}


class SelfAwarenessItem(BaseModel):
    entry_id: UUID
    highlight_id: UUID | None = None
    event_date: date
    title: str
    excerpt: str
    tag_names: list[str] = Field(default_factory=list)


class SelfAwarenessData(BaseModel):
    filter_tag: TagRef | None = None
    items: list[SelfAwarenessItem]
    total: int
    page: int
    page_size: int


class GoodTimesPoint(BaseModel):
    highlight_id: UUID
    entry_id: UUID
    title: str
    quote_text: str
    engagement: float
    drain: float
    quadrant: QuadrantId
    event_date: date


class GoodTimesData(BaseModel):
    engagement_split: float
    drain_split: float
    points: list[GoodTimesPoint]
    slices: list[GoodTimesPoint]


class QuadrantNotePublic(BaseModel):
    id: UUID
    quadrant: QuadrantId
    body: str
    created_at: datetime
    updated_at: datetime


class QuadrantNoteCreate(BaseModel):
    quadrant: QuadrantId
    body: str


class QuadrantNoteUpdate(BaseModel):
    body: str | None = None
    quadrant: QuadrantId | None = None


class QuadrantNoteList(BaseModel):
    items: list[QuadrantNotePublic]
