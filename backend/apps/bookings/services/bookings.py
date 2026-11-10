from __future__ import annotations

from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.common.models import HotelSetting
from apps.common.utils import (
    hotel_now,
    normalise_kenyan_phone,
    unique_reference,
)
from apps.rates.models import MealPlan

from ..models import Booking, BookingStatus
from ..state import transition_booking
from .availability import available_rooms
from .pricing import Quote, QuoteError, calculate_quote

HOLD_STATUSES = (BookingStatus.HELD, BookingStatus.PENDING_PAYMENT)


class SoldOutError(ValueError):
    pass


class CancellationError(ValueError):
    pass


@transaction.atomic
def create_booking(
    *,
    room_type,
    meal_plan: MealPlan,
    checkin,
    checkout,
    guests: int,
    first_name: str,
    last_name: str,
    email: str,
    phone: str,
    country: str = "",
    notes: str = "",
    language: str = "en",
    consent_privacy: bool = False,
    rate_plan_id: int | None = None,
    source: str = Booking.Source.WEBSITE,
    created_by=None,
    guest_ip: str | None = None,
    request_id: str = "",
    client_request_id: str | None = None,
) -> tuple[Booking, Quote]:
    """Create a held booking atomically.

    The RoomType row is locked for the duration of the availability check and
    insert. On Postgres this serialises two guests competing for the last room;
    the second request re-checks availability after the lock is released and
    receives SoldOutError instead of overselling.
    """

    from apps.rooms.models import RoomType

    if client_request_id:
        existing = Booking.objects.filter(
            client_request_id=client_request_id
        ).first()
        if existing is not None:
            return existing, quote_for_request(
                room_type=existing.room_type,
                meal_plan=existing.meal_plan,
                checkin=existing.checkin,
                checkout=existing.checkout,
                guests=existing.guests,
                rate_plan_id=existing.rate_plan_id,
            )

    locked = RoomType.objects.select_for_update().get(pk=room_type.pk)
    settings_obj = HotelSetting.load()

    quote = calculate_quote(
        room_type=locked,
        checkin=checkin,
        checkout=checkout,
        guests=guests,
        meal_plan=meal_plan,
        rate_plan_id=rate_plan_id,
        max_nights=settings_obj.max_nights_per_booking,
        cancellation_cutoff_hours=settings_obj.cancellation_cutoff_hours,
        tax_included=settings_obj.tax_included,
        tax_rate_percent=settings_obj.tax_rate_percent,
    )

    available = available_rooms(locked, checkin, checkout)
    if available < 1:
        raise SoldOutError("That room type has just sold out for these dates.")

    now = timezone.now()
    booking = Booking.objects.create(
        reference=unique_reference(Booking, "WP"),
        client_request_id=client_request_id or None,
        room_type=locked,
        rate_plan=quote.rate_plan,
        meal_plan=meal_plan,
        checkin=checkin,
        checkout=checkout,
        guests=guests,
        first_name=first_name.strip(),
        last_name=last_name.strip(),
        email=email.strip(),
        phone=normalise_kenyan_phone(phone),
        country=country.strip(),
        notes=notes.strip(),
        language=language if language in ("en", "sw") else "en",
        consent_privacy=consent_privacy,
        guest_ip=guest_ip,
        status=BookingStatus.HELD,
        source=source,
        accommodation_total=quote.accommodation_total,
        meal_total=quote.meal_total,
        discount_total=quote.discount_total,
        total=quote.total,
        price_breakdown=quote.as_dict(),
        cancellation_cutoff_hours=settings_obj.cancellation_cutoff_hours,
        free_cancellation_until=quote.free_cancellation_until,
        hold_expires_at=now + timedelta(minutes=settings_obj.hold_ttl_minutes),
        created_by=created_by,
    )

    from ..models import BookingStatusEvent

    BookingStatusEvent.objects.create(
        booking=booking,
        from_status="",
        to_status=BookingStatus.HELD,
        reason="Booking created",
        actor=created_by if getattr(created_by, "is_authenticated", False) else None,
        request_id=request_id,
    )
    return booking, quote


def extend_hold_for_bank_transfer(booking: Booking) -> Booking:
    settings_obj = HotelSetting.load()
    booking.hold_expires_at = timezone.now() + timedelta(
        hours=settings_obj.bank_transfer_hold_hours
    )
    booking.save(update_fields=("hold_expires_at", "updated_at"))
    return booking


def verify_contact(booking: Booking, email: str = "", phone: str = "") -> bool:
    if email and booking.email.lower() == email.strip().lower():
        return True
    if phone:
        try:
            normalised = normalise_kenyan_phone(phone)
        except ValueError:
            return False
        return booking.phone == normalised
    return False


def lookup_booking(reference: str, email: str = "", phone: str = "") -> Booking | None:
    booking = Booking.objects.filter(reference__iexact=reference.strip()).first()
    if booking is None:
        return None
    if not (email or phone):
        return None
    return booking if verify_contact(booking, email=email, phone=phone) else None


def cancel_booking(
    booking: Booking,
    *,
    reason: str = "Cancelled by guest",
    actor=None,
    request=None,
    request_id: str = "",
) -> Booking:
    if booking.status in (
        BookingStatus.CANCELLED,
        BookingStatus.DECLINED,
        BookingStatus.EXPIRED,
    ):
        raise CancellationError("This booking is no longer active.")
    if booking.status == BookingStatus.CONFIRMED:
        if not booking.free_cancellation_until or hotel_now() > booking.free_cancellation_until:
            raise CancellationError(
                "The free cancellation deadline has passed. Please contact the front desk."
            )
    return transition_booking(
        booking,
        BookingStatus.CANCELLED,
        actor=actor,
        reason=reason,
        request=request,
        request_id=request_id,
    )


def expire_stale_holds(*, batch_size: int = 500) -> int:
    """Release expired holds. Safe to run repeatedly from a background job."""

    now = timezone.now()
    stale = Booking.objects.filter(
        status__in=HOLD_STATUSES, hold_expires_at__lte=now
    ).order_by("hold_expires_at")[:batch_size]
    count = 0
    for booking in stale:
        transition_booking(
            booking,
            BookingStatus.EXPIRED,
            reason="Payment window expired",
        )
        count += 1
    return count


def quote_for_request(
    *,
    room_type,
    meal_plan: MealPlan,
    checkin,
    checkout,
    guests: int,
    rate_plan_id: int | None = None,
) -> Quote:
    settings_obj = HotelSetting.load()
    return calculate_quote(
        room_type=room_type,
        checkin=checkin,
        checkout=checkout,
        guests=guests,
        meal_plan=meal_plan,
        rate_plan_id=rate_plan_id,
        max_nights=settings_obj.max_nights_per_booking,
        cancellation_cutoff_hours=settings_obj.cancellation_cutoff_hours,
        tax_included=settings_obj.tax_included,
        tax_rate_percent=settings_obj.tax_rate_percent,
    )


__all__ = [
    "CancellationError",
    "QuoteError",
    "SoldOutError",
    "cancel_booking",
    "create_booking",
    "expire_stale_holds",
    "extend_hold_for_bank_transfer",
    "lookup_booking",
    "quote_for_request",
    "verify_contact",
]
