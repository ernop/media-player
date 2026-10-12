#!/bin/sh
# Makes the demo's media in demo/media (ignored by git): a 2.5 min test pattern with the time and
# frame number burned in and a keyframe every second, and a 6:40 tone for the audio player.
set -eu
cd "$(dirname "$0")"
mkdir -p media

ffmpeg -hide_banner -loglevel error -y \
    -f lavfi -i "testsrc2=size=1280x720:rate=30:duration=150" \
    -f lavfi -i "sine=frequency=440:sample_rate=48000:duration=150" \
    -vf "drawtext=font=monospace:text='%{pts\\:hms}  frame %{n}':fontsize=60:fontcolor=white:box=1:boxcolor=black:boxborderw=14:x=(w-tw)/2:y=h-th-48" \
    -c:v libx264 -preset veryfast -crf 30 -pix_fmt yuv420p -g 30 \
    -c:a aac -b:a 96k -movflags +faststart \
    media/pattern.mp4

ffmpeg -hide_banner -loglevel error -y \
    -f lavfi -i "sine=frequency=330:sample_rate=48000:duration=400" \
    -c:a aac -b:a 64k -movflags +faststart \
    media/tone.m4a

ls -l media
