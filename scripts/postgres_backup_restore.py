#!/usr/bin/env python
"""Postgres logical backup, restore and restore-drill helper.

Uses ``pg_dump``/``pg_restore`` for the data and ``psycopg`` (already a backend
dependency) for scratch-database administration. The ``drill`` subcommand is
safe to run in CI: it creates two temporary databases, dumps a marker row from
one, restores it into the other, verifies it and drops both. It never touches
the application database.

Examples:

    python scripts/postgres_backup_restore.py backup --db hotel --file backup.dump
    python scripts/postgres_backup_restore.py restore --db hotel_restore --file backup.dump
    python scripts/postgres_backup_restore.py drill
"""

from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
import tempfile
import traceback
import uuid
from pathlib import Path

import psycopg
from psycopg import sql

DEFAULT_DB = "hotel"
ADMIN_DB = "postgres"


def settings() -> tuple[str, int, str, str]:
    return (
        os.getenv("POSTGRES_HOST", "localhost"),
        int(os.getenv("POSTGRES_PORT", "5432")),
        os.getenv("POSTGRES_USER", "hotel"),
        os.getenv("POSTGRES_PASSWORD", "hotel"),
    )


def conninfo(dbname: str) -> str:
    host, port, user, password = settings()
    return (
        f"host={host} port={port} dbname={dbname} user={user} "
        f"password={password} connect_timeout=10"
    )


def psql_env() -> dict[str, str]:
    env = dict(os.environ)
    env["PGPASSWORD"] = settings()[3]
    return env


def command(args: list[str]) -> None:
    print(f"[run] {' '.join(args)}", file=sys.stderr)
    subprocess.run(args, check=True, env=psql_env())


def common_args(dbname: str) -> list[str]:
    host, port, user, _password = settings()
    return ["--host", host, "--port", str(port), "--username", user, "--dbname", dbname]


def backup(dbname: str, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    command(
        [
            "pg_dump",
            "--format=custom",
            "--no-owner",
            "--no-privileges",
            "--no-tablespaces",
            *common_args(dbname),
            "--file",
            str(destination),
        ]
    )
    print(f"[ok]   backed up {dbname} to {destination}")


def restore(dbname: str, source: Path, *, clean: bool = False) -> None:
    if not source.is_file():
        raise SystemExit(f"backup file does not exist: {source}")
    host, port, user, _password = settings()
    args = ["pg_restore"]
    if clean:
        # Useful for a real restore into an existing database. Scratch-drill
        # targets are empty, so we skip it: --clean can try to drop built-in
        # extension objects that the dump only comments on.
        args.extend(["--clean", "--if-exists"])
    args.extend(
        [
            "--no-owner",
            "--no-privileges",
            "--host",
            host,
            "--port",
            str(port),
            "--username",
            user,
            "--dbname",
            dbname,
            str(source),
        ]
    )
    command(args)
    print(f"[ok]   restored {source} into {dbname}")


def sql_dump(dbname: str, destination: Path) -> None:
    """Create a portable plain-SQL dump for the scratch restore drill.

    The operational ``backup``/``restore`` commands use pg_dump's custom format.
    The drill deliberately uses plain SQL so it can restore with ``psql`` alone
    and does not depend on pg_restore's extension/owner handling.
    """
    destination.parent.mkdir(parents=True, exist_ok=True)
    command(
        [
            "pg_dump",
            "--format=plain",
            "--no-owner",
            "--no-privileges",
            "--no-tablespaces",
            *common_args(dbname),
            "--file",
            str(destination),
        ]
    )
    print(f"[ok]   dumped {dbname} to {destination}")


def sanitize_sql_dump(source: Path) -> None:
    """Remove session settings newer than the target server.

    A newer pg_dump can emit ``SET transaction_timeout = 0;``, which older
    servers (including the Postgres 16 CI service) reject. It is a client-only
    session default and is safe to drop from a logical restore.
    """
    text = source.read_text(encoding="utf-8")
    cleaned = re.sub(
        r"(?im)^\s*SET\s+transaction_timeout\s*=.*?;\s*$", "", text
    )
    if cleaned != text:
        source.write_text(cleaned, encoding="utf-8")
        print("[ok]   removed unsupported transaction_timeout setting")


def sql_restore(dbname: str, source: Path) -> None:
    command(
        [
            "psql",
            "--no-psqlrc",
            "--set",
            "ON_ERROR_STOP=1",
            "--quiet",
            *common_args(dbname),
            "--file",
            str(source),
        ]
    )
    print(f"[ok]   restored {source} into {dbname}")


def drop_database(name: str) -> None:
    # Scratch databases have no long-lived connections. Avoid WITH (FORCE),
    # which requires elevated privileges on some deployments.
    with psycopg.connect(conninfo(ADMIN_DB), autocommit=True) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                sql.SQL("DROP DATABASE IF EXISTS {}").format(sql.Identifier(name))
            )


def create_database(name: str) -> None:
    with psycopg.connect(conninfo(ADMIN_DB), autocommit=True) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                sql.SQL("CREATE DATABASE {}").format(sql.Identifier(name))
            )


def drill(source: str, target: str) -> int:
    if source == target:
        raise SystemExit("source and target databases must differ")
    token = uuid.uuid4().hex
    drop_database(source)
    drop_database(target)
    create_database(source)
    create_database(target)

    try:
        with psycopg.connect(conninfo(source)) as connection:
            with connection.cursor() as cursor:
                cursor.execute("CREATE TABLE backup_drill_marker (value text NOT NULL)")
                cursor.execute(
                    "INSERT INTO backup_drill_marker (value) VALUES (%s)", (token,)
                )
            connection.commit()

        with tempfile.TemporaryDirectory(prefix="hotel-backup-drill-") as directory:
            dump = Path(directory) / "drill.sql"
            sql_dump(source, dump)
            sanitize_sql_dump(dump)
            sql_restore(target, dump)

        with psycopg.connect(conninfo(target)) as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT value FROM backup_drill_marker")
                row = cursor.fetchone()
        if not row or row[0] != token:
            raise SystemExit(
                "restore drill failed: marker row absent or different after restore"
            )
        print(f"[ok]   restored marker {token} verified in {target}")
        print("\nBackup/restore drill passed.")
        return 0
    finally:
        drop_database(source)
        drop_database(target)
        print(f"[ok]   dropped scratch databases {source} and {target}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    backup_parser = subparsers.add_parser("backup", help="dump a database")
    backup_parser.add_argument("--db", default=os.getenv("POSTGRES_DB", DEFAULT_DB))
    backup_parser.add_argument("--file", required=True, type=Path)

    restore_parser = subparsers.add_parser("restore", help="restore a dump")
    restore_parser.add_argument("--db", required=True)
    restore_parser.add_argument("--file", required=True, type=Path)
    restore_parser.add_argument(
        "--clean",
        action="store_true",
        help="Drop existing objects before restoring (for a real restore).",
    )

    drill_parser = subparsers.add_parser("drill", help="restore into scratch databases")
    drill_parser.add_argument("--source", default="hotel_backup_source")
    drill_parser.add_argument("--target", default="hotel_backup_restore")

    args = parser.parse_args()
    try:
        if args.command == "backup":
            backup(args.db, args.file)
            return 0
        if args.command == "restore":
            restore(args.db, args.file, clean=args.clean)
            return 0
        return drill(args.source, args.target)
    except subprocess.CalledProcessError as exc:
        print(f"[FAIL] {exc.cmd[0]} exited {exc.returncode}", file=sys.stderr)
        return 1
    except psycopg.Error as exc:
        print(f"[FAIL] Postgres error: {exc}", file=sys.stderr)
        return 2
    except Exception:
        traceback.print_exc(file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
