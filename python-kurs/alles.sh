#!/bin/sh
# Prueft Inhalte, Musterloesungen und Beispielausgaben, baut dann die Datei.
set -e
cd "$(dirname "$0")"
node pruefe.js --json
python3 pruefe_loesungen.py
python3 pruefe_beispiele.py
# Zweiter Lauf mit anderem Hash-Startwert deckt Ausgaben auf, die von der
# zufaelligen Reihenfolge in Mengen abhaengen.
PYTHONHASHSEED=12345 python3 pruefe_beispiele.py > /dev/null && echo "Zweiter Lauf mit anderem Hash-Startwert: gleich"
python3 build.py
