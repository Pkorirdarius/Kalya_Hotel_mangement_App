from __future__ import annotations

import logging
import uuid
from decimal import Decimal

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.bookings.models import BookingStatus
from apps.bookings.state import IllegalTransition, transition_booking
from apps.common.utils import normalise_kenyan_phone, unique_reference

from .models import Payment, PaymentWebhookEvent
from .providers.base import ProviderResult
from .providers.card import BankTransferProvider, StubCardProvider
from .providers.mpesa import MpesaDarajaProvider

logger = logging.getLogger(__name__)


class PaymentError(ValueError):
    pass


def get_provider(method: str):
    if method == Payment.Provider.MPESA:
        return MpesaDarajaProvider()
    if method == Payment.Provider.CARD:
        return StubCardProvider()
    if method == Payment.Provider.BANK_TRANSFER:
        return BankTransferProvider()
    raise PaymentError("Choose M-Pesa, card or bank transfer.")


def _redact(value):
    if isinstance(value, dict):
        return {
            key: (
                "***"
                if any(
                    marker in key.lower()
                    for marker in ("phone", "msisdn", "name", "email")
                )
                else _redact(item)
            )
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [_redact(item) for item in value]
    return value


def _persist_result(payment: Payment, result: ProviderResult) -> Payment:
    payment.status = (
        Payment.Status.PENDING if result.ok else Payment.Status.FAILED
    )
    payment.provider_reference = result.provider_reference
    payment.checkout_request_id = result.checkout_request_id
    payment.merchant_request_id = result.merchant_request_id
    payment.failure_code = result.failure_code
    payment.failure_message = result.failure_message or result.message
    payment.raw_request = _redact(result.raw_request)
    payment.raw_response = _redact(result.raw_response)
    payment.save()
    return payment


@transaction.atomic
def initiate_booking_payment(
    *,
    booking,
    method: str,
    phone: str = "",
    idempotency_key: str | None = None,
) -> Payment:
    if method not in Payment.Provider.values:
        raise PaymentError("Choose M-Pesa, card or bank transfer.")
    if booking.status not in (
        BookingStatus.HELD,
        BookingStatus.PENDING_PAYMENT,
    ):
        raise PaymentError("This booking is not awaiting payment.")

    if idempotency_key:
        existing = Payment.objects.filter(idempotency_key=idempotency_key).first()
        if existing is not None:
            return existing

    normalised_phone = ""
    if phone:
        normalised_phone = normalise_kenyan_phone(phone)

    payment = Payment.objects.create(
        reference=unique_reference(Payment, "PAY", length=8),
        purpose=Payment.Purpose.ROOM_BOOKING,
        booking=booking,
        amount=booking.total,
        currency=booking.currency,
        provider=method,
        status=Payment.Status.INITIATED,
        phone=normalised_phone,
        idempotency_key=idempotency_key,
    )

    if booking.status == BookingStatus.HELD:
        transition_booking(
            booking,
            BookingStatus.PENDING_PAYMENT,
            reason=f"{payment.get_provider_display()} payment initiated",
        )

    if method == Payment.Provider.BANK_TRANSFER:
        from apps.bookings.services.bookings import extend_hold_for_bank_transfer

        extend_hold_for_bank_transfer(booking)
        return _persist_result(
            payment,
            get_provider(method).initiate(payment=payment, phone=normalised_phone),
        )

    try:
        result = get_provider(method).initiate(
            payment=payment, phone=normalised_phone
        )
    except Exception as exc:  # provider failure must not 500 the booking
        logger.warning("Payment provider error: %s", type(exc).__name__)
        result = ProviderResult(
            ok=False,
            status="failed",
            failure_code="provider_error",
            failure_message="The payment provider is unavailable. Please try again.",
        )
    return _persist_result(payment, result)


@transaction.atomic
def initiate_gym_payment(
    *,
    gym_pass,
    method: str,
    phone: str = "",
    idempotency_key: str | None = None,
) -> Payment:
    if method not in (
        Payment.Provider.MPESA,
        Payment.Provider.CARD,
    ):
        raise PaymentError("Online day passes accept M-Pesa or card.")
    if idempotency_key:
        existing = Payment.objects.filter(idempotency_key=idempotency_key).first()
        if existing is not None:
            return existing

    normalised_phone = normalise_kenyan_phone(phone) if phone else ""
    payment = Payment.objects.create(
        reference=unique_reference(Payment, "PAY", length=8),
        purpose=Payment.Purpose.GYM_DAY_PASS,
        gym_pass=gym_pass,
        amount=gym_pass.amount,
        provider=method,
        status=Payment.Status.INITIATED,
        phone=normalised_phone,
        idempotency_key=idempotency_key,
    )
    try:
        result = get_provider(method).initiate(
            payment=payment, phone=normalised_phone
        )
    except Exception as exc:
        logger.warning("Gym payment provider error: %s", type(exc).__name__)
        result = ProviderResult(
            ok=False,
            status="failed",
            failure_code="provider_error",
            failure_message="The payment provider is unavailable. Please try again.",
        )
    return _persist_result(payment, result)


@transaction.atomic
def complete_payment(
    *,
    payment: Payment,
    success: bool,
    provider_reference: str = "",
    failure_code: str = "",
    failure_message: str = "",
    raw_response: dict | None = None,
) -> Payment:
    payment = Payment.objects.select_for_update().get(pk=payment.pk)
    if payment.status == Payment.Status.SUCCEEDED:
        return payment

    if not success:
        payment.status = Payment.Status.FAILED
        payment.failure_code = failure_code or "failed"
        payment.failure_message = failure_message or "Payment was not completed."
        if raw_response:
            payment.raw_response = _redact(raw_response)
        payment.save()
        return payment

    payment.status = Payment.Status.SUCCEEDED
    payment.paid_at = timezone.now()
    if provider_reference:
        payment.provider_reference = provider_reference
    if raw_response:
        payment.raw_response = _redact(raw_response)
    payment.save()

    if payment.booking_id:
        booking = payment.booking
        if booking.status in (
            BookingStatus.HELD,
            BookingStatus.PENDING_PAYMENT,
        ):
            try:
                transition_booking(
                    booking,
                    BookingStatus.PENDING_CONFIRMATION,
                    reason="Payment received",
                )
            except IllegalTransition:
                pass
        from apps.notifications.services import notify_new_paid_booking

        notify_new_paid_booking(booking)
    elif payment.gym_pass_id:
        gym_pass = payment.gym_pass
        gym_pass.status = gym_pass.Status.CONFIRMED
        gym_pass.paid_at = payment.paid_at
        gym_pass.payment_reference = payment.reference
        if gym_pass.qr_token is None:
            gym_pass.qr_token = uuid.uuid4()
        gym_pass.save()
        from apps.notifications.services import notify_gym_pass

        notify_gym_pass(gym_pass)
    return payment


def process_mpesa_callback(payload: dict, *, signature_valid: bool = True) -> PaymentWebhookEvent:
    """Idempotent M-Pesa callback processing.

    Safaricom does not sign callbacks, so the view validates the shared secret
    and optional IP allowlist before calling this function. The event is stored
    with a unique key before processing so repeated callbacks are harmless.
    """

    callback = (payload.get("Body") or {}).get("stkCallback") or {}
    checkout_id = callback.get("CheckoutRequestID", "")
    result_code = str(callback.get("ResultCode", ""))
    event_id = f"{checkout_id}:{result_code}"
    if not checkout_id:
        event_id = f"unknown:{uuid.uuid4()}"

    try:
        event, created = PaymentWebhookEvent.objects.get_or_create(
            provider=Payment.Provider.MPESA,
            event_id=event_id,
            defaults={
                "signature_valid": signature_valid,
                "payload": _redact(payload),
            },
        )
    except IntegrityError:
        event = PaymentWebhookEvent.objects.get(
            provider=Payment.Provider.MPESA, event_id=event_id
        )
        created = False

    if not created and event.processed:
        return event

    payment = Payment.objects.filter(checkout_request_id=checkout_id).first()
    if payment is None:
        event.error = "No payment matches this checkout request."
        event.save(update_fields=("error",))
        return event

    metadata = {
        item.get("Name"): item.get("Value")
        for item in callback.get("CallbackMetadata", {}).get("Item", [])
        if isinstance(item, dict)
    }
    receipt = str(metadata.get("MpesaReceiptNumber") or "")

    if result_code == "0":
        complete_payment(
            payment=payment,
            success=True,
            provider_reference=receipt,
            raw_response=payload,
        )
        event.processed = True
    else:
        failure_messages = {
            "1032": "The payment was cancelled on your phone.",
            "1037": "The M-Pesa request timed out. Please try again.",
            "1": "There were insufficient funds in the M-Pesa account.",
            "2001": "The M-Pesa PIN was entered incorrectly.",
        }
        complete_payment(
            payment=payment,
            success=False,
            failure_code=result_code,
            failure_message=failure_messages.get(
                result_code,
                callback.get("ResultDesc") or "The payment was not completed.",
            ),
            raw_response=payload,
        )
        event.processed = True

    event.error = ""
    event.save(update_fields=("processed", "error"))
    return event
