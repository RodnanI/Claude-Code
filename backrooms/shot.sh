#!/bin/bash
# shot.sh <seconds> <outname> [warmup] -- render a single frame for inspection
cd /home/user/Claude-Code/backrooms
SP=/tmp/claude-0/-home-user-Claude-Code/664332f3-e0a3-5830-83a5-74a19354fbe3/scratchpad
FF=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
F=$(python3 -c "print(int($1*24))")
W=${3:-10}
./bk_render -r 0 1 -o $F -w $W -e /dev/null 2>/dev/null > $SP/$2.raw
$FF -y -f rawvideo -pix_fmt rgb24 -s 640x480 -i $SP/$2.raw -frames:v 1 $SP/$2.png -loglevel error
echo "$SP/$2.png"
