from decimal import Decimal

from django.conf import settings
from django.db import models


def default_hotel_name() -> str:
    """Brand default kept in one place: the HOTEL settings dictionary."""

    return settings.HOTEL["NAME"]


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class HotelSetting(TimeStampedModel):
    """Single editable record for hotel-wide public settings.

    The hotel's ICT/marketing staff can change these values in Django admin
    without a code deployment. Every value ships as a placeholder flagged for
    confirmation by the hotel.
    """

    name = models.CharField(max_length=120, default=default_hotel_name)
    tagline = models.CharField(max_length=200, blank=True)
    address = models.CharField(
        max_length=255,
        blank=True,
        help_text="Needs hotel confirmation: sources disagree (Nairobi vs Kapenguria).",
    )
    town = models.CharField(
        max_length=120,
        blank=True,
        help_text="Needs hotel confirmation: do not launch until checked.",
    )
    county = models.CharField(
        max_length=120,
        blank=True,
        help_text="Needs hotel confirmation: do not launch until checked.",
    )
    country = models.CharField(max_length=120, default="Kenya")
    phone = models.CharField(
        max_length=40,
        blank=True,
        help_text="Needs hotel confirmation: replace with the hotel's real number.",
    )
    phone_href = models.CharField(max_length=60, blank=True)
    email = models.EmailField(
        blank=True,
        help_text="Needs hotel confirmation: replace with the hotel's real inbox.",
    )
    whatsapp = models.CharField(max_length=40, blank=True)
    map_query = models.CharField(
        max_length=255,
        blank=True,
        help_text="Needs hotel confirmation: pin the correct location on Google Maps.",
    )

    currency = models.CharField(max_length=3, default="KES")
    timezone = models.CharField(max_length=64, default="Africa/Nairobi")

    # Booking policy. Values are editable in admin and shown to guests.
    cancellation_cutoff_hours = models.PositiveSmallIntegerField(default=48)
    hold_ttl_minutes = models.PositiveSmallIntegerField(default=15)
    bank_transfer_hold_hours = models.PositiveSmallIntegerField(default=24)
    max_nights_per_booking = models.PositiveSmallIntegerField(default=30)
    frontdesk_target_minutes = models.PositiveSmallIntegerField(default=10)
    frontdesk_escalate_minutes = models.PositiveSmallIntegerField(default=8)
    frontdesk_undo_seconds = models.PositiveSmallIntegerField(default=10)

    tax_included = models.BooleanField(default=True)
    tax_rate_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("16.00")
    )

    # Facility operating facts. Capacity is used by the availability service.
    restaurant_capacity = models.PositiveSmallIntegerField(default=80)
    restaurant_hours = models.CharField(max_length=80, default="6:30 AM – 10:00 PM")
    coffee_capacity = models.PositiveSmallIntegerField(default=100)
    coffee_hours = models.CharField(max_length=80, default="6:00 AM – 9:00 PM")
    conference_capacity = models.PositiveSmallIntegerField(default=100)
    conference_hours = models.CharField(max_length=80, default="6:00 AM – 9:00 PM")
    gym_capacity = models.PositiveSmallIntegerField(default=20)
    gym_hours = models.CharField(max_length=80, default="5:00 AM – 9:00 PM")
    gym_day_pass_price = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("500.00")
    )
    gym_monthly_price = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("3000.00")
    )
    conference_half_day_price = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("8000.00")
    )
    conference_full_day_price = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("15000.00")
    )

    # Bank transfer details shown to guests. Never store card data.
    bank_name = models.CharField(max_length=120, blank=True)
    bank_account_name = models.CharField(max_length=120, blank=True)
    bank_account_number = models.CharField(max_length=60, blank=True)
    bank_branch = models.CharField(max_length=120, blank=True)
    bank_swift = models.CharField(max_length=40, blank=True)

    # Feature gates for unconfirmed marketing claims.
    claims_verified = models.BooleanField(
        default=False,
        help_text="When false, unverified claims (best-rate, airport ride, etc.) are hidden.",
    )
    google_reviews_enabled = models.BooleanField(default=False)

    privacy_notice_url = models.CharField(max_length=255, blank=True)
    privacy_notice_version = models.CharField(max_length=40, blank=True)
    data_retention_months = models.PositiveSmallIntegerField(default=24)

    class Meta:
        verbose_name = "Hotel settings"
        verbose_name_plural = "Hotel settings"

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls) -> "HotelSetting":
        record, _ = cls.objects.get_or_create(pk=1)
        return record


class AuditLog(models.Model):
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=100)
    entity_type = models.CharField(max_length=100, blank=True)
    entity_id = models.CharField(max_length=64, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    request_id = models.CharField(max_length=64, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["action", "-created_at"]),
            models.Index(fields=["entity_type", "entity_id"]),
        ]

    def __str__(self) -> str:
        return f"{self.action} at {self.created_at:%Y-%m-%d %H:%M:%S}"
