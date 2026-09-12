#!/usr/bin/env python3
"""Baut aus den Quelldateien eine einzelne, eigenstaendige HTML-Datei."""
from pathlib import Path
import re
import sys

WURZEL = Path(__file__).resolve().parent
SRC = WURZEL / "src"
ZIEL = WURZEL / "dist" / "python-kurs.html"

CSS_REIHENFOLGE = [
    "reset.css",
    "tokens.css",
    "basis.css",
    "layout.css",
    "komponenten.css",
    "editor.css",
    "animationen.css",
    "druck.css",
]

JS_REIHENFOLGE = [
    "werkzeug.js",
    "markup.js",
    "highlight.js",
    "speicher.js",
    "thema.js",
    "laufzeit.js",
    "editor.js",
    "quiz.js",
    "aufgabe.js",
    "suche.js",
]

INHALT_REIHENFOLGE = [
    "_bausteine.js",
    "modul-01.js",
    "modul-02.js",
    "modul-03.js",
    "modul-04.js",
    "modul-05.js",
    "modul-06.js",
    "modul-07.js",
    "modul-08.js",
    "extras.js",
    "register.js",
]

APP_REIHENFOLGE = [
    "ansichten.js",
    "pruefung.js",
    "router.js",
    "app.js",
]


def lies(pfad: Path) -> str:
    if not pfad.exists():
        print(f"  fehlt: {pfad.relative_to(WURZEL)}", file=sys.stderr)
        return ""
    return pfad.read_text(encoding="utf-8")


def sammle(ordner: Path, namen) -> str:
    teile = []
    for name in namen:
        text = lies(ordner / name)
        if text.strip():
            teile.append(f"/* ==== {name} ==== */\n{text}")
    return "\n\n".join(teile)


def schuetze(js: str) -> str:
    """Verhindert, dass ein String im Code das script-Element vorzeitig schliesst."""
    return js.replace("</script", "<\\/script").replace("<!--", "<\\!--")


def baue() -> int:
    geruest = lies(SRC / "index.html")
    if not geruest:
        print("index.html fehlt, Abbruch", file=sys.stderr)
        return 1

    css = sammle(SRC / "css", CSS_REIHENFOLGE)
    js_kern = sammle(SRC / "js", JS_REIHENFOLGE)
    js_inhalt = sammle(SRC / "inhalt", INHALT_REIHENFOLGE)
    js_app = sammle(SRC / "js", APP_REIHENFOLGE)
    js = "\n\n".join([js_kern, js_inhalt, js_app])

    seite = geruest.replace("/*STIL*/", css)
    seite = seite.replace("/*SKRIPT*/", schuetze(js))

    offen = seite.count("/*STIL*/") + seite.count("/*SKRIPT*/")
    if offen:
        print("Platzhalter nicht ersetzt", file=sys.stderr)
        return 1

    ZIEL.parent.mkdir(parents=True, exist_ok=True)
    ZIEL.write_text(seite, encoding="utf-8")

    groesse = ZIEL.stat().st_size
    lektionen = len(re.findall(r"\bid:\s*['\"]l-", js_inhalt))
    print(f"gebaut: {ZIEL.relative_to(WURZEL)}")
    print(f"  Groesse: {groesse/1024:.0f} KB")
    print(f"  CSS: {len(css)/1024:.0f} KB, JS: {len(js)/1024:.0f} KB")
    print(f"  Lektionen gefunden: {lektionen}")
    return 0


if __name__ == "__main__":
    raise SystemExit(baue())
