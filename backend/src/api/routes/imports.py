"""Import HTTP routes."""

from __future__ import annotations

from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, File, UploadFile
from pycore.api.responses import success_response

from src.api.deps import CurrentUser, DbSession
from src.api.errors import bad_request
from src.models.imports import ImportCommitRequest, ImportPreviewPatch
from src.services import import_service

router = APIRouter(tags=["imports"])


def _ok(data: Any) -> dict[str, Any]:
    payload = success_response(data=data).model_dump()
    assert isinstance(payload, dict)
    return payload


@router.post("/api/imports")
async def create_import(
    db: DbSession,
    user: CurrentUser,
    file: Annotated[UploadFile, File()],
) -> dict[str, Any]:
    filename = file.filename or ""
    data = await file.read()
    if len(data) > 20 * 1024 * 1024:
        raise bad_request("文件过大（上限 20MB）")
    result = await import_service.create_import(
        db, user, filename=filename, data=data
    )
    return _ok(result.model_dump(mode="json"))


@router.get("/api/imports/{import_id}")
async def get_import(
    import_id: UUID, db: DbSession, user: CurrentUser
) -> dict[str, Any]:
    result = await import_service.get_import(db, user, import_id)
    return _ok(result.model_dump(mode="json"))


@router.patch("/api/imports/{import_id}/preview")
async def patch_preview(
    import_id: UUID,
    body: ImportPreviewPatch,
    db: DbSession,
    user: CurrentUser,
) -> dict[str, Any]:
    result = await import_service.patch_preview(db, user, import_id, body)
    return _ok(result.model_dump(mode="json"))


@router.post("/api/imports/{import_id}/commit")
async def commit_import(
    import_id: UUID,
    body: ImportCommitRequest,
    db: DbSession,
    user: CurrentUser,
) -> dict[str, Any]:
    result = await import_service.commit_import(
        db, user, import_id, confirm=body.confirm
    )
    return _ok(result.model_dump(mode="json"))
