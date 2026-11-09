import pytest
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


def test_health_endpoint_reports_database_status():
    response = APIClient().get("/api/v1/health/")

    assert response.status_code == 200
    assert response.data["status"] == "ok"
    assert response.data["database"] is True
    assert response.data["service"] == "west-premier-api"
    assert response["X-Request-ID"]


def test_request_id_is_echoed_when_safe():
    response = APIClient().get(
        "/api/v1/health/", HTTP_X_REQUEST_ID="web-abc_123"
    )

    assert response.status_code == 200
    assert response["X-Request-ID"] == "web-abc_123"
