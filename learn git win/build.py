#!/usr/bin/env python3
"""Compile src/ into one standalone file: learn-git-win.html

Windows:  py build.py        (or double-click build.cmd, which needs no Python)
Order:    files in src/styles, src/chapters and src/scripts are joined by
          file name, so the number prefix (01-, 02-, ...) decides the order.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
OUT = ROOT / "learn-git-win.html"


def bundle(folder, pattern, banner):
    parts = []
    for f in sorted((SRC / folder).glob(pattern)):
        parts.append(banner.format(f.name))
        parts.append(f.read_text(encoding="utf-8").strip())
    return "\n".join(parts)


def main():
    html = (SRC / "template.html").read_text(encoding="utf-8")
    pieces = {
        "/*@CSS@*/": bundle("styles", "*.css", "/* {} */"),
        "<!--@CHAPTERS@-->": bundle("chapters", "*.html", "<!-- {} -->"),
        "/*@JS@*/": bundle("scripts", "*.js", "/* {} */"),
    }
    for marker, content in pieces.items():
        if marker not in html:
            raise SystemExit(f"template.html is missing the {marker} marker")
        html = html.replace(marker, content)
    with open(OUT, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(html)
    print(f"Built {OUT.name} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
