from decimal import Decimal

from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel
from apps.rates.models import MealPlan, RatePlan
from apps.rooms.models import RoomType


class BookingStatus(models.TextChoices):
    HELD = "held", "Held"
    PENDING_PAYMENT = "pending_payment", "Pending payment"
    PENDING_CONFIRMATION = "pending_confirmation", "Pending confirmation"
    CONFIRMED = "confirmed", "Confirmed"
    DECLINED = "declined", "Declined"
    CANCELLED = "cancelled", "Cancelled"
    EXPIRED = "expired", "Expired"


# Statuses that reserve inventory. Held/pending-payment rows only reserve while
# hold_expires_at is in the future.
INVENTORY_STATUSES = (
    BookingStatus.HELD,
    BookingStatus.PENDING_PAYMENT,
    BookingStatus.PENDING_CONFIRMATION,
    BookingStatus.CONFIRMED,
)

OPEN_STATUSES = (
    BookingStatus.HELD,
    BookingStatus.PENDING_PAYMENT,
    BookingStatus.PENDING_CONFIRMATION,
)


class Booking(TimeStampedModel):
    class Source(models.TextChoices):
        WEBSITE = "website", "Website"
        STAFF = "staff", "Staff"

    reference = models.CharField(max_length=20, unique=True, db_index=True)
    client_request_id = models.CharField(
        max_length=64,
        unique=True,
        null=True,
        blank=True,
        help_text="Idempotency key supplied by the booking client.",
    )
    room_type = models.ForeignKey(
        RoomType, on_delete=models.PROTECT, related_name="bookings"
    )
    rate_plan = models.ForeignKey(
        RatePlan, on_delete=models.PROTECT, related_name="bookings"
    )
    meal_plan = models.ForeignKey(
        MealPlan, on_delete=models.PROTECT, related_name="bookings"
    )
    checkin = models.DateField()
    checkout = models.DateField()
    guests = models.PositiveSmallIntegerField(default=1)

    first_name = models.CharField(max_length=80)
    last_name = models.CharField(max_length=80)
    email = models.EmailField()
    phone = models.CharField(max_length=32)
    country = models.CharField(max_length=80, blank=True)
    notes = models.TextField(blank=True)
    language = models.CharField(max_length=2, default="en")
    consent_privacy = models.BooleanField(default=False)
    guest_ip = models.GenericIPAddressField(null=True, blank=True)

    status = models.CharField(
        max_length=32,
        choices=BookingStatus.choices,
        default=BookingStatus.HELD,
        db_index=True,
    )
    source = models.CharField(
        max_length=20, choices=Source.choices, default=Source.WEBSITE
    )
    currency = models.CharField(max_length=3, default="KES")

    accommodation_total = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00")
    )
    meal_total = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00")
    )
    discount_total = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00")
    )
    total = models.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal("0.00")
    )
    price_breakdown = models.JSONField(default=dict, blank=True)
    cancellation_cutoff_hours = models.PositiveSmallIntegerField(default=48)
    free_cancellation_until = models.DateTimeField(null=True, blank=True)

    hold_expires_at = models.DateTimeField(null=True, blank=True, db_index=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    declined_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    expired_at = models.DateTimeField(null=True, blank=True)
    escalated_at = models.DateTimeField(null=True, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="bookings_created",
    )

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["room_type", "checkin", "checkout", "status"]),
            models.Index(fields=["status", "hold_expires_at"]),
            models.Index(fields=["email"]),
            models.Index(fields=["phone"]),
        ]

    def __str__(self) -> str:
        return f"{self.reference} · {self.room_type} · {self.status}"

    @property
    def nights(self) -> int:
        return max(0, (self.checkout - self.checkin).days)

    @property
    def guest_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def is_open(self) -> bool:
        return self.status in OPEN_STATUSES

    @property
    def can_cancel(self) -> bool:
        if self.status in (
            BookingStatus.CANCELLED,
            BookingStatus.DECLINED,
            BookingStatus.EXPIRED,
        ):
            return False
        if self.status == BookingStatus.CONFIRMED and self.free_cancellation_until:
            from apps.common.utils import hotel_now

            return hotel_now() <= self.free_cancellation_until
        return self.status in OPEN_STATUSES


class BookingStatusEvent(models.Model):
    booking = models.ForeignKey(
        Booking, on_delete=models.CASCADE, related_name="status_events"
    )
    from_status = models.CharField(max_length=32, blank=True)
    to_status = models.CharField(max_length=32)
    reason = models.CharField(max_length=255, blank=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="booking_status_events",
    )
    request_id = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"{self.booking_id}: {self.from_status} → {self.to_status}"
