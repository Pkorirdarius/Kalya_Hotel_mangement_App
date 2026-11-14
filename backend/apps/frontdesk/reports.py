from __future__ import annotations

from datetime import date, datetime, time, timedelta

from django.db.models import Sum
from django.utils import timezone

from apps.bookings.models import Booking, BookingStatus
from apps.common.utils import hotel_today
from apps.facilities.models import ConferenceEnquiry, GymDayPass, TableBooking
from apps.payments.models import Payment
from apps.rooms.models import RoomType


def _day_range(day: date):
    start = timezone.make_aware(datetime.combine(day, time.min))
    end = timezone.make_aware(datetime.combine(day, time.max))
    return start, end


def overview(day: date | None = None) -> dict:
    day = day or hotel_today()
    confirmed = Booking.objects.filter(status=BookingStatus.CONFIRMED)
    arrivals = confirmed.filter(checkin=day)
    departures = confirmed.filter(checkout=day)
    in_house = confirmed.filter(checkin__lte=day, checkout__gt=day)

    total_rooms = RoomType.objects.aggregate(total=Sum("total_rooms"))["total"] or 0
    occupied = in_house.aggregate(rooms=Sum("guests"))["rooms"] or 0
    room_nights_sold = in_house.count()

    start, end = _day_range(day)
    revenue = (
        Payment.objects.filter(
            status=Payment.Status.SUCCEEDED, paid_at__gte=start, paid_at__lte=end
        ).aggregate(total=Sum("amount"))["total"]
        or 0
    )

    return {
        "date": day.isoformat(),
        "arrivals": arrivals.count(),
        "departures": departures.count(),
        "in_house_bookings": in_house.count(),
        "in_house_guests": occupied,
        "total_rooms": total_rooms,
        "occupancy_percent": round((room_nights_sold / total_rooms) * 100, 1)
        if total_rooms
        else 0,
        "revenue_today": int(revenue),
        "pending": {
            "room_bookings": Booking.objects.filter(
                status__in=(BookingStatus.PENDING_PAYMENT, BookingStatus.PENDING_CONFIRMATION)
            ).count(),
            "table_bookings": TableBooking.objects.filter(
                status=TableBooking.Status.PENDING
            ).count(),
            "conference_enquiries": ConferenceEnquiry.objects.filter(
                status=ConferenceEnquiry.Status.PENDING
            ).count(),
            "gym_day_passes": GymDayPass.objects.filter(
                status=GymDayPass.Status.PENDING_CONFIRMATION
            ).count(),
        },
    }


def occupancy_report(start: date, end: date) -> list[dict]:
    """Nightly occupancy and revenue for a date range (inclusive)."""

    rows = []
    day = start
    while day <= end:
        summary = overview(day)
        rows.append(
            {
                "date": summary["date"],
                "in_house_bookings": summary["in_house_bookings"],
                "in_house_guests": summary["in_house_guests"],
                "occupancy_percent": summary["occupancy_percent"],
                "revenue_today": summary["revenue_today"],
            }
        )
        day = day + timedelta(days=1)
    return rows


def _mask_phone(value: str) -> str:
    if not value:
        return ""
    if len(value) <= 6:
        return "***"
    return f"{value[:4]}***{value[-2:]}"


def payment_report(
    start: date,
    end: date,
    *,
    provider: str = "",
    status: str = "",
) -> list[dict]:
    """Payments created in a date range, ready for reconciliation.

    The report includes failed and pending attempts as well as successful
    payments, so staff can match gateway settlements against every attempt.
    Phone numbers are masked because this file leaves the staff application.
    """

    start_at, _ = _day_range(start)
    _, end_at = _day_range(end)
    queryset = (
        Payment.objects.select_related("booking", "gym_pass")
        .filter(created_at__gte=start_at, created_at__lte=end_at)
        .order_by("created_at", "reference")
    )
    if provider:
        queryset = queryset.filter(provider=provider)
    if status:
        queryset = queryset.filter(status=status)

    rows = []
    for payment in queryset:
        rows.append(
            {
                "reference": payment.reference,
                "booking_reference": payment.booking.reference
                if payment.booking_id
                else "",
                "gym_pass_reference": payment.gym_pass.reference
                if payment.gym_pass_id
                else "",
                "purpose": payment.purpose,
                "purpose_display": payment.get_purpose_display(),
                "provider": payment.provider,
                "provider_display": payment.get_provider_display(),
                "status": payment.status,
                "status_display": payment.get_status_display(),
                "amount": int(payment.amount),
                "currency": payment.currency,
                "phone": _mask_phone(payment.phone),
                "provider_reference": payment.provider_reference,
                "requires_review": payment.requires_review,
                "created_at": payment.created_at.isoformat(),
                "paid_at": payment.paid_at.isoformat() if payment.paid_at else None,
            }
        )
    return rows
