from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.common.models import HotelSetting
from apps.common.utils import hotel_today
from apps.rates.models import MealPlan, RatePlan
from apps.rooms.models import RoomType


@pytest.fixture
def api() -> APIClient:
    return APIClient()


@pytest.fixture
def hotel(db) -> HotelSetting:
    return HotelSetting.load()


@pytest.fixture
def meal_plan(db) -> MealPlan:
    return MealPlan.objects.create(
        code="room-only",
        name_en="Room only",
        name_sw="Chumba tu",
        supplement_per_person_per_night=Decimal("0.00"),
        active=True,
    )


@pytest.fixture
def room_type(db) -> RoomType:
    room = RoomType.objects.create(
        slug="standard",
        name_en="Standard",
        name_sw="Kawaida",
        sleeps=2,
        total_rooms=2,
        website_allotment=2,
        active=True,
    )
    RatePlan.objects.create(
        room_type=room,
        code="flexible",
        name="Flexible rate",
        weekday_rate=Decimal("8000.00"),
        weekend_rate=Decimal("8000.00"),
        min_nights=1,
        active=True,
    )
    return room


@pytest.fixture
def single_room_type(db) -> RoomType:
    room = RoomType.objects.create(
        slug="last-room",
        name_en="Last room",
        sleeps=2,
        total_rooms=1,
        website_allotment=1,
        active=True,
    )
    RatePlan.objects.create(
        room_type=room,
        code="flexible",
        name="Flexible rate",
        weekday_rate=Decimal("9000.00"),
        weekend_rate=Decimal("9000.00"),
        active=True,
    )
    return room


@pytest.fixture
def stay_dates():
    checkin = hotel_today() + timedelta(days=10)
    checkout = checkin + timedelta(days=2)
    return checkin, checkout


@pytest.fixture
def booking_payload(room_type, meal_plan, stay_dates):
    checkin, checkout = stay_dates
    return {
        "quote": {
            "room_type": room_type.slug,
            "meal_plan": meal_plan.code,
            "checkin": checkin.isoformat(),
            "checkout": checkout.isoformat(),
            "guests": 1,
        },
        "first_name": "Amina",
        "last_name": "Wanjiku",
        "email": "amina@example.com",
        "phone": "0712 345 678",
        "consent_privacy": True,
        "language": "en",
    }
