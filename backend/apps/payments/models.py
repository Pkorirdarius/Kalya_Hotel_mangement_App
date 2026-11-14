from decimal import Decimal

from django.db import models

from apps.common.models import TimeStampedModel


class Payment(TimeStampedModel):
    class Purpose(models.TextChoices):
        ROOM_BOOKING = "room_booking", "Room booking"
        GYM_DAY_PASS = "gym_day_pass", "Gym day pass"

    class Provider(models.TextChoices):
        MPESA = "mpesa", "M-Pesa"
        CARD = "card", "Card"
        BANK_TRANSFER = "bank_transfer", "Bank transfer"

    class Status(models.TextChoices):
        INITIATED = "initiated", "Initiated"
        PENDING = "pending", "Pending"
        SUCCEEDED = "succeeded", "Succeeded"
        FAILED = "failed", "Failed"
        CANCELLED = "cancelled", "Cancelled"
        REFUNDED = "refunded", "Refunded"

    reference = models.CharField(max_length=24, unique=True, db_index=True)
    purpose = models.CharField(max_length=24, choices=Purpose.choices)
    booking = models.ForeignKey(
        "bookings.Booking",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="payments",
    )
    gym_pass = models.ForeignKey(
        "facilities.GymDayPass",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="payments",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="KES")
    provider = models.CharField(max_length=24, choices=Provider.choices)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.INITIATED, db_index=True
    )
    phone = models.CharField(max_length=32, blank=True)
    provider_reference = models.CharField(max_length=120, blank=True, db_index=True)
    checkout_request_id = models.CharField(max_length=120, blank=True, db_index=True)
    merchant_request_id = models.CharField(max_length=120, blank=True)
    idempotency_key = models.CharField(
        max_length=80, unique=True, null=True, blank=True
    )
    failure_code = models.CharField(max_length=40, blank=True)
    failure_message = models.CharField(max_length=255, blank=True)
    raw_request = models.JSONField(default=dict, blank=True)
    raw_response = models.JSONField(default=dict, blank=True)
    redirect_url = models.URLField(max_length=500, blank=True)
    requires_review = models.BooleanField(
        default=False,
        help_text="Set when money arrived after the booking or day pass was no longer payable.",
    )
    review_reason = models.CharField(max_length=255, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    refunded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["booking", "status"]),
            models.Index(fields=["provider", "provider_reference"]),
        ]

    def __str__(self) -> str:
        return f"{self.reference} · {self.get_provider_display()} · {self.status}"

    @property
    def is_successful(self) -> bool:
        return self.status == self.Status.SUCCEEDED


class PaymentWebhookEvent(models.Model):
    provider = models.CharField(max_length=24)
    event_id = models.CharField(max_length=160)
    signature_valid = models.BooleanField(default=False)
    payload = models.JSONField(default=dict)
    processed = models.BooleanField(default=False)
    error = models.TextField(blank=True)
    received_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-received_at",)
        constraints = [
            models.UniqueConstraint(
                fields=("provider", "event_id"), name="unique_webhook_event"
            )
        ]

    def __str__(self) -> str:
        return f"{self.provider}:{self.event_id}"
