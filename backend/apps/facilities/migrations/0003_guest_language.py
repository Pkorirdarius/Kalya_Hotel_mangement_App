from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("facilities", "0002_tablebooking_venue"),
    ]

    operations = [
        migrations.AddField(
            model_name="tablebooking",
            name="language",
            field=models.CharField(
                choices=[("en", "English"), ("sw", "Kiswahili")],
                db_index=True,
                default="en",
                max_length=2,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="conferenceenquiry",
            name="language",
            field=models.CharField(
                choices=[("en", "English"), ("sw", "Kiswahili")],
                db_index=True,
                default="en",
                max_length=2,
            ),
            preserve_default=False,
        ),
        # Existing rows predate the field; make the English backfill explicit
        # so a future default change cannot silently rewrite guest history.
        migrations.RunSQL(
            sql="UPDATE facilities_tablebooking SET language = 'en' WHERE language IS NULL OR language NOT IN ('en', 'sw');",
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.RunSQL(
            sql="UPDATE facilities_conferenceenquiry SET language = 'en' WHERE language IS NULL OR language NOT IN ('en', 'sw');",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
