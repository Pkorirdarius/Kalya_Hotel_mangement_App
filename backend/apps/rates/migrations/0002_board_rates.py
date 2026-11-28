from decimal import Decimal

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("rates", "0001_initial"),
    ]

    operations = [
        migrations.RenameField(
            model_name="mealplan",
            old_name="supplement_per_person_per_night",
            new_name="supplement_per_room_per_night",
        ),
        migrations.AlterField(
            model_name="mealplan",
            name="supplement_per_room_per_night",
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal("0.00"),
                help_text="Board supplement for the room, per night, for one guest.",
                max_digits=10,
            ),
        ),
        migrations.AddField(
            model_name="mealplan",
            name="extra_person_per_night",
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal("0.00"),
                help_text="Added per night for each guest beyond the first.",
                max_digits=10,
            ),
        ),
    ]
