#!/usr/bin/env python3
"""Compile index.html, js/ and fonts/ into one standalone file: palimpsest.html

Usage: python3 build.py
"""
import base64
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "palimpsest.html"


def font(m):
    data = (ROOT / m.group(1)).read_bytes()
    return "url(data:font/woff2;base64," + base64.b64encode(data).decode("ascii") + ")"


def script(m):
    code = (ROOT / m.group(1)).read_text(encoding="utf-8")
    low = code.lower()
    if "</script" in low or "<!--" in low:
        sys.exit(f"error: {m.group(1)} contains '</script' or '<!--', which would break inlining")
    return "<script>\n" + code.rstrip() + "\n</script>"


def main():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    html, nf = re.subn(r"url\((fonts/[\w.-]+\.woff2)\)", font, html)
    html, ns = re.subn(r'<script src="(js/[\w.-]+\.js)"></script>', script, html)
    if re.search(r'src="js/|url\(fonts/', html):
        sys.exit("error: a local file is still referenced after inlining")
    if "\u2014" in html:
        line = html[:html.index("\u2014")].count("\n") + 1
        sys.exit(f"error: em dash found in output (line {line})")
    OUT.write_text(html, encoding="utf-8")
    print(f"wrote {OUT.name}: {len(html) / 1024:.0f} KB ({nf} fonts, {ns} scripts)")


if __name__ == "__main__":
    main()
