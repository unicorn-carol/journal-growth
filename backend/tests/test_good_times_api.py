"""Good-times and quadrant-notes API tests."""

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


async def _login(client: AsyncClient) -> str:
    email = f"t016_{uuid.uuid4().hex[:10]}@example.com"
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
async def test_good_times_and_quadrant_notes(client: AsyncClient) -> None:
    access = await _login(client)
    headers = {"Authorization": f"Bearer {access}"}

    a = await client.post(
        "/api/entries",
        headers=headers,
        json={
            "title": "高专注低消耗",
            "body": "安静写了一下午自己真正在意的东西。",
            "event_date": "2026-09-08",
        },
    )
    assert a.status_code == 200
    entry_a = a.json()["data"]["id"]
    ha = await client.post(
        f"/api/entries/{entry_a}/highlights",
        headers=headers,
        json={
            "kind": "energy",
            "quote_text": "安静写了一下午",
            "start_offset": 0,
            "end_offset": 7,
            "engagement": 4,
            "drain": 1,
        },
    )
    assert ha.status_code == 200, ha.text

    b = await client.post(
        "/api/entries",
        headers=headers,
        json={
            "title": "高专注高消耗",
            "body": "对着文档改了两小时很累。",
            "event_date": "2026-09-07",
        },
    )
    entry_b = b.json()["data"]["id"]
    hb = await client.post(
        f"/api/entries/{entry_b}/highlights",
        headers=headers,
        json={
            "kind": "energy",
            "quote_text": "对着文档改了两小时",
            "engagement": 4,
            "drain": 4,
        },
    )
    assert hb.status_code == 200

    gt = await client.get(
        "/api/insights/good-times",
        headers=headers,
        params={
            "limit_entries": 10,
            "quadrant": "high_focus_low_drain",
            "sort": "desc",
        },
    )
    assert gt.status_code == 200, gt.text
    data = gt.json()["data"]
    assert data["engagement_split"] == 2.5
    assert len(data["points"]) == 2
    assert all(p["quadrant"] == "high_focus_low_drain" for p in data["slices"])
    assert len(data["slices"]) == 1
    assert data["slices"][0]["entry_id"] == entry_a

    created = await client.post(
        "/api/insights/quadrant-notes",
        headers=headers,
        json={
            "quadrant": "high_focus_low_drain",
            "body": "完整时间块时最轻松。",
        },
    )
    assert created.status_code == 200, created.text
    note_id = created.json()["data"]["id"]

    listed = await client.get(
        "/api/insights/quadrant-notes",
        headers=headers,
        params={"quadrant": "high_focus_low_drain"},
    )
    assert listed.status_code == 200
    assert any(n["id"] == note_id for n in listed.json()["data"]["items"])

    patched = await client.patch(
        f"/api/insights/quadrant-notes/{note_id}",
        headers=headers,
        json={"body": "更新后的观察"},
    )
    assert patched.status_code == 200
    assert patched.json()["data"]["body"] == "更新后的观察"

    deleted = await client.delete(
        f"/api/insights/quadrant-notes/{note_id}", headers=headers
    )
    assert deleted.status_code == 200
    assert deleted.json()["data"]["ok"] is True

    bad = await client.post(
        "/api/insights/quadrant-notes",
        headers=headers,
        json={"quadrant": "nope", "body": "x"},
    )
    assert bad.status_code == 422 or bad.status_code == 400
