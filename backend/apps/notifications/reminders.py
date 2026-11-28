from __future__ import annotations

from datetime import timedelta

from django.conf import settings

from apps.bookings.models import Booking, BookingStatus
from apps.common.models import HotelSetting
from apps.common.utils import hotel_today
from apps.facilities.models import ConferenceEnquiry, TableBooking

from .services import (
    guest_language,
    manage_booking_url,
    notify_conference_enquiry_reminder,
    notify_table_booking_reminder,
    send_email,
)


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
        language = guest_language(booking.language)
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
                "manage_url": manage_booking_url(booking),
            },
            entity=booking,
        )
        count += 1
    return count


def send_facility_reminders(days_ahead: int = 1) -> int:
    """Email and text guests about confirmed facility bookings tomorrow."""

    day = hotel_today() + timedelta(days=days_ahead)
    count = 0
    for table in TableBooking.objects.filter(
        date=day, status=TableBooking.Status.CONFIRMED
    ):
        notify_table_booking_reminder(table)
        count += 1
    for enquiry in ConferenceEnquiry.objects.filter(
        date=day, status=ConferenceEnquiry.Status.CONFIRMED
    ):
        notify_conference_enquiry_reminder(enquiry)
        count += 1
    return count
