#!/usr/bin/env python3
"""Fuehrt jede Musterloesung aus und prueft sie gegen ihre eigenen Pruefschritte.
So faellt auf, wenn eine Aufgabe gar nicht loesbar ist."""
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

gesamt = 0
schlecht = []


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
        exec(compile(quelle, "<loesung>", "exec"), raum)
    except BaseException:
        fehler = traceback.format_exc()
    finally:
        sys.stdout, sys.stderr, builtins.input = alt
    return puffer.getvalue(), fehler, raum, _eingabe


for m in KURS["module"]:
    for lek in m["lektionen"]:
        if nur and nur not in lek["id"] and nur not in m["id"]:
            continue
        for auf in lek.get("aufgaben", []):
            gesamt += 1
            kennung = f"{lek['id']} / {auf['id']}"
            ausgabe, fehler, raum, eingabe_fn = lauf(auf["loesung"], auf.get("eingaben"))
            if fehler:
                schlecht.append((kennung, "Loesung bricht ab", fehler.strip().split("\n")[-1]))
                continue
            raum["AUSGABE"] = ausgabe
            raum["QUELLE"] = auf["loesung"]
            for test in auf.get("tests", []):
                puffer = io.StringIO()
                alt = (sys.stdout, sys.stderr, builtins.input)
                sys.stdout = sys.stderr = puffer
                builtins.input = eingabe_fn
                try:
                    exec(compile(test["code"], "<test>", "exec"), raum)
                except AssertionError as e:
                    schlecht.append((kennung, test["name"], str(e) or "Bedingung nicht erfuellt"))
                except BaseException as e:
                    schlecht.append((kennung, test["name"], f"{type(e).__name__}: {e}"))
                finally:
                    sys.stdout, sys.stderr, builtins.input = alt

print("--------------------------------------------")
print(f"Aufgaben geprueft: {gesamt}")
if schlecht:
    print(f"FEHLGESCHLAGEN: {len(schlecht)}")
    for kennung, name, grund in schlecht:
        print(f"  ! {kennung}")
        print(f"      {name}: {grund}")
    raise SystemExit(1)
print("Jede Musterloesung besteht alle eigenen Pruefschritte.")
