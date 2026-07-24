#!/bin/bash
# build.sh -- render the tape end to end.
#
#   ./build.sh [output.mp4]
#
# Stage 1 raymarches 7200 frames straight into x264 and writes a sidecar file of
# footstep times. Stage 2 synthesises the audio against those times. Stage 3
# muxes. Expect roughly 45 minutes on four cores.
set -e
cd "$(dirname "$0")"

OUT="${1:-backrooms_vhs.mp4}"
FF=$(python3 -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())")

echo "== compiling =="
gcc -O3 -ffast-math -fopenmp bk_main.c -o bk_render -lm

echo "== rendering 300 s of video =="
./bk_render -e events.txt \
  | "$FF" -y -f rawvideo -pix_fmt rgb24 -s 640x480 -r 24 -i - \
      -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -movflags +faststart \
      video.mp4 -loglevel error

echo "== synthesising audio =="
python3 audio.py events.txt audio.wav

echo "== muxing =="
"$FF" -y -i video.mp4 -i audio.wav \
  -c:v copy -c:a aac -b:a 160k -ac 2 -shortest \
  -movflags +faststart "$OUT" -loglevel error

echo "== done: $OUT =="
"$FF" -hide_banner -i "$OUT" 2>&1 | grep -E "Duration|Stream"
