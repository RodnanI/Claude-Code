#!/usr/bin/env bash
# Rendert alle Szenen des Kurses und setzt sie zu einem Video zusammen.
#
#   ./render.sh              -> 1080p30, komplettes Video mit Musik
#   ./render.sh -q l         -> schnelle Vorschau (854x480, 15 fps)
#   ./render.sh -j 2         -> nur 2 parallele Render-Prozesse
#   ./render.sh --no-render  -> nur zusammensetzen und vertonen
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$HERE")"
COURSE="$ROOT/course"
OUT="$ROOT/out"
PY=${PY:-/opt/manimenv/bin/python}
MANIM=${MANIM:-/opt/manimenv/bin/manim}

QUALITY=h
JOBS=4
SKIP_RENDER=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    -q) QUALITY="$2"; shift 2 ;;
    -j) JOBS="$2"; shift 2 ;;
    --no-render) SKIP_RENDER=1; shift ;;
    *) echo "unbekannte Option: $1"; exit 1 ;;
  esac
done

if [[ "$QUALITY" == "l" ]]; then
  RES="854,480"; FPS=15; DIR="480p15"
else
  RES="1920,1080"; FPS=30; DIR="1080p30"
fi

mkdir -p "$OUT"
cd "$COURSE"

render_one() {
  local mod="$1" scene="$2"
  local target="media/videos/$mod/$DIR/$scene.mp4"
  local log="/tmp/manim_${mod}_${scene}.log"
  if [[ -s "$target" ]]; then
    echo "  = $mod/$scene (vorhanden)"
    return 0
  fi
  if "$MANIM" --resolution "$RES" --fps "$FPS" --disable_caching \
       "$mod.py" "$scene" > "$log" 2>&1; then
    echo "  + $mod/$scene"
  else
    echo "  ! FEHLER $mod/$scene  ->  $log"
  fi
}

render_pass() {
  local jobs="$1" running=0
  while read -r mod scene; do
    [[ -z "${mod:-}" ]] && continue
    if (( jobs <= 1 )); then
      render_one "$mod" "$scene"
      continue
    fi
    render_one "$mod" "$scene" &
    running=$((running + 1))
    if (( running >= jobs )); then
      wait -n
      running=$((running - 1))
    fi
  done < <(awk 'NF' "$HERE/scenes.txt")
  wait
}

if [[ "$SKIP_RENDER" == "0" ]]; then
  # Erster Durchgang parallel. Dabei können sich zwei Prozesse beim
  # gemeinsamen LaTeX-Cache in die Quere kommen; deshalb wird danach
  # seriell nachgeholt, was fehlt (vorhandene Dateien werden übersprungen).
  echo ">>> Rendere Szenen ($DIR, $JOBS parallel)"
  render_pass "$JOBS"
  echo ">>> Zweiter Durchgang (seriell) für fehlende Szenen"
  render_pass 1
fi

# ---------------------------------------------------------------- prüfen
echo ">>> Prüfe Ausgabedateien"
LIST="$OUT/concat_$DIR.txt"
: > "$LIST"
MISSING=0
while read -r mod scene; do
  [[ -z "${mod:-}" ]] && continue
  f="$COURSE/media/videos/$mod/$DIR/$scene.mp4"
  if [[ ! -s "$f" ]]; then
    echo "  FEHLT: $mod/$scene"
    MISSING=$((MISSING + 1))
  else
    printf "file '%s'\n" "$f" >> "$LIST"
  fi
done < <(awk 'NF' "$HERE/scenes.txt")
if (( MISSING > 0 )); then
  echo "!!! $MISSING Szene(n) fehlen — Abbruch."
  exit 1
fi

# ---------------------------------------------------------------- Video
SILENT="$OUT/matrizen_stumm_$DIR.mp4"
echo ">>> Setze Szenen zusammen"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$LIST" -c copy "$SILENT" || exit 1
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SILENT")
python3 -c "print('>>> Gesamtlänge: %.1f min' % ($DUR/60))"

# ---------------------------------------------------------------- Musik
MUSIC="$OUT/musik.wav"
if [[ ! -s "$MUSIC" ]]; then
  echo ">>> Erzeuge Hintergrundmusik"
  "$PY" "$HERE/music.py" "$MUSIC" 12 || exit 1
fi

FINAL="$OUT/matrizen_kurs_$DIR.mp4"
FADE_OUT=$(python3 -c "print(max($DUR-6.0, 0.0))")
echo ">>> Mische Musik dazu"
ffmpeg -y -loglevel error \
  -i "$SILENT" \
  -stream_loop -1 -i "$MUSIC" \
  -filter_complex "[1:a]volume=0.16,afade=t=in:st=0:d=4,afade=t=out:st=$FADE_OUT:d=6[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -movflags +faststart \
  -shortest "$FINAL" || exit 1

echo ">>> Fertig:"
ls -lh "$FINAL"
