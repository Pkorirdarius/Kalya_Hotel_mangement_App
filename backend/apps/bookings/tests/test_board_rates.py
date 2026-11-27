from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

import pytest

from apps.bookings.services.pricing import calculate_quote
from apps.common.utils import hotel_today
from apps.rates.models import MealPlan, RatePlan
from apps.rooms.models import RoomType

pytestmark = pytest.mark.django_db


SUPPLEMENTS = {
    "breakfast": Decimal("1000.00"),
    "half-board": Decimal("2500.00"),
    "full-board": Decimal("4000.00"),
}


@pytest.fixture
def board_plans(db):
    plans = {}
    for code, supplement in SUPPLEMENTS.items():
        plans[code] = MealPlan.objects.create(
            code=code,
            name_en=code,
            name_sw=code,
            supplement_per_room_per_night=supplement,
            extra_person_per_night=Decimal("1500.00"),
            active=True,
        )
    return plans


def _room(slug: str, nightly_rate: str) -> RoomType:
    room = RoomType.objects.create(
        slug=slug,
        name_en=slug,
        name_sw=slug,
        sleeps=2,
        total_rooms=1,
        website_allotment=1,
        active=True,
    )
    RatePlan.objects.create(
        room_type=room,
        code="flexible",
        name="Flexible rate",
        weekday_rate=Decimal(nightly_rate),
        weekend_rate=Decimal(nightly_rate),
        min_nights=1,
        active=True,
    )
    return room


def _quote(room: RoomType, plan: MealPlan, guests: int):
    checkin = hotel_today() + timedelta(days=10)
    return calculate_quote(
        room_type=room,
        checkin=checkin,
        checkout=checkin + timedelta(days=1),
        guests=guests,
        meal_plan=plan,
        max_nights=30,
    )


@pytest.mark.parametrize(
    ("code", "one_guest", "two_guests"),
    [
        ("breakfast", 7000, 8500),
        ("half-board", 8500, 10000),
        ("full-board", 10000, 11500),
    ],
)
def test_confirmed_superior_and_deluxe_board_rates(board_plans, code, one_guest, two_guests):
    """Base 6,000 + board supplement, plus 1,500 for the second guest."""
    room = _room("superior", "6000.00")
    plan = board_plans[code]

    assert int(_quote(room, plan, 1).total) == one_guest
    assert int(_quote(room, plan, 2).total) == two_guests


@pytest.mark.parametrize(
    ("code", "one_guest", "two_guests"),
    [
        ("breakfast", 10000, 11500),
        ("half-board", 11500, 13000),
        ("full-board", 13000, 14500),
    ],
)
def test_confirmed_executive_suite_board_rates(board_plans, code, one_guest, two_guests):
    """The En-suite room is the hotel's Executive Suite (base 9,000)."""
    room = _room("en-suite", "9000.00")
    plan = board_plans[code]

    assert int(_quote(room, plan, 1).total) == one_guest
    assert int(_quote(room, plan, 2).total) == two_guests


def test_extra_person_charge_is_a_meal_charge_not_room_charge(board_plans):
    room = _room("deluxe", "6000.00")
    plan = board_plans["breakfast"]

    quote = _quote(room, plan, 2)

    assert int(quote.accommodation_total) == 6000
    assert int(quote.meal_total) == 2500
    assert int(quote.total) == 8500
