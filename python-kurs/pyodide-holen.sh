#!/bin/sh
# Laedt Pyodide herunter und legt es neben die Kursdatei.
# Danach laeuft der Kurs ohne jede fremde Adresse, auch offline.
#
#   sh pyodide-holen.sh              vollstaendig, rund 334 MB, alles laeuft
#   sh pyodide-holen.sh kern         nur der Kern, rund 6 MB, ohne numpy und pandas
#   sh pyodide-holen.sh voll /pfad   Zielordner selbst bestimmen
#
# Ohne Angabe landet alles in dist/pyodide, also genau dort, wo die
# Kursdatei danach von allein sucht.

set -e

VERSION="314.0.6"
UMFANG="${1:-voll}"
ZIEL="${2:-dist}"

case "$UMFANG" in
  kern|core) ARCHIV="pyodide-core-$VERSION.tar.bz2"; HINWEIS="nur der Kern, Modul 8 braucht dann das Netz" ;;
  *)         ARCHIV="pyodide-$VERSION.tar.bz2";      HINWEIS="vollstaendig mit numpy und pandas" ;;
esac

ADRESSE="https://github.com/pyodide/pyodide/releases/download/$VERSION/$ARCHIV"

if [ -d "$ZIEL/pyodide" ]; then
  echo "In $ZIEL/pyodide liegt bereits etwas."
  echo "Loesche den Ordner, wenn du neu laden willst."
  exit 0
fi

echo "Lade Pyodide $VERSION ($HINWEIS) ..."
mkdir -p "$ZIEL"
cd "$ZIEL"

if command -v curl > /dev/null 2>&1; then
  curl -L --fail --progress-bar -o "$ARCHIV" "$ADRESSE"
elif command -v wget > /dev/null 2>&1; then
  wget -O "$ARCHIV" "$ADRESSE"
else
  echo "Weder curl noch wget gefunden."
  exit 1
fi

echo "Entpacke ..."
tar xjf "$ARCHIV"
rm -f "$ARCHIV"

if [ ! -f "pyodide/pyodide.js" ]; then
  echo "Das Entpacken hat nicht geklappt, pyodide/pyodide.js fehlt."
  exit 1
fi

GROESSE=$(du -sh pyodide | cut -f1)
DATEIEN=$(find pyodide -type f | wc -l)

echo
echo "Fertig. $GROESSE in $ZIEL/pyodide, $DATEIEN Dateien."
echo
echo "Lade den Ordner zusammen mit python-kurs.html auf deinen Server:"
echo "    python-kurs.html"
echo "    pyodide/pyodide.js"
echo "    pyodide/pyodide.asm.wasm"
echo "    ..."
echo
echo "Wichtig: der Server muss .wasm als application/wasm ausliefern."
echo "Die Seite findet den Ordner von allein. Pruefen kannst du das"
echo "im Menue unter Technikpruefung."
