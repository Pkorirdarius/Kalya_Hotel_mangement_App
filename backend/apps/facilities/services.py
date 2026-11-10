from __future__ import annotations

import uuid
from datetime import date, time, timedelta

from django.db.models import Sum
from django.utils import timezone

from apps.common.models import HotelSetting
from apps.common.utils import hotel_now, unique_reference

from .models import (
    ConferenceBlock,
    ConferenceEnquiry,
    GymDayPass,
    TableBooking,
)

RESTAURANT_OPEN = time(6, 30)
RESTAURANT_CLOSE = time(22, 0)
RESTAURANT_SLOT_MINUTES = 30


class FacilityError(ValueError):
    def __init__(self, message: str, fields: dict | None = None):
        super().__init__(message)
        self.fields = fields or {"detail": message}


def restaurant_slots() -> list[str]:
    slots = []
    cursor = time(6, 30)
    while cursor < time(22, 0):
        slots.append(cursor.strftime("%H:%M"))
        total = cursor.hour * 60 + cursor.minute + RESTAURANT_SLOT_MINUTES
        cursor = time(total // 60, total % 60)
    return slots


def _slot_time(value: str | time) -> time:
    if isinstance(value, time):
        return value
    try:
        hours, minutes = value.split(":")[:2]
        return time(int(hours), int(minutes))
    except (TypeError, ValueError):
        raise FacilityError("Choose a valid time.", {"time": "Choose a valid time."})


def restaurant_remaining(date_value: date, slot: time, exclude_id=None) -> int:
    capacity = HotelSetting.load().restaurant_capacity
    query = TableBooking.objects.filter(
        date=date_value,
        time=slot,
        status__in=(TableBooking.Status.PENDING, TableBooking.Status.CONFIRMED),
    )
    if exclude_id:
        query = query.exclude(pk=exclude_id)
    taken = query.aggregate(total=Sum("party_size"))["total"] or 0
    return max(0, capacity - taken)


def restaurant_slot_capacity(date_value: date) -> list[dict]:
    return [
        {
            "time": slot,
            "remaining": restaurant_remaining(date_value, _slot_time(slot)),
        }
        for slot in restaurant_slots()
    ]


def create_table_booking(
    *,
    date_value: date,
    slot,
    party_size: int,
    first_name: str,
    last_name: str,
    phone: str,
    email: str = "",
    occasion: str = "",
    notes: str = "",
    created_by=None,
) -> TableBooking:
    if date_value < hotel_now().date():
        raise FacilityError("Choose a future date.", {"date": "Choose a future date."})
    slot_time = _slot_time(slot)
    if slot_time < RESTAURANT_OPEN or slot_time >= RESTAURANT_CLOSE:
        raise FacilityError(
            "The restaurant is open 6:30 AM to 10:00 PM.",
            {"time": "Choose a time between 6:30 AM and 10:00 PM."},
        )
    if party_size < 1 or party_size > 20:
        raise FacilityError(
            "Party size must be between 1 and 20.",
            {"party_size": "For larger groups, please call the hotel."},
        )
    if restaurant_remaining(date_value, slot_time) < party_size:
        raise FacilityError(
            "That time is fully booked. Please choose another slot.",
            {"time": "This slot is full."},
        )
    return TableBooking.objects.create(
        reference=unique_reference(TableBooking, "TB"),
        date=date_value,
        time=slot_time,
        party_size=party_size,
        first_name=first_name.strip(),
        last_name=last_name.strip(),
        phone=phone,
        email=email.strip(),
        occasion=occasion,
        notes=notes.strip(),
        created_by=created_by,
    )


def conference_conflict(date_value: date, session: str):
    blocks = ConferenceBlock.objects.filter(date=date_value)
    confirmed = ConferenceEnquiry.objects.filter(
        date=date_value, status=ConferenceEnquiry.Status.CONFIRMED
    )
    for item in blocks:
        if (
            item.session == ConferenceEnquiry.Session.FULL_DAY
            or session == ConferenceEnquiry.Session.FULL_DAY
            or item.session == session
        ):
            return True
    for item in confirmed:
        if (
            item.session == ConferenceEnquiry.Session.FULL_DAY
            or session == ConferenceEnquiry.Session.FULL_DAY
            or item.session == session
        ):
            return True
    return False


def conference_availability(date_value: date, session: str = "full_day") -> dict:
    if conference_conflict(date_value, session):
        return {"status": "full", "label": "Fully booked"}
    pending = ConferenceEnquiry.objects.filter(
        date=date_value,
        session=session,
        status=ConferenceEnquiry.Status.PENDING,
    ).exists()
    if pending:
        return {"status": "limited", "label": "Enquiry in progress"}
    return {"status": "available", "label": "Available"}


def create_conference_enquiry(
    *,
    date_value: date,
    session: str,
    people: int,
    layout: str,
    catering: list,
    first_name: str,
    last_name: str,
    company: str,
    email: str,
    phone: str,
    notes: str = "",
    created_by=None,
) -> ConferenceEnquiry:
    if date_value < hotel_now().date():
        raise FacilityError("Choose a future date.", {"date": "Choose a future date."})
    if people < 4 or people > 120:
        raise FacilityError(
            "Capacity is 4 to 120 people.",
            {"people": "Enter between 4 and 120 people."},
        )
    if conference_availability(date_value, session)["status"] == "full":
        raise FacilityError(
            "The hall is already booked for that session. Please choose another date.",
            {"date": "This session is unavailable."},
        )
    return ConferenceEnquiry.objects.create(
        reference=unique_reference(ConferenceEnquiry, "KQ"),
        date=date_value,
        session=session,
        people=people,
        layout=layout,
        catering=catering,
        first_name=first_name.strip(),
        last_name=last_name.strip(),
        company=company.strip(),
        email=email.strip(),
        phone=phone,
        notes=notes.strip(),
        created_by=created_by,
    )


def gym_remaining(date_value: date) -> int:
    settings_obj = HotelSetting.load()
    taken = GymDayPass.objects.filter(
        date=date_value,
        status__in=(
            GymDayPass.Status.PENDING_PAYMENT,
            GymDayPass.Status.PENDING_CONFIRMATION,
            GymDayPass.Status.CONFIRMED,
        ),
    ).count()
    return max(0, settings_obj.gym_capacity - taken)


def create_gym_day_pass(
    *,
    date_value: date,
    full_name: str,
    phone: str,
    email: str,
    payment_method: str,
) -> GymDayPass:
    if date_value < hotel_now().date():
        raise FacilityError("Choose a future date.", {"date": "Choose a future date."})
    if gym_remaining(date_value) < 1:
        raise FacilityError(
            "The gym is fully booked for that date.",
            {"date": "Choose another date."},
        )
    settings_obj = HotelSetting.load()
    status = (
        GymDayPass.Status.PENDING_CONFIRMATION
        if payment_method == GymDayPass.PaymentMethod.RECEPTION
        else GymDayPass.Status.PENDING_PAYMENT
    )
    return GymDayPass.objects.create(
        reference=unique_reference(GymDayPass, "GY"),
        date=date_value,
        full_name=full_name.strip(),
        phone=phone,
        email=email.strip(),
        amount=settings_obj.gym_day_pass_price,
        payment_method=payment_method,
        status=status,
    )


def confirm_gym_day_pass(gym_pass: GymDayPass) -> GymDayPass:
    gym_pass.status = GymDayPass.Status.CONFIRMED
    if gym_pass.qr_token is None:
        gym_pass.qr_token = uuid.uuid4()
    if gym_pass.paid_at is None and gym_pass.payment_method == GymDayPass.PaymentMethod.RECEPTION:
        gym_pass.paid_at = timezone.now()
    gym_pass.save()
    return gym_pass
