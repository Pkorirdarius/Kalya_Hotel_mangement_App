from __future__ import annotations

from rest_framework import serializers

from apps.common.serializers import KesField, PublicFormSerializer
from apps.common.utils import normalise_kenyan_phone

from .models import (
    GUEST_LANGUAGE_CHOICES,
    ConferenceBlock,
    ConferenceEnquiry,
    GymDayPass,
    GymMembershipEnquiry,
    MenuItem,
    TableBooking,
)


class TableBookingCreateSerializer(PublicFormSerializer):
    venue = serializers.ChoiceField(
        choices=TableBooking.Venue.choices,
        default=TableBooking.Venue.RESTAURANT,
        required=False,
    )
    date = serializers.DateField()
    time = serializers.CharField(max_length=5)
    party_size = serializers.IntegerField(min_value=1, max_value=20)
    first_name = serializers.CharField(max_length=80)
    last_name = serializers.CharField(max_length=80)
    phone = serializers.CharField(max_length=32)
    email = serializers.EmailField(required=False, allow_blank=True)
    language = serializers.ChoiceField(
        choices=GUEST_LANGUAGE_CHOICES, default="en", required=False
    )
    occasion = serializers.CharField(max_length=40, required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True, max_length=1000)

    def validate_phone(self, value):
        try:
            return normalise_kenyan_phone(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc

    def validate_venue(self, value):
        if value == TableBooking.Venue.COFFEE:
            raise serializers.ValidationError(
                "The coffee shop is walk-in only and cannot be booked."
            )
        return value


class TableBookingSerializer(serializers.ModelSerializer):
    guest_name = serializers.CharField()
    status_display = serializers.CharField(source="get_status_display")
    venue_display = serializers.CharField(source="get_venue_display")

    class Meta:
        model = TableBooking
        fields = (
            "reference",
            "venue",
            "venue_display",
            "date",
            "time",
            "party_size",
            "guest_name",
            "first_name",
            "last_name",
            "phone",
            "email",
            "language",
            "occasion",
            "notes",
            "status",
            "status_display",
            "created_at",
        )


class RestaurantSlotSerializer(serializers.Serializer):
    time = serializers.CharField()
    remaining = serializers.IntegerField()


class ConferenceEnquiryCreateSerializer(PublicFormSerializer):
    date = serializers.DateField()
    session = serializers.ChoiceField(choices=ConferenceEnquiry.Session.choices)
    hall = serializers.ChoiceField(choices=ConferenceEnquiry.Hall.choices)
    people = serializers.IntegerField(min_value=4, max_value=120)
    layout = serializers.ChoiceField(choices=ConferenceEnquiry.Layout.choices)
    catering = serializers.ListField(
        child=serializers.CharField(max_length=60), required=False, default=list
    )
    first_name = serializers.CharField(max_length=80)
    last_name = serializers.CharField(max_length=80)
    company = serializers.CharField(max_length=120, required=False, allow_blank=True)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=32)
    language = serializers.ChoiceField(
        choices=GUEST_LANGUAGE_CHOICES, default="en", required=False
    )
    notes = serializers.CharField(required=False, allow_blank=True, max_length=2000)

    def validate_phone(self, value):
        try:
            return normalise_kenyan_phone(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc


class ConferenceEnquirySerializer(serializers.ModelSerializer):
    guest_name = serializers.CharField()
    session_display = serializers.CharField(source="get_session_display")
    hall_display = serializers.CharField(source="get_hall_display")
    layout_display = serializers.CharField(source="get_layout_display")
    status_display = serializers.CharField(source="get_status_display")

    class Meta:
        model = ConferenceEnquiry
        fields = (
            "reference",
            "date",
            "session",
            "session_display",
            "hall",
            "hall_display",
            "people",
            "layout",
            "layout_display",
            "catering",
            "guest_name",
            "first_name",
            "last_name",
            "company",
            "email",
            "phone",
            "language",
            "notes",
            "status",
            "status_display",
            "created_at",
        )


class ConferenceAvailabilitySerializer(serializers.Serializer):
    date = serializers.DateField()
    session = serializers.CharField()
    status = serializers.CharField()
    label = serializers.CharField()


class GymDayPassCreateSerializer(PublicFormSerializer):
    date = serializers.DateField()
    full_name = serializers.CharField(max_length=120)
    phone = serializers.CharField(max_length=32)
    email = serializers.EmailField(required=False, allow_blank=True)
    payment_method = serializers.ChoiceField(
        choices=GymDayPass.PaymentMethod.choices
    )

    def validate_phone(self, value):
        try:
            return normalise_kenyan_phone(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc


class GymDayPassSerializer(serializers.ModelSerializer):
    amount = KesField(read_only=True)
    status_display = serializers.CharField(source="get_status_display")
    payment_method_display = serializers.CharField(
        source="get_payment_method_display"
    )
    qr_url = serializers.SerializerMethodField()

    class Meta:
        model = GymDayPass
        fields = (
            "reference",
            "date",
            "full_name",
            "phone",
            "email",
            "amount",
            "payment_method",
            "payment_method_display",
            "status",
            "status_display",
            "qr_token",
            "qr_url",
            "paid_at",
            "created_at",
        )

    def get_qr_url(self, obj) -> str | None:
        if not obj.qr_token:
            return None
        request = self.context.get("request")
        path = f"/api/v1/facilities/gym/day-passes/{obj.reference}/qr/"
        if request is not None:
            return request.build_absolute_uri(path)
        return path


class MenuItemSerializer(serializers.ModelSerializer):
    price = KesField(read_only=True)

    class Meta:
        model = MenuItem
        fields = (
            "id",
            "venue",
            "category",
            "name_en",
            "name_sw",
            "description_en",
            "description_sw",
            "price",
            "image",
            "needs_confirmation",
            "sort_order",
        )


class MenuItemStaffSerializer(serializers.ModelSerializer):
    price = KesField()

    class Meta:
        model = MenuItem
        fields = (
            "id",
            "venue",
            "category",
            "name_en",
            "name_sw",
            "description_en",
            "description_sw",
            "price",
            "image",
            "active",
            "needs_confirmation",
            "sort_order",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class TableBookingStaffSerializer(TableBookingSerializer):
    class Meta(TableBookingSerializer.Meta):
        fields = TableBookingSerializer.Meta.fields + ("escalated_at",)


class ConferenceEnquiryStaffSerializer(ConferenceEnquirySerializer):
    class Meta(ConferenceEnquirySerializer.Meta):
        fields = ConferenceEnquirySerializer.Meta.fields + ("escalated_at",)


class GymDayPassStaffSerializer(GymDayPassSerializer):
    class Meta(GymDayPassSerializer.Meta):
        fields = GymDayPassSerializer.Meta.fields + (
            "payment_reference",
            "escalated_at",
        )


class GymAvailabilitySerializer(serializers.Serializer):
    date = serializers.DateField()
    remaining = serializers.IntegerField()
    price = serializers.IntegerField()


class ConferenceBlockSerializer(serializers.ModelSerializer):
    session_display = serializers.CharField(source="get_session_display", read_only=True)

    class Meta:
        model = ConferenceBlock
        fields = ("id", "date", "session", "session_display", "reason", "created_at")
        read_only_fields = ("id", "created_at")


class GymMembershipEnquirySerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = GymMembershipEnquiry
        fields = (
            "id",
            "full_name",
            "phone",
            "email",
            "message",
            "status",
            "status_display",
            "created_at",
        )
        read_only_fields = ("id", "created_at")


class TableBookingCreateResponseSerializer(serializers.Serializer):
    booking = TableBookingSerializer()


class ConferenceEnquiryCreateResponseSerializer(serializers.Serializer):
    enquiry = ConferenceEnquirySerializer()


class GymDayPassCreateResponseSerializer(serializers.Serializer):
    day_pass = GymDayPassSerializer()
