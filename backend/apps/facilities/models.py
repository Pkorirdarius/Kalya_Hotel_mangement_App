from decimal import Decimal

from django.db import models

from apps.common.models import TimeStampedModel


class MenuItem(TimeStampedModel):
    class Venue(models.TextChoices):
        RESTAURANT = "restaurant", "Restaurant"
        COFFEE = "coffee", "Coffee shop"

    venue = models.CharField(max_length=20, choices=Venue.choices)
    category = models.CharField(max_length=80, blank=True)
    name_en = models.CharField(max_length=120)
    name_sw = models.CharField(max_length=120, blank=True)
    description_en = models.TextField(blank=True)
    description_sw = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    image = models.URLField(max_length=500, blank=True)
    active = models.BooleanField(default=True)
    sort_order = models.PositiveSmallIntegerField(default=0)
    needs_confirmation = models.BooleanField(
        default=True, help_text="Price or description still needs hotel confirmation."
    )

    class Meta:
        ordering = ("venue", "sort_order", "id")

    def __str__(self) -> str:
        return f"{self.name_en} ({self.get_venue_display()})"


class TableBooking(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        DECLINED = "declined", "Declined"
        CANCELLED = "cancelled", "Cancelled"

    reference = models.CharField(max_length=20, unique=True, db_index=True)
    date = models.DateField()
    time = models.TimeField()
    party_size = models.PositiveSmallIntegerField()
    first_name = models.CharField(max_length=80)
    last_name = models.CharField(max_length=80)
    phone = models.CharField(max_length=32)
    email = models.EmailField(blank=True)
    occasion = models.CharField(max_length=40, blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True
    )
    escalated_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        "accounts.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="table_bookings_created",
    )

    class Meta:
        ordering = ("date", "time", "-created_at")
        indexes = [models.Index(fields=["date", "time", "status"])]

    def __str__(self) -> str:
        return f"{self.reference} · {self.date} {self.time:%H:%M} · {self.party_size}"

    @property
    def guest_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()


class ConferenceEnquiry(TimeStampedModel):
    class Session(models.TextChoices):
        BREAKFAST = "breakfast", "Breakfast meeting"
        HALF_DAY = "half_day", "Half day"
        FULL_DAY = "full_day", "Full day"

    class Layout(models.TextChoices):
        CLASSROOM = "classroom", "Classroom"
        BOARDROOM = "boardroom", "Boardroom"
        USHAPE = "ushape", "U-shape"
        THEATRE = "theatre", "Theatre"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        DECLINED = "declined", "Declined"
        CANCELLED = "cancelled", "Cancelled"

    reference = models.CharField(max_length=20, unique=True, db_index=True)
    date = models.DateField()
    session = models.CharField(max_length=20, choices=Session.choices)
    people = models.PositiveSmallIntegerField()
    layout = models.CharField(max_length=20, choices=Layout.choices)
    catering = models.JSONField(default=list, blank=True)
    first_name = models.CharField(max_length=80)
    last_name = models.CharField(max_length=80)
    company = models.CharField(max_length=120, blank=True)
    email = models.EmailField()
    phone = models.CharField(max_length=32)
    notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True
    )
    escalated_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        "accounts.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="conference_enquiries_created",
    )

    class Meta:
        ordering = ("date", "-created_at")
        indexes = [models.Index(fields=["date", "session", "status"])]

    def __str__(self) -> str:
        return f"{self.reference} · {self.date} · {self.get_session_display()}"

    @property
    def guest_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()


class ConferenceBlock(TimeStampedModel):
    date = models.DateField()
    session = models.CharField(
        max_length=20,
        choices=ConferenceEnquiry.Session.choices,
        default=ConferenceEnquiry.Session.FULL_DAY,
    )
    reason = models.CharField(max_length=200, blank=True)
    created_by = models.ForeignKey(
        "accounts.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="conference_blocks",
    )

    class Meta:
        ordering = ("date", "session")
        constraints = [
            models.UniqueConstraint(
                fields=("date", "session"), name="unique_conference_block"
            )
        ]

    def __str__(self) -> str:
        return f"{self.date} · {self.get_session_display()} blocked"


class GymDayPass(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING_PAYMENT = "pending_payment", "Pending payment"
        PENDING_CONFIRMATION = "pending_confirmation", "Pending confirmation"
        CONFIRMED = "confirmed", "Confirmed"
        CANCELLED = "cancelled", "Cancelled"
        EXPIRED = "expired", "Expired"

    class PaymentMethod(models.TextChoices):
        MPESA = "mpesa", "M-Pesa"
        CARD = "card", "Card"
        RECEPTION = "reception", "Pay at reception"

    reference = models.CharField(max_length=20, unique=True, db_index=True)
    date = models.DateField()
    full_name = models.CharField(max_length=120)
    phone = models.CharField(max_length=32)
    email = models.EmailField(blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices)
    status = models.CharField(
        max_length=24,
        choices=Status.choices,
        default=Status.PENDING_PAYMENT,
        db_index=True,
    )
    qr_token = models.UUIDField(null=True, blank=True, unique=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    payment_reference = models.CharField(max_length=80, blank=True)
    escalated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("date", "-created_at")
        indexes = [models.Index(fields=["date", "status"])]

    def __str__(self) -> str:
        return f"{self.reference} · {self.full_name} · {self.date}"


class GymMembershipEnquiry(TimeStampedModel):
    class Status(models.TextChoices):
        NEW = "new", "New"
        CONTACTED = "contacted", "Contacted"
        CLOSED = "closed", "Closed"

    full_name = models.CharField(max_length=120)
    phone = models.CharField(max_length=32)
    email = models.EmailField(blank=True)
    message = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.NEW, db_index=True
    )

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"{self.full_name} · {self.phone}"
