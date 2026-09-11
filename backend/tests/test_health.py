"""Health endpoint tests."""

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from src.config.settings import reset_settings_for_tests


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    reset_settings_for_tests()
    from src.main import app

    with TestClient(app) as test_client:
        yield test_client
    reset_settings_for_tests()


def test_health_ok(client: TestClient) -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["code"] == 200
    assert body["message"] == "success"
    assert body["data"]["status"] == "ok"


def test_cors_allows_agent_origin(client: TestClient) -> None:
    response = client.options(
        "/api/health",
        headers={
            "Origin": "http://127.0.0.1:5199",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code in {200, 204}
    assert response.headers.get("access-control-allow-origin") in {
        "http://127.0.0.1:5199",
        "*",
    }
