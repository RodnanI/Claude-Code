#!/usr/bin/env bash
# Score, performance and recording of the Passacaglia, Chorale and Fugue.
#
#   SFZ="/abs/path/Salamander Grand Piano V3.sfz" \
#   SFIZZ=/abs/path/sfizz/build/library/bin/sfizz_render \
#   BUILD=/tmp/pcf-build ./build.sh
set -euo pipefail

NAME=passacaglia-chorale-fugue
STEM=passacaglia_chorale_fugue
HERE="$(cd "$(dirname "$0")" && pwd)"
BUILD="${BUILD:-$HERE/build}"
SFZ="${SFZ:?set SFZ to the Salamander Grand Piano V3 .sfz file}"
SFIZZ="${SFIZZ:-sfizz_render}"
SEED="${SEED:-7}"

mkdir -p "$BUILD"
cd "$HERE"

echo "== compose"
python3 compose.py "$BUILD"

echo "== engrave (LilyPond)"
( cd "$BUILD" && lilypond -dno-point-and-click -o score "$STEM.ly" 2>&1 \
    | grep -i -A3 "warning\|error" || true )

echo "== perform"
python3 perform.py "$BUILD/score.midi" "$BUILD/score_meta.json" "$BUILD/performance.mid" "$SEED"

echo "== render (sfizz + Salamander Grand Piano V3)"
"$SFIZZ" --sfz "$SFZ" --midi "$BUILD/performance.mid" --wav "$BUILD/dry.wav" \
    -s 48000 -q 3 -p 256 > /dev/null

echo "== master"
python3 master.py "$BUILD/dry.wav" "$BUILD/master.wav"

echo "== encode"
ffmpeg -loglevel error -y -i "$BUILD/master.wav" -codec:a libmp3lame -b:a 320k -ar 48000 "$BUILD/$NAME.mp3"
ffmpeg -loglevel error -y -i "$BUILD/master.wav" -ar 44100 -sample_fmt s16 -compression_level 8 "$BUILD/$NAME.flac"

cp "$BUILD/$NAME.mp3" "$BUILD/$NAME.flac" "$HERE/"
cp "$BUILD/score.pdf" "$HERE/$NAME-score.pdf"
cp "$BUILD/$STEM.ly" "$HERE/$NAME.ly"
cp "$BUILD/score.midi" "$HERE/$NAME-score.mid"
cp "$BUILD/performance.mid" "$HERE/$NAME-performance.mid"
echo "== done: $HERE"
