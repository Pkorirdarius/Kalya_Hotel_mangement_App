"""Keep legacy bookings and rates intact while adopting the confirmed room IDs.

The hotel confirmed four sellable room types. Earlier data used three working
slugs. Renaming the existing rows in place (where possible) preserves booking,
rate-plan and room-block foreign keys; where a row with the new slug already
exists, the legacy row is deactivated instead of deleted because bookings use
PROTECT.
"""

from django.db import migrations

LEGACY_TO_CONFIRMED = {
    "standard-executive": ("superior", "Superior Room", "Chumba cha Superior"),
    "deluxe-garden-suite": ("deluxe", "Deluxe Room", "Chumba cha Deluxe"),
    "mara-residence": ("en-suite", "En-suite Room", "Chumba chenye bafu ya ndani"),
}

COUNTS = {"superior": 2, "deluxe": 6, "en-suite": 1}


def rename_legacy_rows(apps, schema_editor):
    RoomType = apps.get_model("rooms", "RoomType")
    for legacy_slug, (new_slug, name_en, name_sw) in LEGACY_TO_CONFIRMED.items():
        legacy = RoomType.objects.filter(slug=legacy_slug).first()
        if legacy is None:
            continue
        if RoomType.objects.filter(slug=new_slug).exclude(pk=legacy.pk).exists():
            # A seeded row already uses the confirmed ID. Keep the old row for
            # historical bookings, but take it out of the public catalog.
            legacy.active = False
            legacy.save(update_fields=["active"])
            continue
        legacy.slug = new_slug
        legacy.name_en = name_en
        legacy.name_sw = name_sw
        legacy.sleeps = 2
        legacy.size_sqm = 0  # Room sizes were never supplied by the hotel.
        legacy.total_rooms = COUNTS[new_slug]
        legacy.website_allotment = COUNTS[new_slug]
        legacy.save(
            update_fields=[
                "slug",
                "name_en",
                "name_sw",
                "sleeps",
                "size_sqm",
                "total_rooms",
                "website_allotment",
            ]
        )


def restore_legacy_rows(apps, schema_editor):
    RoomType = apps.get_model("rooms", "RoomType")
    for legacy_slug, (new_slug, _name_en, _name_sw) in LEGACY_TO_CONFIRMED.items():
        renamed = RoomType.objects.filter(slug=new_slug).first()
        if renamed is not None and not RoomType.objects.filter(slug=legacy_slug).exists():
            renamed.slug = legacy_slug
            renamed.active = True
            renamed.save(update_fields=["slug", "active"])
            continue
        legacy = RoomType.objects.filter(slug=legacy_slug).first()
        if legacy is not None:
            legacy.active = True
            legacy.save(update_fields=["active"])


class Migration(migrations.Migration):

    dependencies = [
        ("rooms", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(rename_legacy_rows, restore_legacy_rows),
    ]
