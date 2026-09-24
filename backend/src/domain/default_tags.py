"""Default thinking / emotion tags seeded on register (PRD).

Colors follow a small Mooda-like set. Same hue means the same category.
Keep hex values aligned with frontend/src/utils/tagColors.ts.
"""

from __future__ import annotations

# 关系 / 事业 / 自我 / 生活
_TOPIC_RELATION = "#E8896A"
_TOPIC_WORK = "#7E9CC8"
_TOPIC_SELF = "#9B84D6"
_TOPIC_LIFE = "#6FBF8A"

# 喜悦 / 安稳 / 愤怒 / 紧绷 / 低落 / 触动
_JOY = "#F2C14E"
_CALM = "#6FBF8A"
_ANGER = "#E15B5B"
_TENSE = "#9B84D6"
_LOW = "#7E9CC8"
_TENDER = "#E8896A"

THINKING_DEFAULTS: list[tuple[str, str]] = [
    ("人际关系", _TOPIC_RELATION),
    ("情绪", _TOPIC_SELF),
    ("亲密关系", _TOPIC_RELATION),
    ("家庭", _TOPIC_RELATION),
    ("职业规划", _TOPIC_WORK),
    ("工作状态", _TOPIC_WORK),
    ("金钱观", _TOPIC_WORK),
    ("价值判断", _TOPIC_SELF),
    ("人生观", _TOPIC_SELF),
    ("世界观", _TOPIC_SELF),
    ("健康", _TOPIC_LIFE),
    ("学习成长", _TOPIC_WORK),
    ("兴趣爱好", _TOPIC_LIFE),
    ("生活探索", _TOPIC_LIFE),
    ("死亡", _TOPIC_SELF),
    ("重大事件", _TOPIC_LIFE),
]

EMOTION_DEFAULTS: list[tuple[str, str, str | None]] = [
    ("平静", _CALM, "calm_wave"),
    ("喜悦", _JOY, "joy_blob"),
    ("期待", _JOY, None),
    ("感动", _TENDER, None),
    ("安心", _CALM, "calm_wave"),
    ("焦虑", _TENSE, "anxious_fuzz"),
    ("疲惫", _LOW, "low_mud"),
    ("失落", _LOW, None),
    ("愤怒", _ANGER, None),
    ("孤独", _LOW, None),
    ("迷茫", _TENSE, "anxious_fuzz"),
    ("紧张", _TENSE, "anxious_fuzz"),
    ("释然", _CALM, None),
    ("委屈", _LOW, None),
]


def default_color_for(kind: str, name: str) -> str | None:
    if kind == "thinking":
        return dict(THINKING_DEFAULTS).get(name)
    if kind == "emotion":
        return {n: c for n, c, _ in EMOTION_DEFAULTS}.get(name)
    return None
