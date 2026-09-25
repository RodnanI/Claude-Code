#!/usr/bin/env python3
"""Place the dry sampler render in a concert hall and master it.

The hall is a synthetic stereo impulse response: sparse early reflections,
then decorrelated noise whose decay time falls with frequency (about 2.3 s
in the bass, 1.9 s at 1 kHz, under 1 s at 10 kHz), like a mid-sized hall.

usage: master.py raw.wav out.wav
"""
import sys

import numpy as np
import soundfile as sf
from scipy import signal

SR = 48000


def hall_ir(sr=SR, length=3.6, seed=11):
    rng = np.random.default_rng(seed)
    n = int(sr * length)
    nfft, hop = 1024, 256
    freqs = np.fft.rfftfreq(nfft, 1 / sr)
    rt60 = np.interp(np.log10(np.maximum(freqs, 20)),
                     np.log10([20, 125, 500, 1000, 4000, 10000, 24000]),
                     [2.5, 2.35, 2.05, 1.9, 1.5, 0.85, 0.45])
    ir = np.zeros((n, 2))
    for ch in range(2):
        noise = rng.standard_normal(n + nfft)
        _, _, z = signal.stft(noise, fs=sr, nperseg=nfft, noverlap=nfft - hop)
        t = np.arange(z.shape[1]) * hop / sr
        z *= np.exp(-6.908 * t[None, :] / rt60[:, None])
        _, late = signal.istft(z, fs=sr, nperseg=nfft, noverlap=nfft - hop)
        late = late[:n]
        tt = np.arange(n) / sr
        onset = np.clip((tt - 0.018) / 0.06, 0, 1) ** 2          # pre-delay and build-up
        ir[:, ch] = late * onset
    ir /= np.sqrt(np.sum(ir ** 2) / 2)
    # early reflections: floor, side walls, stage shell
    early = [(0.011, 0.55, 0.3), (0.017, 0.42, -0.6), (0.023, 0.38, 0.7), (0.031, 0.30, -0.2),
             (0.037, 0.27, 0.5), (0.044, 0.22, -0.7), (0.052, 0.18, 0.1), (0.061, 0.15, -0.4),
             (0.070, 0.12, 0.6), (0.083, 0.10, -0.1)]
    er = np.zeros_like(ir)
    for delay, gain, pan in early:
        k = int(delay * sr)
        er[k, 0] += gain * np.sqrt(0.5 * (1 - pan)) * (1 if rng.random() > 0.3 else -1)
        er[k, 1] += gain * np.sqrt(0.5 * (1 + pan)) * (1 if rng.random() > 0.3 else -1)
    b, a = signal.butter(2, 6000 / (sr / 2))
    er = signal.lfilter(b, a, er, axis=0)
    return ir + 0.9 * er


def shelf(x, f0, gain_db, sr=SR, high=True):
    """RBJ shelving filter."""
    A = 10 ** (gain_db / 40)
    w0 = 2 * np.pi * f0 / sr
    alpha = np.sin(w0) / 2 * np.sqrt(2)
    c = np.cos(w0)
    s = 1 if high else -1
    b = np.array([A * ((A + 1) + s * (A - 1) * c + 2 * np.sqrt(A) * alpha),
                  -s * 2 * A * ((A - 1) + s * (A + 1) * c),
                  A * ((A + 1) + s * (A - 1) * c - 2 * np.sqrt(A) * alpha)])
    a = np.array([(A + 1) - s * (A - 1) * c + 2 * np.sqrt(A) * alpha,
                  s * 2 * ((A - 1) - s * (A + 1) * c),
                  (A + 1) - s * (A - 1) * c - 2 * np.sqrt(A) * alpha])
    return signal.lfilter(b / a[0], a / a[0], x, axis=0)


def leveler(x, thresh_db=-30.0, ratio=1.5, hop=48):
    """Slow, gentle compression (80 ms attack, 0.8 s release) so pianissimo stays audible."""
    p = np.mean(x ** 2, axis=1)
    frames = p[:len(p) // hop * hop].reshape(-1, hop).mean(axis=1)
    rms_db = 10 * np.log10(np.convolve(frames, np.ones(60) / 60, mode="same") + 1e-12)
    target = np.where(rms_db > thresh_db, -(rms_db - thresh_db) * (1 - 1 / ratio), 0.0)
    g, cur = np.empty_like(target), 0.0
    att, rel = np.exp(-1 / 80), np.exp(-1 / 800)
    for i, t in enumerate(target):
        a = att if t < cur else rel
        cur = a * cur + (1 - a) * t
        g[i] = cur
    gain_db = np.interp(np.arange(len(p)), np.arange(len(g)) * hop + hop / 2, g)
    return x * 10 ** (gain_db / 20)[:, None]


def limiter(x, reduce_db=2.0, sr=SR):
    """Look-ahead peak limiter that shaves only the few loudest hammer transients."""
    from scipy.ndimage import minimum_filter1d, uniform_filter1d
    a = np.abs(x).max(axis=1)
    ceil = a.max() * 10 ** (-reduce_db / 20)
    need = np.minimum(1.0, ceil / np.maximum(a, 1e-12))
    g = minimum_filter1d(need, size=int(0.02 * sr))
    g = np.minimum(uniform_filter1d(g, size=int(0.01 * sr)), need)
    return x * g[:, None]


def master(x, sr=SR, wet_db=-8.5):
    hp = signal.butter(2, 28 / (sr / 2), "high", output="sos")
    dry = signal.sosfilt(hp, x, axis=0)
    dry = shelf(dry, 7000, -1.5)                    # a little distance from the strings
    ir = hall_ir(sr)
    wet = np.stack([signal.fftconvolve(dry[:, 0], ir[:, 0]) + 0.25 * signal.fftconvolve(dry[:, 1], ir[:, 0]),
                    signal.fftconvolve(dry[:, 1], ir[:, 1]) + 0.25 * signal.fftconvolve(dry[:, 0], ir[:, 1])],
                   axis=1) / 1.25
    out = np.zeros_like(wet)
    out[:len(dry)] = dry
    out += wet * 10 ** (wet_db / 20)
    # trim trailing silence, short fades
    level = np.abs(out).max(axis=1)
    last = np.nonzero(level > 10 ** (-80 / 20) * level.max())[0][-1]
    out = out[:min(len(out), last + sr // 2)]
    fade = int(0.5 * sr)
    out[-fade:] *= np.linspace(1, 0, fade)[:, None] ** 2
    out /= np.abs(out).max()
    out = limiter(leveler(out))
    # peak normalise with 4x oversampled true-peak estimate to -1 dBTP
    tp = np.abs(signal.resample_poly(out, 4, 1, axis=0)).max()
    return out * (10 ** (-1 / 20) / tp)


if __name__ == "__main__":
    x, sr = sf.read(sys.argv[1], always_2d=True)
    assert sr == SR
    y = master(x)
    sf.write(sys.argv[2], y, SR, subtype="PCM_24")
    try:
        import pyloudnorm
        print(f"integrated loudness {pyloudnorm.Meter(SR).integrated_loudness(y):.1f} LUFS")
    except ImportError:
        pass
    print(f"{len(y) / SR:.1f} s written to {sys.argv[2]}")
