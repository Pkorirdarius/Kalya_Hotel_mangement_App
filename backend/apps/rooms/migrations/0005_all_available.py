"""Upgrade existing hotel data so every confirmed room can be sold online.

Fresh databases are intentionally left alone: ``seed_hotel`` creates the full
catalogue there. Upgraded databases already have room types, so this migration
repairs the missing Twin category, aligns website allotment with the physical
count, and keeps staff Room Blocks as the way to withhold rooms.
"""

from decimal import Decimal

from django.db import migrations

CONFIRMED = (
    ("superior", "Superior Room", "Chumba cha Superior", 2),
    ("deluxe", "Deluxe Room", "Chumba cha Deluxe", 6),
    ("twin", "Twin Room", "Chumba cha Twin", 1),
    ("en-suite", "En-suite Room", "Chumba chenye bafu ya ndani", 1),
)

ROOM_NUMBERS = {
    "superior": ["201", "202"],
    "deluxe": ["204", "205", "206", "207", "108", "109"],
    "twin": ["TWIN-1"],
    "en-suite": ["203"],
}


def sync_types(apps, schema_editor):
    RoomType = apps.get_model("rooms", "RoomType")
    # A fresh database gets its catalogue from seed_hotel, not from migrations.
    if not RoomType.objects.exists():
        return

    Room = apps.get_model("rooms", "Room")
    RatePlan = apps.get_model("rates", "RatePlan")
    for slug, name_en, name_sw, count in CONFIRMED:
        room_type, _ = RoomType.objects.update_or_create(
            slug=slug,
            defaults={
                "name_en": name_en,
                "name_sw": name_sw,
                "total_rooms": count,
                "website_allotment": count,
                "active": True,
                "needs_confirmation": False,
            },
        )
        for number in ROOM_NUMBERS[slug]:
            Room.objects.update_or_create(
                number=number, defaults={"room_type_id": room_type.pk}
            )
        if not room_type.rate_plans.exists():
            rate = Decimal("9000.00") if slug == "en-suite" else Decimal("6000.00")
            RatePlan.objects.create(
                room_type_id=room_type.pk,
                code="flexible",
                name="Flexible rate",
                weekday_rate=rate,
                weekend_rate=rate,
                min_nights=1,
                active=True,
                sort_order=0,
            )


def reverse_sync(apps, schema_editor):
    # The previous allotment is not recoverable; seed_hotel is the source of truth.
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("rooms", "0004_seed_rooms"),
        ("rates", "0002_board_rates"),
    ]

    operations = [migrations.RunPython(sync_types, reverse_sync)]
