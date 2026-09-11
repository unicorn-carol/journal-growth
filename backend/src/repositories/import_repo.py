"""Import job repository."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import ImportJob


async def create_job(
    db: AsyncSession, *, user_id: UUID, filename: str, status: str = "uploaded"
) -> ImportJob:
    job = ImportJob(user_id=user_id, filename=filename, status=status)
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job


async def get_job(
    db: AsyncSession, *, user_id: UUID, job_id: UUID
) -> ImportJob | None:
    result = await db.execute(
        select(ImportJob).where(ImportJob.id == job_id, ImportJob.user_id == user_id)
    )
    job = result.scalar_one_or_none()
    return job if isinstance(job, ImportJob) else None


async def save_job(db: AsyncSession, job: ImportJob) -> ImportJob:
    await db.commit()
    await db.refresh(job)
    return job
