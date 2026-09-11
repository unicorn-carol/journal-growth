"""User / tag / verification token repositories."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import EmailVerificationToken, Tag, User


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    user: User | None = result.scalar_one_or_none()
    return user


async def get_user_by_id(db: AsyncSession, user_id: UUID) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    user: User | None = result.scalar_one_or_none()
    return user


async def create_user(
    db: AsyncSession,
    *,
    email: str,
    password_hash: str,
    display_name: str | None,
) -> User:
    user = User(
        email=email,
        password_hash=password_hash,
        email_verified=False,
        display_name=display_name,
    )
    db.add(user)
    await db.flush()
    return user


async def create_verification_token(
    db: AsyncSession,
    *,
    user_id: UUID,
    token: str,
    expires_at: datetime,
) -> EmailVerificationToken:
    row = EmailVerificationToken(user_id=user_id, token=token, expires_at=expires_at)
    db.add(row)
    await db.flush()
    return row


async def get_verification_token(
    db: AsyncSession, token: str
) -> EmailVerificationToken | None:
    result = await db.execute(
        select(EmailVerificationToken).where(EmailVerificationToken.token == token)
    )
    row: EmailVerificationToken | None = result.scalar_one_or_none()
    return row


async def seed_default_tags(db: AsyncSession, user_id: UUID) -> None:
    from src.domain.default_tags import EMOTION_DEFAULTS, THINKING_DEFAULTS

    for i, (name, color) in enumerate(THINKING_DEFAULTS):
        db.add(
            Tag(
                user_id=user_id,
                kind="thinking",
                name=name,
                color=color,
                shape=None,
                sort_order=(i + 1) * 10,
                is_system_default=True,
            )
        )
    for i, (name, color, shape) in enumerate(EMOTION_DEFAULTS):
        db.add(
            Tag(
                user_id=user_id,
                kind="emotion",
                name=name,
                color=color,
                shape=shape,
                sort_order=i + 1,
                is_system_default=True,
            )
        )
    await db.flush()
