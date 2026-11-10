from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from apps.common.models import TimeStampedModel


class RoomType(TimeStampedModel):
    """A sellable room category.

    Individual room numbers are deliberately not modelled. The hotel sells by
    category and the inventory engine counts category availability. This keeps
    the front desk workflow simple and matches how the website allots rooms.
    """

    slug = models.SlugField(max_length=80, unique=True)
    name_en = models.CharField(max_length=120)
    name_sw = models.CharField(max_length=120, blank=True)
    description_en = models.TextField(blank=True)
    description_sw = models.TextField(blank=True)
    sleeps = models.PositiveSmallIntegerField(default=2)
    size_sqm = models.PositiveSmallIntegerField(default=30)
    bed_en = models.CharField(max_length=120, blank=True)
    bed_sw = models.CharField(max_length=120, blank=True)

    total_rooms = models.PositiveSmallIntegerField(
        default=0, help_text="Physical rooms of this type in the hotel."
    )
    website_allotment = models.PositiveSmallIntegerField(
        default=0,
        help_text=(
            "Rooms released for sale on the website. Other rooms may be sold "
            "through online travel agents. Zero means no website inventory."
        ),
    )

    image = models.URLField(max_length=500, blank=True)
    images = models.JSONField(
        default=list,
        blank=True,
        help_text='List of {"src": "...", "alt": "..."} objects.',
    )
    amenities = models.JSONField(
        default=list,
        blank=True,
        help_text='List of {"icon": "...", "label_en": "...", "label_sw": "..."}.',
    )
    highlights = models.JSONField(default=list, blank=True)
    sort_order = models.PositiveSmallIntegerField(default=0)
    active = models.BooleanField(default=True)
    needs_confirmation = models.BooleanField(
        default=True,
        help_text="Placeholder copy/price; hide or review before launch.",
    )

    class Meta:
        ordering = ("sort_order", "name_en")
        verbose_name = "Room type"
        verbose_name_plural = "Room types"

    def __str__(self) -> str:
        return self.name_en

    @property
    def online_inventory(self) -> int:
        return max(0, min(self.website_allotment, self.total_rooms))

    @property
    def from_price(self):
        plan = self.rate_plans.filter(active=True).order_by("sort_order", "id").first()
        if plan is None:
            return None
        return plan.weekday_rate


class RoomBlock(TimeStampedModel):
    """A date range where a number of rooms are withheld from sale."""

    room_type = models.ForeignKey(
        RoomType, on_delete=models.CASCADE, related_name="blocks"
    )
    start_date = models.DateField()
    end_date = models.DateField(help_text="Exclusive checkout date.")
    quantity = models.PositiveSmallIntegerField(default=1)
    reason = models.CharField(max_length=200, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="room_blocks",
    )

    class Meta:
        ordering = ("start_date", "room_type")
        indexes = [
            models.Index(fields=["room_type", "start_date", "end_date"]),
        ]

    def __str__(self) -> str:
        return f"{self.room_type} blocked {self.start_date} → {self.end_date}"

    def clean(self):
        if self.end_date <= self.start_date:
            raise ValidationError({"end_date": "End date must be after start date."})
        if self.room_type_id and self.quantity > self.room_type.total_rooms:
            raise ValidationError(
                {"quantity": "Cannot block more rooms than the room type has."}
            )
