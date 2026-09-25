#!/usr/bin/env bash
# Full pipeline: composition -> engraved score + score MIDI -> humanised
# performance MIDI -> Salamander Grand Piano render -> hall + master -> files.
#
# Needs python3 (mido numpy scipy soundfile), LilyPond >= 2.24, ffmpeg,
# sfizz_render (https://github.com/sfztools/sfizz, -DSFIZZ_RENDER=ON) and the
# Salamander Grand Piano V3 SFZ (https://github.com/sfzinstruments/SalamanderGrandPiano).
#
#   SFZ=/path/to/"Salamander Grand Piano V3.sfz" SFIZZ=/path/to/sfizz_render ./build.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
SFZ="${SFZ:?set SFZ to the Salamander Grand Piano V3 .sfz file}"
SFIZZ="${SFIZZ:-sfizz_render}"
BUILD="${BUILD:-$HERE/build}"
NAME=fantaisie-ballade
mkdir -p "$BUILD"

python3 "$HERE/compose.py" "$BUILD"
(cd "$BUILD" && lilypond -s fantaisie_ballade.ly)
python3 "$HERE/perform.py" "$BUILD/fantaisie_ballade.midi" "$BUILD/score_meta.json" "$BUILD/performance.mid"
"$SFIZZ" --sfz "$SFZ" --midi "$BUILD/performance.mid" --wav "$BUILD/dry.wav" -s 48000 -q 3 -p 256 >/dev/null
python3 "$HERE/master.py" "$BUILD/dry.wav" "$BUILD/master.wav"

META=(-metadata title="Fantaisie-Ballade in D minor" -metadata artist="Claude"
      -metadata comment="Salamander Grand Piano V3 (Alexander Holm, CC-BY 3.0) rendered with sfizz")
ffmpeg -y -loglevel error -i "$BUILD/master.wav" "${META[@]}" -c:a libmp3lame -b:a 320k "$HERE/$NAME.mp3"
ffmpeg -y -loglevel error -i "$BUILD/master.wav" "${META[@]}" -c:a flac -sample_fmt s16 -ar 44100 \
       -compression_level 12 "$HERE/$NAME.flac"
cp "$BUILD/fantaisie_ballade.pdf" "$HERE/$NAME-score.pdf"
cp "$BUILD/fantaisie_ballade.ly" "$HERE/$NAME.ly"
cp "$BUILD/fantaisie_ballade.midi" "$HERE/$NAME-score.mid"
cp "$BUILD/performance.mid" "$HERE/$NAME-performance.mid"
ls -la "$HERE"
