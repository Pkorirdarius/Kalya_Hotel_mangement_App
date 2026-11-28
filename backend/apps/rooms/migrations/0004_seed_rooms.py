"""Create the confirmed physical rooms for front desk occupancy tracking.

Running the seed command also maintains these rows; this migration makes sure an
existing deployment gets them without a separate manual step.
"""

from django.db import migrations

ROOM_NUMBERS = {
    "superior": ["201", "202"],
    "deluxe": ["204", "205", "206", "207", "108", "109"],
    # The hotel has not supplied a number for the single Twin room. TWIN-1 is a
    # provisional identifier until the front desk confirms the real number.
    "twin": ["TWIN-1"],
    "en-suite": ["203"],
}


def seed_rooms(apps, schema_editor):
    Room = apps.get_model("rooms", "Room")
    RoomType = apps.get_model("rooms", "RoomType")
    for slug, numbers in ROOM_NUMBERS.items():
        room_type = RoomType.objects.filter(slug=slug).first()
        if room_type is None:
            continue
        for number in numbers:
            Room.objects.update_or_create(
                number=number, defaults={"room_type_id": room_type.pk}
            )


def remove_rooms(apps, schema_editor):
    apps.get_model("rooms", "Room").objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ("rooms", "0003_room"),
    ]

    operations = [
        migrations.RunPython(seed_rooms, remove_rooms),
    ]
