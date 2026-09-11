"""Highlights API tests against real Postgres."""

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


async def _login(client: AsyncClient) -> tuple[str, str]:
    email = f"t013_{uuid.uuid4().hex[:10]}@example.com"
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
    return str(login.json()["data"]["access_token"]), email


@pytest.mark.asyncio(loop_scope="module")
async def test_energy_and_topic_highlights(client: AsyncClient) -> None:
    access, _ = await _login(client)
    headers = {"Authorization": f"Bearer {access}"}

    created_entry = await client.post(
        "/api/entries",
        headers=headers,
        json={
            "title": "能量篇",
            "body": "对着文档改了两小时。把这些碎片留下。",
            "event_date": "2026-09-08",
        },
    )
    assert created_entry.status_code == 200
    entry_id = created_entry.json()["data"]["id"]

    energy = await client.post(
        f"/api/entries/{entry_id}/highlights",
        headers=headers,
        json={
            "kind": "energy",
            "quote_text": "对着文档改了两小时",
            "start_offset": 0,
            "end_offset": 9,
            "engagement": 4,
            "drain": 3,
        },
    )
    assert energy.status_code == 200, energy.text
    energy_hl = energy.json()["data"]
    assert energy_hl["kind"] == "energy"
    assert energy_hl["engagement"] == 4
    assert energy_hl["drain"] == 3
    assert energy_hl["tags"] == []

    bad = await client.post(
        f"/api/entries/{entry_id}/highlights",
        headers=headers,
        json={
            "kind": "energy",
            "quote_text": "x",
            "engagement": 4.2,
            "drain": 1,
        },
    )
    assert bad.status_code == 400

    tags = await client.get("/api/tags", headers=headers)
    thinking = next(t for t in tags.json()["data"]["items"] if t["kind"] == "thinking")
    emotion = next(t for t in tags.json()["data"]["items"] if t["kind"] == "emotion")

    topic = await client.post(
        f"/api/entries/{entry_id}/highlights",
        headers=headers,
        json={
            "kind": "topic_emotion",
            "quote_text": "把这些碎片留下",
            "start_offset": 10,
            "end_offset": 17,
            "tag_ids": [thinking["id"], emotion["id"]],
        },
    )
    assert topic.status_code == 200, topic.text
    topic_hl = topic.json()["data"]
    assert len(topic_hl["tags"]) == 2

    detail = await client.get(f"/api/entries/{entry_id}", headers=headers)
    assert detail.status_code == 200
    assert len(detail.json()["data"]["highlights"]) == 2
    assert len(detail.json()["data"]["tags"]) == 2

    patched = await client.patch(
        f"/api/highlights/{energy_hl['id']}",
        headers=headers,
        json={"engagement": 5, "drain": 2.5},
    )
    assert patched.status_code == 200
    assert patched.json()["data"]["engagement"] == 5
    assert patched.json()["data"]["drain"] == 2.5

    deleted = await client.delete(
        f"/api/highlights/{energy_hl['id']}", headers=headers
    )
    assert deleted.status_code == 200
    detail2 = await client.get(f"/api/entries/{entry_id}", headers=headers)
    kinds = [h["kind"] for h in detail2.json()["data"]["highlights"]]
    assert kinds == ["topic_emotion"]
