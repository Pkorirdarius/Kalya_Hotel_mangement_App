from __future__ import annotations

from datetime import date

from rest_framework import serializers

from apps.common.serializers import KesField
from apps.common.utils import normalise_kenyan_phone
from apps.rates.models import MealPlan
from apps.rooms.models import RoomType

from .models import Booking, BookingStatusEvent


class QuoteRequestSerializer(serializers.Serializer):
    room_type = serializers.SlugRelatedField(
        slug_field="slug",
        queryset=RoomType.objects.filter(active=True),
    )
    meal_plan = serializers.SlugRelatedField(
        slug_field="code",
        queryset=MealPlan.objects.filter(active=True),
    )
    checkin = serializers.DateField()
    checkout = serializers.DateField()
    guests = serializers.IntegerField(min_value=1, max_value=10, default=1)
    rate_plan = serializers.IntegerField(required=False, allow_null=True)


class NightlyRateSerializer(serializers.Serializer):
    date = serializers.DateField()
    rate = serializers.IntegerField()
    weekend = serializers.BooleanField()
    season = serializers.CharField()


class QuoteResponseSerializer(serializers.Serializer):
    room_type = serializers.CharField()
    room_type_name = serializers.CharField()
    rate_plan = serializers.CharField()
    meal_plan = serializers.CharField()
    checkin = serializers.DateField()
    checkout = serializers.DateField()
    guests = serializers.IntegerField()
    nights = serializers.IntegerField()
    currency = serializers.CharField()
    nightly_rates = NightlyRateSerializer(many=True)
    accommodation_total = serializers.IntegerField()
    meal_total = serializers.IntegerField()
    discount_percent = serializers.FloatField()
    discount_total = serializers.IntegerField()
    tax_total = serializers.IntegerField()
    tax_included = serializers.BooleanField()
    tax_rate_percent = serializers.FloatField()
    total = serializers.IntegerField()
    cancellation_cutoff_hours = serializers.IntegerField()
    free_cancellation_until = serializers.DateTimeField(allow_null=True)
    available_rooms = serializers.IntegerField()


class BookingCreateSerializer(serializers.Serializer):
    quote = QuoteRequestSerializer()
    first_name = serializers.CharField(max_length=80)
    last_name = serializers.CharField(max_length=80)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=32)
    country = serializers.CharField(max_length=80, required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True, max_length=1000)
    language = serializers.ChoiceField(choices=("en", "sw"), default="en")
    consent_privacy = serializers.BooleanField()
    marketing_consent = serializers.BooleanField(default=False)
    client_request_id = serializers.CharField(
        max_length=64, required=False, allow_blank=True
    )

    def validate_phone(self, value):
        try:
            return normalise_kenyan_phone(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc

    def validate_consent_privacy(self, value):
        if not value:
            raise serializers.ValidationError(
                "Please accept the privacy notice to continue."
            )
        return value


class PaymentSummarySerializer(serializers.Serializer):
    reference = serializers.CharField()
    provider = serializers.CharField()
    provider_display = serializers.CharField()
    status = serializers.CharField()
    amount = serializers.IntegerField()
    checkout_request_id = serializers.CharField(allow_blank=True)
    failure_message = serializers.CharField(allow_blank=True)
    paid_at = serializers.DateTimeField(allow_null=True)
    instructions = serializers.JSONField(required=False)


class BookingStatusEventSerializer(serializers.ModelSerializer):
    to_status_display = serializers.CharField(source="get_to_status_display")

    class Meta:
        model = BookingStatusEvent
        fields = ("from_status", "to_status", "to_status_display", "reason", "created_at")


class BookingPublicSerializer(serializers.ModelSerializer):
    room_type = serializers.CharField(source="room_type.slug")
    room_type_name = serializers.CharField(source="room_type.name_en")
    room_type_image = serializers.CharField(source="room_type.image")
    rate_plan = serializers.CharField(source="rate_plan.code")
    meal_plan = serializers.CharField(source="meal_plan.code")
    meal_plan_name = serializers.CharField(source="meal_plan.name_en")
    nights = serializers.IntegerField()
    status_display = serializers.CharField(source="get_status_display")
    guest_name = serializers.CharField()
    accommodation_total = KesField(read_only=True)
    meal_total = KesField(read_only=True)
    discount_total = KesField(read_only=True)
    total = KesField(read_only=True)
    can_cancel = serializers.BooleanField()
    latest_payment = serializers.SerializerMethodField()
    status_events = BookingStatusEventSerializer(many=True, read_only=True)

    class Meta:
        model = Booking
        fields = (
            "reference",
            "status",
            "status_display",
            "room_type",
            "room_type_name",
            "room_type_image",
            "rate_plan",
            "meal_plan",
            "meal_plan_name",
            "checkin",
            "checkout",
            "nights",
            "guests",
            "guest_name",
            "first_name",
            "last_name",
            "email",
            "phone",
            "country",
            "notes",
            "language",
            "currency",
            "accommodation_total",
            "meal_total",
            "discount_total",
            "total",
            "price_breakdown",
            "cancellation_cutoff_hours",
            "free_cancellation_until",
            "hold_expires_at",
            "can_cancel",
            "created_at",
            "latest_payment",
            "status_events",
        )

    def get_latest_payment(self, obj):
        payment = obj.payments.order_by("-created_at").first()
        if payment is None:
            return None
        from apps.payments.serializers import payment_summary

        return payment_summary(payment)


class BookingLookupQuerySerializer(serializers.Serializer):
    email = serializers.EmailField(required=False)
    phone = serializers.CharField(required=False, max_length=32)

    def validate(self, attrs):
        if not attrs.get("email") and not attrs.get("phone"):
            raise serializers.ValidationError(
                "Provide the email or phone used for the booking."
            )
        return attrs


class AvailabilityQuerySerializer(serializers.Serializer):
    checkin = serializers.DateField()
    checkout = serializers.DateField()
    guests = serializers.IntegerField(min_value=1, max_value=10, default=1)

    def validate(self, attrs):
        if attrs["checkout"] <= attrs["checkin"]:
            raise serializers.ValidationError(
                {"checkout": "Check-out must be after check-in."}
            )
        return attrs


class AvailabilityRowSerializer(serializers.Serializer):
    room_type = serializers.CharField()
    name = serializers.CharField()
    available_rooms = serializers.IntegerField()
    sleeps = serializers.IntegerField()
    fits_guests = serializers.BooleanField()
    from_price = serializers.IntegerField(allow_null=True)


class CancelBookingSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, max_length=255)


class StaffBookingSerializer(BookingPublicSerializer):
    source = serializers.CharField(source="get_source_display")

    class Meta(BookingPublicSerializer.Meta):
        fields = BookingPublicSerializer.Meta.fields + ("source", "escalated_at")
