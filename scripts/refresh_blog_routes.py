#!/usr/bin/env python3
"""Refresh the CMS-backed blog slugs used by the sitemap and prerenderer.

The frontend route manifest marks `/blog/:slug` as dynamic, so its concrete URLs
cannot be inferred from code. Run this script after publishing posts (or from a
deploy hook before `npm run build`) with `SITE_API_URL` pointing at the public
API, for example `https://api.example.com/api/v1`.
"""

from __future__ import annotations

import json
import os
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

API_URL = (
    os.environ.get("SITE_API_URL")
    or os.environ.get("VITE_API_URL")
    or "http://127.0.0.1:8000/api/v1"
).rstrip("/")
OUTPUT = Path(__file__).resolve().parents[1] / "frontend" / "src" / "content" / "blog-routes.json"


def main() -> None:
    with urllib.request.urlopen(f"{API_URL}/content/posts/", timeout=15) as response:
        posts = json.load(response)

    slugs = sorted({post["slug"] for post in posts if post.get("slug")})
    OUTPUT.write_text(
        json.dumps(
            {"generatedAt": datetime.now(timezone.utc).isoformat(), "slugs": slugs},
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(slugs)} blog slug(s) to {OUTPUT}")


if __name__ == "__main__":
    main()
