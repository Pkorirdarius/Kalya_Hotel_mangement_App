from __future__ import annotations

from datetime import timedelta

import pytest

from apps.bookings.models import Booking, BookingStatus
from apps.bookings.services.bookings import lookup_booking

pytestmark = pytest.mark.django_db


def _create(api, payload):
    return api.post("/api/v1/bookings/", payload, format="json")


def test_quote_returns_server_price_summary(api, booking_payload):
    response = api.post(
        "/api/v1/bookings/quote/", booking_payload["quote"], format="json"
    )

    assert response.status_code == 200, response.content
    data = response.json()
    assert data["currency"] == "KES"
    assert data["nights"] == 2
    assert data["total"] > 0
    assert isinstance(data["total"], int)
    assert data["available_rooms"] == 2
    assert len(data["nightly_rates"]) == 2


def test_create_booking_holds_inventory(api, booking_payload):
    response = _create(api, booking_payload)

    assert response.status_code == 201, response.content
    booking = response.json()["booking"]
    assert booking["status"] == BookingStatus.HELD
    assert booking["reference"].startswith("WP-")
    assert booking["hold_expires_at"] is not None
    assert booking["guest_name"] == "Amina Wanjiku"


def test_create_booking_is_idempotent_by_client_request_id(api, booking_payload):
    payload = {**booking_payload, "client_request_id": "client-abc-123"}

    first = _create(api, payload)
    second = _create(api, payload)

    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["booking"]["reference"] == second.json()["booking"]["reference"]
    assert Booking.objects.count() == 1


def test_lookup_requires_matching_contact(api, booking_payload):
    reference = _create(api, booking_payload).json()["booking"]["reference"]

    assert api.get(
        f"/api/v1/bookings/{reference}/?email=amina@example.com"
    ).status_code == 200
    assert api.get(
        f"/api/v1/bookings/{reference}/?email=other@example.com"
    ).status_code == 404
    assert api.get(f"/api/v1/bookings/{reference}/").status_code == 400


def test_cancel_booking(api, booking_payload):
    reference = _create(api, booking_payload).json()["booking"]["reference"]

    response = api.post(
        f"/api/v1/bookings/{reference}/cancel/?email=amina@example.com",
        {"reason": "Plans changed"},
        format="json",
    )

    assert response.status_code == 200, response.content
    assert response.json()["status"] == BookingStatus.CANCELLED

    lookup = lookup_booking(reference, email="amina@example.com")
    assert lookup.status == BookingStatus.CANCELLED
    assert lookup.hold_expires_at is None


def test_last_website_room_cannot_be_oversold(
    api, single_room_type, meal_plan, stay_dates
):
    checkin, checkout = stay_dates
    payload = {
        "quote": {
            "room_type": single_room_type.slug,
            "meal_plan": meal_plan.code,
            "checkin": checkin.isoformat(),
            "checkout": checkout.isoformat(),
            "guests": 1,
        },
        "first_name": "First",
        "last_name": "Guest",
        "email": "first@example.com",
        "phone": "0712 345 678",
        "consent_privacy": True,
    }
    second = {
        **payload,
        "first_name": "Second",
        "email": "second@example.com",
        "phone": "0722 345 678",
    }

    assert _create(api, payload).status_code == 201
    response = _create(api, second)

    assert response.status_code == 409, response.content
    assert Booking.objects.count() == 1


def test_expired_hold_releases_inventory(
    api, single_room_type, meal_plan, stay_dates
):
    from django.utils import timezone

    from apps.bookings.services.bookings import expire_stale_holds

    checkin, checkout = stay_dates
    payload = {
        "quote": {
            "room_type": single_room_type.slug,
            "meal_plan": meal_plan.code,
            "checkin": checkin.isoformat(),
            "checkout": checkout.isoformat(),
            "guests": 1,
        },
        "first_name": "First",
        "last_name": "Guest",
        "email": "first@example.com",
        "phone": "0712 345 678",
        "consent_privacy": True,
    }
    reference = _create(api, payload).json()["booking"]["reference"]
    Booking.objects.filter(reference=reference).update(
        hold_expires_at=timezone.now() - timedelta(minutes=1)
    )

    assert expire_stale_holds() == 1

    second = {**payload, "first_name": "Second", "email": "second@example.com", "phone": "0722 345 678"}
    assert _create(api, second).status_code == 201
