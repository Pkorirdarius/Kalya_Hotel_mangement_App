from __future__ import annotations

from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.bookings.models import Booking, BookingStatus, BookingStatusEvent
from apps.bookings.state import restore_booking_status, transition_booking
from apps.common.audit import record_audit
from apps.common.models import HotelSetting
from apps.common.utils import as_kes_int
from apps.facilities.models import (
    ConferenceEnquiry,
    GymDayPass,
    TableBooking,
)

from .models import DeskAction


class ActionError(ValueError):
    pass


def _latest_pending_event(booking: Booking):
    return (
        BookingStatusEvent.objects.filter(
            booking=booking,
            to_status__in=(
                BookingStatus.PENDING_PAYMENT,
                BookingStatus.PENDING_CONFIRMATION,
            ),
        )
        .order_by("-created_at")
        .first()
    )


def _deadline(created_at, minutes: int):
    return created_at + timedelta(minutes=minutes)


def _item(
    *,
    entity_type: str,
    obj,
    guest_name: str,
    phone: str,
    summary: str,
    amount,
    status: str,
    payment_status: str = "",
    created_at=None,
    minutes: int,
) -> dict:
    now = timezone.now()
    created_at = created_at or obj.created_at
    deadline = _deadline(created_at, minutes)
    remaining = int((deadline - now).total_seconds())
    return {
        "entity_type": entity_type,
        "id": obj.pk,
        "reference": obj.reference,
        "guest_name": guest_name,
        "phone": phone,
        "summary": summary,
        "amount": amount,
        "status": status,
        "payment_status": payment_status,
        "created_at": created_at.isoformat(),
        "deadline_at": deadline.isoformat(),
        "seconds_remaining": remaining,
        "overdue": remaining <= 0,
        "actions": ["confirm", "decline"],
    }


def frontdesk_queue() -> list[dict]:
    settings_obj = HotelSetting.load()
    target = settings_obj.frontdesk_target_minutes
    items: list[dict] = []

    bookings = Booking.objects.filter(
        status__in=(BookingStatus.PENDING_PAYMENT, BookingStatus.PENDING_CONFIRMATION)
    ).select_related("room_type")
    for booking in bookings:
        event = _latest_pending_event(booking)
        payment = booking.payments.order_by("-created_at").first()
        items.append(
            _item(
                entity_type="booking",
                obj=booking,
                guest_name=booking.guest_name,
                phone=booking.phone,
                summary=(
                    f"{booking.room_type.name_en} · {booking.checkin:%d %b} → "
                    f"{booking.checkout:%d %b} · {booking.guests} guests · "
                    f"{booking.nights} nights"
                ),
                amount=as_kes_int(booking.total),
                status=booking.status,
                payment_status=payment.status if payment else "unpaid",
                created_at=event.created_at if event else booking.updated_at,
                minutes=target,
            )
        )

    for table in TableBooking.objects.filter(status=TableBooking.Status.PENDING):
        items.append(
            _item(
                entity_type="table_booking",
                obj=table,
                guest_name=table.guest_name,
                phone=table.phone,
                summary=(
                    f"Restaurant · {table.date:%d %b} · {table.time:%H:%M} · "
                    f"{table.party_size} guests"
                ),
                amount=None,
                status=table.status,
                minutes=target,
            )
        )

    for enquiry in ConferenceEnquiry.objects.filter(
        status=ConferenceEnquiry.Status.PENDING
    ):
        items.append(
            _item(
                entity_type="conference_enquiry",
                obj=enquiry,
                guest_name=enquiry.guest_name,
                phone=enquiry.phone,
                summary=(
                    f"Conference · {enquiry.date:%d %b} · "
                    f"{enquiry.get_session_display()} · {enquiry.people} people · "
                    f"{enquiry.get_layout_display()}"
                ),
                amount=None,
                status=enquiry.status,
                minutes=target,
            )
        )

    for gym_pass in GymDayPass.objects.filter(
        status=GymDayPass.Status.PENDING_CONFIRMATION
    ):
        items.append(
            _item(
                entity_type="gym_pass",
                obj=gym_pass,
                guest_name=gym_pass.full_name,
                phone=gym_pass.phone,
                summary=(
                    f"Gym day pass · {gym_pass.date:%d %b} · "
                    f"{gym_pass.get_payment_method_display()}"
                ),
                amount=as_kes_int(gym_pass.amount),
                status=gym_pass.status,
                payment_status=(
                    "paid"
                    if gym_pass.payment_method == GymDayPass.PaymentMethod.RECEPTION
                    else "pending"
                ),
                minutes=target,
            )
        )

    items.sort(key=lambda item: item["created_at"])
    return items


def _booking_confirm(booking: Booking, actor) -> tuple[str, str]:
    previous = booking.status
    if booking.status == BookingStatus.PENDING_PAYMENT:
        payment = booking.payments.filter(
            provider="bank_transfer", status="pending"
        ).first()
        if payment:
            payment.status = payment.Status.SUCCEEDED
            payment.paid_at = timezone.now()
            payment.failure_message = "Confirmed at front desk"
            payment.save(update_fields=("status", "paid_at", "failure_message", "updated_at"))
    transition_booking(booking, BookingStatus.CONFIRMED, actor=actor, reason="Confirmed at front desk")
    return previous, booking.status


def _booking_decline(booking: Booking, actor) -> tuple[str, str]:
    previous = booking.status
    transition_booking(booking, BookingStatus.DECLINED, actor=actor, reason="Declined at front desk")
    return previous, booking.status


@transaction.atomic
def apply_action(
    *,
    entity_type: str,
    entity_id: int,
    action: str,
    actor,
    request_id: str = "",
) -> DeskAction:
    entity_type = entity_type.strip()
    action = action.strip()
    model_map = {
        "booking": Booking,
        "table_booking": TableBooking,
        "conference_enquiry": ConferenceEnquiry,
        "gym_pass": GymDayPass,
    }
    if entity_type not in model_map:
        raise ActionError("Unknown front desk item type.")
    if action not in ("confirm", "decline", "undo"):
        raise ActionError("Unknown action.")

    obj = model_map[entity_type].objects.select_for_update().filter(pk=entity_id).first()
    if obj is None:
        raise ActionError("That item no longer exists.")

    if action == "undo":
        settings_obj = HotelSetting.load()
        window = timedelta(seconds=settings_obj.frontdesk_undo_seconds)
        latest = (
            DeskAction.objects.filter(
                entity_type=entity_type,
                entity_id=entity_id,
                undone_at__isnull=True,
                action__in=(DeskAction.Action.CONFIRM, DeskAction.Action.DECLINE),
                created_at__gte=timezone.now() - window,
            )
            .order_by("-created_at")
            .first()
        )
        if latest is None:
            raise ActionError("The undo window has closed.")
        previous = latest.previous_status
        current = obj.status
        if entity_type == "booking":
            restore_booking_status(obj, previous, actor=actor, request_id=request_id)
        else:
            obj.status = previous
            if entity_type == "gym_pass" and current == GymDayPass.Status.CONFIRMED:
                obj.qr_token = None
            obj.save()
        latest.undone_at = timezone.now()
        latest.save(update_fields=("undone_at",))
        desk_action = DeskAction.objects.create(
            entity_type=entity_type,
            entity_id=entity_id,
            action=DeskAction.Action.UNDO,
            previous_status=current,
            new_status=previous,
            actor=actor,
            undo_deadline=None,
        )
        record_audit(
            f"frontdesk.undo.{entity_type}",
            actor=actor,
            entity_type=entity_type,
            entity_id=entity_id,
            metadata={"from": current, "to": previous},
        )
        return desk_action

    previous = obj.status
    if entity_type == "booking":
        if action == "confirm":
            previous, new = _booking_confirm(obj, actor)
        else:
            previous, new = _booking_decline(obj, actor)
    elif entity_type == "table_booking":
        new = (
            TableBooking.Status.CONFIRMED
            if action == "confirm"
            else TableBooking.Status.DECLINED
        )
        obj.status = new
        obj.save(update_fields=("status", "updated_at"))
    elif entity_type == "conference_enquiry":
        new = (
            ConferenceEnquiry.Status.CONFIRMED
            if action == "confirm"
            else ConferenceEnquiry.Status.DECLINED
        )
        obj.status = new
        obj.save(update_fields=("status", "updated_at"))
    else:
        if action == "confirm":
            from apps.facilities.services import confirm_gym_day_pass

            confirm_gym_day_pass(obj)
            from apps.notifications.services import notify_gym_pass

            notify_gym_pass(obj)
            new = obj.status
        else:
            new = GymDayPass.Status.CANCELLED
            obj.status = new
            obj.save(update_fields=("status", "updated_at"))

    settings_obj = HotelSetting.load()
    desk_action = DeskAction.objects.create(
        entity_type=entity_type,
        entity_id=entity_id,
        action=DeskAction.Action.CONFIRM
        if action == "confirm"
        else DeskAction.Action.DECLINE,
        previous_status=previous,
        new_status=new,
        actor=actor,
        undo_deadline=timezone.now()
        + timedelta(seconds=settings_obj.frontdesk_undo_seconds),
    )
    record_audit(
        f"frontdesk.{action}.{entity_type}",
        actor=actor,
        entity_type=entity_type,
        entity_id=entity_id,
        metadata={"from": previous, "to": new},
    )
    return desk_action


def recent_activity(limit: int = 30) -> list[dict]:
    rows = DeskAction.objects.select_related("actor").order_by("-created_at")[:limit]
    return [
        {
            "id": row.pk,
            "entity_type": row.entity_type,
            "entity_id": row.entity_id,
            "action": row.action,
            "previous_status": row.previous_status,
            "new_status": row.new_status,
            "actor": row.actor.get_full_name() if row.actor else "System",
            "created_at": row.created_at.isoformat(),
            "undone_at": row.undone_at.isoformat() if row.undone_at else None,
        }
        for row in rows
    ]


def escalate_overdue_items() -> int:
    settings_obj = HotelSetting.load()
    now = timezone.now()
    threshold = now - timedelta(minutes=settings_obj.frontdesk_escalate_minutes)
    count = 0

    for booking in Booking.objects.filter(
        status__in=(BookingStatus.PENDING_PAYMENT, BookingStatus.PENDING_CONFIRMATION),
        escalated_at__isnull=True,
    ):
        event = _latest_pending_event(booking)
        pending_since = event.created_at if event else booking.updated_at
        if pending_since <= threshold:
            from apps.notifications.services import notify_escalation

            notify_escalation(
                booking,
                label="Room booking",
                detail=f"{booking.room_type.name_en} · {booking.checkin} → {booking.checkout}",
            )
            booking.escalated_at = now
            booking.save(update_fields=("escalated_at", "updated_at"))
            count += 1

    for table in TableBooking.objects.filter(
        status=TableBooking.Status.PENDING,
        escalated_at__isnull=True,
        created_at__lte=threshold,
    ):
        from apps.notifications.services import notify_escalation

        notify_escalation(
            table,
            label="Table booking",
            detail=f"{table.date} {table.time:%H:%M} · {table.party_size} guests",
        )
        table.escalated_at = now
        table.save(update_fields=("escalated_at", "updated_at"))
        count += 1

    for enquiry in ConferenceEnquiry.objects.filter(
        status=ConferenceEnquiry.Status.PENDING,
        escalated_at__isnull=True,
        created_at__lte=threshold,
    ):
        from apps.notifications.services import notify_escalation

        notify_escalation(
            enquiry,
            label="Conference enquiry",
            detail=f"{enquiry.date} · {enquiry.get_session_display()}",
        )
        enquiry.escalated_at = now
        enquiry.save(update_fields=("escalated_at", "updated_at"))
        count += 1

    for gym_pass in GymDayPass.objects.filter(
        status=GymDayPass.Status.PENDING_CONFIRMATION,
        escalated_at__isnull=True,
        created_at__lte=threshold,
    ):
        from apps.notifications.services import notify_escalation

        notify_escalation(
            gym_pass,
            label="Gym day pass",
            detail=f"{gym_pass.date} · {gym_pass.full_name}",
        )
        gym_pass.escalated_at = now
        gym_pass.save(update_fields=("escalated_at", "updated_at"))
        count += 1

    return count
