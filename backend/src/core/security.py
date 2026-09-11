"""JWT helpers for access tokens."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from jose import JWTError, jwt

from src.config.settings import get_settings

ALGORITHM = "HS256"


def create_access_token(*, user_id: UUID | str, expires_seconds: int | None = None) -> str:
    settings = get_settings()
    ttl = expires_seconds if expires_seconds is not None else settings.jwt_expire_seconds
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=ttl)).timestamp()),
    }
    encoded = jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)
    return str(encoded)


def decode_access_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise ValueError("invalid token") from exc
    if not isinstance(payload, dict) or "sub" not in payload:
        raise ValueError("invalid token payload")
    return payload
