"""Tag API / domain Pydantic models."""

from __future__ import annotations

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

TagKind = Literal["thinking", "emotion"]


class TagCreate(BaseModel):
    kind: TagKind
    name: str = Field(..., min_length=1, max_length=64)
    color: str | None = Field(None, max_length=32)
    shape: str | None = Field(None, max_length=64)


class TagUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=64)
    color: str | None = Field(None, max_length=32)
    shape: str | None = Field(None, max_length=64)
    sort_order: int | None = None


class TagPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    kind: TagKind
    name: str
    color: str | None = None
    shape: str | None = None
    sort_order: int
    is_system_default: bool


class TagListData(BaseModel):
    items: list[TagPublic]


class OkResult(BaseModel):
    ok: bool = True


class TagUsage(BaseModel):
    """How many diary contents currently reference this tag."""

    entry_count: int = 0
    highlight_count: int = 0
    content_count: int = 0
