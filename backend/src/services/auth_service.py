"""Auth domain service."""

from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta

from pycore.core.logger import get_logger
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.errors import bad_request, conflict, forbidden, not_found, unauthorized
from src.config.settings import get_settings
from src.core.passwords import hash_password, verify_password
from src.core.security import create_access_token
from src.db.models import User
from src.models.auth import (
    ChangePasswordRequest,
    LoginRequest,
    LoginResult,
    LoginSendCodeRequest,
    OkResult,
    RegisterRequest,
    RegisterResult,
    ResendResult,
    ResendVerificationRequest,
    SendCodeResult,
    UserPublic,
    VerifyEmailRequest,
    VerifyEmailResult,
)
from src.repositories import user_repo
from src.services import login_codes

logger = get_logger()


def _delivery() -> str:
    return "dev_print" if get_settings().mail_dev_print else "email"


def _user_public(user: User) -> UserPublic:
    return UserPublic(
        id=str(user.id),
        email=user.email,
        email_verified=user.email_verified,
        display_name=user.display_name,
        created_at=user.created_at,
    )


def _print_verification_link(email: str, token: str) -> None:
    settings = get_settings()
    base = settings.frontend_public_url.rstrip("/")
    link = f"{base}/verify-email?token={token}"
    logger.info(f"[MAIL_DEV_PRINT] verification link for {email}: {link}")


def _print_login_code(email: str, code: str) -> None:
    logger.info(f"[MAIL_DEV_PRINT] login OTP for {email}: {code}")


async def _issue_verification(db: AsyncSession, user: User) -> str:
    token = secrets.token_urlsafe(32)
    expires = datetime.now(UTC) + timedelta(hours=48)
    await user_repo.create_verification_token(
        db, user_id=user.id, token=token, expires_at=expires
    )
    if get_settings().mail_dev_print:
        _print_verification_link(user.email, token)
    return token


async def register(db: AsyncSession, body: RegisterRequest) -> RegisterResult:
    email = str(body.email).strip().lower()
    if len(body.password) < 8:
        raise bad_request("密码至少 8 位")
    existing = await user_repo.get_user_by_email(db, email)
    if existing is not None:
        raise conflict("邮箱已注册")

    display = email.split("@", 1)[0] or "User"
    user = await user_repo.create_user(
        db,
        email=email,
        password_hash=hash_password(body.password),
        display_name=display,
    )
    await user_repo.seed_default_tags(db, user.id)
    await _issue_verification(db, user)
    await db.commit()
    await db.refresh(user)
    return RegisterResult(
        user_id=str(user.id),
        email=user.email,
        email_verified=False,
        verification_delivery=_delivery(),
    )


async def send_login_code(db: AsyncSession, body: LoginSendCodeRequest) -> SendCodeResult:
    email = str(body.email).strip().lower()
    user = await user_repo.get_user_by_email(db, email)
    if user is None:
        raise not_found("用户不存在")
    code = f"{secrets.randbelow(1_000_000):06d}"
    login_codes.set_login_code(email, code)
    if get_settings().mail_dev_print:
        _print_login_code(email, code)
    return SendCodeResult(sent=True, delivery=_delivery())


async def login(db: AsyncSession, body: LoginRequest) -> LoginResult:
    email = str(body.email).strip().lower()
    user = await user_repo.get_user_by_email(db, email)
    if user is None or not verify_password(body.password, user.password_hash):
        raise unauthorized("邮箱或密码错误")
    if not login_codes.consume_login_code(email, body.code):
        raise bad_request("验证码错误或已过期")
    if not user.email_verified:
        raise forbidden("邮箱未验证")

    settings = get_settings()
    token = create_access_token(user_id=user.id)
    return LoginResult(
        access_token=token,
        token_type="bearer",
        expires_in=settings.jwt_expire_seconds,
        user=_user_public(user),
    )


async def verify_email(db: AsyncSession, body: VerifyEmailRequest) -> VerifyEmailResult:
    row = await user_repo.get_verification_token(db, body.token.strip())
    if row is None or row.used_at is not None:
        raise bad_request("验证链接无效或已过期")
    expires = row.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=UTC)
    if datetime.now(UTC) > expires:
        raise bad_request("验证链接无效或已过期")

    user = await user_repo.get_user_by_id(db, row.user_id)
    if user is None:
        raise bad_request("验证链接无效或已过期")

    user.email_verified = True
    row.used_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(user)
    return VerifyEmailResult(email=user.email, email_verified=True)


async def resend_verification(
    db: AsyncSession, body: ResendVerificationRequest
) -> ResendResult:
    email = str(body.email).strip().lower()
    user = await user_repo.get_user_by_email(db, email)
    if user is None:
        raise not_found("用户不存在")
    if user.email_verified:
        return ResendResult(sent=True, verification_delivery=_delivery())
    await _issue_verification(db, user)
    await db.commit()
    return ResendResult(sent=True, verification_delivery=_delivery())


async def me(user: User) -> UserPublic:
    return _user_public(user)


async def logout() -> OkResult:
    return OkResult(ok=True)


async def change_password(
    db: AsyncSession, user: User, body: ChangePasswordRequest
) -> OkResult:
    if not verify_password(body.current_password, user.password_hash):
        raise bad_request("当前密码不正确")
    if len(body.new_password) < 8:
        raise bad_request("新密码至少 8 位")
    user.password_hash = hash_password(body.new_password)
    await db.commit()
    return OkResult(ok=True)
