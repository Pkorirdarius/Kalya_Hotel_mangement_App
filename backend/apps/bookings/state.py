"""The single source of truth for booking status transitions."""

from __future__ import annotations

from django.utils import timezone

from apps.common.audit import record_audit

from .models import Booking, BookingStatus, BookingStatusEvent

ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    BookingStatus.HELD: {
        BookingStatus.PENDING_PAYMENT,
        BookingStatus.CANCELLED,
        BookingStatus.EXPIRED,
    },
    BookingStatus.PENDING_PAYMENT: {
        BookingStatus.PENDING_CONFIRMATION,
        BookingStatus.DECLINED,
        BookingStatus.CANCELLED,
        BookingStatus.EXPIRED,
    },
    BookingStatus.PENDING_CONFIRMATION: {
        BookingStatus.CONFIRMED,
        BookingStatus.DECLINED,
        BookingStatus.CANCELLED,
    },
    BookingStatus.CONFIRMED: {BookingStatus.CANCELLED},
    BookingStatus.DECLINED: set(),
    BookingStatus.CANCELLED: set(),
    BookingStatus.EXPIRED: set(),
}

TERMINAL_STATUSES = {
    BookingStatus.DECLINED,
    BookingStatus.CANCELLED,
    BookingStatus.EXPIRED,
}


class IllegalTransition(ValueError):
    pass


def can_transition(current: str, target: str) -> bool:
    return target in ALLOWED_TRANSITIONS.get(current, set())


def transition_booking(
    booking: Booking,
    target: str,
    *,
    actor=None,
    reason: str = "",
    request=None,
    request_id: str = "",
    save: bool = True,
) -> Booking:
    """Move a booking to `target`, enforcing the state machine in one place."""

    if target == booking.status:
        return booking
    if not can_transition(booking.status, target):
        raise IllegalTransition(
            f"Cannot move booking {booking.reference} from "
            f"{booking.status} to {target}."
        )

    previous = booking.status
    booking.status = target
    now = timezone.now()
    if target == BookingStatus.CONFIRMED:
        booking.confirmed_at = now
        booking.hold_expires_at = None
    elif target == BookingStatus.DECLINED:
        booking.declined_at = now
        booking.hold_expires_at = None
    elif target == BookingStatus.CANCELLED:
        booking.cancelled_at = now
        booking.hold_expires_at = None
    elif target == BookingStatus.EXPIRED:
        booking.expired_at = now
        booking.hold_expires_at = None
    elif target == BookingStatus.PENDING_CONFIRMATION:
        # A paid booking keeps its inventory but no longer expires while the
        # front desk reviews it.
        booking.hold_expires_at = None

    if save:
        booking.save()

    BookingStatusEvent.objects.create(
        booking=booking,
        from_status=previous,
        to_status=target,
        reason=reason,
        actor=actor if getattr(actor, "is_authenticated", False) else None,
        request_id=request_id or "",
    )
    record_audit(
        f"booking.{target}",
        actor=actor,
        entity_type="booking",
        entity_id=booking.pk,
        metadata={"reference": booking.reference, "from": previous, "to": target},
        request=request,
    )

    # Notifications are best-effort and must never roll back a status change.
    try:
        from apps.notifications.services import (
            notify_booking_cancelled,
            notify_booking_confirmed,
        )

        if target == BookingStatus.CONFIRMED:
            notify_booking_confirmed(booking)
        elif target == BookingStatus.CANCELLED:
            notify_booking_cancelled(booking)
    except Exception:
        import logging

        logging.getLogger(__name__).exception(
            "Booking notification failed for %s", booking.reference
        )

    return booking


def restore_booking_status(
    booking: Booking,
    previous: str,
    *,
    actor=None,
    reason: str = "Front desk undo",
    request_id: str = "",
) -> Booking:
    """Undo a very recent staff action.

    This intentionally bypasses the forward state machine. Callers must enforce
    the short undo window (the front desk API does).
    """

    current = booking.status
    booking.status = previous
    if previous == BookingStatus.PENDING_CONFIRMATION:
        booking.confirmed_at = None
        booking.hold_expires_at = None
    booking.save(
        update_fields=("status", "confirmed_at", "hold_expires_at", "updated_at")
    )
    BookingStatusEvent.objects.create(
        booking=booking,
        from_status=current,
        to_status=previous,
        reason=reason,
        actor=actor if getattr(actor, "is_authenticated", False) else None,
        request_id=request_id,
    )
    return booking
