"""One source of truth for the gym day-pass price.

The backend charges ``HotelSetting.gym_day_pass_price`` (default and seed 500).
The frontend only keeps 500 as a fallback while the public settings endpoint
loads. This test fails if those values drift apart or if the old 1,000 copy
comes back.
"""

from __future__ import annotations

import re
from decimal import Decimal
from pathlib import Path

from django.test import SimpleTestCase

from apps.common.models import HotelSetting

ROOT = Path(__file__).resolve().parents[4]


class GymDayPassPriceTests(SimpleTestCase):
    def test_backend_default_is_500(self):
        field = HotelSetting._meta.get_field("gym_day_pass_price")
        self.assertEqual(field.default, Decimal("500.00"))

    def test_seed_uses_the_same_price(self):
        seed = (ROOT / "backend/apps/common/management/commands/seed_hotel.py").read_text(
            encoding="utf-8"
        )
        self.assertRegex(seed, r"gym_day_pass_price\s*=\s*Decimal\(\"500\.00\"\)")

    def test_frontend_fallback_is_500(self):
        prices = (ROOT / "frontend/src/config/prices.ts").read_text(encoding="utf-8")
        match = re.search(r"GYM_DAY_PASS_PRICE\s*=\s*(\d+)", prices)
        self.assertIsNotNone(match, "GYM_DAY_PASS_PRICE is missing from prices.ts")
        self.assertEqual(int(match.group(1)), 500)

    def test_no_second_gym_price_in_translations(self):
        translations = (ROOT / "frontend/src/i18n.ts").read_text(encoding="utf-8")
        self.assertNotIn("KES 1,000", translations)
        self.assertNotIn("KES 1000", translations)
