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
            entity_type=getattr(getattr(entity, "_meta", None), "model_name", "")
            if entity
            else "",
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


def guest_language(value: str | None) -> str:
    """Return a supported guest language, falling back to English."""

    return value if value in ("en", "sw") else "en"


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


def manage_booking_url(booking) -> str:
    """Public page where a guest can review or cancel their own booking."""

    return f"{settings.SITE_URL}/booking/manage?reference={booking.reference}"


def notify_booking_confirmed(booking, language: str | None = None) -> None:
    language = guest_language(language or booking.language)
    context = {
        **_public_context(),
        "booking": booking,
        "guest_name": booking.guest_name,
        "language": language,
        "manage_url": manage_booking_url(booking),
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
    language = guest_language(booking.language)
    context = {**_public_context(), "booking": booking, "language": language}
    if booking.email:
        send_email(
            kind="booking_cancelled",
            subject=(
                f"Booking cancelled · {booking.reference}"
                if language == "en"
                else f"Nafasi imeghairiwa · {booking.reference}"
            ),
            recipient=booking.email,
            template=(
                "booking_cancelled_en" if language == "en" else "booking_cancelled_sw"
            ),
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


def notify_table_booking(table) -> None:
    """Tell a guest whether their restaurant table was confirmed or declined."""

    language = guest_language(table.language)
    confirmed = table.status == "confirmed"
    context = {**_public_context(), "table": table, "confirmed": confirmed, "language": language}
    subjects = {
        "en": (
            f"Table confirmed · {table.reference}"
            if confirmed
            else f"Table booking update · {table.reference}"
        ),
        "sw": (
            f"Meza imethibitishwa · {table.reference}"
            if confirmed
            else f"Taarifa ya meza · {table.reference}"
        ),
    }
    if table.email:
        send_email(
            kind="table_booking",
            subject=subjects[language],
            recipient=table.email,
            template=f"table_booking_update_{language}",
            context=context,
            entity=table,
        )
    if language == "en":
        message = (
            f"{hotel_display_name()}: table {table.reference} "
            f"{'confirmed' if confirmed else 'could not be confirmed'} for "
            f"{table.date:%d %b %Y} at {table.time:%H:%M}."
        )
    else:
        message = (
            f"{hotel_display_name()}: meza {table.reference} "
            f"{'imethibitishwa' if confirmed else 'haikuweza kuthibitishwa'} "
            f"tarehe {table.date:%d/%m/%Y} saa {table.time:%H:%M}."
        )
    send_sms(kind="table_booking", recipient=table.phone, message=message, entity=table)


def notify_table_booking_reminder(table) -> None:
    """Remind a guest about an upcoming confirmed table booking."""

    language = guest_language(table.language)
    context = {**_public_context(), "table": table, "language": language}
    if table.email:
        send_email(
            kind="table_booking_reminder",
            subject=(
                f"Table booking reminder · {table.reference}"
                if language == "en"
                else f"Kumbusho la meza · {table.reference}"
            ),
            recipient=table.email,
            template=f"table_booking_reminder_{language}",
            context=context,
            entity=table,
        )
    message = (
        f"{hotel_display_name()}: reminder for table {table.reference} "
        f"on {table.date:%d %b %Y} at {table.time:%H:%M}."
        if language == "en"
        else f"{hotel_display_name()}: kumbusho la meza {table.reference} "
        f"tarehe {table.date:%d/%m/%Y} saa {table.time:%H:%M}."
    )
    send_sms(
        kind="table_booking_reminder",
        recipient=table.phone,
        message=message,
        entity=table,
    )


def notify_conference_enquiry(enquiry) -> None:
    """Tell an enquirer whether their conference request was confirmed."""

    language = guest_language(enquiry.language)
    confirmed = enquiry.status == "confirmed"
    context = {
        **_public_context(),
        "enquiry": enquiry,
        "confirmed": confirmed,
        "language": language,
    }
    subjects = {
        "en": (
            f"Conference confirmed · {enquiry.reference}"
            if confirmed
            else f"Conference enquiry update · {enquiry.reference}"
        ),
        "sw": (
            f"Mkutano umethibitishwa · {enquiry.reference}"
            if confirmed
            else f"Taarifa ya mkutano · {enquiry.reference}"
        ),
    }
    if enquiry.email:
        send_email(
            kind="conference_enquiry",
            subject=subjects[language],
            recipient=enquiry.email,
            template=f"conference_enquiry_update_{language}",
            context=context,
            entity=enquiry,
        )
    if language == "en":
        message = (
            f"{hotel_display_name()}: conference request {enquiry.reference} "
            f"{'confirmed' if confirmed else 'could not be confirmed'} for "
            f"{enquiry.date:%d %b %Y} ({enquiry.get_session_display()})."
        )
    else:
        message = (
            f"{hotel_display_name()}: ombi la mkutano {enquiry.reference} "
            f"{'limethibitishwa' if confirmed else 'halikuweza kuthibitishwa'} "
            f"tarehe {enquiry.date:%d/%m/%Y} ({enquiry.get_session_display()})."
        )
    send_sms(
        kind="conference_enquiry",
        recipient=enquiry.phone,
        message=message,
        entity=enquiry,
    )


def notify_conference_enquiry_reminder(enquiry) -> None:
    """Remind an enquirer about an upcoming confirmed conference session."""

    language = guest_language(enquiry.language)
    context = {**_public_context(), "enquiry": enquiry, "language": language}
    send_email(
        kind="conference_enquiry_reminder",
        subject=(
            f"Conference reminder · {enquiry.reference}"
            if language == "en"
            else f"Kumbusho la mkutano · {enquiry.reference}"
        ),
        recipient=enquiry.email,
        template=f"conference_enquiry_reminder_{language}",
        context=context,
        entity=enquiry,
    )
    message = (
        f"{hotel_display_name()}: reminder for conference {enquiry.reference} "
        f"on {enquiry.date:%d %b %Y} ({enquiry.get_session_display()})."
        if language == "en"
        else f"{hotel_display_name()}: kumbusho la mkutano {enquiry.reference} "
        f"tarehe {enquiry.date:%d/%m/%Y} ({enquiry.get_session_display()})."
    )
    send_sms(
        kind="conference_enquiry_reminder",
        recipient=enquiry.phone,
        message=message,
        entity=enquiry,
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
