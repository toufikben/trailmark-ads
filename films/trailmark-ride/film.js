// Trailmark · «كل هذا المسار» · silhouette-rhythm · 10 s · 1080×1920 · no sound
// A bike waits in the shallows at sundown. He rides it out across the salt flat, the trail
// writing itself in cream light on the water behind him. A ridge appears; he climbs it on
// switchbacks; off the summit he is in the air. On the last beat the whole route lights up
// from its start to him, and one line of type lands: everything recorded, no network.
(() => {
const W = innerWidth, H = innerHeight, K = W / 1080;
const DUR = 10.0, PI = Math.PI, TAU = PI * 2;
const B = 0.625;                       // 96 bpm: 16 beats in 10 s
const RZ = 30;                         // the rider's plane, metres from the world origin
const lerp = (a, b, u) => a + (b - a) * u;
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const eio = x => { x = cl(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const eout = x => 1 - Math.pow(1 - cl(x), 3);
const eback = x => { x = cl(x); const c1 = 2.0, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const env = (t, a, b) => cl((t - a) / (b - a));
function seg(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [a, va, e] = keys[i], [b, vb] = keys[i + 1];
    if (t <= b) return lerp(va, vb, (e || eio)((t - a) / (b - a)));
  }
  return keys[keys.length - 1][1];
}

const G = document.getElementById('g'); G.width = W; G.height = H;
const O = document.getElementById('o'); O.width = W; O.height = H;
const octx = O.getContext('2d');
function layer() { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; }
const LF = layer(), LR = layer(), LX = layer();
const fctx = LF.getContext('2d'), rctx = LR.getContext('2d'), xctx = LX.getContext('2d');
const draw = SKY.make(G);
const SM = document.createElement('canvas');

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
function both(cam, x, y, z, s, face, fn, rot, noRefl) {
  const wl = project(cam, x, 0, z)[1];
  for (const [ctx, refl] of [[fctx, false], [rctx, true]]) {
    if (refl && noRefl) continue;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.beginPath();
    if (refl) ctx.rect(-10, wl, W + 20, H - wl + 20); else ctx.rect(-10, -10, W + 20, wl + 10);
    ctx.clip(); place(ctx, cam, x, y, z, s, face, refl, rot); fn(ctx); ctx.restore();
  }
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
function ik(hx, hy, fx, fy, a, b) {
  const dx = fx - hx, dy = fy - hy; let d = Math.hypot(dx, dy);
  d = cl(d, Math.abs(a - b) + .02, (a + b) * .999);
  const cosA = cl((a * a + d * d - b * b) / (2 * a * d), -1, 1), ang = Math.acos(cosA);
  return [hx + Math.cos(Math.atan2(dy, dx) + ang) * a, hy + Math.sin(Math.atan2(dy, dx) + ang) * a];
}

// ================================================================== THE BIKE
// local metres, y up, baseline y = 0, facing +x. One black shape, no detail inside.
const BK = {
  r: .335, rear: [-.545, .335], front: [.545, .335],
  bb: [.00, .275], seat: [-.275, .905], head: [.360, .925], bar: [.450, .965],
  crank: .155, hip: [-.265, .935],
  thigh: .430, shin: .430, upper: .300, fore: .290,
  torso: .500, neck: .105, headR: .098,
};
const CAD = .78;                        // one crank revolution (~77 rpm)
function wheel(ctx, c, ang, blur) {
  const r = BK.r;
  ctx.fillStyle = '#000'; ctx.strokeStyle = '#000'; ctx.lineCap = 'round';
  ctx.lineWidth = .030;
  ctx.beginPath(); ctx.arc(c[0], c[1], r - .015, 0, TAU); ctx.stroke();
  if (blur > .01) {                     // a fast wheel is a disc: the spokes smear into it
    ctx.beginPath(); ctx.arc(c[0], c[1], r - .030, 0, TAU); ctx.fill();
  } else {
    ctx.lineWidth = .0070;
    for (let s = 0; s < 3; s++) {
      const a = ang + s * TAU / 3;
      ctx.beginPath();
      ctx.moveTo(c[0] + Math.cos(a) * .038, c[1] + Math.sin(a) * .038);
      ctx.lineTo(c[0] + Math.cos(a) * (r - .026), c[1] + Math.sin(a) * (r - .026));
      ctx.stroke();
    }
  }
  dot(ctx, c[0], c[1], .034);
}
function bikeFrame(ctx, spin, blur) {
  const S = BK.seat, Hd = BK.head, BB = BK.bb;
  ctx.fillStyle = '#000'; ctx.strokeStyle = '#000'; ctx.lineCap = 'round';
  wheel(ctx, BK.rear, spin, blur);
  wheel(ctx, BK.front, spin, blur);
  ctx.lineWidth = .016;
  for (const [a, b] of [[S, Hd], [S, BB], [BB, Hd], [S, BK.rear], [BB, BK.rear], [Hd, BK.front]]) {
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  }
  cap(ctx, BK.bar[0] - .045, BK.bar[1] + .005, BK.bar[0], BK.bar[1], .019, .019);
  cap(ctx, Hd[0], Hd[1], BK.bar[0] - .02, BK.bar[1], .015, .015);
  cap(ctx, S[0] - .048, S[1] + .020, S[0] + .048, S[1] + .014, .019, .017);
  dot(ctx, BB[0], BB[1], .032);
}
function rider(ctx, t) {
  const hip = BK.hip, cr = TAU * t / CAD, lean = .86;
  const sh = [hip[0] + Math.sin(lean) * BK.torso, hip[1] + Math.cos(lean) * BK.torso];
  const hd = [sh[0] + Math.sin(lean + .26) * (BK.neck + BK.headR), sh[1] + Math.cos(lean + .26) * (BK.neck + BK.headR)];
  ctx.fillStyle = '#000';
  for (const side of [1, 0]) {                                     // the feet ride the pedals
    const a = cr + side * PI;
    const ped = [BK.bb[0] + Math.cos(a) * BK.crank, BK.bb[1] + Math.sin(a) * BK.crank];
    const kn = ik(hip[0], hip[1], ped[0], ped[1] - .045, BK.thigh, BK.shin);
    cap(ctx, hip[0], hip[1], kn[0], kn[1], .066, .048);
    cap(ctx, kn[0], kn[1], ped[0], ped[1] - .045, .046, .034);
    cap(ctx, ped[0] - .015, ped[1] - .040, ped[0] + .078, ped[1] - .034, .028, .020);
  }
  cap(ctx, hip[0], hip[1] + .03, sh[0], sh[1], .072, .080);        // the flat back
  dot(ctx, sh[0] - .01, sh[1] - .03, .084);
  cap(ctx, sh[0], sh[1], hd[0], hd[1], .040, .038);                // the neck
  dot(ctx, hd[0], hd[1], .080);                                    // the head
  dot(ctx, hd[0] + .046, hd[1] - .024, .040);                      // the jaw
  dot(ctx, hd[0] - .038, hd[1] + .016, .038);                      // the helmet
  const hand = [BK.bar[0] - .03, BK.bar[1] + .012];                // one arm to the hoods
  const el = ik(sh[0], sh[1], hand[0], hand[1], BK.upper, BK.fore);
  cap(ctx, sh[0], sh[1] - .01, el[0], el[1], .042, .034);
  cap(ctx, el[0], el[1], hand[0], hand[1], .032, .028);
  dot(ctx, hand[0], hand[1], .032);
}
function drawBike(ctx, t, spin, blur) { bikeFrame(ctx, spin, blur); rider(ctx, t); }

// ================================================================== THE RUNNER (two beats, small)
const RN = { hipY: .93, torso: .50, thigh: .46, shin: .44, ankle: .075, upper: .30, fore: .27, lean: .21, cad: .34, lift: .28 };
function runRig(t) {
  const ph = TAU * t / (2 * RN.cad), lean = RN.lean + .02 * Math.sin(ph);
  const hipY = RN.hipY - .028 * Math.cos(TAU * t / RN.cad);
  const sh = [Math.sin(lean) * RN.torso, hipY + Math.cos(lean) * RN.torso];
  const head = [sh[0] + Math.sin(lean + .1) * .19, sh[1] + Math.cos(lean + .1) * .19];
  const legs = [0, 1].map(side => {
    const a = ph + side * PI, fx = Math.sin(a) * .30, fy = RN.ankle + Math.max(0, -Math.cos(a)) * RN.lift;
    const kn = ik(0, hipY, fx, fy, RN.thigh, RN.shin);
    return { kn, fx, fy, toe: [fx + .16, fy - .05] };
  });
  return { hipY, sh, head, legs, lean };
}
function drawRunner(ctx, g) {
  const hip = [0, g.hipY], sh = g.sh;
  ctx.fillStyle = '#000';
  const order = g.legs[0].fx < g.legs[1].fx ? [0, 1] : [1, 0];
  for (const i of order) {
    const L = g.legs[i];
    cap(ctx, hip[0], hip[1] - .02, L.kn[0], L.kn[1], .074, .052);
    cap(ctx, L.kn[0], L.kn[1], L.fx, L.fy, .050, .034);
    cap(ctx, L.fx, L.fy, L.toe[0], L.toe[1], .032, .022);
  }
  cap(ctx, hip[0], hip[1] + .02, sh[0], sh[1], .080, .082);
  dot(ctx, hip[0] + Math.sin(g.lean) * .28, hip[1] + Math.cos(g.lean) * .28, .086);
  cap(ctx, sh[0], sh[1], g.head[0], g.head[1], .044, .040);
  dot(ctx, g.head[0], g.head[1], .080);
  dot(ctx, g.head[0] + .040, g.head[1] - .020, .042);
}

// ================================================================== THE RIDGE
const MT = { x: 96, z: 3000, h: 190 };
const RIDGE = [[-1.35, .06], [-1.05, .17], [-.78, .27], [-.55, .36], [-.34, .47], [-.16, .59], [-.02, .71], [.09, .83], [.17, .95], [.24, 1.0], [.33, .90], [.45, .79], [.60, .69], [.80, .60], [1.05, .52], [1.40, .45], [1.85, .40], [2.40, .37]];
function ridgeY(x) {
  if (x <= RIDGE[0][0]) return RIDGE[0][1];
  for (let i = 1; i < RIDGE.length; i++) {
    if (x <= RIDGE[i][0]) { const a = RIDGE[i - 1], b = RIDGE[i]; return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0] || 1e-6); }
  }
  return RIDGE[RIDGE.length - 1][1];
}
function mScreen(cam, lx, ly) {
  const p = project(cam, MT.x, 0, MT.z), sc = p[2] * MT.h;
  return [p[0] + lx * sc, p[1] - ly * sc, sc];
}
function ridgeFace(cam) {
  const p = project(cam, MT.x, 0, MT.z), sc = p[2] * MT.h, wl = cam.hor * H;
  fctx.save(); fctx.setTransform(1, 0, 0, 1, 0, 0);
  fctx.beginPath(); fctx.rect(-10, -10, W + 20, wl + 10); fctx.clip();
  fctx.beginPath();
  fctx.moveTo(p[0] - 1.4 * sc, wl + 60);
  for (const [x, y] of RIDGE) fctx.lineTo(p[0] + x * sc, p[1] - y * sc);
  fctx.lineTo(p[0] + 2.5 * sc, wl + 60);
  fctx.closePath(); fctx.fill();
  fctx.restore();
}
// the same face, in the top layer: the shader paints the silhouettes over the water-light layer,
// so anything light that has to sit on the black rock (the road) must be drawn above it
function faceTop(cam) {
  const p = project(cam, MT.x, 0, MT.z), sc = p[2] * MT.h, wl = cam.hor * H;
  octx.save(); octx.setTransform(1, 0, 0, 1, 0, 0);
  octx.beginPath(); octx.rect(-10, -10, W + 20, wl + 10); octx.clip();
  octx.beginPath();
  octx.moveTo(p[0] - 1.4 * sc, wl + 60);
  for (const [x, y] of RIDGE) octx.lineTo(p[0] + x * sc, p[1] - y * sc);
  octx.lineTo(p[0] + 2.5 * sc, wl + 60);
  octx.closePath(); octx.fillStyle = '#000'; octx.fill();
  octx.restore();
}
function roadTop(cam, u) {
  const n = 70;
  octx.save(); octx.lineCap = 'round'; octx.lineJoin = 'round'; octx.strokeStyle = '#FFF3E4';
  for (let i = 1; i <= n; i++) {
    const a = swScreen(cam, u * (i - 1) / n), b = swScreen(cam, u * i / n);
    octx.globalAlpha = .45 + .55 * (i / n); octx.lineWidth = Math.max(1.2, 5.5 * K);
    octx.beginPath(); octx.moveTo(a[0], a[1]); octx.lineTo(b[0], b[1]); octx.stroke();
  }
  octx.restore();
  // the last stretch: from the end of the zigzag up to the crest, where he is
  const q = swPoint(u), b = mScreen(cam, q[0], ridgeY(q[0])), a = swScreen(cam, u);
  octx.save(); octx.lineCap = 'round'; octx.strokeStyle = '#FFF3E4'; octx.globalAlpha = .95;
  octx.lineWidth = Math.max(1.2, 5.5 * K);
  octx.beginPath(); octx.moveTo(a[0], a[1]); octx.lineTo(b[0], b[1]); octx.stroke(); octx.restore();
}
function riderTop(cam, u, t, spin, blur, scl) {
  const q = swPoint(u), rx = q[0], ry = ridgeY(rx) + .004;
  const ang = cl(Math.atan2(ridgeY(rx + .02) - ridgeY(rx - .02), .04), -.30, .30);
  const p = mScreen(cam, rx, ry), s = mScreen(cam, 0, 0)[2] * scl;
  octx.save(); octx.translate(p[0], p[1]); octx.rotate(-ang); octx.scale(s, -s);
  drawBike(octx, t, spin, blur);
  octx.restore();
}
// the road up the face: a zigzag that always stays under the skyline, and ends on the crest
const SW = (function () {
  const pts = [[-.90, .05], [.13, ridgeY(.13)]];
  const N = 9;
  for (let k = 0; k <= N; k++) {
    const y = lerp(.10, .80, k / N);
    const amp = lerp(.34, .07, y / .9);
    pts.push([.10 + (k % 2 ? amp : -amp), y]);
  }
  pts.sort((a, b) => a[1] - b[1]);
  return pts;
})();
function swPoint(u) {
  if (!SW._len) {
    const L = [0]; let s = 0;
    for (let i = 1; i < SW.length; i++) { s += Math.hypot(SW[i][0] - SW[i - 1][0], SW[i][1] - SW[i - 1][1]); L.push(s); }
    SW._len = L; SW._tot = s;
  }
  const d = cl(u) * SW._tot;
  for (let i = 1; i < SW._len.length; i++) {
    if (d <= SW._len[i]) {
      const f = (d - SW._len[i - 1]) / (SW._len[i] - SW._len[i - 1] || 1);
      return [lerp(SW[i - 1][0], SW[i][0], f), lerp(SW[i - 1][1], SW[i][1], f),
        Math.atan2(SW[i][1] - SW[i - 1][1], SW[i][0] - SW[i - 1][0])];
    }
  }
  return [SW[SW.length - 1][0], SW[SW.length - 1][1], 0];
}
function swScreen(cam, u) { const q = swPoint(u), p = mScreen(cam, q[0], q[1]); return [p[0], p[1], q[2]]; }

// ================================================================== water light
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
function droplets(cam, x, z, age, seed, n, big) {
  if (age < 0 || age > .9) return;
  for (let i = 0; i < n; i++) {
    const vx = (hash(seed * 31 + i) - .5) * (big ? 2.4 : 1.6), vy = 1.1 + hash(seed * 17 + i * 3) * (big ? 2.2 : 1.3), vz = (hash(seed * 7 + i) - .5) * .3;
    const y = vy * age - 4.9 * age * age; if (y < 0) continue;
    const p = project(cam, x + vx * age, y, z + vz * age);
    xctx.globalAlpha = .95;
    xctx.beginPath(); xctx.arc(p[0], p[1], Math.max(.8 * K, (.006 + hash(i + seed) * .006) * p[2]), 0, TAU); xctx.fill();
  }
  xctx.globalAlpha = 1;
}
function trailWater(cam, x0, x1, gain, zf) {
  if (x1 <= x0 + .02) return;
  const N = 90, pts = [];
  for (let i = 0; i <= N; i++) { const x = lerp(x0, x1, i / N), p = project(cam, x, 0, zf(x)); pts.push([p[0], p[1], i / N]); }
  xctx.save(); xctx.lineCap = 'round'; xctx.lineJoin = 'round';
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    xctx.globalAlpha = .30 * gain; xctx.lineWidth = 34 * K; xctx.strokeStyle = '#FFE9C8';   // the halo
    xctx.beginPath(); xctx.moveTo(a[0], a[1]); xctx.lineTo(b[0], b[1]); xctx.stroke();
    xctx.globalAlpha = .62 * gain; xctx.lineWidth = 11 * K; xctx.strokeStyle = '#2A0F0C';   // the wake
    xctx.beginPath(); xctx.moveTo(a[0], a[1]); xctx.lineTo(b[0], b[1]); xctx.stroke();
  }
  xctx.restore();
  // a dark trough under it, in the reflection layer, so the cream reads on bright water too
  rctx.save(); rctx.setTransform(1, 0, 0, 1, 0, 0); rctx.lineCap = 'round'; rctx.lineJoin = 'round';
  rctx.strokeStyle = '#000'; rctx.globalAlpha = .62 * gain; rctx.lineWidth = 14 * K;
    for (let i = 1; i < pts.length; i++) rctx.lineTo(pts[i][0], pts[i][1]);
  rctx.stroke(); rctx.restore();
}

// ================================================================== sky clock
const pulseAt = t => .8 * Math.exp(-((t % B) / .13));
const PH = t => seg(t, [[0, .04], [2.5, .22], [4.0, .42], [5.0, .62], [5.7, .78], [6.9, .95], [10, 1.0]]);
const SUNY = t => seg(t, [[0, .050], [2.5, .042], [4.0, .026], [5.0, .008], [5.7, -.004], [6.9, -.012], [10, .014]]);

// ================================================================== the flat
const BIKE_X = 11.0;
const V = 8.6;
const XR = t => BIKE_X + V * Math.max(0, t - 1.25);
const ZF = x => RZ + 9.0 * Math.max(0, BIKE_X - x) + .9 * Math.sin((x - 6) * .12);   // the route recedes behind him

function clear() {
  for (const c of [fctx, rctx, xctx]) { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H); c.fillStyle = '#000'; c.strokeStyle = '#000'; c.filter = 'none'; }
  xctx.fillStyle = '#fff'; xctx.strokeStyle = '#fff';
}
const SHOTS = [];
const shot = (t0, t1, fn) => SHOTS.push({ t0, t1, fn });

// ---- 1 · 0.00–1.25  the bike in the shallows; he runs in, on the beat he is astride it
shot(0, 1.25, t => {
  const cam = { f: 5.2, ch: 1.05, hor: .60, cx: BIKE_X + 2.2 * t, cz: RZ - 55, yaw: 0 };
  const onBike = t > .95;
  both(cam, BIKE_X, 0, ZF(BIKE_X), 1, 1, ctx => { if (onBike) drawBike(ctx, t, 0, 0); else bikeFrame(ctx, 0, 0); });
  if (!onBike) both(cam, BIKE_X - 2.5 + 2.5 * t, 0, ZF(BIKE_X), 1, 1, ctx => drawRunner(ctx, runRig(t)));
  trailWater(cam, XR(0) - 3.0, BIKE_X - .2, .8, ZF);
  return Object.assign({ cam, vs: 1.75, rays: 1, pulse: pulseAt(t) * .7 }, { sun: [.035, SUNY(t)], sunR: .028 });
});
// ---- 2 · 1.25–2.50  low lateral track: wheels, spray, and the line he writes behind him
shot(1.25, 2.50, t => {
  const cam = { f: 7.0, ch: .80, hor: .615, cx: XR(t) + .12, cz: RZ - 38, yaw: 0 };
  const x = XR(t), z = ZF(x);
  both(cam, x, 0, z, 1, 1, ctx => drawBike(ctx, t, -x / BK.r, 1));
  for (let i = 0; i < 4; i++) {
    const tb = t - i * .09;
    if (tb < 1.25) break;
    droplets(cam, XR(tb) - .60, ZF(XR(tb)), t - tb, 31 + i, 10, i === 0);
  }
  ring(cam, x - .55, z, .28, .5, 1.5);
  trailWater(cam, XR(1.25) - 16.0, x - .5, 1.0, ZF);
  return Object.assign({ cam, vs: 1.85, rays: 1, pulse: pulseAt(t) }, { sun: [.010, SUNY(t)], sunR: .024 });
});
// ---- 3 · 2.50–3.75  the ridge appears; he is small on the water and the line runs to it
shot(2.50, 3.75, t => {
  const cam = { f: 5.0, ch: 2.6, hor: .575, cx: XR(t) + 7.5, cz: RZ - 40, yaw: 0 };
  ridgeFace(cam);
  const x = XR(t), z = ZF(x);
  both(cam, x, 0, z, 1, 1, ctx => drawBike(ctx, t, -x / BK.r, 1));
  trailWater(cam, XR(2.5) - 30, x - .4, .95, ZF);
  return Object.assign({ cam, vs: 1.6, rays: .8, pulse: pulseAt(t) * .6 }, { sun: [-.045, .026], sunR: .036 });
});
// ---- 4 · 3.75–5.625  the climb: the face fills the frame, the road zigzags up to the crest
shot(3.75, 5.625, t => {
  const u = env(t, 3.75, 5.625);
  const cam = { f: 6.0, ch: 26, hor: .72, cx: MT.x + .06, cz: MT.z - 1684, yaw: 0 };
  const su = .02 + .86 * eio(u);
  return {
    cam, vs: 1.7, rays: .7, pulse: pulseAt(t) * .8, sun: [.02, .058], sunR: .030,
    overlay: () => { faceTop(cam); roadTop(cam, su); riderTop(cam, su, t, -u * 44, .8, .050); }
  };
});
// ---- 5 · 5.625–6.875  the launch: off the crest, across the sun
shot(5.625, 6.875, t => {
  const u = env(t, 5.625, 6.875);
  const cam = { f: 6.0, ch: 40, hor: .80, cx: MT.x + .10, cz: MT.z - 1400, yaw: 0 };
  const sc = mScreen(cam, 0, 0)[2], s = sc * .050;
  const q = swPoint(1), top = mScreen(cam, q[0], ridgeY(q[0]));
  return {
    cam, vs: 1.5, rays: 1, pulse: 0, sun: [.035, .115], sunR: .026,
    overlay: () => {
      faceTop(cam); roadTop(cam, 1);
      const jx = top[0] + 200 * K * eout(u);
      const jy = top[1] - 205 * K * Math.sin(PI * Math.pow(cl(u * 1.05), .8));
      const rot = -.50 * Math.sin(PI * cl(u * 1.2)) - .16;
      octx.save(); octx.translate(jx, jy); octx.rotate(rot); octx.scale(s, -s);
      drawBike(octx, t, -u * 30, .9); octx.restore();
      octx.save(); octx.lineCap = 'round'; octx.globalAlpha = .95; octx.lineWidth = 5.0 * K;
      octx.beginPath(); octx.moveTo(top[0], top[1]);
      octx.quadraticCurveTo(jx - 110 * K, (jy + top[1]) / 2 - 30 * K, jx, jy); octx.stroke();
      octx.restore();
    }
  };
});
// ---- 6 · 6.875–10.0  the end card: the whole route on the dark, then one line of type
const ROUTE = (function () {                      // screen space, right to left: flat, then up the face
  const pts = [];
  for (let i = 0; i <= 8; i++) pts.push([lerp(.055, .50, i / 8), lerp(.655, .640, i / 8)]);
  const z = [[.53, .618], [.585, .575], [.565, .535], [.615, .495], [.595, .455], [.645, .415], [.630, .375], [.680, .345], [.700, .315]];
  for (const [x, y] of z) pts.push([x, y]);
  return pts.map(([x, y]) => [x * W, y * H]);
})();
shot(6.875, 10.0, t => {
  const cam = { f: 3.1, ch: 5.0, hor: .655, cx: XR(6.0) - 40, cz: RZ - 500, yaw: 0 };
  ridgeFace(cam);
  const g = env(t, 7.15, 8.25);
  return {
    cam, vs: 1.25, rays: .5, pulse: 0, sun: [-.075, .020], sunR: .030,
    overlay: () => {
      octx.save(); octx.lineCap = 'round'; octx.lineJoin = 'round';
      octx.strokeStyle = '#000'; octx.globalAlpha = .45; octx.lineWidth = 12 * K;
      octx.beginPath(); octx.moveTo(ROUTE[0][0], ROUTE[0][1] + 4 * K);
      for (let i = 1; i < ROUTE.length; i++) octx.lineTo(ROUTE[i][0], ROUTE[i][1] + 4 * K);
      octx.stroke();
      octx.strokeStyle = '#FFF3E4'; octx.globalAlpha = .95; octx.lineWidth = 8.5 * K;
      octx.beginPath(); octx.moveTo(ROUTE[0][0], ROUTE[0][1]);
      for (let i = 1; i < ROUTE.length; i++) octx.lineTo(ROUTE[i][0], ROUTE[i][1]);
      octx.stroke();
      octx.globalAlpha = .95; octx.lineWidth = 3.2 * K;
      octx.beginPath(); octx.moveTo(ROUTE[0][0], ROUTE[0][1]);
      for (let i = 1; i < ROUTE.length; i++) octx.lineTo(ROUTE[i][0], ROUTE[i][1]);
      octx.stroke();
      octx.restore();
      if (g > 0 && g < 1) {
        const gp = eio(g), M = ROUTE.length - 1, fi = gp * M, i0 = Math.floor(fi), f = fi - i0;
        const ax = lerp(ROUTE[i0][0], ROUTE[Math.min(i0 + 1, M)][0], f), ay = lerp(ROUTE[i0][1], ROUTE[Math.min(i0 + 1, M)][1], f);
        octx.save(); octx.lineCap = 'round'; octx.globalAlpha = .9 * (1 - Math.abs(gp - .55) * .7);
        octx.strokeStyle = '#FFF6DC'; octx.lineWidth = 13 * K;
        octx.beginPath(); octx.moveTo(ROUTE[Math.max(0, i0 - 6)][0], ROUTE[Math.max(0, i0 - 6)][1]); octx.lineTo(ax, ay); octx.stroke();
        octx.fillStyle = '#FFF6DC'; octx.beginPath(); octx.arc(ax, ay, 7 * K, 0, TAU); octx.fill();
        octx.restore();
      }
      if (g >= 1) {
        const p = ROUTE[ROUTE.length - 1];
        octx.save(); octx.translate(p[0], p[1]); octx.rotate(-.12);
        octx.scale(Math.max(mScreen(cam, 0, 0)[2] * .050, 120 * K), -Math.max(mScreen(cam, 0, 0)[2] * .050, 120 * K));
        drawBike(octx, t, -30, 1); octx.restore();
      }
    }
  };
});

// ================================================================== type: one RTL string, one word per beat
const LINE = 'بلا شبكة. المسار كله.';
const WORD_T = [8.45, 8.70, 8.95, 9.20];
function typeMetrics() {
  octx.font = `700 ${72 * K}px Cairo`;
  const parts = LINE.split(' ');
  const ws = parts.map(p => octx.measureText(p + ' ').width);
  return { ws, tot: ws.reduce((a, b) => a + b, 0) };
}
function drawType(t) {
  if (t < WORD_T[0]) return;
  const M = typeMetrics(), f = `700 ${72 * K}px Cairo`;
  const xr = W - 88 * K, y = 1712 * K;
  let k = 0, wsum = 0;
  for (let i = 0; i < WORD_T.length; i++) {
    const u = env(t, WORD_T[i], WORD_T[i] + .17);
    if (u <= 0) break;
    k = i + 1; wsum += M.ws[i] * (u >= 1 ? 1 : eout(u));
    if (u < 1) break;
  }
  const left = xr - wsum;
  octx.save();
  octx.beginPath(); octx.rect(left - 14 * K, y - 132 * K, (xr - left) + 30 * K, 214 * K); octx.clip();
  octx.font = f; octx.fillStyle = '#FFF3E4'; octx.textAlign = 'right'; octx.textBaseline = 'alphabetic'; octx.direction = 'rtl';
  octx.fillText(LINE, xr, y);
  octx.restore();
  for (let i = 0; i < k; i++) {
    const a = t - WORD_T[i] - .04;
    if (a <= 0 || a > 1.1) continue;
    let cx = xr; for (let j = 0; j < i; j++) cx -= M.ws[j];
    cx -= M.ws[i] * .5;
    octx.save(); octx.strokeStyle = '#FFD9A8'; octx.globalAlpha = .34 * Math.pow(1 - a / 1.1, 2); octx.lineWidth = 1.4 * K;
    const rx = M.ws[i] * .30 + 80 * K * Math.pow(a, .6);
    octx.beginPath(); octx.ellipse(cx, y + 26 * K, Math.max(rx, 6 * K), Math.max(rx * .05, 1.5 * K), 0, 0, TAU); octx.stroke(); octx.restore();
  }
  if (t >= 9.42) {
    const u = eout(env(t, 9.42, 9.74));
    octx.save(); octx.globalAlpha = u * .80; octx.fillStyle = '#FFE9CC';
    octx.font = `600 ${26 * K}px Cairo`; octx.textAlign = 'right'; octx.direction = 'ltr';
    octx.fillText('TRAILMARK', xr, y + 52 * K); octx.restore();
  }
}
window.TEXTS = t => (t < WORD_T[0] ? [] : [{ id: 'line', text: LINE, x0: 80 * K, y0: 1600 * K, x1: W - 80 * K, y1: 1770 * K }]);

// ================================================================== frame
window.DUR = DUR;
window.render = function (t) {
  t = cl(t, 0, DUR - 1e-4);
  let S = SHOTS[0]; for (const s of SHOTS) if (t >= s.t0 && t < s.t1) S = s;
  clear();
  const r = S.fn(t), cam = r.cam;
  draw({ T: t, hor: cam.hor * H, fpx: cam.f * H, yaw: cam.yaw, cx: cam.cx, ch: cam.ch, sun: r.sun, sunR: r.sunR,
    ph: PH(t), pulse: r.pulse, flash: 0, rays: r.rays, vs: r.vs }, [LF, LR, LX]);
  octx.setTransform(1, 0, 0, 1, 0, 0); octx.clearRect(0, 0, W, H);
  if (r.overlay) r.overlay(t, cam);
  drawType(t);
  if (r.smear > .01) motionBlur(r.smear);
};
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
Promise.all([document.fonts.load(`700 40px Cairo`, LINE), document.fonts.load(`600 20px Cairo`, 'TRAILMARK')])
  .then(() => { window.render(0); window.READY = true; });
})();
