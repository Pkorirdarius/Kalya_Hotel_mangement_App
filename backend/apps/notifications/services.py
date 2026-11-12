from __future__ import annotations

import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

from apps.common.models import HotelSetting
from apps.common.utils import hotel_display_name

from .models import NotificationLog
from .providers import get_sms_provider

logger = logging.getLogger(__name__)


def _log(channel, kind, recipient, subject="", ok=True, error="", entity=None):
    try:
        NotificationLog.objects.create(
            channel=channel,
            kind=kind,
            recipient=recipient,
            subject=subject,
            status="sent" if ok else "failed",
            error=error,
            entity_type=getattr(entity, "_meta", None).model if entity else "",
            entity_id=str(getattr(entity, "pk", "")) if entity else "",
        )
    except Exception:  # notification logging must never break a booking
        logger.exception("Could not write notification log")


def send_email(
    *,
    kind: str,
    subject: str,
    recipient: str,
    template: str,
    context: dict,
    entity=None,
) -> bool:
    try:
        text_body = render_to_string(f"emails/{template}.txt", context)
    except Exception:
        logger.exception("Email template missing: %s", template)
        _log("email", kind, recipient, subject, False, "Template missing", entity)
        return False
    html_body = None
    try:
        html_body = render_to_string(f"emails/{template}.html", context)
    except Exception:
        pass
    try:
        message = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient],
        )
        if html_body:
            message.attach_alternative(html_body, "text/html")
        message.send(fail_silently=False)
    except Exception as exc:
        logger.warning("Email send failed: %s", type(exc).__name__)
        _log("email", kind, recipient, subject, False, str(exc)[:300], entity)
        return False
    _log("email", kind, recipient, subject, True, "", entity)
    return True


def send_sms(*, kind: str, recipient: str, message: str, entity=None) -> bool:
    ok, detail = get_sms_provider().send(recipient=recipient, message=message)
    _log("sms", kind, recipient, "", ok, "" if ok else detail, entity)
    return ok


def _public_context():
    return {
        "hotel": HotelSetting.load(),
        "site_url": settings.SITE_URL,
        "front_desk_email": settings.FRONT_DESK_EMAIL,
        "manager_email": settings.MANAGER_EMAIL,
    }


def notify_new_paid_booking(booking) -> None:
    """Tell the front desk a paid room booking needs review."""

    context = {
        **_public_context(),
        "booking": booking,
        "guest_name": booking.guest_name,
    }
    send_email(
        kind="staff_new_paid_booking",
        subject=f"Paid booking ready to confirm · {booking.reference}",
        recipient=settings.FRONT_DESK_EMAIL,
        template="staff_new_booking",
        context=context,
        entity=booking,
    )


def notify_booking_confirmed(booking, language: str | None = None) -> None:
    language = language or booking.language or "en"
    context = {
        **_public_context(),
        "booking": booking,
        "guest_name": booking.guest_name,
        "language": language,
    }
    if booking.email:
        send_email(
            kind="booking_confirmation",
            subject=(
                f"Booking confirmed · {booking.reference}"
                if language == "en"
                else f"Nafasi imethibitishwa · {booking.reference}"
            ),
            recipient=booking.email,
            template=(
                "booking_confirmation_en"
                if language == "en"
                else "booking_confirmation_sw"
            ),
            context=context,
            entity=booking,
        )
    if booking.phone:
        hotel_name = hotel_display_name()
        message = (
            f"{hotel_name}: booking {booking.reference} confirmed. "
            f"Check-in {booking.checkin:%d %b %Y}."
            if language == "en"
            else f"{hotel_name}: nafasi {booking.reference} imethibitishwa. "
            f"Kuingia {booking.checkin:%d %b %Y}."
        )
        send_sms(
            kind="booking_confirmation",
            recipient=booking.phone,
            message=message,
            entity=booking,
        )


def notify_payment_review(payment, *, reason: str) -> None:
    """Alert staff when money arrives after a booking/pass stopped being payable."""

    context = {
        **_public_context(),
        "payment": payment,
        "booking": payment.booking if payment.booking_id else None,
        "gym_pass": payment.gym_pass if payment.gym_pass_id else None,
        "reason": reason,
    }
    send_email(
        kind="staff_payment_review",
        subject=f"Payment needs review · {payment.reference}",
        recipient=settings.FRONT_DESK_EMAIL,
        template="staff_payment_review",
        context=context,
        entity=payment,
    )


def notify_booking_cancelled(booking) -> None:
    context = {**_public_context(), "booking": booking}
    if booking.email:
        send_email(
            kind="booking_cancelled",
            subject=f"Booking cancelled · {booking.reference}",
            recipient=booking.email,
            template="booking_cancelled_en",
            context=context,
            entity=booking,
        )


def notify_gym_pass(gym_pass) -> None:
    context = {
        **_public_context(),
        "gym_pass": gym_pass,
        "qr_url": f"{settings.SITE_URL}/api/v1/gym/day-passes/{gym_pass.reference}/qr/",
    }
    if gym_pass.email:
        send_email(
            kind="gym_day_pass",
            subject=f"Gym day pass confirmed · {gym_pass.reference}",
            recipient=gym_pass.email,
            template="gym_day_pass_en",
            context=context,
            entity=gym_pass,
        )
    send_sms(
        kind="gym_day_pass",
        recipient=gym_pass.phone,
        message=(
            f"{hotel_display_name()}: gym day pass {gym_pass.reference} confirmed "
            f"for {gym_pass.date:%d %b %Y}. Show this reference at reception."
        ),
        entity=gym_pass,
    )


def notify_escalation(item, *, label: str, detail: str) -> None:
    context = {**_public_context(), "item": item, "label": label, "detail": detail}
    send_email(
        kind="frontdesk_escalation",
        subject=f"Front desk overdue: {label} {getattr(item, 'reference', '')}",
        recipient=settings.MANAGER_EMAIL,
        template="frontdesk_escalation",
        context=context,
        entity=item,
    )
    send_sms(
        kind="frontdesk_escalation",
        recipient=settings.MANAGER_EMAIL,
        message=(
            f"{hotel_display_name()} front desk overdue: {label} "
            f"{getattr(item, 'reference', '')}"
        ),
        entity=item,
    )
