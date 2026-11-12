from __future__ import annotations

from datetime import timedelta

import pytest

from apps.bookings.models import Booking, BookingStatus
from apps.bookings.state import transition_booking
from apps.payments.models import Payment, PaymentWebhookEvent
from apps.payments.services import complete_payment

pytestmark = pytest.mark.django_db


def _create_booking(api, payload):
    response = api.post("/api/v1/bookings/", payload, format="json")
    assert response.status_code == 201, response.content
    return response.json()["booking"]["reference"]


def _initiate(api, reference, **body):
    return api.post(
        f"/api/v1/payments/bookings/{reference}/",
        body,
        format="json",
    )


def test_bank_transfer_extends_hold_beyond_stay_hold(api, booking_payload):
    reference = _create_booking(api, booking_payload)
    booking = Booking.objects.get(reference=reference)
    standard_hold = booking.hold_expires_at

    response = _initiate(
        api, reference, method="bank_transfer", email="amina@example.com"
    )

    assert response.status_code == 201, response.content
    booking.refresh_from_db()
    assert booking.status == BookingStatus.PENDING_PAYMENT
    # Bank transfers need a much longer window than the 15-minute online hold.
    assert booking.hold_expires_at > standard_hold
    assert booking.hold_expires_at >= booking.created_at + timedelta(hours=12)

    payment = Payment.objects.get(reference=response.json()["payment"]["reference"])
    assert payment.status == Payment.Status.PENDING
    assert payment.provider == Payment.Provider.BANK_TRANSFER


def test_sandbox_completion_moves_booking_to_pending_confirmation(
    api, booking_payload
):
    reference = _create_booking(api, booking_payload)
    initiated = _initiate(
        api,
        reference,
        method="card",
        email="amina@example.com",
    )
    assert initiated.status_code == 201, initiated.content
    payment_reference = initiated.json()["payment"]["reference"]

    response = api.post(
        f"/api/v1/payments/{payment_reference}/sandbox-complete/",
        {"success": True},
        format="json",
    )

    assert response.status_code == 200, response.content
    assert response.json()["status"] == Payment.Status.SUCCEEDED

    booking = Booking.objects.get(reference=reference)
    assert booking.status == BookingStatus.PENDING_CONFIRMATION


def test_payment_initiation_is_idempotent(api, booking_payload):
    reference = _create_booking(api, booking_payload)
    body = {
        "method": "card",
        "email": "amina@example.com",
        "idempotency_key": "checkout-123",
    }

    first = _initiate(api, reference, **body)
    second = _initiate(api, reference, **body)

    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["payment"]["reference"] == second.json()["payment"]["reference"]
    assert Payment.objects.count() == 1


def _mpesa_payload(checkout_id: str, result_code: int = 0) -> dict:
    callback = {
        "CheckoutRequestID": checkout_id,
        "ResultCode": result_code,
        "ResultDesc": "Processed" if result_code == 0 else "Cancelled",
    }
    if result_code == 0:
        callback["CallbackMetadata"] = {
            "Item": [
                {"Name": "MpesaReceiptNumber", "Value": "TEST123456"},
                {"Name": "Amount", "Value": 1},
            ]
        }
    return {"Body": {"stkCallback": callback}}


def test_mpesa_callback_success_is_idempotent(api, booking_payload):
    reference = _create_booking(api, booking_payload)
    initiated = _initiate(
        api,
        reference,
        method="mpesa",
        phone="0712345678",
        email="amina@example.com",
    )
    assert initiated.status_code == 201, initiated.content
    checkout_id = initiated.json()["payment"]["checkout_request_id"]
    assert checkout_id

    payload = _mpesa_payload(checkout_id)

    first = api.post("/api/v1/payments/webhooks/mpesa/", payload, format="json")
    second = api.post("/api/v1/payments/webhooks/mpesa/", payload, format="json")

    assert first.status_code == 200, first.content
    assert second.status_code == 200, second.content
    assert PaymentWebhookEvent.objects.count() == 1
    assert PaymentWebhookEvent.objects.get().processed is True

    booking = Booking.objects.get(reference=reference)
    assert booking.status == BookingStatus.PENDING_CONFIRMATION

    payment = Payment.objects.get(reference=initiated.json()["payment"]["reference"])
    assert payment.status == Payment.Status.SUCCEEDED
    assert payment.provider_reference == "TEST123456"


def test_mpesa_callback_failure_marks_payment_failed(api, booking_payload):
    reference = _create_booking(api, booking_payload)
    initiated = _initiate(
        api,
        reference,
        method="mpesa",
        phone="0712345678",
        email="amina@example.com",
    )
    checkout_id = initiated.json()["payment"]["checkout_request_id"]

    response = api.post(
        "/api/v1/payments/webhooks/mpesa/",
        _mpesa_payload(checkout_id, result_code=1032),
        format="json",
    )

    assert response.status_code == 200
    payment = Payment.objects.get(reference=initiated.json()["payment"]["reference"])
    assert payment.status == Payment.Status.FAILED
    assert booking_status(reference) == BookingStatus.PENDING_PAYMENT


def test_mpesa_callback_requires_secret_when_configured(
    api, booking_payload, settings
):
    settings.MPESA_CALLBACK_SECRET = "expected-secret"
    reference = _create_booking(api, booking_payload)
    initiated = _initiate(
        api,
        reference,
        method="mpesa",
        phone="0712345678",
        email="amina@example.com",
    )
    checkout_id = initiated.json()["payment"]["checkout_request_id"]
    payload = _mpesa_payload(checkout_id)

    rejected = api.post(
        "/api/v1/payments/webhooks/mpesa/?secret=wrong", payload, format="json"
    )
    assert rejected.status_code == 403

    accepted = api.post(
        "/api/v1/payments/webhooks/mpesa/?secret=expected-secret",
        payload,
        format="json",
    )
    assert accepted.status_code == 200


def test_card_callback_is_idempotent_and_logged(api, booking_payload):
    reference = _create_booking(api, booking_payload)
    initiated = _initiate(api, reference, method="card", email="amina@example.com")
    assert initiated.status_code == 201, initiated.content
    payment = initiated.json()["payment"]

    payload = {
        "event_id": "evt-card-1",
        "reference": payment["provider_reference"],
        "status": "succeeded",
    }
    first = api.post("/api/v1/payments/webhooks/card/", payload, format="json")
    second = api.post("/api/v1/payments/webhooks/card/", payload, format="json")

    assert first.status_code == 200, first.content
    assert second.status_code == 200, second.content
    assert first.json()["status"] == "accepted"
    assert second.json()["status"] == "accepted"
    assert PaymentWebhookEvent.objects.filter(provider=Payment.Provider.CARD).count() == 1
    assert PaymentWebhookEvent.objects.get().processed is True

    stored = Payment.objects.get(reference=payment["reference"])
    assert stored.status == Payment.Status.SUCCEEDED
    assert booking_status(reference) == BookingStatus.PENDING_CONFIRMATION


def test_card_callback_requires_secret_when_configured(
    api, booking_payload, settings
):
    settings.CARD_CALLBACK_SECRET = "expected-secret"
    reference = _create_booking(api, booking_payload)
    initiated = _initiate(api, reference, method="card", email="amina@example.com")
    payment = initiated.json()["payment"]
    payload = {
        "event_id": "evt-card-secret",
        "reference": payment["provider_reference"],
        "status": "succeeded",
    }

    rejected = api.post(
        "/api/v1/payments/webhooks/card/?secret=wrong", payload, format="json"
    )
    assert rejected.status_code == 403
    assert PaymentWebhookEvent.objects.count() == 0

    accepted = api.post(
        "/api/v1/payments/webhooks/card/?secret=expected-secret",
        payload,
        format="json",
    )
    assert accepted.status_code == 200
    assert accepted.json()["status"] == "accepted"


def test_card_callback_failure_marks_payment_failed(api, booking_payload):
    reference = _create_booking(api, booking_payload)
    initiated = _initiate(api, reference, method="card", email="amina@example.com")
    payment = initiated.json()["payment"]

    response = api.post(
        "/api/v1/payments/webhooks/card/",
        {
            "event_id": "evt-card-failed",
            "reference": payment["provider_reference"],
            "status": "declined",
            "failure_message": "The card was declined.",
        },
        format="json",
    )

    assert response.status_code == 200
    stored = Payment.objects.get(reference=payment["reference"])
    assert stored.status == Payment.Status.FAILED
    assert stored.failure_message == "The card was declined."
    assert booking_status(reference) == BookingStatus.PENDING_PAYMENT


def test_payment_received_after_booking_expired_is_flagged_for_review(
    api, booking_payload
):
    reference = _create_booking(api, booking_payload)
    initiated = _initiate(api, reference, method="card", email="amina@example.com")
    payment_reference = initiated.json()["payment"]["reference"]

    booking = Booking.objects.get(reference=reference)
    transition_booking(booking, BookingStatus.EXPIRED, reason="Test expiry")

    response = api.post(
        f"/api/v1/payments/{payment_reference}/sandbox-complete/",
        {"success": True},
        format="json",
    )

    assert response.status_code == 200, response.content
    booking.refresh_from_db()
    assert booking.status == BookingStatus.EXPIRED
    payment = Payment.objects.get(reference=payment_reference)
    assert payment.status == Payment.Status.SUCCEEDED
    assert payment.requires_review is True
    assert "no longer payable" in payment.review_reason


def test_successful_payment_can_complete_a_still_held_booking(api, booking_payload):
    reference = _create_booking(api, booking_payload)
    booking = Booking.objects.get(reference=reference)
    assert booking.status == BookingStatus.HELD

    payment = Payment.objects.create(
        reference="PAY-HELD01",
        purpose=Payment.Purpose.ROOM_BOOKING,
        booking=booking,
        amount=booking.total,
        currency=booking.currency,
        provider=Payment.Provider.CARD,
        status=Payment.Status.INITIATED,
    )

    complete_payment(payment=payment, success=True, provider_reference="CARD-HELD01")

    booking.refresh_from_db()
    assert booking.status == BookingStatus.PENDING_CONFIRMATION
    payment.refresh_from_db()
    assert payment.status == Payment.Status.SUCCEEDED
    assert payment.requires_review is False


def booking_status(reference: str) -> str:
    return Booking.objects.get(reference=reference).status
