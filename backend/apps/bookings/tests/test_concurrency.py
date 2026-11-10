"""Prove the last website room cannot be sold twice under real concurrency.

SQLite serialises writes and does not implement row-level locks the way
Postgres does, so this test only runs when the suite is pointed at Postgres.
CI runs it with ``USE_SQLITE=false`` and a live database.
"""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal

import pytest
from django.db import connections

from apps.bookings.models import Booking
from apps.bookings.services.bookings import SoldOutError, create_booking
from apps.common.utils import hotel_today
from apps.rates.models import MealPlan, RatePlan
from apps.rooms.models import RoomType

pytestmark = pytest.mark.django_db(transaction=True)


def _using_postgres() -> bool:
    return connections["default"].vendor == "postgresql"


@pytest.mark.skipif(
    not _using_postgres(), reason="Row-lock concurrency needs Postgres"
)
def test_only_one_of_many_concurrent_guests_gets_the_last_room():
    meal_plan = MealPlan.objects.create(
        code="room-only",
        name_en="Room only",
        supplement_per_person_per_night=Decimal("0.00"),
        active=True,
    )
    room_type = RoomType.objects.create(
        slug="last-room-postgres",
        name_en="Last room",
        sleeps=2,
        total_rooms=1,
        website_allotment=1,
        active=True,
    )
    RatePlan.objects.create(
        room_type=room_type,
        code="flexible",
        name="Flexible rate",
        weekday_rate=Decimal("9000.00"),
        weekend_rate=Decimal("9000.00"),
        min_nights=1,
        active=True,
    )
    checkin = hotel_today() + 10
    checkout = checkin + 2

    def attempt(index: int) -> str:
        from django.db import transaction

        try:
            with transaction.atomic():
                create_booking(
                    room_type=room_type,
                    meal_plan=meal_plan,
                    checkin=checkin,
                    checkout=checkout,
                    guests=1,
                    first_name=f"Guest{index}",
                    last_name="Concurrent",
                    email=f"guest{index}@example.com",
                    phone=f"0712 345 67{index}",
                    consent_privacy=True,
                )
            return "booked"
        except SoldOutError:
            return "sold_out"
        finally:
            connections.close_all()

    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(attempt, range(8)))

    assert results.count("booked") == 1
    assert results.count("sold_out") == 7
    assert Booking.objects.filter(room_type=room_type).count() == 1
