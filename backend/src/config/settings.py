"""Application settings: .env file first, then PaaS process-env overlay."""

from __future__ import annotations

import json
import os
import ssl
from pathlib import Path
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from pycore.core import BaseSettings, ConfigLoader


class DotEnvConfigLoader(ConfigLoader):
    """Load KEY=VALUE .env files into a flat dict (no process env overlay)."""

    def supports(self, path: Path) -> bool:
        name = path.name.lower()
        return name == ".env" or name.endswith(".env") or path.suffix.lower() == ".env"

    def load(self, path: Path) -> dict[str, Any]:
        if not path.exists():
            raise FileNotFoundError(path)
        data: dict[str, Any] = {}
        for raw in path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
                value = value[1:-1]
            data[key.lower()] = _coerce(value)
        return data


def _coerce(value: str) -> Any:
    lowered = value.lower()
    if lowered in {"true", "false"}:
        return lowered == "true"
    if value.startswith("[") or value.startswith("{"):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value
    try:
        if "." in value:
            return float(value)
        return int(value)
    except ValueError:
        return value


# Process env keys PaaS platforms inject (Railway / Render / Fly).
_PAAS_ENV_KEYS = (
    "APP_NAME",
    "DEBUG",
    "HOST",
    "PORT",
    "DATABASE_URL",
    "CORS_ORIGINS",
    "JWT_SECRET",
    "JWT_EXPIRE_SECONDS",
    "LLM_API_KEY",
    "LLM_BASE_URL",
    "LLM_MODEL",
    "MAIL_DEV_PRINT",
    "UPLOAD_DIR",
    "FRONTEND_PUBLIC_URL",
    "STATIC_DIR",
)


def _normalize_cors_origins(value: Any) -> list[str]:
    """Accept JSON array or a single origin URL (common Railway typo)."""
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return []
        if text.startswith("["):
            parsed = json.loads(text)
            if isinstance(parsed, list):
                return [str(item).strip() for item in parsed if str(item).strip()]
        if "," in text:
            return [part.strip() for part in text.split(",") if part.strip()]
        return [text]
    return []


def _paas_env_overlay() -> dict[str, Any]:
    """Explicit allow-list overlay — not ConfigManager use_env=True."""
    out: dict[str, Any] = {}
    for key in _PAAS_ENV_KEYS:
        if key not in os.environ:
            continue
        raw = os.environ[key]
        if raw == "":
            continue
        out[key.lower()] = _coerce(raw)
    return out


def normalize_database_url(url: str) -> str:
    """Railway/Render give postgresql://; SQLAlchemy async needs +asyncpg."""
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]
    if url.startswith("postgresql://") and "+asyncpg" not in url:
        url = "postgresql+asyncpg://" + url[len("postgresql://") :]
    # asyncpg does not understand libpq sslmode=; strip and use asyncpg_connect_args().
    parsed = urlparse(url)
    if parsed.query:
        q = [(k, v) for k, v in parse_qsl(parsed.query, keep_blank_values=True) if k.lower() != "sslmode"]
        url = urlunparse(parsed._replace(query=urlencode(q)))
    return url


def asyncpg_connect_args(database_url: str) -> dict[str, Any]:
    """SSL for Railway public proxy; private *.railway.internal needs no SSL."""
    lower = database_url.lower()
    if "railway.internal" in lower:
        return {}
    if "proxy.rlwy.net" in lower or "rlwy.net" in lower:
        return {"ssl": ssl.create_default_context()}
    return {}


class AppSettings(BaseSettings):
    app_name: str = "journal-growth"
    debug: bool = True
    host: str = "127.0.0.1"
    port: int = 8099
    database_url: str = "postgresql+asyncpg://postgres@127.0.0.1:5432/journal_growth"
    cors_origins: list[str] = [
        "http://localhost:5199",
        "http://127.0.0.1:5199",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
    ]
    jwt_secret: str
    jwt_expire_seconds: int = 604800
    llm_api_key: str = ""
    llm_base_url: str = "https://api.deepseek.com"
    llm_model: str = "deepseek-v4-pro"
    mail_dev_print: bool = True
    upload_dir: str = "backend/data/uploads"
    frontend_public_url: str = "http://127.0.0.1:5199"
    static_dir: str = ""


_settings: AppSettings | None = None


def _resolve_env_path() -> Path:
    here = Path(__file__).resolve()
    # backend/src/config/settings.py → backend/.env
    backend_env = here.parents[2] / ".env"
    if backend_env.exists():
        return backend_env
    # project root fallback
    return here.parents[3] / "backend" / ".env"


def get_settings() -> AppSettings:
    global _settings
    if _settings is None:
        raw: dict[str, Any] = {}
        path = _resolve_env_path()
        if path.exists():
            raw.update(DotEnvConfigLoader().load(path))
        # PaaS / container: process env wins over file
        raw.update(_paas_env_overlay())
        if "database_url" in raw and isinstance(raw["database_url"], str):
            raw["database_url"] = normalize_database_url(raw["database_url"])
        if "cors_origins" in raw:
            raw["cors_origins"] = _normalize_cors_origins(raw["cors_origins"])
        _settings = AppSettings.model_validate(raw)
    return _settings


def reset_settings_for_tests() -> None:
    """Reset singleton between tests."""
    global _settings
    _settings = None
