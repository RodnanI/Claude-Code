#!/usr/bin/env python3
"""Build ASCII Heroes.

src/core.js         the shared glyph engine
src/heroes/*.html   one source file per hero, loading the engine with <script src="../core.js">
src/shell.html      the showcase page

Writes heroes/*.html (each hero standalone, engine inlined) and index.html
(the whole showcase in one standalone file, every hero embedded).
"""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src"
TAG = '<script src="../core.js"></script>'


def inline(html: str, core: str) -> str:
    assert TAG in html, "engine script tag missing"
    return html.replace(TAG, "<script>\n" + core + "\n</script>")


def main() -> None:
    core = (SRC / "core.js").read_text(encoding="utf-8").strip()
    out_dir = ROOT / "heroes"
    out_dir.mkdir(exist_ok=True)
    heroes = []
    for path in sorted((SRC / "heroes").glob("*.html")):
        src = path.read_text(encoding="utf-8")
        html = inline(src, core)
        (out_dir / path.name).write_text(html, encoding="utf-8")
        meta = json.loads(re.search(r"<meta name=\"ascii-hero\" content='(.*?)'>", src).group(1))
        meta.update(slug=path.stem.split("-", 1)[1], html=html)
        heroes.append(meta)
    # escape '<' so no embedded </script> or <!-- can end the data block early
    data = json.dumps(heroes, ensure_ascii=False)
    data = data.replace("<", "\\u003c").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
    shell = inline((SRC / "shell.html").read_text(encoding="utf-8"), core)
    assert "/*HEROES*/[]" in shell
    (ROOT / "index.html").write_text(shell.replace("/*HEROES*/[]", data), encoding="utf-8")
    size = (ROOT / "index.html").stat().st_size / 1024
    print(f"{len(heroes)} heroes -> heroes/, index.html {size:.0f} KB")


if __name__ == "__main__":
    main()
