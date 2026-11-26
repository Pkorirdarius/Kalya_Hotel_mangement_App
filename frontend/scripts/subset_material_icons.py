#!/usr/bin/env python
"""Rebuild the Material Symbols font with only the icons used by the app.

The full upstream font is kept at `material-icons-outlined-source.woff2` next to
this script. The site uses a small fixed set of icons, so this script filters
the GSUB ligature table to the icon names found in `src/`, then subsets a copy
of the source font to those glyphs and the ASCII characters the ligatures need.
The result is ~9 KiB and is what ships in
`public/fonts/material-icons-outlined.woff2`.

Requires `fonttools` and `brotli` in the Python environment. This is a build
tool, not a runtime dependency; CI does not regenerate the font.

Usage from the repository root:

    .venv\\Scripts\\python.exe frontend/scripts/subset_material_icons.py
"""

from __future__ import annotations

import re
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "frontend" / "src"
SOURCE = ROOT / "frontend" / "scripts" / "material-icons-outlined-source.woff2"
OUTPUT = ROOT / "frontend" / "public" / "fonts" / "material-icons-outlined.woff2"


ICON_FIELD = re.compile(r"\b(?:icon|pillIcon|noteIcon)\s*:\s*'([a-z0-9_]+)'")
ICON_MAP = re.compile(r"\b[A-Za-z_]*ICON[A-Za-z_]*\s*(?::[^=;{]+)?=\s*\{")
ICON_SPAN = re.compile(
    r"<span\b[^>]*material-symbols-outlined[^>]*>([\s\S]*?)</span>"
)
QUOTED_NAME = re.compile(r"['\"]([a-z][a-z0-9_]*)['\"]")


def object_values(text: str, start: int) -> set[str]:
    """Collect quoted values from the object literal starting at `start`."""
    depth = 0
    for index in range(text.index("{", start), len(text)):
        if text[index] == "{":
            depth += 1
        elif text[index] == "}":
            depth -= 1
            if depth == 0:
                return set(QUOTED_NAME.findall(text[start:index]))
    return set()


def used_icon_names() -> set[str]:
    names: set[str] = set()
    for path in SRC.rglob("*"):
        if path.suffix not in {".ts", ".tsx"}:
            continue
        text = path.read_text(encoding="utf-8")
        # Icon fields are named differently across data objects (icon,
        # pillIcon, noteIcon); spans may render them as {value} instead of a
        # literal, so pick the values up from the data as well.
        names.update(ICON_FIELD.findall(text))
        # Some icons live in named maps rather than icon fields, e.g.
        # PAGE_ICONS and EQUIPMENT_ICONS.
        for match in ICON_MAP.finditer(text):
            names.update(object_values(text, match.start()))
        # Literal span text plus any quoted fallbacks inside dynamic spans,
        # e.g. {PAGE_ICONS[page] ?? 'chevron_right'}.
        for match in ICON_SPAN.finditer(text):
            inner = match.group(1).strip()
            if re.fullmatch(r"[a-z0-9_]+", inner):
                names.add(inner)
            else:
                names.update(QUOTED_NAME.findall(inner))
    return names


def ligature_name(
    prefix: str,
    component: list[str],
    reverse_cmap: dict[str, int],
) -> str | None:
    chars: list[str | None] = []
    for glyph in [prefix, *component]:
        char = reverse_cmap.get(glyph)
        chars.append(chr(char) if char is not None and 32 <= char <= 126 else None)
    return "".join(chars) if all(chars) else None


def main() -> None:
    names = used_icon_names()
    font = TTFont(SOURCE)
    cmap = font.getBestCmap()
    reverse_cmap = {glyph: char for char, glyph in cmap.items()}

    ligature_glyphs: dict[str, str] = {}
    for lookup in font["GSUB"].table.LookupList.Lookup:
        subtables = lookup.SubTable
        if lookup.LookupType == 7:  # Extension substitution
            subtables = [subtable.ExtSubTable for subtable in subtables]
        for subtable in subtables:
            if subtable.LookupType != 4:
                continue
            for prefix, records in subtable.ligatures.items():
                kept = []
                for record in records:
                    name = ligature_name(prefix, record.Component, reverse_cmap)
                    if name is not None:
                        ligature_glyphs[name] = record.LigGlyph
                        if name in names:
                            kept.append(record)
                subtable.ligatures[prefix] = kept

    missing = sorted(name for name in names if name not in ligature_glyphs)
    if missing:
        raise SystemExit(f"No ligature found for icon(s): {', '.join(missing)}")

    glyphs = {".notdef"}
    glyphs.update(glyph for char, glyph in cmap.items() if 32 <= char <= 126)
    glyphs.update(ligature_glyphs[name] for name in names)

    options = subset.Options()
    options.flavor = "woff2"
    options.desubroutinize = True
    options.layout_features = ["*"]
    options.glyph_names = False
    options.notdef_glyph = True
    options.notdef_outline = False
    options.recommended_glyphs = False

    subsetter = subset.Subsetter(options=options)
    subsetter.populate(glyphs=glyphs)
    subsetter.subset(font)
    font.flavor = "woff2"
    font.save(OUTPUT)

    print(
        f"Subset {len(names)} icon ligatures into {OUTPUT.relative_to(ROOT)} "
        f"({OUTPUT.stat().st_size} bytes)."
    )


if __name__ == "__main__":
    main()
