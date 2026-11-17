from __future__ import annotations

import pytest

from apps.content.models import PolicyPage

pytestmark = pytest.mark.django_db


def make_policy(**overrides):
    values = {
        "slug": "privacy",
        "title_en": "Privacy notice",
        "title_sw": "Taarifa ya faragha",
        "body_en": "First paragraph.\n\nSecond paragraph.",
        "body_sw": "Aya ya kwanza.\n\nAya ya pili.",
        "version": "2026-11-draft",
        "active": True,
        "needs_confirmation": True,
    }
    values.update(overrides)
    return PolicyPage.objects.create(**values)


def test_public_policy_endpoint_returns_both_languages(api):
    make_policy()

    response = api.get("/api/v1/content/policies/privacy/")

    assert response.status_code == 200
    body = response.json()
    assert body["title_en"] == "Privacy notice"
    assert body["title_sw"] == "Taarifa ya faragha"
    assert body["body_en"].startswith("First paragraph.")
    assert body["version"] == "2026-11-draft"
    assert body["needs_confirmation"] is True


def test_unknown_policy_is_not_found(api):
    response = api.get("/api/v1/content/policies/cookies/")

    assert response.status_code == 404


def test_inactive_policy_is_not_public(api):
    make_policy(active=False)

    response = api.get("/api/v1/content/policies/privacy/")

    assert response.status_code == 404
