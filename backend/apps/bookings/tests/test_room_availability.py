from __future__ import annotations

import json
from datetime import timedelta

from django.utils import timezone

from apps.bookings.models import BookingStatus
from apps.bookings.serializers import BookingPublicSerializer
from apps.bookings.services.availability import available_rooms
from apps.bookings.services.bookings import SoldOutError, create_booking, expire_stale_holds
from apps.bookings.state import restore_booking_status, transition_booking
from apps.rooms.models import Room, RoomBlock

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


def test_second_hold_on_the_last_room_is_rejected(
    single_room_type, meal_plan, stay_dates
):
    checkin, checkout = stay_dates
    first = _book(single_room_type, meal_plan, stay_dates)

    assert first.room is not None
    with pytest.raises(SoldOutError):
        _book(single_room_type, meal_plan, stay_dates, email="second@example.com")


def test_hold_expiry_releases_the_assigned_room(room_type, meal_plan, stay_dates):
    checkin, checkout = stay_dates
    booking = _book(room_type, meal_plan, stay_dates)
    booking.hold_expires_at = timezone.now() - timedelta(minutes=1)
    booking.save(update_fields=["hold_expires_at"])

    assert expire_stale_holds() == 1

    booking.refresh_from_db()
    assert booking.status == BookingStatus.EXPIRED
    assert booking.room is None
    assert available_rooms(room_type, checkin, checkout) == 2


def test_decline_releases_the_room_and_front_desk_undo_reassigns_it(
    room_type, meal_plan, stay_dates
):
    checkin, checkout = stay_dates
    booking = _book(room_type, meal_plan, stay_dates)
    transition_booking(booking, BookingStatus.PENDING_PAYMENT)
    transition_booking(booking, BookingStatus.PENDING_CONFIRMATION)
    assert booking.room is not None

    transition_booking(booking, BookingStatus.DECLINED, reason="Test desk decline")

    booking.refresh_from_db()
    assert booking.room is None
    assert available_rooms(room_type, checkin, checkout) == 2

    restore_booking_status(booking, BookingStatus.PENDING_CONFIRMATION)

    booking.refresh_from_db()
    assert booking.room is not None
    assert available_rooms(room_type, checkin, checkout) == 1


def test_desk_occupancy_of_an_online_guests_room_is_not_double_counted(
    room_type, meal_plan, stay_dates
):
    checkin, checkout = stay_dates
    booking = _book(room_type, meal_plan, stay_dates)
    room = booking.room
    assert available_rooms(room_type, checkin, checkout) == 1

    room.status = Room.Status.OCCUPIED
    room.save(update_fields=["status"])

    assert available_rooms(room_type, checkin, checkout) == 1

    room.status = Room.Status.FREE
    room.save(update_fields=["status"])
    assert available_rooms(room_type, checkin, checkout) == 1


def test_staff_room_block_and_booking_are_both_counted(
    room_type, meal_plan, stay_dates
):
    checkin, checkout = stay_dates
    RoomBlock.objects.create(
        room_type=room_type,
        start_date=checkin,
        end_date=checkout,
        quantity=1,
        reason="Maintenance",
    )

    assert available_rooms(room_type, checkin, checkout) == 1

    booking = _book(room_type, meal_plan, stay_dates)

    assert booking.room is not None
    assert available_rooms(room_type, checkin, checkout) == 0


def test_public_availability_exposes_only_category_and_date_data(
    api, room_type, stay_dates
):
    checkin, checkout = stay_dates
    response = api.get(
        "/api/v1/bookings/availability/",
        {"checkin": checkin.isoformat(), "checkout": checkout.isoformat(), "guests": 2},
    )

    assert response.status_code == 200
    assert len(response.data) == 1
    row = response.data[0]
    assert set(row) == {
        "room_type",
        "name",
        "available_rooms",
        "sleeps",
        "fits_guests",
        "from_price",
    }
    assert row["room_type"] == room_type.slug
    assert "TEST-1" not in json.dumps(response.data, default=str)
    assert "TEST-2" not in json.dumps(response.data, default=str)


def test_public_booking_response_hides_the_assigned_room_number(
    room_type, meal_plan, stay_dates
):
    booking = _book(room_type, meal_plan, stay_dates)

    data = BookingPublicSerializer(booking).data

    assert booking.room is not None
    assert "room" not in data
    assert "room_number" not in data
    assert booking.room.number not in json.dumps(data)


def test_public_room_pages_hide_physical_records_and_counts(api, room_type):
    for path in ("/api/v1/rooms/", f"/api/v1/rooms/{room_type.slug}/"):
        response = api.get(path)

        assert response.status_code == 200
        rows = response.data if isinstance(response.data, list) else [response.data]
        for row in rows:
            for hidden in ("total_rooms", "website_allotment", "rooms", "number"):
                assert hidden not in row
        payload = json.dumps(response.data)
        assert "TEST-1" not in payload
        assert "TEST-2" not in payload
