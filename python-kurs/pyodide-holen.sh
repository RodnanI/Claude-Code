#!/bin/sh
# Laedt Pyodide herunter und legt es neben die Kursdatei.
# Danach laeuft der Kurs ohne jede fremde Adresse, auch offline.
#
#   sh pyodide-holen.sh [zielordner]
#
# Ohne Angabe landet alles in dist/pyodide, also genau dort, wo die
# Kursdatei danach von allein danach sucht.

set -e

VERSION="0.28.3"
ZIEL="${1:-dist}"
ARCHIV="pyodide-$VERSION.tar.bz2"
ADRESSE="https://github.com/pyodide/pyodide/releases/download/$VERSION/$ARCHIV"

if [ -d "$ZIEL/pyodide" ]; then
  echo "In $ZIEL/pyodide liegt bereits etwas. Loesche den Ordner, wenn du neu laden willst."
  exit 0
fi

echo "Lade Pyodide $VERSION, das sind rund 200 MB ..."
mkdir -p "$ZIEL"
cd "$ZIEL"

if command -v curl > /dev/null 2>&1; then
  curl -L --fail -o "$ARCHIV" "$ADRESSE"
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
echo
echo "Fertig. $GROESSE in $ZIEL/pyodide"
echo "Lade den Ordner zusammen mit python-kurs.html auf deinen Server."
echo "Die Seite findet ihn von allein und braucht dann kein Netz mehr."
