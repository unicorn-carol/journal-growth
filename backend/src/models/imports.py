"""Import API models."""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

ImportStatus = Literal["uploaded", "parsing", "preview", "committed", "failed"]


class ImportPreviewEntry(BaseModel):
    temp_id: str
    title: str
    event_date: date
    date_inferred: bool = False
    excerpt: str = ""
    body: str = ""


class ImportPreview(BaseModel):
    entry_count: int
    entries: list[ImportPreviewEntry] = Field(default_factory=list)


class ImportJobPublic(BaseModel):
    id: UUID
    filename: str
    status: ImportStatus
    error_message: str | None = None
    preview: ImportPreview | None = None
    created_at: datetime


class ImportPreviewPatchItem(BaseModel):
    temp_id: str
    title: str | None = None
    event_date: date | None = None


class ImportPreviewPatch(BaseModel):
    entries: list[ImportPreviewPatchItem]


class ImportCommitRequest(BaseModel):
    confirm: bool = True


class ImportCommitFailed(BaseModel):
    temp_id: str
    reason: str


class ImportCommitResult(BaseModel):
    status: Literal["committed"] = "committed"
    created_entry_ids: list[UUID] = Field(default_factory=list)
    failed: list[ImportCommitFailed] = Field(default_factory=list)
