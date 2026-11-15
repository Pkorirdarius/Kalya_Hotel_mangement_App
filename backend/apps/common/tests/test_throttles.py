"""Public endpoints must stop abusive request rates.

Each view sets a named ``throttle_scope``; these tests send one request more
than the configured limit and assert DRF answers 429. ``conftest.py`` clears
the process cache before and after every test, so the counters cannot leak.
"""

from __future__ import annotations

import pytest
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


def _newsletter_payload(index: int) -> dict:
    return {
        "email": f"guest-{index}@example.com",
        "language": "en",
        "source": "test",
    }


def test_newsletter_throttle_blocks_the_eleventh_request():
    client = APIClient()

    for index in range(10):
        response = client.post(
            "/api/v1/marketing/newsletter/",
            _newsletter_payload(index),
            format="json",
        )
        assert response.status_code == 201, response.data

    blocked = client.post(
        "/api/v1/marketing/newsletter/",
        _newsletter_payload(99),
        format="json",
    )

    assert blocked.status_code == 429
    assert blocked.data["error"]["code"] == "throttled"


def test_login_throttle_blocks_repeated_password_guessing():
    client = APIClient()

    for _ in range(10):
        response = client.post(
            "/api/v1/staff/auth/login/",
            {"username": "nobody", "password": "wrong-password"},
            format="json",
        )
        assert response.status_code == 401, response.data

    blocked = client.post(
        "/api/v1/staff/auth/login/",
        {"username": "nobody", "password": "wrong-password"},
        format="json",
    )

    assert blocked.status_code == 429


def test_quote_throttle_blocks_the_twenty_first_request(room_type, meal_plan, stay_dates):
    checkin, checkout = stay_dates
    payload = {
        "room_type": room_type.slug,
        "meal_plan": meal_plan.code,
        "checkin": checkin.isoformat(),
        "checkout": checkout.isoformat(),
        "guests": 1,
    }
    client = APIClient()

    for _ in range(20):
        response = client.post("/api/v1/bookings/quote/", payload, format="json")
        assert response.status_code == 200, response.data

    blocked = client.post("/api/v1/bookings/quote/", payload, format="json")

    assert blocked.status_code == 429
