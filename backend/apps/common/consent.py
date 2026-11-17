from __future__ import annotations

import hashlib

from .models import ConsentRecord, HotelSetting


def record_consent(
    *,
    scope: str,
    subject: str = "",
    reference: str = "",
    language: str = "en",
    text: str = "",
) -> ConsentRecord:
    """Store a consent event with the policy version that was live at the time."""

    settings_obj = HotelSetting.load()
    return ConsentRecord.objects.create(
        scope=scope,
        subject=subject.strip(),
        reference=reference.strip(),
        language=language if language in ("en", "sw") else "en",
        policy_version=settings_obj.privacy_notice_version,
        policy_url=settings_obj.privacy_notice_url,
        text_hash=hashlib.sha256(text.encode("utf-8")).hexdigest() if text else "",
    )
