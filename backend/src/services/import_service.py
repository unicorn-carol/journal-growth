"""Import job service."""

from __future__ import annotations

from datetime import date
from html import escape
from pathlib import Path
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.api.errors import bad_request, not_found
from src.config.settings import get_settings
from src.db.models import ImportJob, User
from src.models.imports import (
    ImportCommitFailed,
    ImportCommitResult,
    ImportJobPublic,
    ImportPreview,
    ImportPreviewPatch,
)
from src.repositories import entry_repo, import_repo
from src.services.import_parse import bytes_to_preview_entries


def _upload_root() -> Path:
    settings = get_settings()
    path = Path(settings.upload_dir)
    if not path.is_absolute():
        # backend/src/services/import_service.py → project root
        path = Path(__file__).resolve().parents[3] / settings.upload_dir
    path.mkdir(parents=True, exist_ok=True)
    return path


def _job_public(job: ImportJob) -> ImportJobPublic:
    preview = None
    if job.preview_json:
        preview = ImportPreview.model_validate(job.preview_json)
    return ImportJobPublic(
        id=job.id,
        filename=job.filename,
        status=job.status,
        error_message=job.error_message,
        preview=preview,
        created_at=job.created_at,
    )


def _allowed_filename(name: str) -> bool:
    lower = name.lower()
    return lower.endswith((".md", ".markdown", ".txt", ".docx", ".zip"))


def _plain_to_html(body: str) -> str:
    parts: list[str] = []
    for line in body.split("\n"):
        if line.strip():
            parts.append(f"<p>{escape(line)}</p>")
        else:
            parts.append("<p><br/></p>")
    return "".join(parts) if parts else "<p></p>"


async def create_import(
    db: AsyncSession, user: User, *, filename: str, data: bytes
) -> ImportJobPublic:
    if not filename or not _allowed_filename(filename):
        raise bad_request("不支持的文件类型")
    if not data:
        raise bad_request("文件为空")

    job = await import_repo.create_job(
        db, user_id=user.id, filename=filename, status="parsing"
    )
    dest = _upload_root() / f"{job.id}_{Path(filename).name}"
    dest.write_bytes(data)

    try:
        entries = bytes_to_preview_entries(filename, data)
        job.status = "preview"
        job.preview_json = {"entry_count": len(entries), "entries": entries}
        job.error_message = None
    except ValueError as exc:
        job.status = "failed"
        job.error_message = str(exc)
        job.preview_json = None

    job = await import_repo.save_job(db, job)
    return _job_public(job)


async def get_import(
    db: AsyncSession, user: User, job_id: UUID
) -> ImportJobPublic:
    job = await import_repo.get_job(db, user_id=user.id, job_id=job_id)
    if job is None:
        raise not_found("导入任务不存在")
    return _job_public(job)


async def patch_preview(
    db: AsyncSession, user: User, job_id: UUID, body: ImportPreviewPatch
) -> ImportJobPublic:
    job = await import_repo.get_job(db, user_id=user.id, job_id=job_id)
    if job is None:
        raise not_found("导入任务不存在")
    if job.status != "preview" or not job.preview_json:
        raise bad_request("当前状态不可编辑预览")

    preview = ImportPreview.model_validate(job.preview_json)
    by_id = {e.temp_id: e for e in preview.entries}
    for patch in body.entries:
        row = by_id.get(patch.temp_id)
        if row is None:
            continue
        if patch.title is not None:
            row.title = patch.title.strip() or row.title
        if patch.event_date is not None:
            row.event_date = patch.event_date
            row.date_inferred = False
    job.preview_json = preview.model_dump(mode="json")
    job = await import_repo.save_job(db, job)
    return _job_public(job)


async def commit_import(
    db: AsyncSession, user: User, job_id: UUID, *, confirm: bool
) -> ImportCommitResult:
    if not confirm:
        raise bad_request("请确认导入")
    job = await import_repo.get_job(db, user_id=user.id, job_id=job_id)
    if job is None:
        raise not_found("导入任务不存在")
    if job.status != "preview" or not job.preview_json:
        raise bad_request("当前状态不可提交")

    preview = ImportPreview.model_validate(job.preview_json)
    created: list[UUID] = []
    failed: list[ImportCommitFailed] = []

    for row in preview.entries:
        body = (row.body or "").strip()
        if not body:
            failed.append(ImportCommitFailed(temp_id=row.temp_id, reason="正文为空"))
            continue
        title = (row.title or "").strip() or "未命名日记"
        event_date = row.event_date if isinstance(row.event_date, date) else date.today()
        entry = await entry_repo.create_entry(
            db,
            user_id=user.id,
            title=title,
            body=_plain_to_html(body),
            event_date=event_date,
        )
        created.append(entry.id)

    job.status = "committed"
    await db.commit()
    return ImportCommitResult(created_entry_ids=created, failed=failed)
