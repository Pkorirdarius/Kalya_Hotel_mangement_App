import json
import logging
import sys
import types
from types import SimpleNamespace

from apps.common import monitoring
from apps.common.logging import SafeJSONFormatter, redact_for_logging
from apps.common.middleware import RequestIDMiddleware


def test_redaction_hides_sensitive_keys_and_identifiers():
    value = {
        "username": "staff",
        "email": "guest@example.com",
        "nested": {"token": "abc123", "safe": "call 0712345678"},
        "items": [{"password": "secret"}, "card 4111111111111111"],
    }

    redacted = redact_for_logging(value)

    assert redacted["username"] == "staff"
    assert redacted["email"] == "[redacted]"
    assert redacted["nested"]["token"] == "[redacted]"
    assert "@example.com" not in json.dumps(redacted)
    assert redacted["items"][0]["password"] == "[redacted]"
    assert "4111111111111111" not in json.dumps(redacted)


def test_json_formatter_emits_one_safe_object_per_record():
    formatter = SafeJSONFormatter()
    record = logging.LogRecord(
        "apps.test",
        logging.INFO,
        __file__,
        1,
        "guest@example.com signed in",
        (),
        None,
    )
    record.request_id = "req-1"
    record.details = {"email": "guest@example.com", "count": 2}

    payload = json.loads(formatter.format(record))

    assert payload["request_id"] == "req-1"
    assert payload["level"] == "INFO"
    assert "guest@example.com" not in payload["message"]
    assert payload["context"]["details"]["email"] == "[redacted]"
    assert payload["context"]["details"]["count"] == 2


def test_monitoring_is_off_without_a_dsn():
    monitoring.reset_monitoring()
    assert monitoring.configure_monitoring() is False
    assert monitoring.is_configured() is False


def test_missing_sdk_keeps_reporting_disabled(monkeypatch, caplog):
    monitoring.reset_monitoring()
    monkeypatch.delitem(sys.modules, "sentry_sdk", raising=False)

    with caplog.at_level(logging.WARNING, logger="apps.common.monitoring"):
        result = monitoring.configure_monitoring(dsn="https://key@example.test/1")

    assert result is False
    assert monitoring.is_configured() is False
    assert "sentry-sdk is not installed" in caplog.text
    monitoring.reset_monitoring()


def test_dsn_enables_sentry_hook_without_default_pii(monkeypatch):
    monitoring.reset_monitoring()
    calls = []
    fake_sdk = types.ModuleType("sentry_sdk")
    fake_sdk.init = lambda **kwargs: calls.append(kwargs)
    monkeypatch.setitem(sys.modules, "sentry_sdk", fake_sdk)

    assert (
        monitoring.configure_monitoring(
            dsn="https://key@example.test/1",
            release="rc1",
            environment="staging",
        )
        is True
    )
    assert calls[0]["dsn"] == "https://key@example.test/1"
    assert calls[0]["release"] == "rc1"
    assert calls[0]["environment"] == "staging"
    assert calls[0]["send_default_pii"] is False

    monitoring.reset_monitoring()


def test_middleware_uses_the_monitoring_hook(monkeypatch):
    captured = []
    monkeypatch.setattr(
        "apps.common.middleware.capture_exception",
        lambda exception, **context: captured.append((exception, context)),
    )
    middleware = RequestIDMiddleware(lambda request: None)
    request = SimpleNamespace(
        META={}, method="GET", path="/api/v1/booking/", request_id="req-2"
    )
    exception = ValueError("boom")

    assert middleware.process_exception(request, exception) is None
    assert captured == [
        (
            exception,
            {
                "request_id": "req-2",
                "path": "/api/v1/booking/",
                "method": "GET",
            },
        )
    ]
