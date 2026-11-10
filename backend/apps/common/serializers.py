from decimal import Decimal

from rest_framework import serializers

from .models import HotelSetting


class ErrorDetailSerializer(serializers.Serializer):
    code = serializers.CharField()
    message = serializers.CharField()
    fields = serializers.JSONField(allow_null=True, required=False)
    request_id = serializers.CharField(allow_null=True, required=False)


class ErrorEnvelopeSerializer(serializers.Serializer):
    error = ErrorDetailSerializer()


class HealthSerializer(serializers.Serializer):
    status = serializers.CharField()
    service = serializers.CharField()
    database = serializers.BooleanField()
    time = serializers.CharField()


class KesField(serializers.DecimalField):
    """Serialize money as an integer number of Kenyan shillings."""

    def __init__(self, **kwargs):
        kwargs.setdefault("max_digits", 12)
        kwargs.setdefault("decimal_places", 2)
        kwargs.setdefault("coerce_to_string", False)
        super().__init__(**kwargs)

    def to_representation(self, value):
        if value is None:
            return None
        return int(Decimal(value).quantize(Decimal("1")))


class PublicHotelSettingSerializer(serializers.ModelSerializer):
    cancellation_cutoff_hours = serializers.IntegerField(read_only=True)
    gym_day_pass_price = KesField(read_only=True)
    gym_monthly_price = KesField(read_only=True)
    conference_half_day_price = KesField(read_only=True)
    conference_full_day_price = KesField(read_only=True)

    class Meta:
        model = HotelSetting
        fields = (
            "name",
            "tagline",
            "address",
            "town",
            "county",
            "country",
            "phone",
            "phone_href",
            "email",
            "whatsapp",
            "map_query",
            "currency",
            "timezone",
            "cancellation_cutoff_hours",
            "hold_ttl_minutes",
            "max_nights_per_booking",
            "frontdesk_target_minutes",
            "tax_included",
            "tax_rate_percent",
            "restaurant_capacity",
            "restaurant_hours",
            "coffee_capacity",
            "coffee_hours",
            "conference_capacity",
            "conference_hours",
            "gym_capacity",
            "gym_hours",
            "gym_day_pass_price",
            "gym_monthly_price",
            "conference_half_day_price",
            "conference_full_day_price",
            "bank_name",
            "bank_account_name",
            "bank_account_number",
            "bank_branch",
            "bank_swift",
            "claims_verified",
            "google_reviews_enabled",
            "privacy_notice_url",
            "privacy_notice_version",
            "data_retention_months",
        )


class StaffHotelSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = HotelSetting
        exclude = ("id", "created_at", "updated_at")
