"""Auth dependency tests (missing / invalid token → 40101)."""

from __future__ import annotations

from fastapi.testclient import TestClient
from src.config.settings import reset_settings_for_tests
from src.main import app


def test_auth_probe_missing_token() -> None:
    reset_settings_for_tests()
    client = TestClient(app)
    resp = client.get("/api/auth/probe")
    assert resp.status_code == 401
    body = resp.json()
    assert body["code"] == 40101
    assert body["data"] is None
    assert "message" in body


def test_auth_probe_invalid_token() -> None:
    reset_settings_for_tests()
    client = TestClient(app)
    resp = client.get(
        "/api/auth/probe",
        headers={"Authorization": "Bearer not-a-real-token"},
    )
    assert resp.status_code == 401
    body = resp.json()
    assert body["code"] == 40101
    assert body["data"] is None
