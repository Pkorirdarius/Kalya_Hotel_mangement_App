"""Cheap, server-side bot checks for public forms.

Two signals are used:

* ``website`` is a hidden field that real guests never see or fill. Any value
  marks the submission as a bot.
* ``form_started_at`` is the browser timestamp (epoch milliseconds) taken when
  the form was rendered. A submission that arrives faster than
  ``FORM_MIN_SUBMIT_SECONDS`` is treated as automated.

Neither signal is a security boundary on its own; they sit alongside the DRF
throttles. Callers must return a generic success response and perform no
writes, sends or lookups when this returns true.
"""

from __future__ import annotations

import time

from django.conf import settings

HONEYPOT_FIELD = "website"
FORM_STARTED_FIELD = "form_started_at"


def is_bot_submission(data) -> bool:
    website = data.get(HONEYPOT_FIELD)
    if website is not None and str(website).strip():
        return True

    raw_started = data.get(FORM_STARTED_FIELD)
    if raw_started in (None, ""):
        # Older clients and server-to-server callers may omit the timestamp.
        # The honeypot still applies; do not turn a missing field into a silent
        # data loss for a real guest.
        return False
    try:
        started_at = int(raw_started)
    except (TypeError, ValueError):
        return True

    threshold_ms = int(getattr(settings, "FORM_MIN_SUBMIT_SECONDS", 2)) * 1000
    elapsed_ms = int(time.time() * 1000) - started_at
    return elapsed_ms < threshold_ms
