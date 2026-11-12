#!/usr/bin/env python
"""Fail if a brand string is hard-coded outside the allowed brand sources.

The single sources of truth for the brand are:

* frontend/src/config/hotel.ts      (frontend brand config)
* frontend/src/i18n.ts              (translatable content / template vars)
* backend/config/settings/base.py   (HOTEL_* defaults)
* seed data                         (placeholder content for the CMS)
* historical migrations             (must not be rewritten)
* .env.example                      (documented environment defaults)

Everything else — components, pages, templates, tests, admin code — must read
the brand from configuration. Run from the repository root:

    python scripts/check_brand.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

SCAN_ROOTS = [
    REPO_ROOT / "frontend" / "src",
    REPO_ROOT / "frontend" / "index.html",
    REPO_ROOT / "backend" / "apps",
    REPO_ROOT / "backend" / "config",
    REPO_ROOT / "backend" / "templates",
]

# Paths (relative to the repo root, POSIX separators) where brand strings are
# expected and therefore allowed.
ALLOWED = {
    "frontend/src/config/hotel.ts",
    "frontend/src/i18n.ts",
    "frontend/src/lib/api/types.ts",
    "backend/config/settings/base.py",
    "backend/apps/common/management/commands/seed_hotel.py",
    ".env.example",
}

ALLOWED_PREFIXES = (
    "backend/apps/common/migrations/",
    "backend/apps/*/migrations/",
)

SKIP_DIRS = {
    ".git",
    ".venv",
    "node_modules",
    "dist",
    "build",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    "coverage",
    "htmlcov",
    "playwright-report",
    "test-results",
    "staticfiles",
    "media",
}

TEXT_SUFFIXES = {
    ".py",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".json",
    ".html",
    ".txt",
    ".md",
    ".css",
    ".scss",
    ".yml",
    ".yaml",
    ".toml",
    ".ini",
    ".cfg",
    ".xml",
    ".example",
}

# Brand tokens. Add future brand names here so a rename cannot leak into code.
BRAND_PATTERN = re.compile(r"(?i)\b(west\s*premier|kalya)\b")


def _relative(path: Path) -> str:
    return path.relative_to(REPO_ROOT).as_posix()


def _is_allowed(relative: str) -> bool:
    if relative in ALLOWED:
        return True
    parts = relative.split("/")
    # Any migrations package is historical and must not be edited.
    if "migrations" in parts:
        return True
    return any(relative.startswith(prefix) for prefix in ALLOWED_PREFIXES)


def _iter_files(root: Path):
    if not root.exists():
        return
    if root.is_file():
        yield root
        return
    for path in root.rglob("*"):
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        if path.is_file() and path.suffix.lower() in TEXT_SUFFIXES:
            yield path


def main() -> int:
    problems: list[str] = []
    for root in SCAN_ROOTS:
        for path in _iter_files(root):
            relative = _relative(path)
            if _is_allowed(relative):
                continue
            try:
                lines = path.read_text(encoding="utf-8").splitlines()
            except UnicodeDecodeError:
                continue
            for number, line in enumerate(lines, start=1):
                if BRAND_PATTERN.search(line):
                    problems.append(f"{relative}:{number}: {line.strip()}")

    if problems:
        print("Brand strings must live in the brand configuration, not in code:")
        for problem in problems:
            print(f"  {problem}")
        print(
            "\nAllowed sources: frontend/src/config/hotel.ts, frontend/src/i18n.ts, "
            "backend/config/settings/base.py, seed data, migrations, .env.example."
        )
        return 1

    print("Brand check passed: no hard-coded brand strings in code or tests.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
