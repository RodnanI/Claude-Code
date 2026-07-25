#!/bin/bash
# shot.sh <seconds> <outname> [warmup] -- render a single frame for inspection
cd "$(dirname "$0")"
SP=/tmp/claude-0/-home-user-Claude-Code/c983a24d-8f4e-5871-951b-ef0f129a6b49/scratchpad
FF=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
F=$(python3 -c "print(int($1*24))")
W=${3:-8}
./hl_render -r 0 1 -o $F -w $W -e /dev/null 2>/dev/null > $SP/$2.raw
$FF -y -f rawvideo -pix_fmt rgb24 -s 640x480 -i $SP/$2.raw -frames:v 1 $SP/$2.png -loglevel error
echo "$SP/$2.png"
