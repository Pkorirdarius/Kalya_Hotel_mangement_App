from __future__ import annotations

from rest_framework import serializers

from apps.common.serializers import KesField
from apps.common.utils import normalise_kenyan_phone

from .models import Payment
from .providers.base import ProviderResult


def payment_summary(payment: Payment) -> dict:
    instructions = {}
    if payment.provider == Payment.Provider.BANK_TRANSFER:
        from .providers.card import BankTransferProvider

        instructions = BankTransferProvider().instructions()
    return {
        "reference": payment.reference,
        "provider": payment.provider,
        "provider_display": payment.get_provider_display(),
        "status": payment.status,
        "amount": int(payment.amount),
        "checkout_request_id": payment.checkout_request_id,
        "failure_message": payment.failure_message,
        "paid_at": payment.paid_at.isoformat() if payment.paid_at else None,
        "instructions": instructions,
    }


class PaymentInitiateSerializer(serializers.Serializer):
    method = serializers.ChoiceField(choices=Payment.Provider.choices)
    phone = serializers.CharField(max_length=32, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    idempotency_key = serializers.CharField(
        max_length=80, required=False, allow_blank=True
    )

    def validate(self, attrs):
        method = attrs["method"]
        phone = attrs.get("phone", "")
        if method == Payment.Provider.MPESA:
            if not phone:
                raise serializers.ValidationError(
                    {"phone": "Enter the M-Pesa phone number."}
                )
            try:
                attrs["phone"] = normalise_kenyan_phone(phone)
            except ValueError as exc:
                raise serializers.ValidationError({"phone": str(exc)}) from exc
        elif phone:
            try:
                attrs["phone"] = normalise_kenyan_phone(phone)
            except ValueError as exc:
                raise serializers.ValidationError({"phone": str(exc)}) from exc
        return attrs


class PaymentSerializer(serializers.ModelSerializer):
    amount = KesField(read_only=True)
    provider_display = serializers.CharField(source="get_provider_display")
    purpose_display = serializers.CharField(source="get_purpose_display")
    instructions = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = (
            "reference",
            "purpose",
            "purpose_display",
            "provider",
            "provider_display",
            "status",
            "amount",
            "currency",
            "phone",
            "provider_reference",
            "checkout_request_id",
            "failure_code",
            "failure_message",
            "paid_at",
            "created_at",
            "instructions",
        )

    def get_instructions(self, obj) -> dict:
        return payment_summary(obj)["instructions"]


class PaymentInitiateResponseSerializer(serializers.Serializer):
    payment = PaymentSerializer()
    message = serializers.CharField(allow_blank=True)
    sandbox = serializers.BooleanField()


class ProviderResultSerializer(serializers.Serializer):
    ok = serializers.BooleanField()
    status = serializers.CharField()
    provider_reference = serializers.CharField()
    checkout_request_id = serializers.CharField()
    message = serializers.CharField()
    sandbox = serializers.BooleanField()


def result_payload(result: ProviderResult) -> dict:
    return {
        "ok": result.ok,
        "status": result.status,
        "provider_reference": result.provider_reference,
        "checkout_request_id": result.checkout_request_id,
        "message": result.message,
        "sandbox": result.sandbox,
    }


class SandboxCompleteSerializer(serializers.Serializer):
    success = serializers.BooleanField(default=True)
    failure_code = serializers.CharField(required=False, allow_blank=True)
    failure_message = serializers.CharField(required=False, allow_blank=True)


class PaymentMethodRowSerializer(serializers.Serializer):
    code = serializers.CharField()
    label = serializers.CharField()
    enabled = serializers.BooleanField()


class PaymentMethodsResponseSerializer(serializers.Serializer):
    methods = PaymentMethodRowSerializer(many=True)
    bank = serializers.JSONField()
    sandbox = serializers.BooleanField()


class WebhookAckSerializer(serializers.Serializer):
    status = serializers.CharField(required=False)
    ResultCode = serializers.IntegerField(required=False)
    ResultDesc = serializers.CharField(required=False)
