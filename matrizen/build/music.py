#!/usr/bin/env python3
"""Erzeugt eine ruhige, loop-fähige Hintergrundmusik (Lo-Fi / Ambient).

Alles wird synthetisch mit NumPy erzeugt — keine externen Samples.
Aufruf:  python3 music.py out.wav [minuten]
"""

import sys
import numpy as np
from scipy.signal import oaconvolve

SR = 44100
BPM = 68.0
BEAT = 60.0 / BPM
BAR = 4 * BEAT          # 3,529 s
SEED = 20260726


def midi(n):
    """MIDI-Nummer -> Frequenz (A4 = 69 = 440 Hz)."""
    return 440.0 * 2 ** ((n - 69) / 12.0)


# ---------------------------------------------------------------- Hüllkurven
def env_adsr(n, a, d, s, r, sr=SR):
    """Einfache ADSR-Hüllkurve der Länge n (Samples)."""
    a, d, r = int(a * sr), int(d * sr), int(r * sr)
    a, d, r = max(a, 1), max(d, 1), max(r, 1)
    sus = max(n - a - d - r, 0)
    e = np.concatenate([
        np.linspace(0, 1, a, endpoint=False) ** 1.6,
        s + (1 - s) * np.linspace(1, 0, d, endpoint=False) ** 1.4,
        np.full(sus, s),
        s * np.linspace(1, 0, r) ** 1.8,
    ])
    if len(e) < n:
        e = np.pad(e, (0, n - len(e)))
    return e[:n]


def env_exp(n, tau, sr=SR):
    t = np.arange(n) / sr
    return np.exp(-t / tau)


# ---------------------------------------------------------------- Klangfarben
def pad_voice(f, dur, detune=0.004, harmonics=(1.0, 0.42, 0.2, 0.09, 0.04)):
    """Warmer Flächenklang mit leichtem Chorus."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for k, amp in enumerate(harmonics, start=1):
        # zwei leicht verstimmte Stimmen -> Schweben
        for dt in (-detune, detune):
            phase = 2 * np.pi * f * k * (1 + dt) * t
            # ganz langsames Vibrato macht die Fläche lebendig
            phase += 0.035 * np.sin(2 * np.pi * 0.13 * t + k)
            out += amp * np.sin(phase)
    out /= sum(harmonics) * 2
    return out * env_adsr(n, a=1.1, d=0.9, s=0.72, r=1.4)


def bell_voice(f, dur, bright=1.0):
    """Weiches Rhodes-/Glockenspiel."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    o = (np.sin(2 * np.pi * f * t) * env_exp(n, 0.85)
         + 0.34 * bright * np.sin(2 * np.pi * 2 * f * t) * env_exp(n, 0.32)
         + 0.13 * bright * np.sin(2 * np.pi * 3.01 * f * t) * env_exp(n, 0.16)
         + 0.05 * bright * np.sin(2 * np.pi * 4.98 * f * t) * env_exp(n, 0.09))
    # kurzer Anschlag
    atk = np.minimum(np.arange(n) / (0.006 * SR), 1.0)
    return o * atk / 1.5


def sub_voice(f, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    o = np.sin(2 * np.pi * f * t) + 0.14 * np.sin(2 * np.pi * 2 * f * t)
    return o * env_adsr(n, a=0.06, d=0.6, s=0.45, r=1.1) / 1.14


def kick(dur=0.55):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 105 * np.exp(-t / 0.035) + 44
    o = np.sin(2 * np.pi * np.cumsum(f) / SR)
    return o * env_exp(n, 0.13)


def shaker(rng, dur=0.14):
    """Sehr weiches Schütteln — bewusst dumpf, damit nichts zischt."""
    n = int(dur * SR)
    o = rng.normal(0, 1, n)
    o = np.convolve(o, np.ones(9) / 9.0, mode="same")   # Tiefpass
    return o * env_exp(n, 0.03) * 0.5


def vinyl(n, rng):
    """Leises Rauschen mit gelegentlichem Knistern."""
    noise = rng.normal(0, 1, n)
    # weiches Tiefpassfiltern durch gleitenden Mittelwert
    k = 24
    noise = np.convolve(noise, np.ones(k) / k, mode="same")
    crackle = np.zeros(n)
    idx = rng.integers(0, n, size=max(n // 26000, 1))
    crackle[idx] = rng.normal(0, 1, len(idx))
    crackle = np.convolve(crackle, np.exp(-np.arange(220) / 45.0), mode="same")
    return noise * 0.35 + crackle * 0.5


# ---------------------------------------------------------------- Harmonik
# Akkorde in a-Moll: Am9 – Fmaj7 – Cmaj7 – G6
CHORDS = [
    dict(name="Am9",   root=45, pad=[57, 60, 64, 67, 71], arp=[69, 72, 76, 79]),
    dict(name="Fmaj7", root=41, pad=[53, 57, 60, 64, 69], arp=[65, 69, 72, 76]),
    dict(name="Cmaj7", root=48, pad=[55, 60, 64, 67, 71], arp=[67, 72, 76, 79]),
    dict(name="G6",    root=43, pad=[55, 59, 62, 64, 71], arp=[71, 74, 76, 79]),
]

ARP_PATTERNS = [
    [0, 2, 1, 3, 2, 1, 3, 2],
    [0, 1, 2, 3, 2, 1, 0, 1],
    [3, 2, 1, 0, 1, 2, 3, 2],
    [0, 3, 1, 2, 0, 3, 2, 1],
]


def add(buf, sig, at):
    i = int(at * SR)
    j = min(i + len(sig), len(buf))
    if i >= len(buf):
        return
    buf[i:j] += sig[:j - i]


def render(minutes=12.0):
    rng = np.random.default_rng(SEED)

    bars_per_chord = 2
    cycle_bars = bars_per_chord * len(CHORDS)      # 8 Takte
    cycle_len = cycle_bars * BAR                    # ~28,2 s
    cycles = max(int(round(minutes * 60 / cycle_len)), 4)
    total = cycle_len * cycles
    n = int(total * SR) + SR * 3

    pads = np.zeros(n)
    bells = np.zeros(n)
    subs = np.zeros(n)
    drums = np.zeros(n)

    for c in range(cycles):
        # Dynamik: alle paar Zyklen wird es dichter bzw. luftiger
        phase = c % 6
        arp_on = phase not in (2,)
        drums_on = phase not in (0, 2)
        pattern = ARP_PATTERNS[(c // 2) % len(ARP_PATTERNS)]
        bright = 0.75 + 0.25 * ((c % 3) == 1)

        for ci, ch in enumerate(CHORDS):
            t0 = c * cycle_len + ci * bars_per_chord * BAR
            dur = bars_per_chord * BAR

            # Fläche
            for k, nte in enumerate(ch["pad"]):
                amp = 0.34 / (1 + 0.28 * k)
                add(pads, pad_voice(midi(nte), dur + 0.9) * amp, t0)

            # Bass: Grundton, zweimal pro Akkord
            add(subs, sub_voice(midi(ch["root"] - 12), BAR * 1.05) * 0.5, t0)
            add(subs, sub_voice(midi(ch["root"] - 12), BAR * 0.9) * 0.34,
                t0 + bars_per_chord * BAR * 0.5)

            # Arpeggio: Achtel über den Akkord
            if arp_on:
                steps = int(bars_per_chord * 8)
                for s in range(steps):
                    if (s % 8) in (5,) and (s // 8) % 2 == 0:
                        continue  # kleine Lücken, damit es atmet
                    nte = ch["arp"][pattern[s % len(pattern)]]
                    if s % 16 == 12:
                        nte += 12
                    amp = 0.16 * (0.75 + 0.25 * (s % 4 == 0))
                    add(bells, bell_voice(midi(nte), 1.9, bright) * amp,
                        t0 + s * BEAT / 2)

            # sehr dezente Rhythmusandeutung
            if drums_on:
                for b in range(int(bars_per_chord * 4)):
                    tb = t0 + b * BEAT
                    if b % 4 in (0, 2):
                        add(drums, kick() * 0.16, tb)
                    add(drums, shaker(rng) * 0.030, tb + BEAT * 0.5)

    dry = pads * 0.55 + bells * 0.75 + subs * 0.6 + drums * 0.5

    # ---- Hall: Faltung mit exponentiell abklingendem Rauschen
    ir_len = int(1.7 * SR)
    ir = rng.normal(0, 1, ir_len) * np.exp(-np.arange(ir_len) / (0.42 * SR))
    ir[:int(0.012 * SR)] = 0
    ir /= np.abs(ir).sum() / 12.0
    wet = oaconvolve(dry, ir)[:n]

    # ---- Stereo: nur der Hallanteil wird versetzt (kein Kammfilter im Direktton)
    d = int(0.013 * SR)
    wet_r = np.concatenate([np.zeros(d), wet[:-d]])
    left = dry * 0.78 + wet * 0.30
    right = dry * 0.78 + wet_r * 0.30
    noise = vinyl(n, rng) * 0.009
    stereo = np.stack([left + noise, right + noise], axis=1)

    # ---- Nahtlose Schleife: Anfang und Ende ineinander blenden
    fade = int(2.5 * SR)
    tail = stereo[-fade:].copy()
    stereo = stereo[:-fade]
    ramp = np.linspace(0, 1, fade)[:, None]
    stereo[:fade] = stereo[:fade] * ramp + tail * (1 - ramp)

    # ---- Pegel
    peak = np.abs(stereo).max()
    stereo = stereo / peak * 0.72
    # sanfte Sättigung nimmt Spitzen die Härte
    stereo = np.tanh(stereo * 1.25) / np.tanh(1.25)
    stereo = stereo / np.abs(stereo).max() * 0.80

    return stereo


def write_wav(path, data):
    import wave
    pcm = (np.clip(data, -1, 1) * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "musik.wav"
    mins = float(sys.argv[2]) if len(sys.argv) > 2 else 12.0
    print(f"Erzeuge {mins:.1f} Minuten Musik ...")
    audio = render(mins)
    write_wav(out, audio)
    print(f"Fertig: {out}  ({len(audio) / SR:.1f} s)")
