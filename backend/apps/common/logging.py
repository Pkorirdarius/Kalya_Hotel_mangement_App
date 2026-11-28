"""Logging helpers.

The default console format stays human-readable. Environments that ship logs to
an aggregator can set ``LOG_FORMAT=json`` to get one JSON object per record with
request IDs and redacted structured extras.
"""

from __future__ import annotations

import json
import logging
import re
from collections.abc import Mapping
from typing import Any

from .context import get_request_id

# Keys that must never appear in an exported log record. Values under these
# keys are replaced before the record is serialised.
SENSITIVE_LOG_KEYS = frozenset(
    {
        "authorization",
        "card",
        "card_number",
        "consent",
        "cvv",
        "email",
        "ip",
        "ip_address",
        "password",
        "passport",
        "phone",
        "recipient",
        "secret",
        "token",
    }
)

_EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
_LONG_NUMBER_RE = re.compile(r"(?<!\d)\d{12,19}(?!\d)")

# LogRecord attributes plus the ones our formatter adds itself. Everything else
# is treated as caller-supplied structured context.
_STANDARD_RECORD_KEYS = frozenset(
    {
        "args",
        "asctime",
        "context",
        "created",
        "exc_info",
        "exc_text",
        "filename",
        "funcName",
        "levelname",
        "levelno",
        "lineno",
        "module",
        "msecs",
        "message",
        "msg",
        "name",
        "pathname",
        "process",
        "processName",
        "relativeCreated",
        "request_id",
        "stack_info",
        "taskName",
        "thread",
        "threadName",
    }
)


class RequestIDFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = get_request_id() or "-"
        return True


def redact_text(value: str) -> str:
    """Remove obvious identifiers from free-form text used in log messages."""
    value = _EMAIL_RE.sub("[redacted-email]", value)
    return _LONG_NUMBER_RE.sub("[redacted-number]", value)


def redact_for_logging(value: Any) -> Any:
    """Recursively redact sensitive keys and obvious identifiers."""
    if isinstance(value, Mapping):
        redacted: dict[str, Any] = {}
        for key, item in value.items():
            normalised = str(key).lower()
            if normalised in SENSITIVE_LOG_KEYS or any(
                word in normalised for word in ("password", "secret", "token")
            ):
                redacted[str(key)] = "[redacted]"
            else:
                redacted[str(key)] = redact_for_logging(item)
        return redacted
    if isinstance(value, (list, tuple)):
        return [redact_for_logging(item) for item in value]
    if isinstance(value, str):
        return redact_text(value)
    return value


class SafeJSONFormatter(logging.Formatter):
    """One JSON object per record, without personal data in structured extras."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "request_id": getattr(record, "request_id", None) or "-",
            "message": redact_text(record.getMessage()),
        }
        extra = {
            key: value
            for key, value in record.__dict__.items()
            if key not in _STANDARD_RECORD_KEYS and not key.startswith("_")
        }
        if extra:
            payload["context"] = redact_for_logging(extra)
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        if record.stack_info:
            payload["stack"] = self.formatStack(record.stack_info)
        return json.dumps(payload, default=str, sort_keys=True)
