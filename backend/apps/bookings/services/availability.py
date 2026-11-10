from __future__ import annotations

from datetime import date, timedelta

from django.db.models import Q
from django.utils import timezone

from apps.bookings.models import Booking, BookingStatus, INVENTORY_STATUSES
from apps.rooms.models import RoomBlock, RoomType


def iter_nights(checkin: date, checkout: date):
    cursor = checkin
    while cursor < checkout:
        yield cursor
        cursor += timedelta(days=1)


def _active_inventory_bookings(room_type: RoomType, checkin: date, checkout: date):
    """Bookings that reserve a room on at least one night in the range.

    Held and pending-payment bookings only reserve while their hold has not
    expired. Paid/confirmed bookings never expire.
    """

    now = timezone.now()
    return Booking.objects.filter(
        room_type=room_type,
        checkin__lt=checkout,
        checkout__gt=checkin,
        status__in=INVENTORY_STATUSES,
    ).filter(
        Q(status__in=(BookingStatus.PENDING_CONFIRMATION, BookingStatus.CONFIRMED))
        | Q(hold_expires_at__gt=now)
    )


def available_rooms(
    room_type: RoomType,
    checkin: date,
    checkout: date,
    *,
    exclude_booking_id: int | None = None,
) -> int:
    """Minimum available website rooms across every night of the stay."""

    if checkout <= checkin:
        return 0

    inventory = room_type.online_inventory
    if inventory <= 0:
        return 0

    bookings = list(
        _active_inventory_bookings(room_type, checkin, checkout).only(
            "checkin", "checkout"
        )
    )
    if exclude_booking_id:
        bookings = [b for b in bookings if b.pk != exclude_booking_id]

    blocks = list(
        RoomBlock.objects.filter(
            room_type=room_type, start_date__lt=checkout, end_date__gt=checkin
        ).only("start_date", "end_date", "quantity")
    )

    minimum = inventory
    for night in iter_nights(checkin, checkout):
        booked = sum(
            1 for booking in bookings if booking.checkin <= night < booking.checkout
        )
        blocked = sum(
            block.quantity
            for block in blocks
            if block.start_date <= night < block.end_date
        )
        minimum = min(minimum, inventory - booked - blocked)
    return max(0, minimum)


def availability_for_range(checkin: date, checkout: date, guests: int = 1):
    results = []
    for room_type in RoomType.objects.filter(active=True).prefetch_related(
        "rate_plans"
    ):
        count = available_rooms(room_type, checkin, checkout)
        results.append(
            {
                "room_type": room_type,
                "available_rooms": count,
                "sleeps": room_type.sleeps,
                "fits_guests": guests <= room_type.sleeps,
                "from_price": room_type.from_price,
            }
        )
    return results
