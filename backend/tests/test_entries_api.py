"""Entries API tests against real Postgres."""

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


async def _register_verify_login(client: AsyncClient) -> str:
    email = f"t012_{uuid.uuid4().hex[:10]}@example.com"
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

    verified = await client.post("/api/auth/verify-email", json={"token": token})
    assert verified.status_code == 200
    set_login_code(email, "654321")
    login = await client.post(
        "/api/auth/login",
        json={"email": email, "password": password, "code": "654321"},
    )
    assert login.status_code == 200, login.text
    return str(login.json()["data"]["access_token"])


@pytest.mark.asyncio(loop_scope="module")
async def test_entries_crud_flow(client: AsyncClient) -> None:
    access = await _register_verify_login(client)
    headers = {"Authorization": f"Bearer {access}"}

    empty = await client.get("/api/entries", headers=headers)
    assert empty.status_code == 200
    assert empty.json()["data"]["total"] == 0
    assert empty.json()["data"]["items"] == []

    tags = await client.get("/api/tags", headers=headers, params={"kind": "thinking"})
    tag_id = tags.json()["data"]["items"][0]["id"]

    created = await client.post(
        "/api/entries",
        headers=headers,
        json={
            "title": "工作节奏",
            "body": "今天开完会后有点空。<br>对着文档改了两小时。",
            "event_date": "2026-09-08",
            "tag_ids": [tag_id],
        },
    )
    assert created.status_code == 200, created.text
    entry = created.json()["data"]
    assert entry["title"] == "工作节奏"
    assert entry["body"].startswith("今天")
    assert len(entry["tags"]) == 1
    assert entry["highlights"] == []
    assert entry["ai_suggestion"] is None
    entry_id = entry["id"]

    listed = await client.get("/api/entries", headers=headers)
    assert listed.status_code == 200
    data = listed.json()["data"]
    assert data["total"] == 1
    assert data["items"][0]["id"] == entry_id
    assert "今天开完会后有点空" in data["items"][0]["excerpt"]
    assert data["items"][0]["tags"][0]["id"] == tag_id

    detail = await client.get(f"/api/entries/{entry_id}", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["data"]["title"] == "工作节奏"

    patched = await client.patch(
        f"/api/entries/{entry_id}",
        headers=headers,
        json={"title": "工作节奏·改", "body": "更新后的正文内容足够长。", "tag_ids": []},
    )
    assert patched.status_code == 200, patched.text
    assert patched.json()["data"]["title"] == "工作节奏·改"
    assert patched.json()["data"]["tags"] == []

    listed2 = await client.get("/api/entries", headers=headers)
    item = listed2.json()["data"]["items"][0]
    assert item["title"] == "工作节奏·改"
    assert "更新后的正文" in item["excerpt"]

    deleted = await client.delete(f"/api/entries/{entry_id}", headers=headers)
    assert deleted.status_code == 200
    assert deleted.json()["data"]["ok"] is True

    listed3 = await client.get("/api/entries", headers=headers)
    assert listed3.json()["data"]["total"] == 0

    gone = await client.get(f"/api/entries/{entry_id}", headers=headers)
    assert gone.status_code == 404
    assert gone.json()["code"] == 40401


@pytest.mark.asyncio(loop_scope="module")
async def test_entries_filter_by_tag_and_date(client: AsyncClient) -> None:
    access = await _register_verify_login(client)
    headers = {"Authorization": f"Bearer {access}"}
    tags = await client.get("/api/tags", headers=headers, params={"kind": "thinking"})
    items = tags.json()["data"]["items"]
    t1, t2 = items[0]["id"], items[1]["id"]

    a = await client.post(
        "/api/entries",
        headers=headers,
        json={
            "title": "A",
            "body": "a",
            "event_date": "2026-09-01",
            "tag_ids": [t1, t2],
        },
    )
    b = await client.post(
        "/api/entries",
        headers=headers,
        json={"title": "B", "body": "b", "event_date": "2026-09-08", "tag_ids": [t1]},
    )
    assert a.status_code == 200 and b.status_code == 200

    both = await client.get(
        "/api/entries",
        headers=headers,
        params={"tag_ids": f"{t1},{t2}"},
    )
    assert both.status_code == 200
    assert both.json()["data"]["total"] == 1
    assert both.json()["data"]["items"][0]["title"] == "A"

    dated = await client.get(
        "/api/entries",
        headers=headers,
        params={"event_date_from": "2026-09-08", "event_date_to": "2026-09-08"},
    )
    assert dated.json()["data"]["total"] == 1
    assert dated.json()["data"]["items"][0]["title"] == "B"
