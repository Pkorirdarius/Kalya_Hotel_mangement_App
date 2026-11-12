from __future__ import annotations

import base64
import logging
from datetime import datetime

import requests
from django.conf import settings

from apps.common.utils import hotel_tz

from .base import BaseProvider, PaymentProviderError, ProviderResult

logger = logging.getLogger(__name__)


class MpesaDarajaProvider(BaseProvider):
    code = "mpesa"
    label = "M-Pesa"

    def _token(self) -> str:
        response = requests.get(
            f"{settings.MPESA_BASE_URL}/oauth/v1/generate",
            params={"grant_type": "client_credentials"},
            auth=(settings.MPESA_CONSUMER_KEY, settings.MPESA_CONSUMER_SECRET),
            timeout=15,
        )
        if response.status_code != 200:
            raise PaymentProviderError("M-Pesa authentication failed.")
        return response.json()["access_token"]

    def initiate(self, *, payment, phone: str = "") -> ProviderResult:
        amount = int(payment.amount)
        account_reference = settings.MPESA_ACCOUNT_REFERENCE or payment.reference
        if settings.MPESA_SIMULATE or not settings.MPESA_CONSUMER_KEY:
            checkout_id = f"SIM-{payment.reference}"
            return ProviderResult(
                ok=True,
                status="pending",
                provider_reference=checkout_id,
                checkout_request_id=checkout_id,
                message=(
                    "Sandbox M-Pesa request created. Complete it from the waiting "
                    "screen in development."
                ),
                raw_request={"simulated": True, "phone": phone, "amount": amount},
                raw_response={"CheckoutRequestID": checkout_id},
                sandbox=True,
            )

        timestamp = datetime.now(hotel_tz()).strftime("%Y%m%d%H%M%S")
        password = base64.b64encode(
            f"{settings.MPESA_SHORTCODE}{settings.MPESA_PASSKEY}{timestamp}".encode()
        ).decode()
        payload = {
            "BusinessShortCode": settings.MPESA_SHORTCODE,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": settings.MPESA_TRANSACTION_TYPE,
            "Amount": amount,
            "PartyA": phone,
            "PartyB": settings.MPESA_SHORTCODE,
            "PhoneNumber": phone,
            "CallBackURL": settings.MPESA_CALLBACK_URL,
            "AccountReference": account_reference[:12],
            "TransactionDesc": f"{settings.HOTEL['NAME']} booking"[:40],
        }
        try:
            token = self._token()
            response = requests.post(
                f"{settings.MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest",
                json=payload,
                headers={"Authorization": f"Bearer {token}"},
                timeout=20,
            )
        except requests.RequestException as exc:
            logger.warning("M-Pesa STK request failed: %s", type(exc).__name__)
            return ProviderResult(
                ok=False,
                status="failed",
                failure_code="network",
                failure_message="Could not reach M-Pesa. Please try again.",
                raw_request=payload,
            )

        body = response.json() if response.content else {}
        if response.status_code >= 400 or body.get("ResponseCode") not in (
            "0",
            0,
            None,
        ):
            return ProviderResult(
                ok=False,
                status="failed",
                failure_code=str(body.get("errorCode") or body.get("ResponseCode") or ""),
                failure_message=(
                    body.get("errorMessage")
                    or body.get("ResponseDescription")
                    or "M-Pesa rejected the request."
                ),
                raw_request=payload,
                raw_response=body,
            )

        return ProviderResult(
            ok=True,
            status="pending",
            provider_reference=body.get("CheckoutRequestID", ""),
            checkout_request_id=body.get("CheckoutRequestID", ""),
            merchant_request_id=body.get("MerchantRequestID", ""),
            message=body.get("CustomerMessage", "Check your phone to enter your PIN."),
            raw_request=payload,
            raw_response=body,
        )
