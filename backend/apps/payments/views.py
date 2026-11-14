from __future__ import annotations

import hmac

from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.bookings.models import Booking
from apps.bookings.services.bookings import verify_contact
from apps.facilities.models import GymDayPass
from apps.payments.models import Payment
from apps.payments.providers.card import BankTransferProvider
from apps.payments.serializers import (
    PaymentInitiateResponseSerializer,
    PaymentInitiateSerializer,
    PaymentMethodsResponseSerializer,
    PaymentSerializer,
    SandboxCompleteSerializer,
    WebhookAckSerializer,
    payment_summary,
)
from apps.payments.services import (
    InvalidCallback,
    PaymentError,
    complete_payment,
    initiate_booking_payment,
    initiate_gym_payment,
    process_card_callback,
    process_mpesa_callback,
)


def _booking_or_404(reference: str) -> Booking:
    booking = (
        Booking.objects.select_related("room_type", "rate_plan", "meal_plan")
        .filter(reference__iexact=reference)
        .first()
    )
    if booking is None:
        raise NotFound("We could not find that booking.")
    return booking


def _payment_or_404(reference: str) -> Payment:
    payment = Payment.objects.filter(reference__iexact=reference).first()
    if payment is None:
        raise NotFound("We could not find that payment.")
    return payment


def _simulation_enabled() -> bool:
    """True only when both development switches are on."""

    return bool(
        settings.PAYMENTS_SANDBOX and settings.PAYMENT_SIMULATION_ALLOWED
    )


@extend_schema(tags=["payments"])
class PaymentMethodsView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(responses=PaymentMethodsResponseSerializer)
    def get(self, request):
        return Response(
            {
                "methods": [
                    {"code": "mpesa", "label": "M-Pesa", "enabled": True},
                    {"code": "card", "label": "Card", "enabled": True},
                    {"code": "bank_transfer", "label": "Bank transfer", "enabled": True},
                ],
                "bank": BankTransferProvider().instructions(),
                "sandbox": _simulation_enabled(),
            }
        )


@extend_schema(tags=["payments"], request=PaymentInitiateSerializer)
class BookingPaymentInitiateView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = "payment"

    @extend_schema(responses={201: PaymentInitiateResponseSerializer})
    def post(self, request, reference: str):
        booking = _booking_or_404(reference)
        serializer = PaymentInitiateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        email = (data.get("email") or "").strip()
        phone = (data.get("phone") or "").strip()
        if not verify_contact(booking, email=email, phone=phone):
            raise NotFound("We could not find a booking with those details.")
        if booking.status not in ("held", "pending_payment"):
            raise ValidationError(
                {"detail": "This booking is not awaiting payment."}
            )

        try:
            payment = initiate_booking_payment(
                booking=booking,
                method=data["method"],
                phone=phone,
                idempotency_key=data.get("idempotency_key")
                or request.headers.get("Idempotency-Key")
                or None,
            )
        except PaymentError as exc:
            raise ValidationError({"detail": str(exc)})

        payment.refresh_from_db()
        return Response(
            {
                "payment": PaymentSerializer(payment).data,
                "message": payment.failure_message
                or payment_summary(payment)["instructions"].get("bank_name", ""),
                "sandbox": _simulation_enabled(),
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["payments"])
class PaymentDetailView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = "lookup"

    @extend_schema(responses=PaymentSerializer)
    def get(self, request, reference: str):
        payment = _payment_or_404(reference)
        return Response(PaymentSerializer(payment).data)


@extend_schema(tags=["payments"])
class SandboxCompleteView(APIView):
    """Development-only helper that completes a payment without a gateway."""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = "payment"

    @extend_schema(request=SandboxCompleteSerializer, responses=PaymentSerializer)
    def post(self, request, reference: str):
        # Two independent guards: the settings flag and the simulation switch.
        # Production forces both off and refuses to start otherwise.
        if not (
            settings.PAYMENTS_SANDBOX
            and settings.PAYMENT_SIMULATION_ALLOWED
        ):
            raise NotFound("Not available.")
        payment = _payment_or_404(reference)
        serializer = SandboxCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        payment = complete_payment(
            payment=payment,
            success=data["success"],
            provider_reference=f"SANDBOX-{payment.reference}",
            failure_code=data.get("failure_code", ""),
            failure_message=data.get("failure_message", ""),
            raw_response={"sandbox": True, "success": data["success"]},
        )
        return Response(PaymentSerializer(payment).data)


@method_decorator(csrf_exempt, name="dispatch")
class MpesaWebhookView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["webhooks"],
        request=None,
        responses={200: None},
        parameters=[OpenApiParameter("secret", str, required=False)],
    )
    def post(self, request):
        secret = settings.MPESA_CALLBACK_SECRET
        if secret:
            supplied = request.headers.get("X-Callback-Secret") or request.query_params.get(
                "secret", ""
            )
            if not hmac.compare_digest(str(supplied), str(secret)):
                raise PermissionDenied("Invalid callback secret.")
        allowed_ips = settings.MPESA_ALLOWED_IPS
        if allowed_ips:
            client_ip = request.META.get("REMOTE_ADDR", "")
            if client_ip not in allowed_ips:
                raise PermissionDenied("Callback source is not allowed.")
        try:
            process_mpesa_callback(request.data, signature_valid=True)
        except InvalidCallback as exc:
            raise ValidationError({"detail": str(exc)}) from exc
        return Response({"ResultCode": 0, "ResultDesc": "Accepted"})


@method_decorator(csrf_exempt, name="dispatch")
class CardWebhookView(APIView):
    """Gateway-neutral card callback placeholder.

    A real adapter (Pesapal/Flutterwave/DPO) validates its signature in the same
    place this shared-secret check runs and then calls the same idempotent
    service. Card details are never accepted by this endpoint.
    """

    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        request=None,
        responses=WebhookAckSerializer,
        parameters=[OpenApiParameter("secret", str, required=False)],
    )
    def post(self, request):
        secret = settings.CARD_CALLBACK_SECRET
        if secret:
            supplied = request.headers.get("X-Callback-Secret") or request.query_params.get(
                "secret", ""
            )
            if not hmac.compare_digest(str(supplied), str(secret)):
                raise PermissionDenied("Invalid callback secret.")
        event = process_card_callback(request.data, signature_valid=True)
        return Response(
            {
                "status": "accepted" if event.processed else "ignored",
                "detail": event.error,
            }
        )


@extend_schema(tags=["payments"], request=PaymentInitiateSerializer)
class GymPaymentInitiateView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = "payment"

    @extend_schema(
        request=PaymentInitiateSerializer,
        responses={201: PaymentInitiateResponseSerializer},
    )
    def post(self, request, reference: str):
        gym_pass = GymDayPass.objects.filter(reference__iexact=reference).first()
        if gym_pass is None:
            raise NotFound("We could not find that day pass.")
        serializer = PaymentInitiateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if gym_pass.phone != data.get("phone"):
            raise NotFound("We could not find that day pass.")
        try:
            payment = initiate_gym_payment(
                gym_pass=gym_pass,
                method=data["method"],
                phone=data.get("phone", ""),
                idempotency_key=data.get("idempotency_key")
                or request.headers.get("Idempotency-Key")
                or None,
            )
        except PaymentError as exc:
            raise ValidationError({"detail": str(exc)})
        return Response(
            {
                "payment": PaymentSerializer(payment).data,
                "message": payment.failure_message,
                "sandbox": _simulation_enabled(),
            },
            status=status.HTTP_201_CREATED,
        )
