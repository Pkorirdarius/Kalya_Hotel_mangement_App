"""Seed West Premier Hotel with launch content.

Every value is an editable placeholder. Items that still need hotel
confirmation are flagged so marketing can review them before launch.
"""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.common.models import HotelSetting
from apps.content.models import BlogPost, Offer, Review
from apps.facilities.models import MenuItem
from apps.notifications.models import NewsletterSubscriber
from apps.rates.models import LongStayDiscount, MealPlan, RatePlan
from apps.rooms.models import RoomType

ROOMS = [
    {
        "slug": "standard-executive",
        "name_en": "Standard Executive",
        "name_sw": "Chumba cha Kawaida cha Msimamizi",
        "description_en": (
            "A calm, city-facing room with a queen bed, work desk and rain "
            "shower. Placeholder copy pending hotel confirmation."
        ),
        "description_sw": (
            "Chumba tulivu kinachoelekea mji, chenye kitanda cha queen, meza ya "
            "kazi na bafu ya mvua. Maandishi ya nafasi yanasubiri uthibitisho."
        ),
        "sleeps": 2,
        "size_sqm": 28,
        "bed_en": "1 queen bed",
        "bed_sw": "Kitanda kimoja cha queen",
        "total_rooms": 15,
        "website_allotment": 8,
        "weekday": Decimal("8500.00"),
        "image": "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=80",
        "amenities": [
            {"icon": "wifi", "label_en": "Free Wi-Fi", "label_sw": "Wi-Fi bila malipo"},
            {"icon": "ac_unit", "label_en": "Air conditioning", "label_sw": "Kiyoyozi"},
            {"icon": "tv", "label_en": "Satellite TV", "label_sw": "Televisheni ya satelaiti"},
        ],
    },
    {
        "slug": "deluxe-garden-suite",
        "name_en": "Deluxe Garden Suite",
        "name_sw": "Suite ya Bustani ya Deluxe",
        "description_en": (
            "A generous suite opening to the garden, with a lounge corner and "
            "separate bath. Placeholder copy pending hotel confirmation."
        ),
        "description_sw": (
            "Suite pana inayofungukia bustani, yenye kona ya mapumziko na bafu "
            "tofauti. Maandishi ya nafasi yanasubiri uthibitisho."
        ),
        "sleeps": 2,
        "size_sqm": 42,
        "bed_en": "1 king bed",
        "bed_sw": "Kitanda kimoja cha king",
        "total_rooms": 13,
        "website_allotment": 6,
        "weekday": Decimal("12800.00"),
        "image": "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80",
        "amenities": [
            {"icon": "wifi", "label_en": "Free Wi-Fi", "label_sw": "Wi-Fi bila malipo"},
            {"icon": "deck", "label_en": "Garden terrace", "label_sw": "Terrace ya bustani"},
            {"icon": "bathtub", "label_en": "Separate bath", "label_sw": "Bafu tofauti"},
        ],
    },
    {
        "slug": "mara-residence",
        "name_en": "Mara Residence",
        "name_sw": "Makazi ya Mara",
        "description_en": (
            "Our largest residence with a private sitting room, dining nook and "
            "space for a third guest. Placeholder copy pending hotel confirmation."
        ),
        "description_sw": (
            "Makazi yetu makubwa zaidi yenye sebule ya faragha, eneo la kulia na "
            "nafasi ya mgeni wa tatu. Maandishi yanasubiri uthibitisho."
        ),
        "sleeps": 3,
        "size_sqm": 58,
        "bed_en": "1 king bed + 1 sofa bed",
        "bed_sw": "Kitanda cha king + kitanda cha sofa",
        "total_rooms": 10,
        "website_allotment": 4,
        "weekday": Decimal("18500.00"),
        "image": "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80",
        "amenities": [
            {"icon": "wifi", "label_en": "Free Wi-Fi", "label_sw": "Wi-Fi bila malipo"},
            {"icon": "weekend", "label_en": "Private sitting room", "label_sw": "Sebule ya faragha"},
            {"icon": "room_service", "label_en": "Room service", "label_sw": "Huduma ya chumbani"},
        ],
    },
]

MEAL_PLANS = [
    {
        "code": "room-only",
        "name_en": "Room only",
        "name_sw": "Chumba tu",
        "description_en": "No meals included.",
        "description_sw": "Hakuna milo iliyojumuishwa.",
        "supplement": Decimal("0.00"),
        "sort_order": 1,
    },
    {
        "code": "breakfast",
        "name_en": "Bed & breakfast",
        "name_sw": "Chumba na kifungua kinywa",
        "description_en": "Breakfast for each guest, each morning.",
        "description_sw": "Kifungua kinywa kwa kila mgeni, kila asubuhi.",
        "supplement": Decimal("1200.00"),
        "sort_order": 2,
    },
    {
        "code": "dinner",
        "name_en": "Dinner, bed & breakfast",
        "name_sw": "Chakula cha jioni, chumba na kifungua kinywa",
        "description_en": "Dinner and breakfast each day.",
        "description_sw": "Chakula cha jioni na kifungua kinywa kila siku.",
        "supplement": Decimal("1800.00"),
        "sort_order": 3,
    },
    {
        "code": "half-board",
        "name_en": "Half board",
        "name_sw": "Nusu bweni",
        "description_en": "Breakfast and dinner each day.",
        "description_sw": "Kifungua kinywa na chakula cha jioni kila siku.",
        "supplement": Decimal("2800.00"),
        "sort_order": 4,
    },
    {
        "code": "full-board",
        "name_en": "Full board",
        "name_sw": "Bweni kamili",
        "description_en": "Breakfast, lunch and dinner each day.",
        "description_sw": "Kifungua kinywa, chakula cha mchana na jioni kila siku.",
        "supplement": Decimal("4200.00"),
        "sort_order": 5,
    },
]

MENU_ITEMS = [
    ("restaurant", "Breakfast", "West Premier breakfast", "Kifungua kinywa cha West Premier", 1500),
    ("restaurant", "Mains", "Grilled tilapia", "Sato wa kuchoma", 1800),
    ("restaurant", "Mains", "Nyama choma platter", "Sahani ya nyama choma", 2200),
    ("restaurant", "Desserts", "Seasonal fruit plate", "Sahani ya matunda ya msimu", 700),
    ("coffee", "Coffee", "Single origin pour-over", "Kahawa ya asili", 450),
    ("coffee", "Pastries", "Butter croissant", "Kroissant ya siagi", 350),
]

BLOG_POSTS = [
    {
        "slug": "a-weekend-in-west-pokot",
        "title_en": "A weekend in West Pokot",
        "title_sw": "Wikendi huko West Pokot",
        "excerpt_en": "Hills, markets and quiet evenings — a sample itinerary.",
        "excerpt_sw": "Milima, masoko na jioni tulivu — ratiba ya mfano.",
        "category": "Guides",
    },
    {
        "slug": "meet-our-coffee-shop",
        "title_en": "Meet our coffee shop",
        "title_sw": "Fahamu duka letu la kahawa",
        "excerpt_en": "Single-origin beans and a calm corner to work from.",
        "excerpt_sw": "Kahawa ya asili na kona tulivu ya kufanyia kazi.",
        "category": "Dining",
    },
]

OFFERS = [
    {
        "slug": "stay-three-nights",
        "title_en": "Stay three nights, save",
        "title_sw": "Kaa usiku tatu, okoa",
        "description_en": "Placeholder long-stay offer pending hotel confirmation.",
        "description_sw": "Ofa ya kukaa muda mrefu inasubiri uthibitisho.",
        "price_label": "From KES 24,000",
    }
]

REVIEWS = [
    {"author": "Sample guest", "rating": 5, "quote_en": "Placeholder review pending confirmation.", "quote_sw": "Maoni ya nafasi yanasubiri uthibitisho."},
    {"author": "Sample guest", "rating": 4, "quote_en": "Placeholder review pending confirmation.", "quote_sw": "Maoni ya nafasi yanasubiri uthibitisho."},
]


class Command(BaseCommand):
    help = "Create or refresh West Premier launch content and placeholder data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--demo-users",
            action="store_true",
            help="Create one demo user per staff role with a printed password.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        settings_obj = HotelSetting.load()
        settings_obj.name = "West Premier Hotel"
        settings_obj.tagline = "A calm stay in the heart of West Pokot"
        settings_obj.address = "Kapenguria, West Pokot, Kenya"
        settings_obj.town = "Kapenguria"
        settings_obj.county = "West Pokot"
        settings_obj.phone = "+254 20 765 4321"
        settings_obj.phone_href = "tel:+254207654321"
        settings_obj.email = "stay@westpremierhotel.co.ke"
        settings_obj.whatsapp = "+254 20 765 4321"
        settings_obj.map_query = "West Premier Hotel, Kapenguria, Kenya"
        settings_obj.restaurant_capacity = 80
        settings_obj.coffee_capacity = 100
        settings_obj.conference_capacity = 100
        settings_obj.gym_capacity = 20
        settings_obj.gym_day_pass_price = Decimal("500.00")
        settings_obj.gym_monthly_price = Decimal("3000.00")
        # The brief listed half-day 8,000 and full-day 15,000. Confirm which way
        # round the hotel intends; these remain flagged in ASSUMPTIONS.md.
        settings_obj.conference_half_day_price = Decimal("8000.00")
        settings_obj.conference_full_day_price = Decimal("15000.00")
        settings_obj.bank_name = "Equity Bank Kenya"
        settings_obj.bank_account_name = "West Premier Hotel Limited"
        settings_obj.bank_account_number = ""
        settings_obj.bank_branch = ""
        settings_obj.bank_swift = ""
        settings_obj.claims_verified = False
        settings_obj.google_reviews_enabled = False
        settings_obj.privacy_notice_url = "/privacy"
        settings_obj.privacy_notice_version = "2026-01"
        settings_obj.save()
        self.stdout.write(self.style.SUCCESS("Hotel settings seeded"))

        meal_plans = {}
        for item in MEAL_PLANS:
            plan, _ = MealPlan.objects.update_or_create(
                code=item["code"],
                defaults={
                    "name_en": item["name_en"],
                    "name_sw": item["name_sw"],
                    "description_en": item["description_en"],
                    "description_sw": item["description_sw"],
                    "supplement_per_person_per_night": item["supplement"],
                    "active": True,
                    "sort_order": item["sort_order"],
                },
            )
            meal_plans[plan.code] = plan

        for index, item in enumerate(ROOMS):
            room, _ = RoomType.objects.update_or_create(
                slug=item["slug"],
                defaults={
                    "name_en": item["name_en"],
                    "name_sw": item["name_sw"],
                    "description_en": item["description_en"],
                    "description_sw": item["description_sw"],
                    "sleeps": item["sleeps"],
                    "size_sqm": item["size_sqm"],
                    "bed_en": item["bed_en"],
                    "bed_sw": item["bed_sw"],
                    "total_rooms": item["total_rooms"],
                    "website_allotment": item["website_allotment"],
                    "image": item["image"],
                    "amenities": item["amenities"],
                    "highlights": [],
                    "sort_order": index,
                    "active": True,
                    "needs_confirmation": True,
                },
            )
            plan, _ = RatePlan.objects.update_or_create(
                room_type=room,
                code="flexible",
                defaults={
                    "name": "Flexible rate",
                    "weekday_rate": item["weekday"],
                    "weekend_rate": item["weekday"],
                    "min_nights": 1,
                    "active": True,
                    "sort_order": 0,
                },
            )
            LongStayDiscount.objects.update_or_create(
                rate_plan=plan,
                min_nights=3,
                defaults={"percent": Decimal("10.00"), "active": True},
            )
            self.stdout.write(f"Room seeded: {room.name_en}")

        for venue, category, name_en, name_sw, price in MENU_ITEMS:
            MenuItem.objects.update_or_create(
                venue=venue,
                name_en=name_en,
                defaults={
                    "category": category,
                    "name_sw": name_sw,
                    "description_en": "Placeholder menu description pending confirmation.",
                    "description_sw": "Maelezo ya menyu yanasubiri uthibitisho.",
                    "price": Decimal(price),
                    "active": True,
                    "needs_confirmation": True,
                },
            )

        now = timezone.now()
        for item in BLOG_POSTS:
            BlogPost.objects.update_or_create(
                slug=item["slug"],
                defaults={
                    "title_en": item["title_en"],
                    "title_sw": item["title_sw"],
                    "excerpt_en": item["excerpt_en"],
                    "excerpt_sw": item["excerpt_sw"],
                    "body_en": item["excerpt_en"] + " Placeholder body pending review.",
                    "body_sw": item["excerpt_sw"] + " Maudhui ya nafasi yanasubiri mapitio.",
                    "category": item["category"],
                    "published_at": now,
                    "active": True,
                    "needs_confirmation": True,
                },
            )

        for item in OFFERS:
            Offer.objects.update_or_create(
                slug=item["slug"],
                defaults={
                    "title_en": item["title_en"],
                    "title_sw": item["title_sw"],
                    "description_en": item["description_en"],
                    "description_sw": item["description_sw"],
                    "price_label": item["price_label"],
                    "valid_from": date.today(),
                    "valid_to": date.today() + timedelta(days=120),
                    "active": True,
                    "needs_confirmation": True,
                },
            )

        for item in REVIEWS:
            Review.objects.get_or_create(
                author=item["author"],
                quote_en=item["quote_en"],
                defaults={
                    "rating": item["rating"],
                    "quote_sw": item["quote_sw"],
                    "source": "google",
                    "reviewed_at": date.today(),
                    "active": True,
                    "needs_confirmation": True,
                },
            )

        NewsletterSubscriber.objects.get_or_create(
            email="stay@westpremierhotel.co.ke",
            defaults={"consent": False, "language": "en", "source": "seed"},
        )

        if options["demo_users"]:
            self._demo_users()

        self.stdout.write(
            self.style.SUCCESS(
                "Seed complete. All sample prices and claims are flagged for hotel confirmation."
            )
        )

    def _demo_users(self):
        User = get_user_model()
        password = "ChangeMe-2026!"
        roles = ["director", "data_manager", "front_desk", "marketing", "ict_admin"]
        for role in roles:
            username = f"{role}_demo"
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": f"{role}@westpremierhotel.co.ke",
                    "first_name": role.replace("_", " ").title(),
                    "role": role,
                    "is_staff": True,
                    "is_active": True,
                },
            )
            if created:
                user.set_password(password)
                user.save()
                self.stdout.write(f"Demo user created: {username} / {password}")
            else:
                self.stdout.write(f"Demo user already exists: {username}")
