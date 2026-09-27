#!/usr/bin/env python3
"""Mastering: EQ, synthetic concert hall, slow leveler, look-ahead limiter,
true-peak normalisation to -1 dBTP.

    python3 master.py dry.wav master.wav
"""
import sys

import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from scipy import ndimage, signal

WET_DB = -8.5
PREDELAY = 0.018
RT60 = [(20.0, 2.5), (1000.0, 1.9), (10000.0, 0.85)]


def high_shelf(f0, gain_db, sr, slope=0.7):
    """RBJ cookbook high shelf as a single SOS section."""
    A = 10 ** (gain_db / 40)
    w0 = 2 * np.pi * f0 / sr
    alpha = np.sin(w0) / 2 * np.sqrt((A + 1 / A) * (1 / slope - 1) + 2)
    cw = np.cos(w0)
    b0 = A * ((A + 1) + (A - 1) * cw + 2 * np.sqrt(A) * alpha)
    b1 = -2 * A * ((A - 1) + (A + 1) * cw)
    b2 = A * ((A + 1) + (A - 1) * cw - 2 * np.sqrt(A) * alpha)
    a0 = (A + 1) - (A - 1) * cw + 2 * np.sqrt(A) * alpha
    a1 = 2 * ((A - 1) - (A + 1) * cw)
    a2 = (A + 1) - (A - 1) * cw - 2 * np.sqrt(A) * alpha
    return np.array([[b0 / a0, b1 / a0, b2 / a0, 1.0, a1 / a0, a2 / a0]])


def rt60(f):
    """Reverb time at frequency f, log-linear between the anchor points."""
    lf = np.log10(f)
    xs = [np.log10(p[0]) for p in RT60]
    ys = [p[1] for p in RT60]
    if lf >= xs[-1]:
        slope = (ys[-1] - ys[-2]) / (xs[-1] - xs[-2])
        return max(0.45, ys[-1] + slope * (lf - xs[-1]))
    return float(np.interp(lf, xs, ys))


def hall_ir(sr, seed=11):
    rng = np.random.default_rng(seed)
    n = int(sr * 3.4)
    t = np.arange(n) / sr
    irs = []
    centres = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
    for ch in range(2):
        noise = rng.standard_normal(n)
        tail = np.zeros(n)
        for i, fc in enumerate(centres):
            lo, hi = fc / np.sqrt(2), min(fc * np.sqrt(2), sr / 2 * 0.95)
            if i == 0:
                sos = signal.butter(4, hi, "lowpass", fs=sr, output="sos")
            elif i == len(centres) - 1:
                sos = signal.butter(4, lo, "highpass", fs=sr, output="sos")
            else:
                sos = signal.butter(3, [lo, hi], "bandpass", fs=sr, output="sos")
            band = signal.sosfilt(sos, noise)
            tail += band * np.exp(-6.9078 * t / rt60(fc))
        # the diffuse tail builds up over the first 60 ms
        ramp = np.clip(t / 0.06, 0, 1)
        tail *= np.sin(ramp * np.pi / 2) ** 2
        tail /= np.sqrt(np.sum(tail ** 2))
        # ten early reflections
        early = np.zeros(n)
        times = np.sort(rng.uniform(0.007, 0.085, 10))
        for k, te in enumerate(times):
            g = 0.55 * (1 - k / 12) * rng.uniform(0.7, 1.0)
            early[int(te * sr)] += g * (1 if rng.random() > 0.3 else -1)
        early = signal.sosfilt(signal.butter(2, 6500, "lowpass", fs=sr, output="sos"), early)
        ir = 0.55 * early + tail
        ir = np.concatenate([np.zeros(int(PREDELAY * sr)), ir])
        irs.append(ir / np.sqrt(np.sum(ir ** 2)))
    return np.stack(irs, axis=1)


def leveler(x, sr, thresh_db=-30.0, ratio=1.5, att=0.08, rel=0.8):
    hop = sr // 1000
    mono = np.mean(x ** 2, axis=1)
    frames = len(mono) // hop
    ms = mono[: frames * hop].reshape(frames, hop).mean(axis=1)
    # 50 ms RMS window
    win = 50
    ms = np.convolve(ms, np.ones(win) / win, mode="same")
    lvl = 10 * np.log10(ms + 1e-12)
    target = np.where(lvl > thresh_db, -(lvl - thresh_db) * (1 - 1 / ratio), 0.0)
    ga = np.exp(-1 / (att * 1000))
    gr = np.exp(-1 / (rel * 1000))
    g = np.empty(frames)
    cur = 0.0
    for i in range(frames):
        tgt = target[i]
        c = ga if tgt < cur else gr
        cur = c * cur + (1 - c) * tgt
        g[i] = cur
    gain_db = np.interp(np.arange(len(x)) / hop, np.arange(frames), g)
    return x * (10 ** (gain_db / 20))[:, None], g


def limiter(x, sr, depth_db=2.0, look=0.005):
    peak = np.max(np.abs(x))
    thr = peak * 10 ** (-depth_db / 20)
    a = np.max(np.abs(x), axis=1)
    g_inst = np.minimum(1.0, thr / np.maximum(a, 1e-12))
    L = int(look * sr)
    m = ndimage.minimum_filter1d(g_inst, size=2 * L + 1, mode="nearest")
    g = ndimage.uniform_filter1d(m, size=L, mode="nearest")
    return x * g[:, None]


def true_peak(x):
    up = signal.resample_poly(x, 4, 1, axis=0)
    return np.max(np.abs(up))


def main():
    src, dst = sys.argv[1:3]
    x, sr = sf.read(src, always_2d=True)
    x = x.astype(np.float64)
    if x.shape[1] == 1:
        x = np.repeat(x, 2, axis=1)
    if not np.all(np.isfinite(x)):
        raise SystemExit("dry render contains NaN/inf")

    # EQ: 28 Hz high-pass, -1.5 dB shelf at 7 kHz
    hp = signal.butter(2, 28, "highpass", fs=sr, output="sos")
    x = signal.sosfilt(hp, x, axis=0)
    x = signal.sosfilt(high_shelf(7000, -1.5, sr), x, axis=0)

    # hall
    ir = hall_ir(sr)
    wet = np.stack([signal.oaconvolve(x[:, c], ir[:, c]) for c in range(2)], axis=1)
    y = np.zeros_like(wet)
    y[: len(x)] += x
    y += 10 ** (WET_DB / 20) * wet
    # trim the silent end of the tail
    env = np.max(np.abs(y), axis=1)
    last = np.nonzero(env > 10 ** (-80 / 20) * env.max())[0][-1]
    y = y[: min(len(y), last + int(0.2 * sr))]
    fade = int(0.2 * sr)
    y[-fade:] *= np.linspace(1, 0, fade)[:, None]

    y /= np.max(np.abs(y)) * 10 ** (1 / 20)
    y, g = leveler(y, sr)
    y = limiter(y, sr)
    tp = true_peak(y)
    y *= 10 ** (-1 / 20) / tp
    sf.write(dst, y, sr, subtype="PCM_24")

    meter = pyln.Meter(sr)
    lufs = meter.integrated_loudness(y)
    st = []
    w, h = 3 * sr, sr
    for i in range(0, len(y) - w, h):
        blk = y[i:i + w]
        st.append(10 * np.log10(np.mean(blk ** 2) + 1e-12))
    st = np.array(st)
    st = st[st > st.max() - 40]
    print(f"length {len(y) / sr:.1f} s  integrated {lufs:.1f} LUFS  "
          f"true peak {20 * np.log10(true_peak(y)):.2f} dBTP  "
          f"sample peak {20 * np.log10(np.max(np.abs(y))):.2f} dBFS  "
          f"dynamic range (p95-p10 of 3 s RMS) {np.percentile(st, 95) - np.percentile(st, 10):.1f} dB  "
          f"max leveler cut {-g.min():.1f} dB")


if __name__ == "__main__":
    main()
