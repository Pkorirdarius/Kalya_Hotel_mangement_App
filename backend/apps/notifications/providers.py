from __future__ import annotations

import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class BaseSmsProvider:
    def send(self, *, recipient: str, message: str) -> tuple[bool, str]:
        raise NotImplementedError


class StubSmsProvider(BaseSmsProvider):
    def send(self, *, recipient: str, message: str) -> tuple[bool, str]:
        logger.info("SMS stub: message accepted for %s", recipient)
        return True, "stub"


class AfricaTalkingProvider(BaseSmsProvider):
    def send(self, *, recipient: str, message: str) -> tuple[bool, str]:
        if not (settings.SMS_USERNAME and settings.SMS_API_KEY):
            return False, "SMS credentials are not configured."
        try:
            response = requests.post(
                "https://api.africastalking.com/version1/messaging",
                headers={
                    "apiKey": settings.SMS_API_KEY,
                    "Accept": "application/json",
                },
                data={
                    "username": settings.SMS_USERNAME,
                    "to": recipient,
                    "message": message,
                    "from": settings.SMS_SENDER_ID,
                },
                timeout=15,
            )
        except requests.RequestException as exc:
            logger.warning("SMS request failed: %s", type(exc).__name__)
            return False, "Could not reach the SMS provider."
        if response.status_code >= 400:
            return False, f"SMS provider returned {response.status_code}."
        return True, "sent"


def get_sms_provider() -> BaseSmsProvider:
    if settings.SMS_PROVIDER == "africastalking" and settings.SMS_SEND_ENABLED:
        return AfricaTalkingProvider()
    return StubSmsProvider()
