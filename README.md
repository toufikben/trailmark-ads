# Trailmark — ad films in code

Short vertical films for **Trailmark** (offline route tracking for Android). No video model,
no stock footage: a static page exposes `render(t)`, a headless browser photographs every frame,
ffmpeg and numpy make the sound.

The render kit in `render/` is the MIT-licensed renderer from
[lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar) (`core/render/`, unchanged);
the film itself is `films/trailmark-dawn/`.

## Films

| film | length | size | style |
|---|---|---|---|
| `trailmark-dawn` — «بلا شبكة» | 8.0 s | 1080×1920 @ 30 fps | silhouette-rhythm |

## Build

Every push to `main` renders on GitHub Actions and publishes a release with the mp4 and the
style frames: **Actions → render → the latest run → Releases**, or
`https://github.com/toufikben/trailmark-ads/releases/latest`.

Locally (needs Node 20+, ffmpeg 7+, Python 3.11+ with numpy and scipy):

```sh
npm install
node node_modules/playwright-core/cli.js install chromium-headless-shell
python -m pip install numpy scipy
sh films/trailmark-dawn/build.sh
```
