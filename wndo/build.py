#!/usr/bin/env python3
"""Inline every stylesheet and script referenced by index.html into one standalone wndo.html."""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent
src = (ROOT / "index.html").read_text(encoding="utf-8")


def css(m):
    body = (ROOT / m.group(1)).read_text(encoding="utf-8")
    return "<style>\n" + body + "\n</style>"


def js(m):
    body = (ROOT / m.group(1)).read_text(encoding="utf-8")
    if "</script" in body:
        raise SystemExit(m.group(1) + " contains a closing script tag")
    return "<script>\n// " + m.group(1) + "\n" + body + "\n</script>"


out = re.sub(r'<link rel="stylesheet" href="([^"]+)">', css, src)
out = re.sub(r'<script src="([^"]+)"></script>', js, out)
(ROOT / "wndo.html").write_text(out, encoding="utf-8")
print("wrote wndo.html, %.0f KB" % (len(out.encode("utf-8")) / 1024))
