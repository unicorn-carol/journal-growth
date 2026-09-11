"""In-memory login OTP store (dev / MVP)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

_codes: dict[str, tuple[str, datetime]] = {}
_TTL = timedelta(minutes=10)


def set_login_code(email: str, code: str) -> None:
    _codes[email.lower()] = (code, datetime.now(UTC) + _TTL)


def consume_login_code(email: str, code: str) -> bool:
    key = email.lower()
    entry = _codes.get(key)
    if entry is None:
        return False
    expected, expires = entry
    if datetime.now(UTC) > expires:
        _codes.pop(key, None)
        return False
    if code.strip() != expected:
        return False
    _codes.pop(key, None)
    return True


def clear_login_codes() -> None:
    """Test helper."""
    _codes.clear()
