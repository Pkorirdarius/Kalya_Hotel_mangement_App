"""Dry-run or apply the hotel's data-retention policy.

Audit and delivery records are business evidence, so old rows are anonymised
rather than deleted. Form-guard rows contain no personal data and are pruned.
Nothing is written unless ``--apply`` is passed.
"""

from __future__ import annotations

import logging
from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandParser
from django.utils import timezone

from apps.common.audit import record_audit
from apps.common.logging import redact_for_logging
from apps.common.models import AuditLog, FormGuardEvent, HotelSetting
from apps.notifications.models import NotificationLog

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Report or apply retention; anonymise audit/delivery records by default."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Write changes. Without this flag the command only reports counts.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Explicitly report counts without writing (the default).",
        )
        parser.add_argument(
            "--months",
            type=int,
            default=None,
            help="Override HotelSetting.data_retention_months for this run.",
        )
        parser.add_argument("--form-guard-months", type=int, default=None)
        parser.add_argument("--audit-months", type=int, default=None)
        parser.add_argument("--notifications-months", type=int, default=None)

    def handle(self, *args, **options) -> None:
        apply = options["apply"] and not options["dry_run"]
        if apply and not settings.RETENTION_APPLY_ENABLED:
            self.stderr.write(
                "Retention writes are disabled. Run the dry run now; set "
                "RETENTION_APPLY_ENABLED=true only after hotel approval to use --apply."
            )
            return
        default_months = options["months"]
        if default_months is None:
            default_months = HotelSetting.load().data_retention_months
        if default_months <= 0:
            self.stderr.write("Retention period must be greater than zero months.")
            return

        months = {
            name: options[name] if options[name] is not None else default_months
            for name in ("form_guard_months", "audit_months", "notifications_months")
        }
        if any(value <= 0 for value in months.values()):
            self.stderr.write("Every per-model retention period must be positive.")
            return

        now = timezone.now()
        cutoffs = {
            name: now - timedelta(days=30 * value) for name, value in months.items()
        }
        mode = "apply" if apply else "dry-run"
        prefix = self.style.WARNING("[dry-run]") if not apply else self.style.SUCCESS("[apply]")

        guard_qs = FormGuardEvent.objects.filter(
            created_at__lt=cutoffs["form_guard_months"]
        )
        guard_count = guard_qs.count()
        self.stdout.write(
            f"{prefix} FormGuardEvent: {guard_count} rows older than "
            f"{months['form_guard_months']} months would be deleted"
        )
        if apply:
            guard_qs.delete()

        audit_qs = AuditLog.objects.filter(created_at__lt=cutoffs["audit_months"])
        audit_count = audit_qs.count()
        self.stdout.write(
            f"{prefix} AuditLog: {audit_count} rows older than "
            f"{months['audit_months']} months would be anonymised"
        )
        if apply:
            for row in audit_qs.iterator():
                row.actor = None
                row.ip_address = None
                row.request_id = ""
                row.metadata = redact_for_logging(row.metadata or {})
                row.save(
                    update_fields=("actor", "ip_address", "request_id", "metadata")
                )

        notification_qs = NotificationLog.objects.filter(
            created_at__lt=cutoffs["notifications_months"]
        )
        notification_count = notification_qs.count()
        self.stdout.write(
            f"{prefix} NotificationLog: {notification_count} rows older than "
            f"{months['notifications_months']} months would be anonymised"
        )
        if apply:
            notification_qs.update(recipient="redacted", subject="", error="")

        summary = {
            "mode": mode,
            "months": months,
            "form_guard_deleted": guard_count,
            "audit_anonymised": audit_count,
            "notifications_anonymised": notification_count,
        }
        logger.info("retention run finished", extra=summary)
        if apply:
            record_audit(
                "privacy.retention.applied",
                entity_type="retention",
                metadata=summary,
            )
            self.stdout.write(self.style.SUCCESS("Retention applied."))
        else:
            self.stdout.write(
                "Dry run only; pass --apply to write changes."
            )
