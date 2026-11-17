"""Role boundaries around guest data.

Marketing and ICT accounts exist for content and system work respectively. They
must never reach the booking list, front desk queue/actions, reports or guest
exports. Director access is asserted alongside each denial so a broken URL
cannot masquerade as a passing permission check.
"""

from __future__ import annotations

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User, UserRole

pytestmark = pytest.mark.django_db


def _staff(role: str, username: str) -> User:
    return User.objects.create_user(
        username=username,
        email=f"{username}@example.com",
        password="strong-test-password",
        role=role,
        is_staff=True,
    )


@pytest.fixture
def marketing():
    return _staff(UserRole.MARKETING, "marketing-user")


@pytest.fixture
def ict_admin():
    return _staff(UserRole.ICT_ADMIN, "ict-user")


@pytest.fixture
def director():
    return _staff(UserRole.DIRECTOR, "director-user")


@pytest.fixture
def client_for():
    def _client(user):
        client = APIClient()
        client.force_login(user)
        return client

    return _client


@pytest.mark.parametrize(
    ("method", "path", "payload"),
    [
        ("get", "/api/v1/staff/bookings/bookings/", None),
        ("get", "/api/v1/staff/frontdesk/queue/", None),
        ("get", "/api/v1/staff/frontdesk/activity/", None),
        (
            "post",
            "/api/v1/staff/frontdesk/actions/",
            {"entity_type": "booking", "entity_id": 1, "action": "confirm"},
        ),
        ("get", "/api/v1/staff/reports/overview/", None),
        ("get", "/api/v1/staff/reports/payments/", None),
        ("get", "/api/v1/staff/reports/hotelplus-export/", None),
    ],
)
def test_marketing_cannot_reach_guest_data(
    client_for, marketing, method, path, payload
):
    client = client_for(marketing)
    if method == "get":
        response = client.get(path)
    else:
        response = client.post(path, payload, format="json")

    assert response.status_code == 403, (path, response.status_code, response.data)


def test_ict_admin_cannot_reach_guest_data(client_for, ict_admin):
    client = client_for(ict_admin)

    assert client.get("/api/v1/staff/bookings/bookings/").status_code == 403
    assert client.get("/api/v1/staff/frontdesk/queue/").status_code == 403
    assert client.get("/api/v1/staff/reports/overview/").status_code == 403


def test_director_keeps_access_to_the_same_endpoints(client_for, director):
    client = client_for(director)

    assert client.get("/api/v1/staff/bookings/bookings/").status_code == 200
    assert client.get("/api/v1/staff/frontdesk/queue/").status_code == 200
    assert client.get("/api/v1/staff/reports/overview/").status_code == 200


def test_marketing_still_manages_content(client_for, marketing):
    client = client_for(marketing)

    assert client.get("/api/v1/staff/content/posts/").status_code == 200
