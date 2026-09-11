"""Auth HTTP routes."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pycore.api.responses import success_response

from src.api.deps import CurrentUser, DbSession
from src.models.auth import (
    ChangePasswordRequest,
    LoginRequest,
    LoginSendCodeRequest,
    RegisterRequest,
    ResendVerificationRequest,
    VerifyEmailRequest,
)
from src.services import auth_service

router = APIRouter(tags=["auth"])


def _ok(data: Any) -> dict[str, Any]:
    payload = success_response(data=data).model_dump()
    assert isinstance(payload, dict)
    return payload


@router.post("/api/auth/register")
async def register(body: RegisterRequest, db: DbSession) -> dict[str, Any]:
    result = await auth_service.register(db, body)
    return _ok(result.model_dump(mode="json"))


@router.post("/api/auth/login/send-code")
async def send_login_code(body: LoginSendCodeRequest, db: DbSession) -> dict[str, Any]:
    result = await auth_service.send_login_code(db, body)
    return _ok(result.model_dump(mode="json"))


@router.post("/api/auth/login")
async def login(body: LoginRequest, db: DbSession) -> dict[str, Any]:
    result = await auth_service.login(db, body)
    return _ok(result.model_dump(mode="json"))


@router.post("/api/auth/logout")
async def logout(_user: CurrentUser) -> dict[str, Any]:
    result = await auth_service.logout()
    return _ok(result.model_dump(mode="json"))


@router.get("/api/auth/me")
async def me(user: CurrentUser) -> dict[str, Any]:
    result = await auth_service.me(user)
    return _ok(result.model_dump(mode="json"))


@router.post("/api/auth/verify-email")
async def verify_email(body: VerifyEmailRequest, db: DbSession) -> dict[str, Any]:
    result = await auth_service.verify_email(db, body)
    return _ok(result.model_dump(mode="json"))


@router.post("/api/auth/resend-verification")
async def resend_verification(
    body: ResendVerificationRequest, db: DbSession
) -> dict[str, Any]:
    result = await auth_service.resend_verification(db, body)
    return _ok(result.model_dump(mode="json"))


@router.post("/api/auth/change-password")
async def change_password(
    body: ChangePasswordRequest, db: DbSession, user: CurrentUser
) -> dict[str, Any]:
    result = await auth_service.change_password(db, user, body)
    return _ok(result.model_dump(mode="json"))
