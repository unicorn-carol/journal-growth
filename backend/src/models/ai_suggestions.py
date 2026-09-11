"""AI tag suggestion API models."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel

from src.models.entries import AiSuggestionPublic, TagRef

__all__ = [
    "AiSuggestRequest",
    "AiAcceptRequest",
    "AiSuggestionPublic",
    "AiAcceptResult",
    "AiDismissResult",
    "TagRef",
]


class AiSuggestRequest(BaseModel):
    force: bool = False


class AiAcceptRequest(BaseModel):
    tag_ids: list[UUID] | None = None


class AiAcceptResult(BaseModel):
    status: str = "accepted"
    tags: list[TagRef]


class AiDismissResult(BaseModel):
    status: str = "dismissed"
