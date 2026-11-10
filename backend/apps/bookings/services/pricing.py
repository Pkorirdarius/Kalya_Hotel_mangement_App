from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta
from decimal import ROUND_HALF_UP, Decimal

from django.utils import timezone

from apps.common.utils import as_kes_int, hotel_now, hotel_tz
from apps.rates.models import LongStayDiscount, MealPlan, RatePlan, Season
from apps.rooms.models import RoomType


class QuoteError(ValueError):
    def __init__(self, message: str, fields: dict | None = None):
        super().__init__(message)
        self.fields = fields or {"detail": message}


@dataclass
class Quote:
    room_type: RoomType
    rate_plan: RatePlan
    meal_plan: MealPlan
    checkin: date
    checkout: date
    guests: int
    nights: int
    nightly_rates: list[dict] = field(default_factory=list)
    accommodation_total: Decimal = Decimal("0.00")
    meal_total: Decimal = Decimal("0.00")
    discount_percent: Decimal = Decimal("0.00")
    discount_total: Decimal = Decimal("0.00")
    tax_total: Decimal = Decimal("0.00")
    total: Decimal = Decimal("0.00")
    tax_included: bool = True
    tax_rate_percent: Decimal = Decimal("0.00")
    cancellation_cutoff_hours: int = 48
    free_cancellation_until: datetime | None = None

    def as_dict(self) -> dict:
        return {
            "room_type": self.room_type.slug,
            "room_type_name": self.room_type.name_en,
            "rate_plan": self.rate_plan.code,
            "meal_plan": self.meal_plan.code,
            "checkin": self.checkin.isoformat(),
            "checkout": self.checkout.isoformat(),
            "guests": self.guests,
            "nights": self.nights,
            "currency": "KES",
            "nightly_rates": self.nightly_rates,
            "accommodation_total": as_kes_int(self.accommodation_total),
            "meal_total": as_kes_int(self.meal_total),
            "discount_percent": float(self.discount_percent),
            "discount_total": as_kes_int(self.discount_total),
            "tax_total": as_kes_int(self.tax_total),
            "tax_included": self.tax_included,
            "tax_rate_percent": float(self.tax_rate_percent),
            "total": as_kes_int(self.total),
            "cancellation_cutoff_hours": self.cancellation_cutoff_hours,
            "free_cancellation_until": (
                self.free_cancellation_until.isoformat()
                if self.free_cancellation_until
                else None
            ),
        }


def validate_stay(
    checkin: date,
    checkout: date,
    guests: int,
    *,
    max_nights: int,
) -> int:
    if checkin < hotel_now().date():
        raise QuoteError(
            "Check-in cannot be in the past.", {"checkin": "Choose a future date."}
        )
    if checkout <= checkin:
        raise QuoteError(
            "Check-out must be after check-in.",
            {"checkout": "Check-out must be after check-in."},
        )
    nights = (checkout - checkin).days
    if nights > max_nights:
        raise QuoteError(
            f"Stays are limited to {max_nights} nights.",
            {"checkout": f"Maximum stay is {max_nights} nights."},
        )
    if guests < 1:
        raise QuoteError("At least one guest is required.", {"guests": "Add a guest."})
    return nights


def get_rate_plan(room_type: RoomType, rate_plan_id: int | None = None) -> RatePlan:
    plans = room_type.rate_plans.filter(active=True).order_by("sort_order", "id")
    if rate_plan_id is not None:
        plan = plans.filter(pk=rate_plan_id).first()
        if plan is None:
            raise QuoteError(
                "That rate plan is not available for this room.",
                {"rate_plan": "Choose another rate."},
            )
        return plan
    plan = plans.first()
    if plan is None:
        raise QuoteError(
            "This room has no active rate plan.",
            {"room_type": "This room is not currently bookable."},
        )
    return plan


def is_weekend(night: date) -> bool:
    # Friday and Saturday nights are priced as weekend nights.
    return night.weekday() in (4, 5)


def calculate_quote(
    *,
    room_type: RoomType,
    checkin: date,
    checkout: date,
    guests: int,
    meal_plan: MealPlan,
    rate_plan_id: int | None = None,
    max_nights: int = 30,
    cancellation_cutoff_hours: int = 48,
    tax_included: bool = True,
    tax_rate_percent: Decimal = Decimal("16.00"),
) -> Quote:
    nights = validate_stay(checkin, checkout, guests, max_nights=max_nights)
    if guests > room_type.sleeps:
        raise QuoteError(
            f"{room_type.name_en} sleeps up to {room_type.sleeps} guests.",
            {"guests": f"Maximum {room_type.sleeps} guests for this room."},
        )

    plan = get_rate_plan(room_type, rate_plan_id)
    if nights < plan.min_nights:
        raise QuoteError(
            f"This rate requires at least {plan.min_nights} nights.",
            {"checkout": f"Minimum stay is {plan.min_nights} nights."},
        )

    last_night = checkout - timedelta(days=1)
    seasons = list(
        plan.seasons.filter(
            active=True, start_date__lte=last_night, end_date__gte=checkin
        ).order_by("-priority", "start_date")
    )

    accommodation = Decimal("0.00")
    nightly_rates: list[dict] = []
    cursor = checkin
    while cursor < checkout:
        season = next(
            (
                item
                for item in seasons
                if item.start_date <= cursor <= item.end_date
            ),
            None,
        )
        weekend = is_weekend(cursor)
        if season is not None:
            rate = season.weekend_rate if weekend else season.weekday_rate
            label = season.name
        else:
            rate = plan.weekend_rate if weekend else plan.weekday_rate
            label = plan.name
        accommodation += rate
        nightly_rates.append(
            {
                "date": cursor.isoformat(),
                "rate": as_kes_int(rate),
                "weekend": weekend,
                "season": label,
            }
        )
        cursor += timedelta(days=1)

    meal_total = meal_plan.supplement_per_person_per_night * guests * nights

    discount = (
        LongStayDiscount.objects.filter(
            rate_plan=plan, active=True, min_nights__lte=nights
        )
        .order_by("-min_nights")
        .first()
    )
    discount_percent = discount.percent if discount else Decimal("0.00")
    discount_total = (
        accommodation * discount_percent / Decimal("100")
    ).quantize(Decimal("1"), rounding=ROUND_HALF_UP)

    subtotal = accommodation - discount_total + meal_total
    tax_rate = Decimal(tax_rate_percent or 0)
    if tax_included:
        tax_total = (
            subtotal - (subtotal * Decimal("100") / (Decimal("100") + tax_rate))
            if tax_rate > 0
            else Decimal("0")
        ).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
        total = subtotal
    else:
        tax_total = (subtotal * tax_rate / Decimal("100")).quantize(
            Decimal("1"), rounding=ROUND_HALF_UP
        )
        total = subtotal + tax_total

    arrival = datetime.combine(checkin, time.min, tzinfo=hotel_tz())
    cutoff = arrival - timedelta(hours=cancellation_cutoff_hours)

    return Quote(
        room_type=room_type,
        rate_plan=plan,
        meal_plan=meal_plan,
        checkin=checkin,
        checkout=checkout,
        guests=guests,
        nights=nights,
        nightly_rates=nightly_rates,
        accommodation_total=accommodation,
        meal_total=meal_total,
        discount_percent=discount_percent,
        discount_total=discount_total,
        tax_total=tax_total,
        total=total,
        tax_included=tax_included,
        tax_rate_percent=tax_rate,
        cancellation_cutoff_hours=cancellation_cutoff_hours,
        free_cancellation_until=cutoff,
    )
