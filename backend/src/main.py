"""Application entrypoint — pycore APIServer."""

from pathlib import Path

from fastapi.responses import JSONResponse
from pycore.api import APIConfig, APIServer
from pycore.core import Logger, LoggerConfig, LogLevel, get_logger

from src.api.errors import AppError
from src.api.routes.ai_suggestions import router as ai_suggestions_router
from src.api.routes.auth import router as auth_router
from src.api.routes.auth_probe import router as auth_probe_router
from src.api.routes.entries import router as entries_router
from src.api.routes.health import router as health_router
from src.api.routes.highlights import router as highlights_router
from src.api.routes.imports import router as imports_router
from src.api.routes.insights import router as insights_router
from src.api.routes.tags import router as tags_router
from src.config.settings import get_settings
from src.db.session import init_db

settings = get_settings()

Logger.configure(
    LoggerConfig(
        level=LogLevel.DEBUG if settings.debug else LogLevel.INFO,
        app_name=settings.app_name,
        json_format=False,
    )
)
logger = get_logger()

upload_path = Path(settings.upload_dir)
if not upload_path.is_absolute():
    # resolve relative to project root (parent of backend/)
    upload_path = Path(__file__).resolve().parents[2] / settings.upload_dir
upload_path.mkdir(parents=True, exist_ok=True)

server = APIServer(
    APIConfig(
        title="漫长游记 API",
        description="journal-growth backend",
        version="0.1.0",
        host=settings.host,
        port=settings.port,
        debug=settings.debug,
        cors_origins=list(settings.cors_origins),
    )
)
server.include_router(health_router)
server.include_router(auth_router)
server.include_router(auth_probe_router)
server.include_router(tags_router)
server.include_router(entries_router)
server.include_router(highlights_router)
server.include_router(ai_suggestions_router)
server.include_router(insights_router)
server.include_router(imports_router)
server.on_startup(init_db)
# Avoid disposing the shared async engine between pytest event loops.
# Process exit is enough for local/dev; production can wrap with atexit if needed.

app = server.app


@app.exception_handler(AppError)
async def app_error_handler(_request: object, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.http_status,
        content={"code": exc.code, "message": exc.message, "data": None},
    )


logger.info("App ready", host=settings.host, port=settings.port)
