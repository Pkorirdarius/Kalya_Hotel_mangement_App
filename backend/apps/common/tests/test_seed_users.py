"""Seeding must never leave demo/staff accounts behind by accident.

The launch definition of done requires that demo users cannot exist in
production. Two layers enforce it:

* ``seed_hotel`` only creates demo accounts with ``--demo-users`` *and*
  ``ALLOW_DEMO_USERS=true`` (default false, forced false in production).
* A plain seed creates no accounts at all; staff users are created by a named
  administrator.
"""

from __future__ import annotations

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import override_settings

from apps.accounts.models import User

pytestmark = pytest.mark.django_db


def test_plain_seed_creates_no_users():
    call_command("seed_hotel", verbosity=0)

    assert User.objects.count() == 0


@override_settings(ALLOW_DEMO_USERS=False)
def test_demo_users_require_explicit_opt_in():
    with pytest.raises(CommandError, match="Demo users are disabled"):
        call_command("seed_hotel", "--demo-users", verbosity=0)

    assert User.objects.count() == 0


@override_settings(ALLOW_DEMO_USERS=True)
def test_demo_users_are_created_only_when_enabled():
    call_command("seed_hotel", "--demo-users", verbosity=0)

    assert User.objects.filter(username__endswith="_demo").count() == 5
