# Trailmark — ad films in code

Short vertical films for **Trailmark** (offline route tracking for Android). No video model,
no stock footage: a static page exposes `render(t)`, a headless browser photographs every frame,
ffmpeg encodes. Silent for now — the score comes later.

The render kit in `render/` is the MIT-licensed renderer from
[lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar) (`core/render/`, unchanged);
the film itself is `films/trailmark-ride/`. Style: **silhouette-rhythm**.

| film | length | size | style |
|---|---|---|---|
| `trailmark-ride` — «كل هذا المسار» | 10.0 s | 1080×1920 @ 30 fps | silhouette-rhythm |

## Build

Every push to `main` renders on GitHub Actions and publishes a release with the mp4 and
the style frames: **Actions → render → Releases**.

Locally (needs Node 20+ and a Chromium):

```sh
npm install
node node_modules/playwright-core/cli.js install chromium-headless-shell
sh films/trailmark-ride/build.sh
```
