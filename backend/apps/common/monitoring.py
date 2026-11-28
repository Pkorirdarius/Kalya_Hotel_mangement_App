"""Opt-in error reporting hook.

Nothing here opens a network connection unless ``SENTRY_DSN`` is configured.
The optional dependency is deliberately not required for local development or
CI; when set but unavailable we keep serving requests and emit a safe log line.
"""

from __future__ import annotations

import logging
from typing import Any

from .logging import redact_for_logging

logger = logging.getLogger(__name__)

_configured = False


def configure_monitoring(
    *, dsn: str = "", release: str = "", environment: str = ""
) -> bool:
    """Initialise Sentry-compatible reporting; return whether it is active."""
    global _configured

    if _configured:
        return True
    if not dsn:
        return False

    try:
        import sentry_sdk
    except ImportError:
        logger.warning(
            "SENTRY_DSN is set but sentry-sdk is not installed; "
            "remote error reporting stays disabled"
        )
        return False

    sentry_sdk.init(
        dsn=dsn,
        release=release or None,
        environment=environment or None,
        traces_sample_rate=0.0,
        send_default_pii=False,
    )
    _configured = True
    logger.info("Remote error reporting configured")
    return True


def reset_monitoring() -> None:
    """Testing helper: forget the cached configuration state."""
    global _configured
    _configured = False


def is_configured() -> bool:
    return _configured


def capture_exception(exception: BaseException, **context: Any) -> None:
    """Report an exception safely, whether or not remote reporting is enabled."""
    safe_context = redact_for_logging(context)
    if _configured:
        import sentry_sdk

        with sentry_sdk.push_scope() as scope:
            for key, value in safe_context.items():
                scope.set_extra(str(key), value)
            sentry_sdk.capture_exception(exception)
        return

    logger.error(
        "Unhandled exception (local log only)",
        extra={"monitoring_context": safe_context},
        exc_info=(type(exception), exception, exception.__traceback__),
    )
