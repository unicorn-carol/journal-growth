"""Auth API integration tests against real Postgres (no drop_all)."""

from __future__ import annotations

import uuid
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from src.config.settings import reset_settings_for_tests
from src.services.login_codes import clear_login_codes, set_login_code


@pytest_asyncio.fixture(scope="module")
async def client() -> AsyncGenerator[AsyncClient, None]:
    reset_settings_for_tests()
    clear_login_codes()
    from src.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    clear_login_codes()
    reset_settings_for_tests()


def _email() -> str:
    return f"t010_{uuid.uuid4().hex[:10]}@example.com"


@pytest.mark.asyncio(loop_scope="module")
async def test_register_login_change_password_flow(client: AsyncClient) -> None:
    email = _email()
    password = "password123"

    reg = await client.post("/api/auth/register", json={"email": email, "password": password})
    assert reg.status_code == 200, reg.text
    body = reg.json()
    assert body["code"] == 200
    assert body["data"]["email"] == email
    assert body["data"]["email_verified"] is False
    assert body["data"]["verification_delivery"] == "dev_print"
    user_id = body["data"]["user_id"]

    from sqlalchemy import select
    from src.db.models import EmailVerificationToken, Tag
    from src.db.session import async_session_maker

    async with async_session_maker() as session:
        tok = (
            await session.execute(
                select(EmailVerificationToken).where(
                    EmailVerificationToken.user_id == uuid.UUID(user_id)
                )
            )
        ).scalar_one()
        tag_count = len(
            (
                await session.execute(select(Tag).where(Tag.user_id == uuid.UUID(user_id)))
            )
            .scalars()
            .all()
        )
        token = tok.token

    assert tag_count == 30  # 16 thinking + 14 emotion

    verified = await client.post("/api/auth/verify-email", json={"token": token})
    assert verified.status_code == 200
    assert verified.json()["data"]["email_verified"] is True

    bad_code = await client.post(
        "/api/auth/login",
        json={"email": email, "password": password, "code": "000000"},
    )
    assert bad_code.status_code == 400
    assert bad_code.json()["code"] == 40001

    send = await client.post("/api/auth/login/send-code", json={"email": email})
    assert send.status_code == 200
    set_login_code(email, "654321")

    wrong_pw = await client.post(
        "/api/auth/login",
        json={"email": email, "password": "wrong-pass", "code": "654321"},
    )
    assert wrong_pw.status_code == 401
    assert wrong_pw.json()["code"] == 40101

    set_login_code(email, "654321")
    ok = await client.post(
        "/api/auth/login",
        json={"email": email, "password": password, "code": "654321"},
    )
    assert ok.status_code == 200
    login_data = ok.json()["data"]
    access = login_data["access_token"]
    assert login_data["token_type"] == "bearer"

    me = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {access}"})
    assert me.status_code == 200
    assert me.json()["data"]["email"] == email

    changed = await client.post(
        "/api/auth/change-password",
        headers={"Authorization": f"Bearer {access}"},
        json={"current_password": password, "new_password": "newpass123"},
    )
    assert changed.status_code == 200

    set_login_code(email, "111222")
    relogin = await client.post(
        "/api/auth/login",
        json={"email": email, "password": "newpass123", "code": "111222"},
    )
    assert relogin.status_code == 200

    logout = await client.post(
        "/api/auth/logout", headers={"Authorization": f"Bearer {access}"}
    )
    assert logout.status_code == 200


@pytest.mark.asyncio(loop_scope="module")
async def test_unverified_login_returns_40301(client: AsyncClient) -> None:
    email = _email()
    await client.post("/api/auth/register", json={"email": email, "password": "password123"})
    set_login_code(email, "123456")
    resp = await client.post(
        "/api/auth/login",
        json={"email": email, "password": "password123", "code": "123456"},
    )
    assert resp.status_code == 403
    assert resp.json()["code"] == 40301


@pytest.mark.asyncio(loop_scope="module")
async def test_duplicate_register_40901(client: AsyncClient) -> None:
    email = _email()
    first = await client.post(
        "/api/auth/register", json={"email": email, "password": "password123"}
    )
    assert first.status_code == 200
    second = await client.post(
        "/api/auth/register", json={"email": email, "password": "password123"}
    )
    assert second.status_code == 409
    assert second.json()["code"] == 40901
