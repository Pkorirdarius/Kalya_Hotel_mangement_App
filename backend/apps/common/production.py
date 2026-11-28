"""Fail-fast checks for production hotel contact data.

The checks are deliberately in a small pure module so they can be tested
without reloading Django settings. ``config.settings.prod`` calls this before
the app starts; staging and development are unaffected.
"""

from __future__ import annotations

from collections.abc import Mapping

from django.core.exceptions import ImproperlyConfigured

_PLACEHOLDER_KEYS = ("PHONE", "PHONE_HREF", "EMAIL", "ADDRESS", "MAP_QUERY")


def enforce_production_hotel_settings(
    *,
    values: Mapping[str, str],
    placeholders: Mapping[str, str],
) -> None:
    """Raise when a known placeholder is still published to guests."""

    problems: list[str] = []
    for key in _PLACEHOLDER_KEYS:
        value = (values.get(key) or "").strip()
        placeholder = (placeholders.get(key) or "").strip()
        if not value or (placeholder and value.casefold() == placeholder.casefold()):
            problems.append(f"HOTEL_{key}")

    if problems:
        raise ImproperlyConfigured(
            "Replace these unconfirmed hotel placeholders before production: "
            + ", ".join(problems)
            + ". See docs/LAUNCH-CHECKLIST.md."
        )
