"""Default thinking / emotion tags seeded on register (PRD).

Clay + Mooda candy lanes (no pink theme):
  - thinking: soft indigo / mint / sky clay
  - emotion: Mooda yellow / mint / blue / lavender / coral
  - energy: coral / warm clay (UI only)
"""

from __future__ import annotations

THINKING_DEFAULTS: list[tuple[str, str]] = [
    ("人际关系", "#6FCFB2"),
    ("情绪", "#A78BFA"),
    ("亲密关系", "#E87A7A"),
    ("家庭", "#6B5CEF"),
    ("职业规划", "#7EB6D9"),
    ("工作状态", "#F0A06A"),
    ("金钱观", "#F5D56B"),
    ("价值判断", "#7C6FF0"),
    ("人生观", "#7EC8A3"),
    ("世界观", "#B8A4E8"),
    ("健康", "#6FCFB2"),
    ("学习成长", "#6B9BD1"),
    ("兴趣爱好", "#F5D56B"),
    ("生活探索", "#7EB6D9"),
    ("死亡", "#A39A8E"),
    ("重大事件", "#F0A06A"),
]

EMOTION_DEFAULTS: list[tuple[str, str, str | None]] = [
    ("平静", "#7EC8A3", "calm_wave"),
    ("喜悦", "#F5D56B", "joy_blob"),
    ("期待", "#F5D56B", None),
    ("感动", "#E87A7A", None),
    ("安心", "#7EC8A3", "calm_wave"),
    ("焦虑", "#B8A4E8", "anxious_fuzz"),
    ("疲惫", "#6B9BD1", "low_mud"),
    ("失落", "#6B9BD1", None),
    ("愤怒", "#F0A06A", None),
    ("孤独", "#A39A8E", None),
    ("迷茫", "#B8A4E8", "anxious_fuzz"),
    ("紧张", "#B8A4E8", "anxious_fuzz"),
    ("释然", "#7EC8A3", None),
    ("委屈", "#E87A7A", None),
]


def default_color_for(kind: str, name: str) -> str | None:
    if kind == "thinking":
        return dict(THINKING_DEFAULTS).get(name)
    if kind == "emotion":
        return {n: c for n, c, _ in EMOTION_DEFAULTS}.get(name)
    return None
