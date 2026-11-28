import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("rooms", "0002_confirmed_room_slugs"),
    ]

    operations = [
        migrations.CreateModel(
            name="Room",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "number",
                    models.CharField(
                        help_text=(
                            "Physical room number, e.g. 201. "
                            "Must be unique in the hotel."
                        ),
                        max_length=20,
                        unique=True,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[("free", "Free"), ("occupied", "Occupied")],
                        db_index=True,
                        default="free",
                        max_length=10,
                    ),
                ),
                (
                    "room_type",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="rooms",
                        to="rooms.roomtype",
                    ),
                ),
            ],
            options={
                "verbose_name": "Room",
                "verbose_name_plural": "Rooms",
                "ordering": ("room_type__sort_order", "number"),
            },
        ),
    ]
