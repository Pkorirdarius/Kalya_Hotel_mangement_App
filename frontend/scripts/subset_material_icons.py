#!/usr/bin/env python
"""Rebuild the Material Symbols font with only the icons used by the app.

The upstream outlined font contains thousands of icons (~250 KiB). The site
uses a small fixed set, so this script filters the GSUB ligature table to the
icon names found in `src/`, then subsets the WOFF2 to those glyphs and the ASCII
characters the ligatures need. The result is ~9 KiB and is what ships in
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
FONT = ROOT / "frontend" / "public" / "fonts" / "material-icons-outlined.woff2"
OUTPUT = FONT


def used_icon_names() -> set[str]:
    names: set[str] = set()
    for path in SRC.rglob("*"):
        if path.suffix not in {".ts", ".tsx"}:
            continue
        text = path.read_text(encoding="utf-8")
        # Static icon config objects and literal <span> icon names.
        names.update(re.findall(r"icon\s*:\s*'([a-z0-9_]+)'", text))
        names.update(re.findall(r"iconClass\s*:\s*'([a-z0-9_]+)'", text))
        names.update(
            match.group(1)
            for match in re.finditer(
                r"material-symbols-outlined[^>]*>\s*([a-z0-9_]+)\s*<", text
            )
        )
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
    font = TTFont(FONT)
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
