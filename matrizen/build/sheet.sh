#!/usr/bin/env bash
# sheet.sh <video> <out.png> [cols] [n]
# Kontaktbogen: n gleichmäßig verteilte Frames als Raster.
set -euo pipefail
V="$1"; OUT="$2"; COLS="${3:-3}"; N="${4:-9}"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$V")
TMP=$(mktemp -d)
for i in $(seq 0 $((N-1))); do
  T=$(python3 -c "print(max(0.2,$DUR*($i+0.5)/$N))")
  ffmpeg -y -loglevel error -ss "$T" -i "$V" -frames:v 1 -vf scale=640:-1 -update 1 "$TMP/$(printf %03d $i).png"
done
ffmpeg -y -loglevel error -pattern_type glob -i "$TMP/*.png" -filter_complex "tile=${COLS}x$(( (N+COLS-1)/COLS )):margin=6:padding=6:color=0x222222" -frames:v 1 -update 1 "$OUT"
rm -rf "$TMP"
echo "$OUT"
