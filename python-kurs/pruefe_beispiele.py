#!/usr/bin/env python3
"""Fuehrt jeden Codeblock mit hinterlegter Ausgabe aus und vergleicht das Ergebnis."""
import io
import json
import sys
import builtins
import traceback
from pathlib import Path

WURZEL = Path(__file__).resolve().parent
KURS = json.loads((WURZEL / "kurs.json").read_text(encoding="utf-8"))

# Beispiele legen Dateien an, deshalb laeuft alles in einem eigenen Verzeichnis.
import os, tempfile
_arbeit = tempfile.mkdtemp(prefix="pykurs-")
os.chdir(_arbeit)
nur = sys.argv[1] if len(sys.argv) > 1 else None

geprueft = 0
uebersprungen = 0
abweichungen = []


def lauf(quelle, eingaben):
    puffer = io.StringIO()
    raum = {"__name__": "__main__"}
    warte = list(eingaben or [])

    def _eingabe(aufforderung=""):
        if aufforderung:
            puffer.write(str(aufforderung))
        wert = str(warte.pop(0)) if warte else ""
        puffer.write(wert + "\n")
        return wert

    alt = (sys.stdout, sys.stderr, builtins.input)
    sys.stdout = sys.stderr = puffer
    builtins.input = _eingabe
    fehler = None
    try:
        exec(compile(quelle, "<beispiel>", "exec"), raum)
    except BaseException:
        fehler = traceback.format_exc().strip().split("\n")[-1]
    finally:
        sys.stdout, sys.stderr, builtins.input = alt
    return puffer.getvalue(), fehler


def sammle(bloecke, wo):
    global geprueft, uebersprungen
    for i, b in enumerate(bloecke or []):
        if not isinstance(b, dict) or b.get("t") != "code":
            continue
        if b.get("aus") is None or b.get("shell") or b.get("roh") or b.get("nichtpruefen"):
            continue
        if b.get("pakete"):
            try:
                for paket in b["pakete"]:
                    __import__(paket)
            except ImportError:
                uebersprungen += 1
                continue
        geprueft += 1
        ausgabe, fehler = lauf(b["x"], b.get("eingaben"))
        if fehler:
            abweichungen.append((f"{wo} Block {i}", "Abbruch", fehler, ""))
            continue
        ist = ausgabe.rstrip("\n")
        soll = b["aus"].rstrip("\n")
        if ist != soll:
            abweichungen.append((f"{wo} Block {i}", "Ausgabe weicht ab", repr(soll), repr(ist)))


for m in KURS["module"]:
    for lek in m["lektionen"]:
        if nur and nur not in lek["id"] and nur not in m["id"]:
            continue
        sammle(lek.get("inhalt"), lek["id"])
        for auf in lek.get("aufgaben", []):
            sammle(auf.get("text"), f"{lek['id']}/{auf['id']}")

print("--------------------------------------------")
print(f"Beispiele geprueft: {geprueft}   (uebersprungen: {uebersprungen})")
if abweichungen:
    print(f"ABWEICHUNGEN: {len(abweichungen)}")
    for wo, art, soll, ist in abweichungen:
        print(f"  ! {wo}: {art}")
        print(f"      erwartet: {soll}")
        if ist:
            print(f"      erhalten: {ist}")
    raise SystemExit(1)
print("Jede hinterlegte Ausgabe stimmt mit der echten Ausfuehrung ueberein.")
