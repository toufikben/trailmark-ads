#!/bin/sh
# One command for the Trailmark test film. Run from the repo root.
#   sh films/trailmark-ride/build.sh
set -e
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$ROOT"
F=films/trailmark-ride
mkdir -p out/stills
node render/still.mjs "$F" 0.55 1.10 1.60 3.20 4.80 6.40 8.00 9.60 --size 1080x1920 --out out/stills
node render/video.mjs "$F" --fps 30 --workers 2 --size 1080x1920 --out out/film.mp4
echo "done: $ROOT/out/film.mp4"
