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


class PublicFormSerializer(serializers.Serializer):
    """Base for public forms with optional anti-spam fields.

    They are accepted so the OpenAPI schema and generated frontend types stay
    truthful. The view checks them before validation and returns a generic
    success without writing anything.
    """

    website = serializers.CharField(
        required=False, allow_blank=True, max_length=200, write_only=True
    )
    form_started_at = serializers.IntegerField(required=False, min_value=0)


class PublicHotelSettingSerializer(serializers.ModelSerializer):
    cancellation_cutoff_hours = serializers.IntegerField(read_only=True)
    gym_day_pass_price = KesField(read_only=True)
    gym_monthly_price = KesField(read_only=True)
    conference_half_day_price = KesField(read_only=True)
    conference_full_day_price = KesField(read_only=True)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not instance.conference_prices_confirmed:
            data.pop("conference_half_day_price", None)
            data.pop("conference_full_day_price", None)
        return data

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
            "conference_prices_confirmed",
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
            "dinner_plan_enabled",
            "privacy_notice_url",
            "privacy_notice_version",
            "data_retention_months",
        )


class StaffHotelSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = HotelSetting
        exclude = ("id", "created_at", "updated_at")


class FormGuardCountSerializer(serializers.Serializer):
    form = serializers.CharField()
    reason = serializers.CharField()
    count = serializers.IntegerField()


class FormGuardSummarySerializer(serializers.Serializer):
    window_days = serializers.IntegerField()
    since = serializers.DateTimeField()
    total = serializers.IntegerField()
    counts = FormGuardCountSerializer(many=True)


class ContentConfirmationItemSerializer(serializers.Serializer):
    kind = serializers.CharField()
    model = serializers.CharField()
    id = serializers.CharField()
    label = serializers.CharField()
    active = serializers.BooleanField()
    needs_confirmation = serializers.BooleanField()
    updated_at = serializers.DateTimeField()


class ContentConfirmationSummarySerializer(serializers.Serializer):
    total = serializers.IntegerField()
    counts = serializers.DictField(child=serializers.IntegerField())
    items = ContentConfirmationItemSerializer(many=True)
