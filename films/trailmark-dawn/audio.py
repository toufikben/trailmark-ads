#!/usr/bin/env python3
"""Trailmark · «بلا شبكة» — the 8-second score and foley, made from numpy only.

Timeline (the picture's, in seconds):
  0.000 – 3.667  music: marimba ostinato, log-drum footfalls on every landing, shaker on 16ths
  3.667 – 4.167  the record stop; four beacon blips, one per sixteenth, as the four bars die
  4.167 – 4.667  wind alone: the silence
  4.667 – 6.667  the beat rebuilt one instrument per step; a push-in on the step
  6.667           the cut: one boom and a whoosh
  6.667 – 8.000  held chord, one marimba note under the last word, one chime under the name

Out: films/trailmark-dawn/out/mix.wav, 48 kHz, stereo, -1 dBFS peak (mux.sh takes it to -14 LUFS).
"""
import os
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
DUR = 8.0
N = int(SR * DUR)
B = 60 / 90.0            # the beat: 0.6667 s, 12 beats in 8 s
HF = B / 2.0             # half beat
SX = B / 4.0             # sixteenth
rng = np.random.default_rng(7)

L = np.zeros(N)
Rr = np.zeros(N)


def add(t, sig, pan=0.0, gain=1.0):
    """Mix a mono signal in at time t, equal-power panned."""
    i = int(round(t * SR))
    if i >= N:
        return
    s = sig[: max(0, N - i)]
    a = (np.clip(pan, -1, 1) + 1) * np.pi / 4
    L[i:i + len(s)] += s * np.cos(a) * gain
    Rr[i:i + len(s)] += s * np.sin(a) * gain


def t_(n):
    return np.arange(n) / SR


def noise(n):
    return rng.standard_normal(n)


def bp(x, lo, hi, order=2):
    sos = butter(order, [lo, hi], btype="band", fs=SR, output="sos")
    return sosfilt(sos, x)


def lp(x, f, order=2):
    sos = butter(order, f, btype="low", fs=SR, output="sos")
    return sosfilt(sos, x)


def hp(x, f, order=2):
    sos = butter(order, f, btype="high", fs=SR, output="sos")
    return sosfilt(sos, x)


# ---------------------------------------------------------------- instruments
def kick(f0=120.0, f1=52.0, k=0.085, dur=0.42):
    t = t_(int(dur * SR))
    f = f1 + (f0 - f1) * np.exp(-t / 0.028)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / k)
    click = hp(noise(len(t)), 1800) * np.exp(-t / 0.004) * 0.35
    return body + click


def woodblock(f=1180.0, dur=0.12):
    t = t_(int(dur * SR))
    s = np.sin(2 * np.pi * f * t) * 0.8 + np.sin(2 * np.pi * f * 1.53 * t) * 0.35
    s *= np.exp(-t / 0.022)
    s += hp(noise(len(t)), 3000) * np.exp(-t / 0.003) * 0.3
    return s


def shaker(dur=0.10):
    t = t_(int(dur * SR))
    s = bp(noise(len(t)), 4200, 11000)
    s *= np.minimum(1, t / 0.004) * np.exp(-t / 0.035)
    return s * 0.55


def marimba(f, dur=1.2):
    t = t_(int(dur * SR))
    s = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.45)
    s += np.sin(2 * np.pi * f * 4.0 * t) * 0.30 * np.exp(-t / 0.11)
    s += np.sin(2 * np.pi * f * 9.2 * t) * 0.10 * np.exp(-t / 0.05)
    return s * np.minimum(1, t / 0.0025)


def bass(f, dur=0.9):
    t = t_(int(dur * SR))
    s = np.sin(2 * np.pi * f * t) + 0.18 * np.sin(2 * np.pi * 2 * f * t)
    s = np.tanh(s * 1.4) * np.exp(-t / 0.30)
    return s * np.minimum(1, t / 0.006)


def strings(fs, dur=3.2, attack=0.55):
    t = t_(int(dur * SR))
    s = np.zeros(len(t))
    for f in fs:
        for d in (-0.004, 0.0, 0.005):
            s += np.sin(2 * np.pi * f * (1 + d) * t + rng.uniform(0, 6.28))
    s = lp(s / (len(fs) * 3), 2200)
    env = np.minimum(1, t / attack) * np.exp(-np.maximum(0, t - attack * 2.2) / 1.1)
    return s * env


def splash(big=1.0):
    d = 0.40
    t = t_(int(d * SR))
    s = bp(noise(len(t)), 900, 6500) * np.exp(-t / 0.075) * 0.9
    s += hp(noise(len(t)), 5000) * np.exp(-t / 0.02) * 0.35
    s *= np.minimum(1, t / 0.0015)
    ping = np.zeros(len(t))
    k = int(0.035 * SR)
    tp = t_(int(0.25 * SR))
    ping[k:k + len(tp)] = np.sin(2 * np.pi * 2100 * tp) * np.exp(-tp / 0.045) * 0.25
    return (s + ping) * big


def beacon(f, dur=0.22):
    t = t_(int(dur * SR))
    s = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.045)
    s += np.sin(2 * np.pi * f * 1.5 * t) * 0.4 * np.exp(-t / 0.03)
    s += hp(noise(len(t)), 4000) * np.exp(-t / 0.006) * 0.25
    return s * np.minimum(1, t / 0.001)


def boom(dur=1.4):
    t = t_(int(dur * SR))
    s = np.sin(2 * np.pi * 46 * t) * np.exp(-t / 0.42)
    s += np.sin(2 * np.pi * 92 * t) * 0.25 * np.exp(-t / 0.16)
    s += lp(noise(len(t)), 300) * np.exp(-t / 0.09) * 0.5
    return s * np.minimum(1, t / 0.002)


def whoosh(dur=0.45, up=True):
    t = t_(int(dur * SR))
    x = noise(len(t))
    # a one-pole low-pass whose cutoff sweeps: cheap and smooth
    fc = 300 + 7000 * (t / dur if up else 1 - t / dur) ** 1.6
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.zeros(len(t))
    acc = 0.0
    for i in range(len(t)):
        acc = a[i] * acc + (1 - a[i]) * x[i]
        y[i] = acc
    y = hp(y, 250)
    env = np.minimum(1, t / 0.03) * (1 - np.minimum(1, t / dur)) ** 1.5
    return y * env


def tape_stop(dur=0.16):
    t = t_(int(dur * SR))
    f = 460 * np.exp(-t / 0.055) + 42
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.09)
    s += lp(noise(len(t)), 900) * np.exp(-t / 0.05) * 0.25
    return s


# ---------------------------------------------------------------- wind, always there
wind = lp(noise(N), 900) * 0.7 + lp(noise(N), 220) * 0.8
wind2 = lp(noise(N), 900) * 0.7 + lp(noise(N), 220) * 0.8
tt = np.arange(N) / SR
# gusts: slower than a beat, so it never fights the rhythm
gust = 0.55 + 0.45 * np.sin(2 * np.pi * tt / 3.1 + 0.4) * np.sin(2 * np.pi * tt / 1.7)
level = np.interp(tt, [0, 3.6, 3.667, 4.3, 4.667, 6.6, 6.7, 8.0],
                      [0.55, 0.55, 1.0, 1.15, 0.55, 0.5, 0.35, 0.3])
wind_l = wind * gust * level * 0.085
wind_r = wind2 * (0.85 + 0.15 * gust) * level * 0.085
L += wind_l
Rr += wind_r

# ---------------------------------------------------------------- landings (the click track)
landings = [0.0666667 + n / 3.0 for n in range(0, 24) if 0.0666667 + n / 3.0 < 8.0]

for n, tl in enumerate(landings):
    if tl < 3.60:                                   # shot 1, shot 2: the full beat
        add(tl, kick(), pan=-0.12 + 0.22 * min(1, tl / 2.0), gain=0.85)
        add(tl, splash(1.0 if n % 2 == 0 else 0.8), pan=-0.1 + 0.2 * min(1, tl / 2.0), gain=0.34)
        if n % 2 == 1:
            add(tl, woodblock(), pan=0.16, gain=0.22)
    elif tl > 4.60:                                 # shot 4: the beat built back, one voice per step
        if tl >= 4.90:
            add(tl, kick(), pan=0.10, gain=0.80)
        if tl >= 5.20:
            add(tl, splash(0.7), pan=0.10, gain=0.26)
        if tl >= 5.53:
            add(tl, woodblock(), pan=0.20, gain=0.20)

# ---------------------------------------------------------------- the music before the turn
SCALE = [440.0, 523.25, 587.33, 659.25, 783.99]        # A minor pentatonic
OSTINATO = [0, 2, 1, 3, 2, 4, 3, 1]
k = 0
t = 1.333
while t < 3.60:
    f = SCALE[OSTINATO[k % len(OSTINATO)]] / 2
    add(t, marimba(f, 0.9), pan=-0.05 + 0.10 * (k % 2), gain=0.30)
    t += HF
    k += 1
for i, tb in enumerate(np.arange(0.0, 3.60, B)):
    add(tb, bass(SCALE[[0, 0, 3, 4][i % 4]] / 4), pan=0.0, gain=0.22)
for tsix in np.arange(0.5, 3.60, SX):
    add(tsix, shaker(), pan=0.22 if int(tsix / SX) % 2 else -0.22, gain=0.20)

# the stop: everything above dies on the sixteenth, the tape drags
STOP = 3.6667
cut = int(STOP * SR)
fade = int(0.018 * SR)
gate = np.ones(N)
gate[cut:cut + fade] = np.linspace(1, 0, fade)
gate[cut + fade:] = 0.0
L *= gate
Rr *= gate
L += wind_l * (1 - gate)
Rr += wind_r * (1 - gate)
add(STOP - 0.02, tape_stop(), pan=0.0, gain=0.30)

# the four bars go: one blip per sixteenth, each lower than the last
for i, fq in enumerate([1480, 1120, 860, 640]):
    add(STOP + i * SX, beacon(fq), pan=-0.18, gain=0.34 - 0.04 * i)
add(4.20, beacon(430, 0.5), pan=-0.18, gain=0.13)         # the last, faint: the tower is dark

# ---------------------------------------------------------------- the beat comes back
add(4.6667, marimba(SCALE[4] / 2, 1.4), pan=-0.05, gain=0.42)     # the first sound after the silence
add(5.0, marimba(SCALE[2] / 2, 1.2), pan=0.0, gain=0.26)
add(5.3333, marimba(SCALE[3] / 2, 1.2), pan=0.05, gain=0.24)
add(5.6667, marimba(SCALE[1] / 2, 1.2), pan=0.0, gain=0.22)
for tsix in np.arange(5.6667, 6.60, SX):
    add(tsix, shaker(), pan=0.20 if int(tsix / SX) % 2 else -0.20, gain=0.16)

# ---------------------------------------------------------------- the cut, then the dark
CUT = 6.6667
add(CUT, boom(), pan=0.0, gain=0.85)
add(CUT - 0.30, whoosh(0.55), pan=0.0, gain=0.26)
add(CUT + 0.02, strings([110.0, 164.81, 220.0, 329.63], 1.5, 0.25), pan=0.0, gain=0.30)
add(7.10, marimba(SCALE[3] / 2, 1.6), pan=0.06, gain=0.40)        # under the last word
add(7.34, beacon(1320, 0.6), pan=0.12, gain=0.12)                 # under the name

# ---------------------------------------------------------------- a short room, then the master
ir_len = int(0.85 * SR)
ir = rng.standard_normal(ir_len) * np.exp(-np.arange(ir_len) / (0.16 * SR))
ir = lp(ir, 5000)
ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
wet = 0.13
Lw = fftconvolve(L, ir)[:N]
Rw = fftconvolve(Rr, ir)[:N]
L = L * (1 - wet * 0.5) + Lw * wet
Rr = Rr * (1 - wet * 0.5) + Rw * wet

# gentle top-end removal on the very end so nothing clicks out
tail = int(0.05 * SR)
L[-tail:] *= np.linspace(1, 0, tail)
Rr[-tail:] *= np.linspace(1, 0, tail)

peak = max(np.max(np.abs(L)), np.max(np.abs(Rr)))
g = 0.89 / peak
L *= g
Rr *= g

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
os.makedirs(out, exist_ok=True)
path = os.path.join(out, "mix.wav")


def write_wav(path, l, r, sr=SR):
    import struct
    x = np.empty(len(l) * 2, dtype=np.int16)
    x[0::2] = np.clip(l * 32767, -32768, 32767).astype(np.int16)
    x[1::2] = np.clip(r * 32767, -32768, 32767).astype(np.int16)
    data = x.tobytes()
    with open(path, "wb") as f:
        f.write(b"RIFF")
        f.write(struct.pack("<I", 36 + len(data)))
        f.write(b"WAVEfmt ")
        f.write(struct.pack("<IHHIIHH", 16, 1, 2, sr, sr * 4, 4, 16))
        f.write(b"data")
        f.write(struct.pack("<I", len(data)))
        f.write(data)


write_wav(path, L, Rr)
rms = np.sqrt(np.mean(L ** 2 + Rr ** 2) / 2)
print(f"{path}  {len(L)/SR:.3f} s  peak {20*np.log10(g*peak):.2f} dBFS  rms {20*np.log10(rms):.1f} dBFS")
