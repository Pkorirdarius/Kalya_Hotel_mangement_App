from datetime import timedelta
from io import StringIO

import pytest
from django.core.management import call_command
from django.utils import timezone

from apps.common.models import AuditLog, FormGuardEvent
from apps.notifications.models import NotificationLog

pytestmark = pytest.mark.django_db


def age(model, pk, days):
    model.objects.filter(pk=pk).update(
        created_at=timezone.now() - timedelta(days=days)
    )


def seed_rows():
    old_guard = FormGuardEvent.objects.create(form="booking", reason="honeypot")
    fresh_guard = FormGuardEvent.objects.create(form="contact", reason="too_fast")
    age(FormGuardEvent, old_guard.pk, 400)
    age(FormGuardEvent, fresh_guard.pk, 1)

    old_audit = AuditLog.objects.create(
        action="staff.login",
        ip_address="198.51.100.7",
        request_id="old-request",
        metadata={"email": "guest@example.com", "nested": {"token": "abc"}},
    )
    fresh_audit = AuditLog.objects.create(
        action="staff.login",
        ip_address="198.51.100.8",
        request_id="fresh-request",
        metadata={"email": "staff@example.com"},
    )
    age(AuditLog, old_audit.pk, 400)
    age(AuditLog, fresh_audit.pk, 1)

    old_notice = NotificationLog.objects.create(
        channel="email",
        kind="booking_confirmed",
        recipient="guest@example.com",
        subject="Your booking",
        error="smtp failure for guest@example.com",
    )
    fresh_notice = NotificationLog.objects.create(
        channel="email",
        kind="booking_confirmed",
        recipient="fresh@example.com",
        subject="Your booking",
        error="",
    )
    age(NotificationLog, old_notice.pk, 400)
    age(NotificationLog, fresh_notice.pk, 1)
    return (
        old_guard,
        fresh_guard,
        old_audit,
        fresh_audit,
        old_notice,
        fresh_notice,
    )


def test_retention_dry_run_reports_without_writing():
    old_guard, fresh_guard, old_audit, _, old_notice, _ = seed_rows()
    output = StringIO()

    call_command("apply_retention", months=12, dry_run=True, stdout=output)

    text = output.getvalue()
    assert "[dry-run]" in text
    assert "FormGuardEvent: 1 rows" in text
    assert "AuditLog: 1 rows" in text
    assert "NotificationLog: 1 rows" in text
    assert "pass --apply" in text
    assert FormGuardEvent.objects.filter(pk__in=[old_guard.pk, fresh_guard.pk]).count() == 2
    old_audit.refresh_from_db()
    old_notice.refresh_from_db()
    assert old_audit.ip_address is not None
    assert old_notice.recipient == "guest@example.com"


def test_apply_deletes_guard_events_and_anonymises_business_records():
    old_guard, fresh_guard, old_audit, fresh_audit, old_notice, fresh_notice = seed_rows()

    call_command("apply_retention", months=12, apply=True, stdout=StringIO())

    assert not FormGuardEvent.objects.filter(pk=old_guard.pk).exists()
    assert FormGuardEvent.objects.filter(pk=fresh_guard.pk).exists()

    old_audit.refresh_from_db()
    fresh_audit.refresh_from_db()
    assert old_audit.actor is None
    assert old_audit.ip_address is None
    assert old_audit.request_id == ""
    assert old_audit.action == "staff.login"
    assert old_audit.metadata["email"] == "[redacted]"
    assert old_audit.metadata["nested"]["token"] == "[redacted]"
    assert fresh_audit.ip_address == "198.51.100.8"
    assert fresh_audit.request_id == "fresh-request"
    assert fresh_audit.metadata["email"] == "staff@example.com"

    old_notice.refresh_from_db()
    fresh_notice.refresh_from_db()
    assert old_notice.recipient == "redacted"
    assert old_notice.subject == ""
    assert "guest@example.com" not in old_notice.error
    assert old_notice.kind == "booking_confirmed"
    assert fresh_notice.recipient == "fresh@example.com"

    assert AuditLog.objects.filter(action="privacy.retention.applied").exists()


def test_per_model_windows_can_be_overridden():
    _, _, old_audit, _, _, _ = seed_rows()
    output = StringIO()

    call_command(
        "apply_retention",
        months=12,
        audit_months=500,
        stdout=output,
    )

    assert "AuditLog: 0 rows" in output.getvalue()
    old_audit.refresh_from_db()
    assert old_audit.ip_address == "198.51.100.7"
