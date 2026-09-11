"""Self-awareness insights API tests against real Postgres."""

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
    email = f"t015_{uuid.uuid4().hex[:10]}@example.com"
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
async def test_self_awareness_highlight_and_body_fallback(
    client: AsyncClient,
) -> None:
    access = await _login(client)
    headers = {"Authorization": f"Bearer {access}"}

    tags = await client.get("/api/tags", headers=headers)
    assert tags.status_code == 200
    thinking = next(t for t in tags.json()["data"]["items"] if t["kind"] == "thinking")
    emotion = next(t for t in tags.json()["data"]["items"] if t["kind"] == "emotion")
    other_thinking = next(
        t
        for t in tags.json()["data"]["items"]
        if t["kind"] == "thinking" and t["id"] != thinking["id"]
    )

    # Entry A: topic_emotion highlight with thinking tag
    a = await client.post(
        "/api/entries",
        headers=headers,
        json={
            "title": "话题篇",
            "body": "对着文档改了两小时。把这些碎片留下。",
            "event_date": "2026-09-08",
        },
    )
    assert a.status_code == 200
    entry_a = a.json()["data"]["id"]

    topic = await client.post(
        f"/api/entries/{entry_a}/highlights",
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
    hl_id = topic.json()["data"]["id"]

    # Entry B: only entry-level thinking tag → body excerpt fallback
    b = await client.post(
        "/api/entries",
        headers=headers,
        json={
            "title": "正文回退",
            "body": "今天只在日记级挂了话题标签。",
            "event_date": "2026-09-07",
            "tag_ids": [thinking["id"]],
        },
    )
    assert b.status_code == 200
    entry_b = b.json()["data"]["id"]

    # Entry C: different thinking tag only
    c = await client.post(
        "/api/entries",
        headers=headers,
        json={
            "title": "其他话题",
            "body": "这条只挂另一个思考标签。",
            "event_date": "2026-09-06",
            "tag_ids": [other_thinking["id"]],
        },
    )
    assert c.status_code == 200
    entry_c = c.json()["data"]["id"]

    all_resp = await client.get(
        "/api/insights/self-awareness",
        headers=headers,
        params={"tag_id": "all", "page": 1, "page_size": 20},
    )
    assert all_resp.status_code == 200, all_resp.text
    data = all_resp.json()["data"]
    assert data["filter_tag"] is None
    assert data["total"] >= 3
    by_entry = {item["entry_id"]: item for item in data["items"]}
    assert entry_a in by_entry
    assert by_entry[entry_a]["highlight_id"] == hl_id
    assert "碎片" in by_entry[entry_a]["excerpt"]
    assert thinking["name"] in by_entry[entry_a]["tag_names"]
    assert entry_b in by_entry
    assert by_entry[entry_b]["highlight_id"] is None
    assert entry_c in by_entry

    filtered = await client.get(
        "/api/insights/self-awareness",
        headers=headers,
        params={"tag_id": thinking["id"], "page": 1, "page_size": 20},
    )
    assert filtered.status_code == 200
    fdata = filtered.json()["data"]
    assert fdata["filter_tag"]["id"] == thinking["id"]
    f_ids = {item["entry_id"] for item in fdata["items"]}
    assert entry_a in f_ids
    assert entry_b in f_ids
    assert entry_c not in f_ids

    missing = await client.get(
        "/api/insights/self-awareness",
        headers=headers,
        params={"tag_id": str(uuid.uuid4())},
    )
    assert missing.status_code == 404


@pytest.mark.asyncio(loop_scope="module")
async def test_self_awareness_entry_tag_fallback_when_other_topic_mark(
    client: AsyncClient,
) -> None:
    """Entry-level 工作状态 must show even if highlight only has 自我认知."""
    access = await _login(client)
    headers = {"Authorization": f"Bearer {access}"}

    tags = await client.get("/api/tags", headers=headers)
    thinking = {t["name"]: t for t in tags.json()["data"]["items"] if t["kind"] == "thinking"}
    work = thinking["工作状态"]
    # custom tag like user-created 自我认知
    created = await client.post(
        "/api/tags",
        headers=headers,
        json={"kind": "thinking", "name": f"自我认知-{uuid.uuid4().hex[:6]}"},
    )
    assert created.status_code == 200
    self_tag = created.json()["data"]

    entry = await client.post(
        "/api/entries",
        headers=headers,
        json={
            "title": "底层认知",
            "body": "划线只有自我认知标签，篇级还有工作状态。",
            "event_date": "2026-08-27",
            "tag_ids": [work["id"], self_tag["id"]],
        },
    )
    assert entry.status_code == 200
    entry_id = entry.json()["data"]["id"]

    hl = await client.post(
        f"/api/entries/{entry_id}/highlights",
        headers=headers,
        json={
            "kind": "topic_emotion",
            "quote_text": "划线只有自我认知标签",
            "start_offset": 0,
            "end_offset": 10,
            "tag_ids": [self_tag["id"]],
        },
    )
    assert hl.status_code == 200, hl.text

    by_work = await client.get(
        "/api/insights/self-awareness",
        headers=headers,
        params={"tag_id": work["id"]},
    )
    assert by_work.status_code == 200
    items = by_work.json()["data"]["items"]
    match = next((i for i in items if i["entry_id"] == entry_id), None)
    assert match is not None
    assert match["highlight_id"] is None
    assert work["name"] in match["tag_names"]

    by_self = await client.get(
        "/api/insights/self-awareness",
        headers=headers,
        params={"tag_id": self_tag["id"]},
    )
    items_self = by_self.json()["data"]["items"]
    match_self = next((i for i in items_self if i["entry_id"] == entry_id), None)
    assert match_self is not None
    assert match_self["highlight_id"] == hl.json()["data"]["id"]

    by_all = await client.get(
        "/api/insights/self-awareness",
        headers=headers,
        params={"tag_id": "all"},
    )
    assert by_all.status_code == 200
    all_items = [i for i in by_all.json()["data"]["items"] if i["entry_id"] == entry_id]
    assert len(all_items) == 2
    assert any(i["highlight_id"] == hl.json()["data"]["id"] for i in all_items)
    body_item = next(i for i in all_items if i["highlight_id"] is None)
    assert work["name"] in body_item["tag_names"]
    assert self_tag["name"] not in body_item["tag_names"]
