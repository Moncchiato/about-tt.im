#!/usr/bin/env python3
"""
Rebuild the site's share image and icons with headless Chrome:

  og-image.png          1200×630  shown when a page is shared (from tools/og-image.html)
  favicon.png             96×96   browser tab and search-result icon (the TTIM brand mark)
  apple-touch-icon.png   180×180  home-screen icon on phones

Usage: python3 tools/make_images.py
"""
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from prerender import ROOT, find_chrome  # noqa: E402

MARK = """<!doctype html><html><head><style>
html,body{margin:0;background:transparent}
div{width:%(s)dpx;height:%(s)dpx;border-radius:%(r)s;
  background:conic-gradient(from 200deg,#7c5cff,#ff5db1,#ff9f1c,#16c2c2,#7c5cff)}
</style></head><body><div></div></body></html>"""


def shoot(url, out, w, h, transparent=False):
    with tempfile.TemporaryDirectory() as profile:
        cmd = [find_chrome(), "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
               f"--user-data-dir={profile}", f"--window-size={w},{h}", "--virtual-time-budget=8000",
               f"--screenshot={out}", url]
        if transparent:
            cmd.insert(1, "--default-background-color=00000000")
        subprocess.run(cmd, capture_output=True, timeout=120, check=True)
    print("wrote", Path(out).relative_to(ROOT))


def main():
    shoot((ROOT / "tools/og-image.html").as_uri(), ROOT / "og-image.png", 1200, 630)
    with tempfile.TemporaryDirectory() as d:
        for name, size, radius, transparent in [("favicon.png", 96, "30%", True),
                                                ("apple-touch-icon.png", 180, "0", False)]:
            page = Path(d) / f"{name}.html"
            page.write_text(MARK % {"s": size, "r": radius})
            shoot(page.as_uri(), ROOT / name, size, size, transparent)


if __name__ == "__main__":
    main()
