from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models

from apps.common.models import TimeStampedModel
from apps.rooms.models import RoomType


class RatePlan(TimeStampedModel):
    room_type = models.ForeignKey(
        RoomType, on_delete=models.CASCADE, related_name="rate_plans"
    )
    code = models.SlugField(max_length=60, default="flexible")
    name = models.CharField(max_length=120, default="Flexible rate")
    weekday_rate = models.DecimalField(max_digits=10, decimal_places=2)
    weekend_rate = models.DecimalField(max_digits=10, decimal_places=2)
    min_nights = models.PositiveSmallIntegerField(default=1)
    active = models.BooleanField(default=True)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ("room_type", "sort_order", "id")
        constraints = [
            models.UniqueConstraint(
                fields=("room_type", "code"), name="unique_rate_plan_per_room"
            )
        ]

    def __str__(self) -> str:
        return f"{self.room_type} · {self.name}"

    def clean(self):
        if self.weekend_rate < self.weekday_rate:
            raise ValidationError(
                {"weekend_rate": "Weekend rate is normally not lower than weekday."}
            )


class Season(TimeStampedModel):
    """Date-range override for a rate plan. End date is inclusive."""

    rate_plan = models.ForeignKey(
        RatePlan, on_delete=models.CASCADE, related_name="seasons"
    )
    name = models.CharField(max_length=120)
    start_date = models.DateField()
    end_date = models.DateField()
    weekday_rate = models.DecimalField(max_digits=10, decimal_places=2)
    weekend_rate = models.DecimalField(max_digits=10, decimal_places=2)
    priority = models.PositiveSmallIntegerField(
        default=0, help_text="Higher priority wins when seasons overlap."
    )
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ("-priority", "start_date")
        indexes = [models.Index(fields=["rate_plan", "start_date", "end_date"])]

    def __str__(self) -> str:
        return f"{self.name} ({self.start_date} → {self.end_date})"

    def clean(self):
        if self.end_date < self.start_date:
            raise ValidationError({"end_date": "End date cannot be before start date."})
        if self.weekend_rate < self.weekday_rate:
            raise ValidationError(
                {"weekend_rate": "Weekend rate is normally not lower than weekday."}
            )


class LongStayDiscount(TimeStampedModel):
    rate_plan = models.ForeignKey(
        RatePlan, on_delete=models.CASCADE, related_name="discounts"
    )
    min_nights = models.PositiveSmallIntegerField()
    percent = models.DecimalField(
        max_digits=5, decimal_places=2, help_text="Percentage off accommodation."
    )
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ("-min_nights",)
        constraints = [
            models.UniqueConstraint(
                fields=("rate_plan", "min_nights"),
                name="unique_discount_nights_per_plan",
            )
        ]

    def __str__(self) -> str:
        return f"{self.min_nights}+ nights: {self.percent}% off"

    def clean(self):
        if not (Decimal("0") < self.percent <= Decimal("100")):
            raise ValidationError({"percent": "Enter a percentage between 0 and 100."})


class MealPlan(TimeStampedModel):
    ROOM_ONLY = "room_only"
    BREAKFAST = "breakfast"
    DINNER = "dinner"
    HALF_BOARD = "half_board"
    FULL_BOARD = "full_board"

    code = models.SlugField(max_length=40, unique=True)
    name_en = models.CharField(max_length=120)
    name_sw = models.CharField(max_length=120, blank=True)
    description_en = models.CharField(max_length=255, blank=True)
    description_sw = models.CharField(max_length=255, blank=True)
    supplement_per_person_per_night = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0.00")
    )
    active = models.BooleanField(default=True)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ("sort_order", "id")

    def __str__(self) -> str:
        return self.name_en
