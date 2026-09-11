"""FastAPI route dependencies (auth)."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.errors import unauthorized
from src.core.security import decode_access_token
from src.db.models import User
from src.db.session import get_db

security = HTTPBearer(auto_error=False)

DbSession = Annotated[AsyncSession, Depends(get_db)]
BearerCreds = Annotated[HTTPAuthorizationCredentials | None, Depends(security)]


async def get_current_user(
    credentials: BearerCreds,
    db: DbSession,
) -> User:
    """Resolve the authenticated user from Bearer JWT (route-level)."""
    if credentials is None or not credentials.credentials:
        raise unauthorized()

    try:
        payload = decode_access_token(credentials.credentials)
        user_id = UUID(str(payload["sub"]))
    except (ValueError, TypeError, KeyError):
        raise unauthorized() from None

    result = await db.execute(select(User).where(User.id == user_id))
    user: User | None = result.scalar_one_or_none()
    if user is None:
        raise unauthorized()
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
