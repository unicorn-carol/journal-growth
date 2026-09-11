"""Auth / user Pydantic models aligned with api-contracts.md."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)
    code: str = Field(..., min_length=1, max_length=16)


class LoginSendCodeRequest(BaseModel):
    email: EmailStr


class VerifyEmailRequest(BaseModel):
    token: str = Field(..., min_length=1, max_length=256)


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=128)
    new_password: str = Field(..., min_length=1, max_length=128)


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    email_verified: bool
    display_name: str | None = None
    created_at: datetime | None = None


class RegisterResult(BaseModel):
    user_id: str
    email: EmailStr
    email_verified: bool
    verification_delivery: str


class LoginResult(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserPublic


class SendCodeResult(BaseModel):
    sent: bool
    delivery: str


class VerifyEmailResult(BaseModel):
    email: EmailStr
    email_verified: bool


class ResendResult(BaseModel):
    sent: bool
    verification_delivery: str


class OkResult(BaseModel):
    ok: bool = True
