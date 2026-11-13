#!/bin/sh
# One command for the Trailmark test film. Run from the repo root.
#   sh films/trailmark-dawn/build.sh
# score + foley -> stills -> picture -> master (-14 LUFS, true peak under -1 dB, grain 1)
set -e
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$ROOT"
F=films/trailmark-dawn
mkdir -p "$F/out" out/stills

python "$F/audio.py"
node render/still.mjs "$F" 0.55 1.30 2.60 3.35 3.95 4.55 5.60 6.40 7.75 --size 1080x1920 --out out/stills
node render/video.mjs "$F" --fps 30 --workers 2 --size 1080x1920 --out out/video.mp4
sh render/mux.sh out/video.mp4 "$F/out/mix.wav" out/trailmark-dawn.mp4 30 1
echo "done: $ROOT/out/trailmark-dawn.mp4"
