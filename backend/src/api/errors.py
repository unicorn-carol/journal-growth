"""Shared API error helpers."""

from __future__ import annotations


class AppError(Exception):
    """Raise to return {code, message, data} with a specific HTTP status."""

    def __init__(self, *, http_status: int, code: int, message: str) -> None:
        self.http_status = http_status
        self.code = code
        self.message = message
        super().__init__(message)


def unauthorized(message: str = "未登录或 token 无效") -> AppError:
    return AppError(http_status=401, code=40101, message=message)


def bad_request(message: str, *, code: int = 40001) -> AppError:
    return AppError(http_status=400, code=code, message=message)


def forbidden(message: str, *, code: int = 40301) -> AppError:
    return AppError(http_status=403, code=code, message=message)


def not_found(message: str, *, code: int = 40401) -> AppError:
    return AppError(http_status=404, code=code, message=message)


def conflict(message: str, *, code: int = 40901) -> AppError:
    return AppError(http_status=409, code=code, message=message)
