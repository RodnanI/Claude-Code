#!/usr/bin/env bash
# Erzeugt aus dem fertigen Kurs eine kompakte Fassung, die unter das
# 100-MB-Limit von GitHub passt.
#
#   ./compress.sh [eingabe.mp4] [ziel-MB]
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$HERE")"
IN="${1:-$ROOT/out/matrizen_kurs_1080p30.mp4}"
TARGET_MB="${2:-94}"
OUT="$ROOT/out/matrizen_kurs_720p_kompakt.mp4"

[[ -s "$IN" ]] || { echo "Eingabe fehlt: $IN"; exit 1; }

DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")
AUDIO_K=64
VID_K=$(python3 - "$DUR" "$TARGET_MB" "$AUDIO_K" <<'PY'
import sys
dur, target_mb, audio_k = float(sys.argv[1]), float(sys.argv[2]), float(sys.argv[3])
total_kbit = target_mb * 8 * 1024
print(max(int(total_kbit / dur - audio_k), 120))
PY
)
echo ">>> Länge ${DUR}s, Ziel ${TARGET_MB} MB  ->  Video ${VID_K} kbit/s, Audio ${AUDIO_K} kbit/s"

COMMON=(-vf "scale=1280:720:flags=lanczos" -c:v libx264 -b:v "${VID_K}k"
        -preset slow -profile:v high -pix_fmt yuv420p -g 250 -bf 3)

cd "$ROOT/out"
echo ">>> Durchgang 1"
ffmpeg -y -loglevel error -i "$IN" "${COMMON[@]}" -pass 1 -an -f mp4 /dev/null
echo ">>> Durchgang 2"
ffmpeg -y -loglevel error -i "$IN" "${COMMON[@]}" -pass 2 \
  -c:a aac -b:a "${AUDIO_K}k" -ac 2 -movflags +faststart "$OUT"
rm -f ffmpeg2pass-0.log ffmpeg2pass-0.log.mbtree

echo ">>> Fertig:"
ls -lh "$OUT"
