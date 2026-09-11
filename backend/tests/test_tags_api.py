"""Tags API tests against real Postgres."""

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
    email = f"t011_{uuid.uuid4().hex[:10]}@example.com"
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
async def test_seeded_tags_list_create_delete(client: AsyncClient) -> None:
    access = await _register_verify_login(client)
    headers = {"Authorization": f"Bearer {access}"}

    all_tags = await client.get("/api/tags", headers=headers)
    assert all_tags.status_code == 200
    items = all_tags.json()["data"]["items"]
    assert len(items) == 30

    thinking = await client.get("/api/tags", headers=headers, params={"kind": "thinking"})
    assert thinking.status_code == 200
    assert len(thinking.json()["data"]["items"]) == 16

    emotion = await client.get("/api/tags", headers=headers, params={"kind": "emotion"})
    assert emotion.status_code == 200
    assert len(emotion.json()["data"]["items"]) == 14

    created = await client.post(
        "/api/tags",
        headers=headers,
        json={"kind": "thinking", "name": f"自定义{uuid.uuid4().hex[:6]}"},
    )
    assert created.status_code == 200, created.text
    tag = created.json()["data"]
    assert tag["is_system_default"] is False
    assert tag["color"]

    patched = await client.patch(
        f"/api/tags/{tag['id']}",
        headers=headers,
        json={"name": tag["name"] + "改"},
    )
    assert patched.status_code == 200
    assert patched.json()["data"]["name"] == tag["name"] + "改"

    deleted = await client.delete(f"/api/tags/{tag['id']}", headers=headers)
    assert deleted.status_code == 200
    assert deleted.json()["data"]["ok"] is True

    gone = await client.get("/api/tags", headers=headers, params={"kind": "thinking"})
    ids = {t["id"] for t in gone.json()["data"]["items"]}
    assert tag["id"] not in ids


@pytest.mark.asyncio(loop_scope="module")
async def test_tag_usage_zero_then_delete_confirm_path(client: AsyncClient) -> None:
    access = await _register_verify_login(client)
    headers = {"Authorization": f"Bearer {access}"}
    created = await client.post(
        "/api/tags",
        headers=headers,
        json={"kind": "emotion", "name": f"用法{uuid.uuid4().hex[:6]}"},
    )
    assert created.status_code == 200
    tag_id = created.json()["data"]["id"]

    usage = await client.get(f"/api/tags/{tag_id}/usage", headers=headers)
    assert usage.status_code == 200, usage.text
    data = usage.json()["data"]
    assert data["content_count"] == 0
    assert data["entry_count"] == 0
    assert data["highlight_count"] == 0

    deleted = await client.delete(f"/api/tags/{tag_id}", headers=headers)
    assert deleted.status_code == 200


@pytest.mark.asyncio(loop_scope="module")
async def test_duplicate_tag_name_400(client: AsyncClient) -> None:
    access = await _register_verify_login(client)
    headers = {"Authorization": f"Bearer {access}"}
    dup = await client.post(
        "/api/tags",
        headers=headers,
        json={"kind": "thinking", "name": "工作状态"},
    )
    assert dup.status_code == 400
    assert dup.json()["code"] == 40001
