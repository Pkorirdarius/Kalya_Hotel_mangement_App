from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("facilities", "0004_alter_conferenceenquiry_language_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="conferenceenquiry",
            name="hall",
            field=models.CharField(
                choices=[
                    ("kopoch", "Kopoch Hall"),
                    ("attelo", "The Attelo Hall"),
                    ("boardroom", "Executive Board Room"),
                ],
                db_index=True,
                default="kopoch",
                max_length=20,
            ),
            # Historical enquiries predate the selector. Backfill them with the
            # first hall, then remove the default so new rows must choose one.
            preserve_default=False,
        ),
        migrations.RunSQL(
            sql="UPDATE facilities_conferenceenquiry SET hall = 'kopoch' WHERE hall IS NULL OR hall = '';",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
