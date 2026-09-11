"""LLM client for AI tag suggestions (DeepSeek or mock)."""

from __future__ import annotations

import json
import re
from html import unescape
from typing import Any
from uuid import UUID

import httpx

from src.config.settings import get_settings
from src.db.models import Tag


def _plain_text(body: str) -> str:
    text = re.sub(r"<[^>]+>", " ", body or "")
    text = unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def mock_suggest_tag_ids(body: str, tags: list[Tag], *, limit: int = 3) -> list[UUID]:
    """Keyword overlap against user lexicon; stable fallback without LLM key."""
    plain = _plain_text(body)
    scored: list[tuple[int, Tag]] = []
    for tag in tags:
        score = 0
        if tag.name and tag.name in plain:
            score += 10
        # light heuristics for empty/short bodies
        if not plain and tag.is_system_default:
            score += 1
        if score:
            scored.append((score, tag))
    scored.sort(key=lambda x: (-x[0], x[1].kind, x[1].sort_order, x[1].name))
    picked = [t.id for _, t in scored[:limit]]
    if picked:
        return picked
    # ensure at least one thinking + one emotion when possible
    thinking = [t for t in tags if t.kind == "thinking"]
    emotion = [t for t in tags if t.kind == "emotion"]
    out: list[UUID] = []
    if thinking:
        out.append(thinking[min(5, len(thinking) - 1)].id)  # 工作状态-ish mid
    if emotion:
        out.append(emotion[0].id)
    if len(out) < limit and len(thinking) > 1:
        out.append(thinking[0].id)
    return out[:limit]


async def deepseek_suggest_tag_ids(
    body: str, tags: list[Tag]
) -> tuple[list[UUID], str] | None:
    """Call DeepSeek chat completions; return (tag_ids, raw) or None on failure."""
    settings = get_settings()
    key = (settings.llm_api_key or "").strip()
    if not key:
        return None

    lexicon = [{"id": str(t.id), "kind": t.kind, "name": t.name} for t in tags]
    plain = _plain_text(body)[:4000]
    payload: dict[str, Any] = {
        "model": settings.llm_model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "你是日记标签助手。只能从给定词库中选择标签 id。"
                    "返回 JSON：{\"tag_ids\":[\"uuid\",...]}，最多 4 个，勿输出其他文字。"
                ),
            },
            {
                "role": "user",
                "content": json.dumps(
                    {"body": plain, "lexicon": lexicon}, ensure_ascii=False
                ),
            },
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.2,
    }
    url = settings.llm_base_url.rstrip("/") + "/v1/chat/completions"
    try:
        async with httpx.AsyncClient(timeout=30.0, trust_env=False) as client:
            resp = await client.post(
                url,
                headers={
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            resp.raise_for_status()
            raw = resp.text
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            ids_raw = parsed.get("tag_ids") or []
            allowed = {t.id for t in tags}
            out: list[UUID] = []
            for item in ids_raw:
                try:
                    uid = UUID(str(item))
                except ValueError:
                    continue
                if uid in allowed and uid not in out:
                    out.append(uid)
            return out, raw
    except Exception:
        return None
