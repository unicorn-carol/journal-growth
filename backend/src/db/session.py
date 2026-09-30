"""
Async database session management.

Extended from pycore/integrations/db/session.py template.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from pycore.core.logger import get_logger
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from src.config.settings import asyncpg_connect_args, get_settings

logger = get_logger()

_settings = get_settings()
DATABASE_URL: str = _settings.database_url

# NullPool avoids asyncpg connections sticking to a closed pytest event loop.
engine: AsyncEngine = create_async_engine(
    DATABASE_URL,
    echo=bool(_settings.debug),
    future=True,
    poolclass=NullPool,
    connect_args=asyncpg_connect_args(DATABASE_URL),
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency: yield a DB session."""
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


@asynccontextmanager
async def get_db_context() -> AsyncGenerator[AsyncSession, None]:
    """Context-manager form of DB session."""
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db() -> None:
    """Create all tables from ORM metadata."""
    from src.db import models  # noqa: F401
    from src.db.models import Base

    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as exc:
        logger.error(
            "Database init failed — check DATABASE_URL references Postgres in same Railway project",
            error=str(exc),
        )
        raise
    logger.info("Database initialized")


async def close_db() -> None:
    """Dispose engine connections (safe to call multiple times)."""
    await engine.dispose()
    logger.info("Database connection closed")
