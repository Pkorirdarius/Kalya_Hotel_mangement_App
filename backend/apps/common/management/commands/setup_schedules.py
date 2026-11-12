"""Install the recurring hotel background jobs.

Run once after deploy:

    python manage.py setup_schedules

The jobs use the django-q2 ORM broker so no Redis instance is required.
"""

from __future__ import annotations

from django.core.management.base import BaseCommand
from django.utils import timezone

try:
    from django_q.models import Schedule
except ImportError:  # pragma: no cover - django-q2 is a hard dependency
    Schedule = None


SCHEDULES = [
    {
        "name": "Expire stale booking holds",
        "func": "apps.bookings.services.bookings.expire_stale_holds",
        "schedule_type": "I",
        "minutes": 5,
    },
    {
        "name": "Escalate overdue front desk items",
        "func": "apps.frontdesk.services.escalate_overdue_items",
        "schedule_type": "I",
        "minutes": 1,
    },
    {
        "name": "Send tomorrow's arrival reminders",
        "func": "apps.notifications.reminders.send_arrival_reminders",
        "schedule_type": "D",
    },
]


class Command(BaseCommand):
    help = "Create or update the recurring django-q2 schedules."

    def handle(self, *args, **options):
        if Schedule is None:
            self.stderr.write("django-q2 is not installed.")
            return

        for item in SCHEDULES:
            schedule, created = Schedule.objects.update_or_create(
                name=item["name"],
                defaults={
                    "func": item["func"],
                    "schedule_type": item["schedule_type"],
                    "minutes": item.get("minutes"),
                    "repeats": -1,
                    "next_run": timezone.now(),
                },
            )
            state = "created" if created else "updated"
            self.stdout.write(f"{state}: {schedule.name} ({schedule.func})")

        self.stdout.write(
            self.style.SUCCESS(
                "Schedules installed. Run `python manage.py qcluster` to process jobs."
            )
        )
