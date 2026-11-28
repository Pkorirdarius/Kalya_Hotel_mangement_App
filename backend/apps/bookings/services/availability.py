from __future__ import annotations

from datetime import date, timedelta

from django.db.models import Q
from django.utils import timezone

from apps.bookings.models import Booking, BookingStatus, INVENTORY_STATUSES
from apps.rooms.models import Room, RoomBlock, RoomType


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

    physical_rooms = list(
        Room.objects.filter(room_type=room_type).values_list("id", flat=True)
    )
    inventory = min(room_type.online_inventory, len(physical_rooms))
    if inventory <= 0:
        return 0

    # Front-desk occupancy reserves the numbered room even without a booking.
    manually_occupied = {
        f"room-{room_id}"
        for room_id in Room.objects.filter(
            room_type=room_type, status=Room.Status.OCCUPIED
        ).values_list("id", flat=True)
    }

    bookings = list(
        _active_inventory_bookings(room_type, checkin, checkout).only(
            "checkin", "checkout", "room_id"
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
        # A physical room is only counted once even when several records refer
        # to it: assigned bookings use room_id, legacy rows fall back to their id.
        occupied = set(manually_occupied)
        occupied.update(
            f"room-{booking.room_id}" if booking.room_id else f"legacy-{booking.pk}"
            for booking in bookings
            if booking.checkin <= night < booking.checkout
        )
        blocked = sum(
            block.quantity
            for block in blocks
            if block.start_date <= night < block.end_date
        )
        minimum = min(minimum, inventory - len(occupied) - blocked)
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
