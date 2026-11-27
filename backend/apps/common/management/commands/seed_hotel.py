"""Seed the hotel with launch content.

Brand values come from ``settings.HOTEL`` so re-branding stays a one-line
change. Every value is an editable placeholder. Items that still need hotel
confirmation are flagged so marketing can review them before launch.
"""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.common.models import HotelSetting
from apps.content.models import BlogPost, Offer, Review
from apps.facilities.models import MenuItem
from apps.content.models import PolicyPage
from apps.notifications.models import NewsletterSubscriber
from apps.rates.models import LongStayDiscount, MealPlan, RatePlan
from apps.rooms.models import Room, RoomType

def amenity(icon: str, label_en: str, label_sw: str) -> dict[str, str]:
    return {"icon": icon, "label_en": label_en, "label_sw": label_sw}


COMMON_AMENITIES = [
    amenity("wifi", "Strong WiFi", "WiFi imara"),
    amenity("tv", "Smart TV", "TV janja"),
    amenity("room_service", "Room Service", "Huduma ya chumbani"),
    amenity("lock", "Safe Box", "Sanduku la usalama"),
    amenity("iron", "Ironing Facilities", "Vifaa vya kupasia"),
    amenity("door_front", "Smart Card Doors", "Milango ya kadi janja"),
]

ROOMS = [
    {
        "slug": "superior",
        "name_en": "Superior Room",
        "name_sw": "Chumba cha Superior",
        "description_en": (
            "King Bed, orthopedic mattress, spacious room and bathroom, "
            "Strong WiFi, Smart TV, Safe Box, ironing box, room service and "
            "smart card doors. Best for couples and solo travellers wanting "
            "extra comfort. 202 is multipurpose room,Can work as superior room too."
        ),
        "description_sw": (
            "Kitanda cha King, godoro la mifupa, chumba na bafu kubwa, WiFi "
            "imara, TV janja, sanduku la usalama, sanduku la pasi, huduma ya "
            "chumbani na milango ya kadi janja. Bora kwa wanandoa na wasafiri "
            "peke yao wanaotaka faraja zaidi. 202 is multipurpose room,Can work "
            "as superior room too."
        ),
        "sleeps": 2,
        # Room sizes have not been supplied; zero means unknown and is not shown.
        "size_sqm": 0,
        "bed_en": "King Bed",
        "bed_sw": "Kitanda cha King",
        "total_rooms": 2,
        "website_allotment": 2,
        # Physical rooms for front desk occupancy tracking.
        "numbers": ["201", "202"],
        "weekday": Decimal("8500.00"),
        "image": "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=80",
        "amenities": COMMON_AMENITIES
        + [
            amenity("iron", "Ironing box", "Sanduku la pasi"),
        ],
    },
    {
        "slug": "deluxe",
        "name_en": "Deluxe Room",
        "name_sw": "Chumba cha Deluxe",
        "description_en": (
            "Queen Bed, orthopedic mattress, spacious room and bathroom, "
            "Strong WiFi, Smart TV, Safe Box, ironing box, room service, smart "
            "card doors, fridge and balcony. Best for families, business "
            "travellers and long stays."
        ),
        "description_sw": (
            "Kitanda cha Queen, godoro la mifupa, chumba na bafu kubwa, WiFi "
            "imara, TV janja, sanduku la usalama, sanduku la pasi, huduma ya "
            "chumbani, milango ya kadi janja, friji na balkoni. Bora kwa "
            "familia, wasafiri wa biashara na kukaa kwa muda mrefu."
        ),
        "sleeps": 2,
        "size_sqm": 0,
        "bed_en": "Queen Bed",
        "bed_sw": "Kitanda cha Queen",
        "total_rooms": 6,
        "website_allotment": 6,
        "numbers": ["204", "205", "206", "207", "108", "109"],
        "weekday": Decimal("12800.00"),
        "image": "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80",
        "amenities": COMMON_AMENITIES
        + [
            amenity("iron", "Ironing box", "Sanduku la pasi"),
            amenity("kitchen", "Fridge", "Friji"),
            amenity("balcony", "Balcony", "Balkoni"),
        ],
    },
    {
        "slug": "twin",
        "name_en": "Twin Room",
        "name_sw": "Chumba cha vitanda viwili",
        "description_en": (
            "Single beds with orthopedic mattresses, spacious room and "
            "bathroom, Strong WiFi, Smart TV, Safe Box, ironing box, room "
            "service, smart card doors and fridge. Best for friends, colleagues "
            "and family."
        ),
        "description_sw": (
            "Vitanda vya mtu mmoja vyenye magodoro ya mifupa, chumba na bafu "
            "kubwa, WiFi imara, TV janja, sanduku la usalama, sanduku la pasi, "
            "huduma ya chumbani, milango ya kadi janja na friji. Bora kwa "
            "marafiki, wafanyakazi wenzako na familia."
        ),
        "sleeps": 2,
        "size_sqm": 0,
        "bed_en": "Single Beds",
        "bed_sw": "Vitanda vya mtu mmoja",
        "total_rooms": 1,
        "website_allotment": 1,
        # Provisional identifier: the hotel has not supplied the Twin room number.
        "numbers": ["TWIN-1"],
        "weekday": Decimal("8500.00"),
        "image": "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80",
        "amenities": COMMON_AMENITIES
        + [
            amenity("iron", "Ironing box", "Sanduku la pasi"),
            amenity("kitchen", "Fridge", "Friji"),
        ],
    },
    {
        "slug": "en-suite",
        "name_en": "En-suite Room",
        "name_sw": "Chumba chenye bafu ya ndani",
        "description_en": (
            "King Bed, orthopedic mattress, spacious room and bathroom, "
            "Strong WiFi, Smart TV, Safe Box, ironing stand and iron box, room "
            "service, smart card doors, fridge, microwave, mini kitchenette, "
            "IP phone and a spacious lounge area with seating for four. Best "
            "for VIP guests, families and special occasions."
        ),
        "description_sw": (
            "Kitanda cha King, godoro la mifupa, chumba na bafu kubwa, WiFi "
            "imara, TV janja, sanduku la usalama, stendi ya pasi na sanduku la "
            "pasi, huduma ya chumbani, milango ya kadi janja, friji, "
            "maikrowevu, jikoni ndogo, simu ya IP na sebule kubwa yenye viti "
            "vinne. Bora kwa wageni wa VIP, familia na hafla maalum."
        ),
        "sleeps": 2,
        "size_sqm": 0,
        "bed_en": "King Bed + Private Lounge",
        "bed_sw": "Kitanda cha King + Sebule ya Faragha",
        "total_rooms": 1,
        "website_allotment": 1,
        "numbers": ["203"],
        "weekday": Decimal("18500.00"),
        "image": "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80",
        "amenities": COMMON_AMENITIES
        + [
            amenity("iron", "Ironing stand and iron box", "Stendi ya pasi na sanduku la pasi"),
            amenity("kitchen", "Fridge", "Friji"),
            amenity("microwave", "Microwave", "Maikrowevu"),
            amenity("countertops", "Mini kitchenette", "Jikoni ndogo"),
            amenity("phone", "IP phone", "Simu ya IP"),
            amenity("groups", "Spacious lounge area with seating for four", "Sebule kubwa yenye viti vinne"),
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
    (
        "restaurant",
        "Breakfast",
        f"{settings.HOTEL['SHORT_NAME']} breakfast",
        f"Kifungua kinywa cha {settings.HOTEL['SHORT_NAME']}",
        1500,
    ),
    ("restaurant", "Mains", "Grilled tilapia", "Sato wa kuchoma", 1800),
    ("restaurant", "Mains", "Nyama choma platter", "Sahani ya nyama choma", 2200),
    ("restaurant", "Desserts", "Seasonal fruit plate", "Sahani ya matunda ya msimu", 700),
    ("coffee", "Coffee", "Single origin pour-over", "Kahawa ya asili", 450),
    ("coffee", "Pastries", "Butter croissant", "Kroissant ya siagi", 350),
]

POLICY_PAGES = [
    {
        "slug": "privacy",
        "title_en": "Privacy notice",
        "title_sw": "Taarifa ya faragha",
        "version": "2026-11-draft",
        "body_en": (
            "This is a draft privacy notice pending review by the hotel and its "
            "legal adviser.\n\n"
            "We collect the details you give us when you book a room, send an "
            "enquiry, subscribe to the newsletter or contact the hotel. We use "
            "them to provide your booking, respond to you and meet our legal and "
            "accounting duties.\n\n"
            "We keep booking and payment records only as long as the hotel's "
            "retention policy requires. You can ask to see, correct, export or "
            "delete your personal data by contacting the hotel."
        ),
        "body_sw": (
            "Hii ni rasimu ya taarifa ya faragha inayosubiri kupitiwa na hoteli "
            "na mshauri wake wa sheria.\n\n"
            "Tunakusanya taarifa unazotupatia unapoweka nafasi ya chumba, "
            "kutuma ombi, kujiandikisha kwa jarida au kuwasiliana na hoteli. "
            "Tunazitumia kuhudumia nafasi yako, kukujibu na kutimiza wajibu wetu "
            "wa kisheria na wa uhasibu.\n\n"
            "Tunahifadhi kumbukumbu za nafasi na malipo kwa muda unaotakiwa na "
            "sera ya hoteli. Unaweza kuomba kuona, kusahihisha, kuhamisha au "
            "kufuta taarifa zako kwa kuwasiliana na hoteli."
        ),
    },
    {
        "slug": "terms",
        "title_en": "Booking terms",
        "title_sw": "Masharti ya kuweka nafasi",
        "version": "2026-11-draft",
        "body_en": (
            "These booking terms are a draft pending review by the hotel and its "
            "legal adviser.\n\n"
            "A website booking is held for a limited time until payment is "
            "received. Room rates, meal plans, taxes and the cancellation cutoff "
            "are shown before you confirm. Cancellations made before the cutoff "
            "are handled under the policy shown at booking; later cancellations "
            "may be charged.\n\n"
            "The hotel may decline a booking if the details are incomplete or if "
            "the room is no longer available, and will refund any payment taken "
            "for that booking."
        ),
        "body_sw": (
            "Masharti haya ya kuweka nafasi ni rasimu inayosubiri kupitiwa na "
            "hoteli na mshauri wake wa sheria.\n\n"
            "Nafasi iliyowekwa kupitia tovuti huhifadhiwa kwa muda maalum hadi "
            "malipo yapokelewe. Bei za vyumba, mipango ya chakula, kodi na muda "
            "wa mwisho wa kughairi huonyeshwa kabla ya kuthibitisha. Kughairi "
            "kabla ya muda huo hufuata sera iliyoonyeshwa wakati wa kuweka "
            "nafasi; kughairi baadaye kunaweza kutoza ada.\n\n"
            "Hoteli inaweza kukataa nafasi ikiwa taarifa hazijakamilika au "
            "chumba hakipo tena, na itarejesha malipo yoyote yaliyotolewa kwa "
            "nafasi hiyo."
        ),
    },
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
    help = "Create or refresh hotel launch content and placeholder data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--demo-users",
            action="store_true",
            help="Create one demo user per staff role with a printed password.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        settings_obj = HotelSetting.load()
        settings_obj.name = settings.HOTEL["NAME"]
        settings_obj.tagline = f"A calm stay in the heart of {settings.HOTEL['COUNTY']}"
        settings_obj.address = settings.HOTEL["ADDRESS"]
        settings_obj.town = settings.HOTEL["TOWN"]
        settings_obj.county = settings.HOTEL["COUNTY"]
        settings_obj.phone = settings.HOTEL["PHONE"]
        settings_obj.phone_href = settings.HOTEL["PHONE_HREF"]
        settings_obj.email = settings.HOTEL["EMAIL"]
        settings_obj.whatsapp = settings.HOTEL["PHONE"]
        settings_obj.map_query = (
            f"{settings.HOTEL['NAME']}, {settings.HOTEL['TOWN']}, "
            f"{settings.HOTEL['COUNTRY']}"
        )
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
        settings_obj.bank_account_name = settings.HOTEL["LEGAL_NAME"]
        settings_obj.bank_account_number = ""
        settings_obj.bank_branch = ""
        settings_obj.bank_swift = ""
        settings_obj.claims_verified = False
        settings_obj.google_reviews_enabled = False
        settings_obj.privacy_notice_url = "/privacy"
        settings_obj.privacy_notice_version = "2026-11-draft"
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
            # Keep the front desk's numbered rooms in step with the catalog.
            # Status is deliberately not touched here: an occupied room must
            # survive a re-seed.
            for number in item["numbers"]:
                Room.objects.update_or_create(
                    number=number, defaults={"room_type": room}
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

        # Retire superseded catalog entries when an existing database is re-seeded.
        RoomType.objects.exclude(
            slug__in=[item["slug"] for item in ROOMS]
        ).update(active=False)

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

        for item in POLICY_PAGES:
            PolicyPage.objects.update_or_create(
                slug=item["slug"],
                defaults={
                    "title_en": item["title_en"],
                    "title_sw": item["title_sw"],
                    "body_en": item["body_en"],
                    "body_sw": item["body_sw"],
                    "version": item["version"],
                    "active": True,
                    "needs_confirmation": True,
                },
            )
            self.stdout.write(f"Policy seeded: {item['slug']}")

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
            email=settings.HOTEL["EMAIL"],
            defaults={"consent": False, "language": "en", "source": "seed"},
        )

        if options["demo_users"]:
            if not getattr(settings, "ALLOW_DEMO_USERS", False):
                raise CommandError(
                    "Demo users are disabled. Set ALLOW_DEMO_USERS=true only in "
                    "a local or test environment; production always refuses."
                )
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
        email_domain = settings.HOTEL["EMAIL"].split("@")[-1]
        for role in roles:
            username = f"{role}_demo"
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": f"{role}@{email_domain}",
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
