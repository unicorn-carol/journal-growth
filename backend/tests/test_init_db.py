"""Verify core tables exist after init_db (uses configured Postgres)."""

from __future__ import annotations

import pytest
from sqlalchemy import text
from src.db.session import engine, init_db


@pytest.mark.asyncio
async def test_init_db_creates_core_tables() -> None:
    await init_db()
    async with engine.connect() as conn:
        result = await conn.execute(
            text(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                """
            )
        )
        tables = {row[0] for row in result.fetchall()}

    for name in (
        "users",
        "tags",
        "entries",
        "highlights",
        "import_jobs",
        "quadrant_notes",
    ):
        assert name in tables
