"""AI tag suggestion API tests (mock LLM, no Key)."""

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
    # Force mock LLM path even if developer .env has LLM_API_KEY.
    from src.config.settings import get_settings

    get_settings().llm_api_key = ""
    clear_login_codes()
    from src.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    clear_login_codes()
    reset_settings_for_tests()


async def _login(client: AsyncClient) -> str:
    email = f"t014_{uuid.uuid4().hex[:10]}@example.com"
    password = "password123"
    reg = await client.post(
        "/api/auth/register", json={"email": email, "password": password}
    )
    assert reg.status_code == 200, reg.text
    user_id = reg.json()["data"]["user_id"]
    from sqlalchemy import select
    from src.db.models import EmailVerificationToken
    from src.db.session import async_session_maker

    async with async_session_maker() as session:
        tok = (
            await session.execute(
                select(EmailVerificationToken).where(
                    EmailVerificationToken.user_id == uuid.UUID(user_id)
                )
            )
        ).scalar_one()
        token = tok.token
    await client.post("/api/auth/verify-email", json={"token": token})
    set_login_code(email, "654321")
    login = await client.post(
        "/api/auth/login",
        json={"email": email, "password": password, "code": "654321"},
    )
    assert login.status_code == 200
    return str(login.json()["data"]["access_token"])


@pytest.mark.asyncio(loop_scope="module")
async def test_ai_suggest_accept_dismiss_mock(client: AsyncClient) -> None:
    access = await _login(client)
    headers = {"Authorization": f"Bearer {access}"}

    created = await client.post(
        "/api/entries",
        headers=headers,
        json={
            "title": "工作与疲惫",
            "body": "今天工作状态很差，情绪疲惫，人际关系也有点拧。",
            "event_date": "2026-09-08",
        },
    )
    assert created.status_code == 200
    entry_id = created.json()["data"]["id"]

    suggest = await client.post(
        f"/api/entries/{entry_id}/ai-tag-suggestions",
        headers=headers,
        json={"force": True},
    )
    assert suggest.status_code == 200, suggest.text
    data = suggest.json()["data"]
    assert data["status"] == "pending"
    assert data["source"] == "mock"
    assert len(data["suggested_tags"]) >= 1
    # no life advice fields
    assert "conclusion" not in data
    assert "rewrite" not in data
    sid = data["id"]

    again = await client.post(
        f"/api/entries/{entry_id}/ai-tag-suggestions",
        headers=headers,
        json={"force": False},
    )
    assert again.json()["data"]["id"] == sid

    detail = await client.get(f"/api/entries/{entry_id}", headers=headers)
    assert detail.json()["data"]["ai_suggestion"]["id"] == sid

    accepted = await client.post(
        f"/api/entries/{entry_id}/ai-tag-suggestions/{sid}/accept",
        headers=headers,
        json={},
    )
    assert accepted.status_code == 200, accepted.text
    assert accepted.json()["data"]["status"] == "accepted"
    assert len(accepted.json()["data"]["tags"]) >= 1

    detail2 = await client.get(f"/api/entries/{entry_id}", headers=headers)
    assert detail2.json()["data"]["ai_suggestion"] is None
    assert len(detail2.json()["data"]["tags"]) >= 1

    # new suggestion then dismiss
    suggest2 = await client.post(
        f"/api/entries/{entry_id}/ai-tag-suggestions",
        headers=headers,
        json={"force": True},
    )
    sid2 = suggest2.json()["data"]["id"]
    dismissed = await client.post(
        f"/api/entries/{entry_id}/ai-tag-suggestions/{sid2}/dismiss",
        headers=headers,
    )
    assert dismissed.status_code == 200
    assert dismissed.json()["data"]["status"] == "dismissed"
    detail3 = await client.get(f"/api/entries/{entry_id}", headers=headers)
    assert detail3.json()["data"]["ai_suggestion"] is None
