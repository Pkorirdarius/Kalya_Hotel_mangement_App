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


def test_quote_uses_the_generous_browse_throttle(room_type, meal_plan, stay_dates):
    """Guests behind one shared hotel or mobile IP must be able to compare stays.

    Quotes used to share the strict booking limit. They now use ``browse``
    (1200/hour by default), so a normal session cannot exhaust it.
    """

    checkin, checkout = stay_dates
    payload = {
        "room_type": room_type.slug,
        "meal_plan": meal_plan.code,
        "checkin": checkin.isoformat(),
        "checkout": checkout.isoformat(),
        "guests": 1,
    }
    client = APIClient()

    for _ in range(25):
        response = client.post("/api/v1/bookings/quote/", payload, format="json")
        assert response.status_code == 200, response.data


def test_browse_views_share_one_generous_scope():
    from apps.bookings.views import AvailabilityView, QuoteView
    from apps.facilities.views import (
        ConferenceAvailabilityView,
        GymAvailabilityView,
        MenuView,
        RestaurantSlotsView,
    )
    from apps.rates.views import MealPlanListView
    from apps.rooms.views import RoomTypeDetailView, RoomTypeListView

    views = [
        AvailabilityView,
        QuoteView,
        RoomTypeListView,
        RoomTypeDetailView,
        MealPlanListView,
        RestaurantSlotsView,
        ConferenceAvailabilityView,
        GymAvailabilityView,
        MenuView,
    ]

    for view in views:
        assert view.throttle_scope == "browse", view.__name__


def test_strict_views_keep_their_own_scope():
    from apps.bookings.views import BookingCreateView, BookingDetailView
    from apps.notifications.views import (
        ContactMessageCreateView,
        NewsletterSubscribeView,
    )

    assert BookingCreateView.throttle_scope == "booking"
    assert BookingDetailView.throttle_scope == "lookup"
    assert NewsletterSubscribeView.throttle_scope == "newsletter"
    assert ContactMessageCreateView.throttle_scope == "enquiry"


def test_booking_lookup_throttle_blocks_the_thirty_first_request():
    client = APIClient()
    url = "/api/v1/bookings/WP-MISSING/?email=guest@example.com"

    for _ in range(30):
        response = client.get(url)
        assert response.status_code == 404

    blocked = client.get(url)

    assert blocked.status_code == 429
