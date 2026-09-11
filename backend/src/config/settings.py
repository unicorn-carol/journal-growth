"""Application settings loaded via pycore ConfigManager."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from pycore.core import BaseSettings, ConfigLoader, ConfigManager


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


_config: ConfigManager[AppSettings] | None = None


def _resolve_env_path() -> Path:
    here = Path(__file__).resolve()
    # backend/src/config/settings.py → backend/.env
    backend_env = here.parents[2] / ".env"
    if backend_env.exists():
        return backend_env
    # project root fallback
    root_env = here.parents[3] / "backend" / ".env"
    return root_env


def get_settings() -> AppSettings:
    global _config
    if _config is None:
        ConfigManager.reset()
        manager: ConfigManager[AppSettings] = ConfigManager()
        manager.register_loader(DotEnvConfigLoader())
        manager.load(AppSettings, _resolve_env_path(), use_env=False)
        _config = manager
    settings = _config.settings
    assert isinstance(settings, AppSettings)
    return settings


def reset_settings_for_tests() -> None:
    """Reset singleton between tests."""
    global _config
    _config = None
    ConfigManager.reset()
