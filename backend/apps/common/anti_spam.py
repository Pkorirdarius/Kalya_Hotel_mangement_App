"""Cheap, server-side bot checks for public forms.

Two signals are used:

* ``website`` is a hidden field that real guests never see or fill. Any value
  marks the submission as a bot.
* ``form_started_at`` is the browser timestamp (epoch milliseconds) taken when
  the form was rendered. A submission that arrives faster than
  ``FORM_MIN_SUBMIT_SECONDS`` is suspicious.

The two signals are handled differently by the views:

* Newsletter and contact are low-risk writes, so a suspected bot receives the
  normal success shape and nothing is stored, sent or looked up.
* Booking, table booking, conference, gym, payment and booking lookup keep the
  honeypot as a bot-only signal, but a *too fast* submission is answered with a
  polite retryable error instead of a fake success. A real guest whose
  password manager or browser autofilled the form can simply press submit
  again; nothing is silently lost.

Every block is counted in ``FormGuardEvent`` (form, reason, timestamp; no
personal data) so staff can spot false positives in Django admin or through
``GET /api/v1/staff/common/form-guard/summary/``.
"""

from __future__ import annotations

import logging
import time

from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

HONEYPOT_FIELD = "website"
FORM_STARTED_FIELD = "form_started_at"

# Reasons returned by ``blocked_reason``. Kept as plain strings so they can be
# stored and grouped without importing the model here.
HONEYPOT = "honeypot"
TOO_FAST = "too_fast"
BAD_TIMESTAMP = "bad_timestamp"


def blocked_reason(data) -> str | None:
    """Return why a submission looks automated, or ``None`` for a real guest."""

    website = data.get(HONEYPOT_FIELD)
    if website is not None and str(website).strip():
        return HONEYPOT

    raw_started = data.get(FORM_STARTED_FIELD)
    if raw_started in (None, ""):
        # Older clients and server-to-server callers may omit the timestamp.
        # The honeypot still applies; do not turn a missing field into a silent
        # data loss for a real guest.
        return None
    try:
        started_at = int(raw_started)
    except (TypeError, ValueError):
        return BAD_TIMESTAMP

    threshold_ms = max(0, int(getattr(settings, "FORM_MIN_SUBMIT_SECONDS", 2))) * 1000
    now_ms = int(time.time() * 1000)
    elapsed_ms = now_ms - started_at
    if elapsed_ms < 0:
        # A clock that is ahead of the server (common on phones and in browser
        # autofill/password-manager flows) must not be treated as a bot.
        return None
    if elapsed_ms < threshold_ms:
        return TOO_FAST
    return None


def is_bot_submission(data) -> bool:
    """Backwards-compatible predicate used by tests and simple callers."""

    return blocked_reason(data) is not None


RETRY_MESSAGE = "Please try again in a moment."


def _error_response(code: str, message: str, status_code: int):
    from rest_framework.response import Response

    from .context import get_request_id

    request_id = get_request_id()
    response = Response(
        {
            "error": {
                "code": code,
                "message": message,
                "fields": None,
                "request_id": request_id,
            }
        },
        status=status_code,
    )
    if request_id:
        response["X-Request-ID"] = request_id
    return response


def too_fast_response():
    """Polite retryable answer for a write-heavy form submitted too fast.

    Returning the response directly (instead of raising) keeps the
    ``FormGuardEvent`` count inside the request transaction, so staff can see
    exactly how often a real guest hits the guard.
    """

    from rest_framework import status

    return _error_response(TOO_FAST, RETRY_MESSAGE, status.HTTP_400_BAD_REQUEST)


def not_found_response(message: str):
    """Generic not-found answer that still records the block.

    Used by the payment endpoints for a honeypot hit: raising ``NotFound``
    would roll the ``FormGuardEvent`` row back under ``ATOMIC_REQUESTS``.
    """

    from rest_framework import status

    return _error_response("not_found", message, status.HTTP_404_NOT_FOUND)


def record_blocked_submission(form: str, reason: str) -> None:
    """Count a blocked submission without storing any guest data.

    Failures are logged and swallowed: a monitoring problem must never turn a
    bot response into a 500 for a real guest.
    """

    logger.info(
        "form_guard.blocked form=%s reason=%s at=%s",
        form,
        reason,
        timezone.now().isoformat(),
    )
    try:
        from .models import FormGuardEvent

        FormGuardEvent.objects.create(form=form, reason=reason)
    except Exception:  # pragma: no cover - database failure only
        logger.exception("form_guard.record_failed form=%s reason=%s", form, reason)
