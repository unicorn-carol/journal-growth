"""Import API tests."""

from __future__ import annotations

import uuid
from collections.abc import AsyncGenerator
from io import BytesIO

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from src.config.settings import reset_settings_for_tests
from src.services.import_parse import parse_journal_text
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
    email = f"t017_{uuid.uuid4().hex[:10]}@example.com"
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


def test_parse_journal_text_splits_by_heading() -> None:
    raw = """# 关于工作节奏
日期：2026-08-29
今天开完会后有点空。

---

# 路过花店
日期：2026年8月2日
下班路过花店，闻见桂花香。
"""
    entries = parse_journal_text(raw)
    assert len(entries) == 2
    assert entries[0]["title"] == "关于工作节奏"
    assert entries[0]["event_date"] == "2026-08-29"
    assert entries[0]["date_inferred"] is False
    assert entries[1]["title"] == "路过花店"
    assert entries[1]["event_date"] == "2026-08-02"


@pytest.mark.asyncio(loop_scope="module")
async def test_import_upload_preview_commit(client: AsyncClient) -> None:
    access = await _login(client)
    headers = {"Authorization": f"Bearer {access}"}

    content = (
        "# 导入篇一\n"
        "日期：2026-09-01\n"
        "第一篇正文内容。\n\n"
        "---\n\n"
        "# 导入篇二\n"
        "日期：2026-09-02\n"
        "第二篇正文内容。\n"
    ).encode()

    bad = await client.post(
        "/api/imports",
        headers=headers,
        files={"file": ("notes.pdf", BytesIO(b"%PDF"), "application/pdf")},
    )
    assert bad.status_code == 400

    created = await client.post(
        "/api/imports",
        headers=headers,
        files={"file": ("meeting-notes.md", BytesIO(content), "text/markdown")},
    )
    assert created.status_code == 200, created.text
    job = created.json()["data"]
    assert job["status"] == "preview"
    assert job["preview"]["entry_count"] == 2
    job_id = job["id"]


    from src.services.import_service import _upload_root

    stored = list(_upload_root().glob(f"{job_id}_*"))
    assert stored, "uploaded file missing under UPLOAD_DIR"

    got = await client.get(f"/api/imports/{job_id}", headers=headers)
    assert got.status_code == 200
    assert got.json()["data"]["status"] == "preview"

    patched = await client.patch(
        f"/api/imports/{job_id}/preview",
        headers=headers,
        json={"entries": [{"temp_id": "t1", "title": "改标题", "event_date": "2026-08-31"}]},
    )
    assert patched.status_code == 200
    row = next(
        e for e in patched.json()["data"]["preview"]["entries"] if e["temp_id"] == "t1"
    )
    assert row["title"] == "改标题"
    assert row["event_date"] == "2026-08-31"

    committed = await client.post(
        f"/api/imports/{job_id}/commit",
        headers=headers,
        json={"confirm": True},
    )
    assert committed.status_code == 200, committed.text
    result = committed.json()["data"]
    assert result["status"] == "committed"
    assert len(result["created_entry_ids"]) == 2

    entries = await client.get("/api/entries", headers=headers)
    assert entries.status_code == 200
    titles = {e["title"] for e in entries.json()["data"]["items"]}
    assert "改标题" in titles
    assert "导入篇二" in titles
