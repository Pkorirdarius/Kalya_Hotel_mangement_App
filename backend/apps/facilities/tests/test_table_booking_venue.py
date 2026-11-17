from __future__ import annotations

from datetime import time, timedelta

import pytest

from apps.common.utils import hotel_today
from apps.facilities.models import TableBooking
from apps.facilities.services import restaurant_slot_capacity

pytestmark = pytest.mark.django_db

BOOKINGS_URL = "/api/v1/facilities/restaurant/bookings/"


def booking_payload(**overrides):
    payload = {
        "date": (hotel_today() + timedelta(days=2)).isoformat(),
        "time": "19:00",
        "party_size": 2,
        "first_name": "Grace",
        "last_name": "Wanjiku",
        "phone": "0712 345 678",
        "email": "grace@example.com",
    }
    payload.update(overrides)
    return payload


def test_table_booking_without_venue_defaults_to_restaurant(api):
    response = api.post(BOOKINGS_URL, booking_payload(), format="json")

    assert response.status_code == 201
    body = response.json()["booking"]
    assert body["venue"] == TableBooking.Venue.RESTAURANT
    assert body["venue_display"] == "Restaurant"
    assert TableBooking.objects.get(reference=body["reference"]).venue == "restaurant"


def test_table_booking_explicit_restaurant_is_accepted(api):
    response = api.post(BOOKINGS_URL, booking_payload(venue="restaurant"), format="json")

    assert response.status_code == 201
    assert response.json()["booking"]["venue"] == TableBooking.Venue.RESTAURANT


def test_coffee_shop_booking_is_rejected(api):
    response = api.post(BOOKINGS_URL, booking_payload(venue="coffee"), format="json")

    assert response.status_code == 400
    assert "venue" in response.json()["error"]["fields"]
    assert not TableBooking.objects.filter(venue=TableBooking.Venue.COFFEE).exists()
    assert not TableBooking.objects.exists()


def test_unknown_venue_is_rejected(api):
    response = api.post(BOOKINGS_URL, booking_payload(venue="lobby"), format="json")

    assert response.status_code == 400
    assert "venue" in response.json()["error"]["fields"]


def test_coffee_rows_do_not_reduce_restaurant_capacity(hotel):
    day = hotel_today() + timedelta(days=3)
    slot = time(19, 0)
    baseline = restaurant_slot_capacity(day)
    baseline_remaining = next(row["remaining"] for row in baseline if row["time"] == "19:00")

    # A legacy or admin-created coffee row must not be counted against the
    # restaurant's seat capacity.
    TableBooking.objects.create(
        reference="TB-COFFEE-1",
        venue=TableBooking.Venue.COFFEE,
        date=day,
        time=slot,
        party_size=6,
        first_name="Walk",
        last_name="In",
        phone="254700000002",
    )

    after = restaurant_slot_capacity(day)
    assert next(row["remaining"] for row in after if row["time"] == "19:00") == baseline_remaining
