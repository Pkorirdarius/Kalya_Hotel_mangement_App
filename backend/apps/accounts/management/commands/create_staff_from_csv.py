"""Create named hotel staff accounts from a CSV file.

Passwords are deliberately not part of the CSV. New accounts receive an
unusable password, so an operator must set one with ``manage.py changepassword``
before the account is handed to staff. Existing usernames are never changed.
"""

from __future__ import annotations

import csv
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError, CommandParser
from django.core.validators import validate_email
from django.db import transaction

from apps.accounts.models import UserRole

REQUIRED_COLUMNS = ("username", "email", "role")
OPTIONAL_COLUMNS = ("first_name", "last_name", "phone")


class Command(BaseCommand):
    help = "Create named staff accounts from a CSV without storing passwords."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--csv",
            required=True,
            type=Path,
            help="CSV with username,email,role and optional first_name,last_name,phone columns.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Validate the file and list the accounts without writing anything.",
        )

    @transaction.atomic
    def handle(self, *args, **options) -> None:
        path: Path = options["csv"]
        if not path.is_file():
            raise CommandError(f"CSV file not found: {path}")

        rows = self._read_rows(path)
        if options["dry_run"]:
            for row in rows:
                self.stdout.write(
                    f"Would create {row['username']} ({row['role']}) — no password set."
                )
            self.stdout.write(
                f"Dry run: {len(rows)} account(s) validated. Nothing was written."
            )
            return

        user_model = get_user_model()
        created = 0
        skipped = 0
        for row in rows:
            user, was_created = user_model.objects.get_or_create(
                username=row["username"],
                defaults={
                    "email": row["email"],
                    "first_name": row["first_name"],
                    "last_name": row["last_name"],
                    "phone": row["phone"],
                    "role": row["role"],
                    "is_staff": True,
                    "is_active": True,
                },
            )
            if not was_created:
                skipped += 1
                self.stdout.write(
                    f"Skipped {row['username']}: that username already exists and was left unchanged."
                )
                continue
            user.set_unusable_password()
            user.save(update_fields=("password",))
            created += 1
            self.stdout.write(
                self.style.SUCCESS(f"Created {user.username} ({user.role}) — no password set.")
            )

        self.stdout.write(
            f"Created {created} account(s), skipped {skipped}. Set each password with "
            "`python manage.py changepassword <username>` before handing over access."
        )

    def _read_rows(self, path: Path) -> list[dict[str, str]]:
        with path.open(newline="", encoding="utf-8-sig") as handle:
            reader = csv.DictReader(handle)
            headers = {(name or "").strip().lower() for name in reader.fieldnames or []}
            missing = sorted(set(REQUIRED_COLUMNS) - headers)
            if missing:
                raise CommandError(
                    "CSV is missing required column(s): " + ", ".join(missing)
                )

            rows: list[dict[str, str]] = []
            seen_usernames: set[str] = set()
            for number, raw in enumerate(reader, start=2):
                row = {
                    (key or "").strip().lower(): (value or "").strip()
                    for key, value in raw.items()
                    if key is not None
                }
                empty = [name for name in REQUIRED_COLUMNS if not row.get(name)]
                if empty:
                    raise CommandError(
                        f"Row {number}: missing value for {', '.join(empty)}."
                    )

                username = row["username"]
                if username in seen_usernames:
                    raise CommandError(f"Row {number}: duplicate username {username!r}.")
                seen_usernames.add(username)

                if row["role"] not in UserRole.values:
                    raise CommandError(
                        f"Row {number}: unknown role {row['role']!r}. "
                        f"Use one of: {', '.join(UserRole.values)}."
                    )
                try:
                    validate_email(row["email"])
                except ValidationError as exc:
                    raise CommandError(
                        f"Row {number}: invalid email {row['email']!r}."
                    ) from exc

                rows.append(
                    {
                        "username": username,
                        "email": row["email"],
                        "role": row["role"],
                        **{
                            name: row.get(name, "")
                            for name in OPTIONAL_COLUMNS
                        },
                    }
                )

        if not rows:
            raise CommandError("CSV contains no staff rows.")
        return rows
