// Trailmark · «بلا شبكة» · silhouette-rhythm · 8 s · 1080×1920
// One runner on a shallow lagoon at dawn. Every footfall is a beat; the trail the feet
// leave is drawn on the water. At the turn four signal bars die above a radio mast and the
// music dies with them — the trail keeps drawing. At the end the whole track is on the dark.
(() => {
const W = innerWidth, H = innerHeight, K = W / 1080;
const DUR = 8.0, PI = Math.PI, TAU = PI * 2;
const B = 60 / 90;            // 90 bpm, one beat = 0.667 s; 8 s = 12 beats
const HF = B / 2;             // half beat
const RZ = 30;                // the runner's plane, metres from the world origin
const V = 3.2;                // running speed, m/s

const G = document.getElementById('g'); G.width = W; G.height = H;
const O = document.getElementById('o'); O.width = W; O.height = H;
const octx = O.getContext('2d');
function layer() { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; }
const LF = layer(), LR = layer(), LX = layer();
const fctx = LF.getContext('2d'), rctx = LR.getContext('2d'), xctx = LX.getContext('2d');
const draw = SKY.make(G);
const SM = document.createElement('canvas');

const lerp = (a, b, u) => a + (b - a) * u;
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ss = x => { x = cl(x); return x * x * (3 - 2 * x); };
const eio = x => { x = cl(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const eout = x => 1 - Math.pow(1 - cl(x), 3);
const ein = x => Math.pow(cl(x), 3);
const eback = x => { x = cl(x); const c1 = 2.2, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const env = (t, a, b) => cl((t - a) / (b - a));
function seg(t, keys) {                       // [[t, v, ease?], ...]
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [a, va, e] = keys[i], [b, vb] = keys[i + 1];
    if (t <= b) return lerp(va, vb, (e || eio)((t - a) / (b - a)));
  }
  return keys[keys.length - 1][1];
}

// ------------------------------------------------------------------ camera
function project(cam, x, y, z) {
  const zz = Math.max(.05, z - (cam.cz || 0)), fpx = cam.f * H;
  return [W / 2 + ((x - cam.cx) / zz - cam.yaw) * fpx, cam.hor * H + ((cam.ch - y) / zz) * fpx, fpx / zz];
}
function place(ctx, cam, x, y, z, s, face, refl, rot) {
  const p = project(cam, x, refl ? -y : y, z), sc = p[2] * s;
  const c = Math.cos(rot || 0), sn = Math.sin(rot || 0), ys = refl ? sc : -sc;
  ctx.setTransform(sc * face * c, ys * sn, -sc * face * sn, ys * c, p[0], p[1]);
}
// a shape into the silhouette layer and, mirrored and clipped at the waterline, into the reflection layer
function both(cam, x, y, z, s, face, fn, rot, noRefl) {
  const wl = project(cam, x, 0, z)[1];
  for (const [ctx, refl] of [[fctx, false], [rctx, true]]) {
    if (refl && noRefl) continue;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.beginPath();
    if (refl) ctx.rect(-10, wl, W + 20, H - wl + 20); else ctx.rect(-10, -10, W + 20, wl + 10);
    ctx.clip(); ctx.beginPath();
    place(ctx, cam, x, y, z, s, face, refl, rot); fn(ctx); ctx.restore();
  }
}

// ------------------------------------------------------------------ the trail: one curve the runner follows
const trackZ = x => RZ + 0.55 * Math.sin((x - 1.5) * 0.30);
const X = t => 3.2 * t;                        // the runner's world x at time t

// ------------------------------------------------------------------ running rig (one black shape, profile)
const R = {
  hipY: .96, torso: .50, neck: .10, headR: .098,
  thigh: .47, shin: .45, ankle: .075,
  upper: .305, fore: .275,
  cad: 0.3333, swing: .225, lift: .30, reach: .155,
  lean: .20,
};
const STANCE = R.cad - R.swing;
const FOOT = [];                                // per side, the landings in order
for (let side = 0; side < 2; side++) {
  const a = [];
  for (let k = -6; k < 30; k++) {
    const tl = (2 * k + side - 0.8) * HF;
    a.push({ tl, to: X(tl) + R.reach + side * 0.02 });
  }
  FOOT.push(a);
}
const FALLS = [];                               // every footfall, in order: the click track
for (const side of [0, 1]) for (const s of FOOT[side]) if (s.tl > -1 && s.tl < 9) FALLS.push({ t: s.tl, x: s.to, z: trackZ(s.to), side });
FALLS.sort((a, b) => a.t - b.t);
function footAt(side, t) {
  const a = FOOT[side];
  let i = -1;
  for (let j = 0; j < a.length; j++) { if (a[j].tl <= t) i = j; else break; }
  if (i < 0) return { x: a[0].to, y: 0, sw: 0, u: 0, planted: 1 };
  const s = a[i], nx = a[Math.min(i + 1, a.length - 1)];
  if (t <= s.tl + STANCE) return { x: s.to, y: 0, sw: 0, u: 0, planted: 1 };
  const u = cl((t - s.tl - STANCE) / R.swing, 0, 1);
  return { x: lerp(s.to, nx.to, eio(u)), y: R.lift * Math.pow(Math.sin(PI * Math.pow(u, .92)), .75), sw: Math.sin(PI * u), u, planted: 0 };
}
function ik(hx, hy, fx, fy, a, b) {
  const dx = fx - hx, dy = fy - hy; let d = Math.hypot(dx, dy);
  const dmax = (a + b) * .999, dmin = Math.abs(a - b) + .02;
  d = cl(d, dmin, dmax);
  const cosA = cl((a * a + d * d - b * b) / (2 * a * d), -1, 1), ang = Math.acos(cosA);
  const base = Math.atan2(dy, dx), k = base + ang;      // the knee bends forward, in profile
  return [hx + Math.cos(k) * a, hy + Math.sin(k) * a];
}
function rig(t) {
  const bounce = -0.030 * Math.cos(TAU * (t - 0.055) / R.cad);
  const hipY = R.hipY + bounce;
  const lean = R.lean + 0.020 * Math.sin(TAU * t / (2 * R.cad));
  const sh = [Math.sin(lean) * R.torso, hipY + Math.cos(lean) * R.torso];
  const head = [sh[0] + Math.sin(lean + .10) * (R.neck + R.headR), sh[1] + Math.cos(lean + .10) * (R.neck + R.headR)];
  const legs = [0, 1].map(side => {
    const f = footAt(side, t);
    const ax = f.x - X(t), ay = R.ankle + f.y;
    const knee = ik(0, hipY, ax, ay, R.thigh, R.shin);
    // the toe: flat while planted, point down and back through the swing
    const ta = lerp(-0.06, -1.15, f.sw) + (f.planted ? 0 : -0.25 * Math.sin(PI * f.u));
    return { ax, ay, knee, toe: [ax + Math.cos(ta) * .185, ay + Math.sin(ta) * .185], sw: f.sw, planted: f.planted };
  });
  const ph = TAU * t / (2 * R.cad);
  const arms = [0, 1].map(side => {
    const a = ph + (side ? 0 : PI);
    const th = 0.60 * Math.cos(a) + 0.12 + lean * .5;
    const bend = 1.48 + 0.22 * Math.sin(a);
    const el = [sh[0] + Math.sin(th) * R.upper * .98, sh[1] - Math.cos(th) * R.upper * .98];
    const hand = [el[0] + Math.sin(th + bend) * R.fore, el[1] - Math.cos(th + bend) * R.fore];
    return { el, hand, th };
  });
  return { hipY, sh, head, legs, arms, lean };
}
function cap(ctx, ax, ay, bx, by, ra, rb) {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1e-6, nx = -dy / L, ny = dx / L;
  ctx.beginPath();
  ctx.moveTo(ax + nx * ra, ay + ny * ra); ctx.lineTo(bx + nx * rb, by + ny * rb);
  ctx.lineTo(bx - nx * rb, by - ny * rb); ctx.lineTo(ax - nx * ra, ay - ny * ra);
  ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(ax, ay, ra, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(bx, by, rb, 0, TAU); ctx.fill();
}
function dot(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
function drawBody(ctx, g) {
  const hip = [0, g.hipY], sh = g.sh, nx = Math.sin(g.lean), ny = Math.cos(g.lean);
  // the back leg first, then the torso, then the near arm: one union of black shapes
  const legOrder = g.legs[0].ax < g.legs[1].ax ? [0, 1] : [1, 0];
  for (const i of legOrder) {
    const L = g.legs[i];
    cap(ctx, hip[0] - .010, hip[1] - .030, L.knee[0], L.knee[1], .086, .060);
    cap(ctx, L.knee[0], L.knee[1], L.ax, L.ay, .058, .040);
    cap(ctx, L.ax, L.ay, L.toe[0], L.toe[1], .040, .026);      // foot
    dot(ctx, L.ax - .018, L.ay - .018, .042);                   // heel
  }
  // torso: pelvis to shoulder, wider at the chest, a runner's lean
  cap(ctx, hip[0], hip[1] + .02, sh[0], sh[1], .092, .092);
  dot(ctx, hip[0] + nx * .10, hip[1] + ny * .10, .098);
  dot(ctx, hip[0] + nx * .30, hip[1] + ny * .30, .100);         // chest
  dot(ctx, sh[0], sh[1], .090);
  // a vest on the back: shape only, no detail
  dot(ctx, hip[0] + nx * .24 - Math.cos(g.lean - .05) * .078, hip[1] + ny * .24 + Math.sin(g.lean - .05) * .078, .048);
  // neck and head, the jaw forward, a small cap of hair at the back
  const hx = g.head[0], hy = g.head[1];
  cap(ctx, sh[0], sh[1], hx, hy, .050, .046);
  dot(ctx, hx, hy, .092);
  dot(ctx, hx + .046, hy - .024, .050);                         // jaw / chin
  dot(ctx, hx - .040, hy + .034, .050);                         // back of the head
  // the near arm, swinging: the far one is the same black shape, so it is not drawn twice
  const A = g.arms[0];
  cap(ctx, sh[0] - nx * .01, sh[1] - ny * .01, A.el[0], A.el[1], .050, .042);
  cap(ctx, A.el[0], A.el[1], A.hand[0], A.hand[1], .040, .032);
  dot(ctx, A.hand[0], A.hand[1], .040);
}

// ------------------------------------------------------------------ water light (ripples, spray)
function ring(cam, x, z, r, al, lw) {
  if (al <= .003 || r <= 0) return;
  const p = project(cam, x, 0, z), rx = r * p[2], ry = Math.max(.5, rx * cam.ch / Math.max(.05, z - (cam.cz || 0)));
  if (p[0] + rx < -60 || p[0] - rx > W + 60 || p[1] - ry > H + 20 || p[1] + ry < cam.hor * H - 4) return;
  xctx.globalAlpha = cl(al); xctx.lineWidth = Math.max(1, lw * K);
  xctx.beginPath(); xctx.ellipse(p[0], p[1], rx, ry, 0, 0, TAU); xctx.stroke(); xctx.globalAlpha = 1;
  const g = Math.max(1.2, lw * 1.1 * K), d = Math.min(rx * .2, g * 1.3);
  rctx.save(); rctx.setTransform(1, 0, 0, 1, 0, 0); rctx.globalAlpha = cl(al * .5); rctx.lineWidth = g; rctx.strokeStyle = '#000';
  rctx.beginPath(); rctx.ellipse(p[0], p[1] + d * .25, Math.max(.5, rx - d), Math.max(.4, ry - d * ry / Math.max(rx, 1)), 0, 0, TAU); rctx.stroke(); rctx.restore();
}
function ripple(cam, x, z, age, big) {
  if (age < 0 || age > 1.8) return;
  for (let j = 0; j < (big ? 3 : 2); j++) {
    const a = age - j * .16; if (a <= 0) continue;
    const r = .04 + (big ? .55 : .38) * Math.pow(a, .6);
    ring(cam, x, z, r, Math.pow(1 - a / 1.8, 2) * (big ? .9 : .7) * (j ? .6 : 1), 2.2 * Math.min(1.6, 9 / Math.max(1, z - (cam.cz || 0))));
  }
}
function droplets(cam, x, z, age, seed, n, big, y0) {
  if (age < 0 || age > 1.0) return;
  for (let i = 0; i < n; i++) {
    const vx = (hash(seed * 31 + i) - .5) * (big ? 2.0 : 1.4), vy = 1.0 + hash(seed * 17 + i * 3) * (big ? 2.0 : 1.2), vz = (hash(seed * 7 + i) - .5) * .4;
    const y = (y0 || 0) + vy * age - 4.9 * age * age; if (y < 0) continue;
    const p = project(cam, x + vx * age, y, z + vz * age);
    const r = Math.max(.8 * K, (.006 + hash(i + seed) * .007) * p[2]);
    xctx.globalAlpha = .95; xctx.beginPath(); xctx.arc(p[0], p[1], r, 0, TAU); xctx.fill();
  }
  xctx.globalAlpha = 1;
}

// ------------------------------------------------------------------ the trail drawn on the water
function trail(cam, t, xEnd, gain) {
  const x0 = X(0.98);
  if (xEnd <= x0 + .05) return;
  const N = 150, pts = [];
  for (let i = 0; i <= N; i++) {
    const x = lerp(x0, xEnd, i / N), z = trackZ(x), p = project(cam, x, 0, z);
    pts.push([p[0], p[1], i / N]);
  }
  xctx.save(); xctx.lineCap = 'round'; xctx.lineJoin = 'round';
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    xctx.globalAlpha = (.34 + .40 * b[2]) * gain;
    xctx.lineWidth = 8.0 * K;
    xctx.beginPath(); xctx.moveTo(a[0], a[1]); xctx.lineTo(b[0], b[1]); xctx.stroke();
    xctx.globalAlpha = (.70 + .30 * b[2]) * gain;
    xctx.lineWidth = 2.8 * K;
    xctx.beginPath(); xctx.moveTo(a[0], a[1]); xctx.lineTo(b[0], b[1]); xctx.stroke();
  }
  // its shadow on the water just below, so the line reads on the bright glitter too
  rctx.save(); rctx.setTransform(1, 0, 0, 1, 0, 0); rctx.lineCap = 'round'; rctx.lineJoin = 'round';
  rctx.strokeStyle = '#000'; rctx.globalAlpha = .55 * gain; rctx.lineWidth = 6.0 * K;
  rctx.beginPath(); rctx.moveTo(pts[0][0], pts[0][1] + 5 * K);
  for (let i = 1; i < pts.length; i++) rctx.lineTo(pts[i][0], pts[i][1] + 5 * K);
  rctx.stroke(); rctx.restore();
  // the head of the trail, where the last footfall is
  const h = pts[pts.length - 1];
  xctx.globalAlpha = .95 * gain;
  xctx.beginPath(); xctx.arc(h[0], h[1], 5.0 * K, 0, TAU); xctx.fill();
  xctx.globalAlpha = .30 * gain;
  xctx.beginPath(); xctx.arc(h[0], h[1], 13 * K, 0, TAU); xctx.fill();
  xctx.restore();
}
// the footfalls written on the water: one ring per step, older ones dimmer
function footfallRings(cam, t, from, gain) {
  for (const F of FALLS) {
    if (F.t < from || F.t > t) continue;
    const age = t - F.t;
    ring(cam, F.x, F.z, .05 + .30 * Math.pow(cl(age, 0, 3), .55), .55 * Math.pow(1 - cl(age / 3.2, 0, 1), 1.6) * gain, 1.8);
  }
}

// ------------------------------------------------------------------ the radio mast and its four bars
const MAST_H = 17, MAST_X = X(3.30) + 26, MAST_Z = RZ + 220;
function mastBody(ctx) {                        // local: base y=0, height 1
  ctx.strokeStyle = '#000'; ctx.fillStyle = '#000'; ctx.lineCap = 'round';
  const legs = [[-.115, 0, -.028, 1], [.115, 0, .028, 1]];
  ctx.lineWidth = .022;
  for (const [x0, y0, x1, y1] of legs) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
  ctx.lineWidth = .011;
  for (let i = 0; i < 9; i++) {
    const y = .06 + i * .108, w0 = lerp(.104, .026, y), w1 = lerp(.104, .026, y + .108);
    ctx.beginPath(); ctx.moveTo(-w0, y); ctx.lineTo(w0, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-w0, y); ctx.lineTo(w1, y + .108); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w0, y); ctx.lineTo(-w1, y + .108); ctx.stroke();
  }
  ctx.lineWidth = .014;
  ctx.beginPath(); ctx.moveTo(0, 1); ctx.lineTo(0, 1.055); ctx.stroke();  // antenna
  ctx.beginPath(); ctx.moveTo(-.045, 1.0); ctx.lineTo(.045, 1.0); ctx.stroke();
}
// four bars, bottom-aligned and growing, floating above the antenna: the signal, as the world
const BARS = [{ w: .62, h: .70 }, { w: .62, h: 1.10 }, { w: .62, h: 1.50 }, { w: .62, h: 1.90 }];
const BAR_T = [3.667, 3.833, 4.000, 4.167];     // from the strongest down: bar 3, 2, 1, 0
function bars(cam, t) {
  const base = 17.9, gap = .26, x0 = MAST_X - 1.55;
  for (let i = 0; i < 4; i++) {
    const death = BAR_T[3 - i];                 // i = 0 is the shortest: it dies last
    const u = cl((t - death) / .055, 0, 1);
    const al = 1 - u;
    const x = x0 + i * (.62 + gap) + .31;
    if (al > .002) {
      const p0 = project(cam, x, base + BARS[i].h * .5, MAST_Z), sc = p0[2];
      xctx.globalAlpha = al * .22;              // the halo of a light
      xctx.fillRect(p0[0] - .80 * sc, p0[1] - BARS[i].h * .5 * sc - .22 * sc, 1.60 * sc, BARS[i].h * sc + .44 * sc);
      xctx.globalAlpha = al;
      xctx.fillRect(p0[0] - .31 * sc, p0[1] - BARS[i].h * .5 * sc, .62 * sc, BARS[i].h * sc);
    }
    if (t > death && t < death + .42) {         // it goes: one thin ring where it was
      const a = (t - death) / .42, p = project(cam, x, base + BARS[i].h * .5, MAST_Z), sc = p[2];
      xctx.globalAlpha = .32 * Math.pow(1 - a, 2);
      xctx.lineWidth = Math.max(1, 1.3 * K);
      xctx.beginPath(); xctx.arc(p[0], p[1], (.22 + .55 * Math.pow(a, .6)) * sc, 0, TAU); xctx.stroke();
    }
  }
  xctx.globalAlpha = 1;
}

// ------------------------------------------------------------------ sky clock
function sunAt(t, u, R2) { return { sun: [u, sunY(t)], sunR: R2 }; }
const sunY = t => seg(t, [[0, .0378], [2.0, .0330], [3.667, .0100], [4.333, -.004], [6.667, -.010], [8.0, .0400]]);
const phAt = t => seg(t, [[0, .06], [2.0, .15], [3.667, .30], [4.333, .44], [6.667, .66], [6.70, 1.0, eout], [8, 1.0]]);
function pulseAt(t) {
  if (t < 3.667) return 0.75 * Math.exp(-((t % B) / .12));
  if (t >= 6.66) return 0.9 * Math.exp(-(t - 6.66) / .16);
  return 0;
}

// ------------------------------------------------------------------ frame helpers
function clear() {
  for (const c of [fctx, rctx, xctx]) { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H); c.fillStyle = '#000'; c.strokeStyle = '#000'; c.filter = 'none'; }
  xctx.fillStyle = '#fff'; xctx.strokeStyle = '#fff';
}
const SHOTS = [];
const shot = (t0, t1, fn) => SHOTS.push({ t0, t1, fn });

// ---- 1 · 0.000–2.000  wide telephoto: the runner crosses the disc, every step writes on the water
shot(0, 2.0, t => {
  const f = 5.8, d = 26, cam = { f, ch: .85, hor: .62, cx: X(t) + .30 * t, cz: RZ - d, yaw: 0 };
  const rx = X(t), rz = trackZ(rx);
  both(cam, rx, 0, rz, 1, 1, ctx => drawBody(ctx, rig(t)));
  for (const F of FALLS) {
    const age = t - F.t;
    if (age < 0 || age > 1.6) continue;
    ripple(cam, F.x, F.z, age, F.side === 0);
    if (age < .5) droplets(cam, F.x, F.z, age, 11 + Math.round(F.t * 100), 22, F.side === 0);
  }
  trail(cam, t, rx, .55);
  return Object.assign({ cam, vs: 1.7, rays: 1, pulse: pulseAt(t) * .8 }, sunAt(t, .0, .024));
});
// ---- 2 · 2.000–3.667  locked medium: the beat itself, and the trail behind him
shot(2.0, 3.667, t => {
  const cam = { f: 7.6, ch: .90, hor: .615, cx: X(t) + .18, cz: RZ - 21, yaw: 0 };
  const rx = X(t), rz = trackZ(rx);
  both(cam, rx, 0, rz, 1, 1, ctx => drawBody(ctx, rig(t)));
  footfallRings(cam, t, 1.4, .9);
  trail(cam, t, rx, 1.0);
  return Object.assign({ cam, vs: 1.8, rays: 1, pulse: pulseAt(t) }, sunAt(t, .0, .020));
});
// ---- 3 · 3.667–4.333  the mast: four bars, one per sixteenth, gone. Music gone with them
shot(3.667, 4.333, t => {
  const cam = { f: 7.2, ch: 6.5, hor: .56, cx: MAST_X + .35 * (t - 4.0), cz: MAST_Z - 230, yaw: 0 };
  both(cam, MAST_X, 0, MAST_Z, MAST_H, 1, mastBody);
  bars(cam, t);
  return Object.assign({ cam, vs: 1.8, rays: .5, pulse: 0 }, sunAt(t, -.085, .016));
});
// ---- 4 · 4.333–6.667  back to him, pushing in: nothing changed but the network
shot(4.333, 6.667, t => {
  const u = env(t, 4.333, 6.667);
  const cam = { f: lerp(7.6, 8.3, eio(u)), ch: lerp(.90, .70, eio(u)), hor: .615, cx: X(t) + .14, cz: RZ - lerp(21, 18.6, eio(u)), yaw: 0 };
  const rx = X(t), rz = trackZ(rx);
  both(cam, rx, 0, rz, 1, 1, ctx => drawBody(ctx, rig(t)));
  footfallRings(cam, t, 1.4, 1.0);
  trail(cam, t, rx, 1.0);
  return Object.assign({ cam, vs: 1.8, rays: 1, pulse: t > 4.66 ? pulseAt(t) * .8 : 0 }, sunAt(t, .012, .020));
});
// ---- 5 · 6.667–8.000  after sundown: the whole trail, on the dark, and one line of type
shot(6.667, 8.0, t => {
  const u = env(t, 6.667, 8.0);
  const cam = { f: 2.7, ch: 3.2, hor: .52, cx: X(6.667) - 5.6 + 1.6 * u, cz: RZ - 110, yaw: 0 };
  const rx = X(8.0);
  both(cam, rx, 0, trackZ(rx), 1, 1, ctx => drawBody(ctx, rig(7.98)));
  for (const F of FALLS) {
    if (F.t > 7.9) continue;
    ring(cam, F.x, F.z, .22, .38 * Math.pow(cl(1 - (7.9 - F.t) / 9, .15, 1), .6), 1.4);
  }
  trail(cam, 8.0, rx, 1.0);
  return Object.assign({ cam, vs: 1.3, rays: .45, pulse: pulseAt(t) * .7 }, sunAt(t, -.062, .012));
});

// ------------------------------------------------------------------ type: one line, right-aligned (Arabic), lower third
const LINE = ['بلا', 'شبكة.', 'المسار', 'يكمل.'];
const WORDT = [6.70, 6.80, 6.98, 7.10];
function typeLayout() {
  octx.font = `700 ${76 * K}px Cairo`;
  const sp = octx.measureText(' ').width, ws = LINE.map(w => octx.measureText(w).width);
  return { ws, sp, total: ws.reduce((a, b) => a + b, 0) + sp * (LINE.length - 1) };
}
function drawWord(text, x, y, t0, t, font) {
  if (t < t0) return;
  const u = env(t, t0, t0 + .20), e = eback(u);
  octx.save(); octx.font = font; octx.fillStyle = '#FFF3E4'; octx.globalAlpha = cl(u * 1.8);
  octx.textAlign = 'left'; octx.textBaseline = 'alphabetic';
  octx.fillText(text, x, y - (1 - e) * 40 * K); octx.restore();
  const a = t - t0 - .10;
  if (a > 0 && a < 1.2) {
    const w = octx.measureText(text).width;
    octx.save(); octx.strokeStyle = '#FFD9A8'; octx.globalAlpha = .40 * Math.pow(1 - a / 1.2, 2); octx.lineWidth = 1.5 * K;
    const rx = w * .36 + 90 * K * Math.pow(a, .6), ry = rx * .055;
    octx.beginPath(); octx.ellipse(x + w / 2, y + 22 * K, rx, ry, 0, 0, TAU); octx.stroke(); octx.restore();
  }
}
function drawType(t) {
  if (t < WORDT[0]) return;
  const L = typeLayout(), f = `700 ${76 * K}px Cairo`;
  const xr = W - 96 * K, y = 1728 * K;          // right edge, lower third
  let x = xr;
  for (let i = 0; i < LINE.length; i++) {
    x -= L.ws[i];
    drawWord(LINE[i], x, y, WORDT[i], t, f);
    x -= L.sp;
  }
  if (t >= 7.34) {                               // the name, small, under the line
    const u = eout(env(t, 7.34, 7.66));
    octx.save(); octx.globalAlpha = u * .82; octx.fillStyle = '#FFE9CC';
    octx.font = `600 ${27 * K}px Cairo`; octx.textAlign = 'right';
    octx.fillText('TRAILMARK', xr, y + 54 * K); octx.restore();
  }
}
window.TEXTS = t => (t < WORDT[0] ? [] : [{ id: 'line', text: LINE.join(' '), x0: 96 * K, y0: 1640 * K, x1: W - 90 * K, y1: 1760 * K }]);

// ------------------------------------------------------------------ frame
window.DUR = DUR;
window.render = function (t) {
  t = cl(t, 0, DUR - 1e-4);
  let S = SHOTS[0]; for (const s of SHOTS) if (t >= s.t0 && t < s.t1) S = s;
  clear();
  const r = S.fn(t), cam = r.cam;
  const flash = t >= 6.667 && t < 6.90 ? Math.exp(-(t - 6.667) / .16) : 0;
  draw({ T: t, hor: cam.hor * H, fpx: cam.f * H, yaw: cam.yaw, cx: cam.cx, ch: cam.ch, sun: r.sun, sunR: r.sunR,
    ph: phAt(t), pulse: r.pulse, flash, rays: r.rays, vs: r.vs }, [LF, LR, LX]);
  octx.setTransform(1, 0, 0, 1, 0, 0); octx.clearRect(0, 0, W, H);
  drawType(t);
  if (r.smear > .01) motionBlur(r.smear);
};
// whip-pan blur: many samples along the motion, at full resolution (never a downscale)
function motionBlur(amount) {
  const L = 280 * K * amount, n = 16;
  if (L < 1) return;
  if (SM.width !== W || SM.height !== H) { SM.width = W; SM.height = H; }
  const s = SM.getContext('2d');
  s.setTransform(1, 0, 0, 1, 0, 0); s.globalAlpha = 1; s.clearRect(0, 0, W, H); s.drawImage(G, 0, 0);
  for (let i = 0; i < n; i++) { s.globalAlpha = 1 / (i + 2); s.drawImage(G, -L / 2 + (i + .5) * L / n, 0); }
  s.globalAlpha = 1;
  const d = L / n;
  octx.globalAlpha = 1; octx.drawImage(SM, 0, 0);
  for (let i = 0; i < n; i++) { octx.globalAlpha = 1 / (i + 2); octx.drawImage(SM, -d / 2 + (i + .5) * d / n, 0); }
  octx.globalAlpha = 1;
}
const ar = LINE.join(' ');
Promise.all([document.fonts.load(`700 40px Cairo`, ar), document.fonts.load(`600 20px Cairo`, 'TRAILMARK')])
  .then(() => { window.render(0); window.READY = true; });
})();
