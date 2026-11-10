from __future__ import annotations

from datetime import timedelta

from django.conf import settings

from apps.bookings.models import Booking, BookingStatus
from apps.common.models import HotelSetting
from apps.common.utils import hotel_today

from .services import send_email


def send_arrival_reminders(days_ahead: int = 1) -> int:
    """Email confirmed guests arriving in ``days_ahead`` days."""

    day = hotel_today() + timedelta(days=days_ahead)
    bookings = Booking.objects.filter(
        status=BookingStatus.CONFIRMED, checkin=day
    ).select_related("room_type", "meal_plan")
    hotel = HotelSetting.load()
    count = 0
    for booking in bookings:
        if not booking.email:
            continue
        language = booking.language or "en"
        template = "booking_reminder_en" if language == "en" else "booking_reminder_sw"
        send_email(
            kind="arrival_reminder",
            subject=(
                f"Your stay tomorrow · {booking.reference}"
                if language == "en"
                else f"Kukaa kwako kesho · {booking.reference}"
            ),
            recipient=booking.email,
            template=template,
            context={
                "hotel": hotel,
                "site_url": settings.SITE_URL,
                "booking": booking,
                "guest_name": booking.guest_name,
            },
            entity=booking,
        )
        count += 1
    return count
