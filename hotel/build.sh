#!/bin/bash
# build.sh -- render the tape end to end.
#
#   ./build.sh [output.mp4]
#
# Stage 1 raymarches 7200 frames straight into x264 and writes a sidecar file of
# footfall and event times. Stage 2 synthesises the sound against those times.
# Stage 3 muxes. Stage 4 is a two-pass VBR encode onto a size target.
#
# The intermediate runs about 70 kB a frame, because grain this heavy is very
# nearly incompressible, so hitting 95 MB is a 5.7:1 reduction -- about a third
# of a bit per pixel. At that budget x264's default psy settings spend the
# bitrate on smoothing the grain away, which is the one thing on this tape that
# must survive, so the final pass is tuned for it.
set -e
cd "$(dirname "$0")"

OUT="${1:-hotel_vhs.mp4}"
TARGET_MB="${TARGET_MB:-95}"
FF=$(python3 -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())")

echo "== compiling =="
gcc -O3 -ffast-math -march=native -fopenmp hl_main.c -o hl_render -lm

echo "== rendering 300 s of video =="
./hl_render -e events.txt \
  | "$FF" -y -f rawvideo -pix_fmt rgb24 -s 640x480 -r 24 -i - \
      -c:v libx264 -preset medium -crf 16 -pix_fmt yuv420p -movflags +faststart \
      video.mp4 -loglevel error

echo "== synthesising audio =="
python3 hl_audio.py events.txt audio.wav

echo "== muxing =="
"$FF" -y -i video.mp4 -i audio.wav \
  -c:v copy -c:a aac -b:a 160k -ac 2 -shortest \
  -movflags +faststart master.mp4 -loglevel error

echo "== compressing to ~${TARGET_MB} MB =="
# Decimal MB, not MiB: it is the base GitHub's 100 MB per-file limit uses, and
# a 95 MiB file is 99.87 MB, which leaves 130 kB of headroom and no room to be
# wrong about container overhead.
VBR=$(python3 - "$TARGET_MB" <<'PY'
import sys
mb = float(sys.argv[1])
total_kbps = mb*1e6*8/300.0/1000.0
print(int(total_kbps - 160 - 8))
PY
)
echo "   video bitrate: ${VBR}k"
for PASS in 1 2; do
  if [ "$PASS" = 1 ]; then EXTRA="-an -f mp4 /dev/null"
  else EXTRA="-c:a aac -b:a 160k -ac 2 -movflags +faststart $OUT"; fi
  "$FF" -y -i master.mp4 -c:v libx264 -preset slow -tune grain \
      -b:v ${VBR}k -pass $PASS -pix_fmt yuv420p $EXTRA -loglevel error
done
rm -f ffmpeg2pass-0.log ffmpeg2pass-0.log.mbtree

echo "== done: $OUT =="
ls -la "$OUT"
"$FF" -hide_banner -i "$OUT" 2>&1 | grep -E "Duration|Stream"
