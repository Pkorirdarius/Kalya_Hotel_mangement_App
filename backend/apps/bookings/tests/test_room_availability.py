from __future__ import annotations

from apps.bookings.models import BookingStatus
from apps.bookings.services.availability import available_rooms
from apps.bookings.services.bookings import create_booking
from apps.bookings.state import transition_booking
from apps.rooms.models import Room

import pytest

pytestmark = pytest.mark.django_db


def _book(room_type, meal_plan, stay_dates, email="guest@example.com"):
    checkin, checkout = stay_dates
    booking, _ = create_booking(
        room_type=room_type,
        meal_plan=meal_plan,
        checkin=checkin,
        checkout=checkout,
        guests=1,
        first_name="Test",
        last_name="Guest",
        email=email,
        phone="+254712000001",
        consent_privacy=True,
    )
    return booking


def test_booking_assigns_a_physical_room_and_does_not_double_count(
    room_type, meal_plan, stay_dates
):
    checkin, checkout = stay_dates
    assert available_rooms(room_type, checkin, checkout) == 2

    booking = _book(room_type, meal_plan, stay_dates)

    assert booking.room is not None
    assert booking.room.room_type_id == room_type.pk
    assert available_rooms(room_type, checkin, checkout) == 1


def test_front_desk_occupied_room_reduces_website_availability(
    room_type, meal_plan, stay_dates
):
    checkin, checkout = stay_dates
    room = Room.objects.filter(room_type=room_type).order_by("number").first()
    room.status = Room.Status.OCCUPIED
    room.save(update_fields=["status"])

    assert available_rooms(room_type, checkin, checkout) == 1

    booking = _book(room_type, meal_plan, stay_dates)

    assert booking.room != room
    assert available_rooms(room_type, checkin, checkout) == 0


def test_cancel_releases_the_assigned_room(room_type, meal_plan, stay_dates):
    checkin, checkout = stay_dates
    booking = _book(room_type, meal_plan, stay_dates)
    assert available_rooms(room_type, checkin, checkout) == 1

    transition_booking(booking, BookingStatus.CANCELLED, reason="Test")

    booking.refresh_from_db()
    assert booking.room is None
    assert available_rooms(room_type, checkin, checkout) == 2
