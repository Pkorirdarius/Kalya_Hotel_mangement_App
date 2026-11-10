from django.conf import settings
from django.db import models


class DeskAction(models.Model):
    """Audit trail for front desk confirm/decline with a short undo window."""

    class Entity(models.TextChoices):
        BOOKING = "booking", "Room booking"
        TABLE = "table_booking", "Table booking"
        CONFERENCE = "conference_enquiry", "Conference enquiry"
        GYM = "gym_pass", "Gym day pass"

    class Action(models.TextChoices):
        CONFIRM = "confirm", "Confirm"
        DECLINE = "decline", "Decline"
        UNDO = "undo", "Undo"

    entity_type = models.CharField(max_length=32, choices=Entity.choices)
    entity_id = models.PositiveBigIntegerField()
    action = models.CharField(max_length=16, choices=Action.choices)
    previous_status = models.CharField(max_length=32)
    new_status = models.CharField(max_length=32)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="desk_actions",
    )
    undo_deadline = models.DateTimeField(null=True, blank=True)
    undone_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [models.Index(fields=["entity_type", "entity_id", "-created_at"])]

    def __str__(self) -> str:
        return f"{self.entity_type}:{self.entity_id} {self.action}"
