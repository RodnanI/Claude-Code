#!/usr/bin/env python3
"""Compile src/ into one standalone HTML file: machine-learning.html

Usage: python3 build.py
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
OUT = ROOT / "machine-learning.html"


def cat(paths):
    return "\n".join(p.read_text(encoding="utf-8") for p in paths)


def main():
    styles = cat(SRC / "styles" / n for n in ("tokens.css", "layout.css", "components.css"))
    scripts = cat([SRC / "scripts" / "core.js", SRC / "scripts" / "ml.js",
                   *sorted((SRC / "scripts" / "demos").glob("*.js"))]) + "\nML.start();\n"
    chapters = cat(sorted((SRC / "chapters").glob("*.html")))

    if "</script" in scripts.lower():
        sys.exit("error: a script contains '</script', which would break inlining")

    html = (SRC / "template.html").read_text(encoding="utf-8")
    html = (html.replace("/*@STYLES*/", styles)
                .replace("<!--@CHAPTERS-->", chapters)
                .replace("/*@SCRIPTS*/", scripts))

    if "—" in html:
        line = html[:html.index("—")].count("\n") + 1
        sys.exit(f"error: em dash found in output (line {line})")

    OUT.write_text(html, encoding="utf-8")
    print(f"wrote {OUT.name}: {len(html) / 1024:.0f} KB")


if __name__ == "__main__":
    main()
