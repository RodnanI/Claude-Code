"""Procedural audio. Every effect and the music loop are synthesized at startup,
so the game ships without a single asset file."""
import array
import math
import random
import threading

import pygame

TAU = math.tau


def midi(m):
    return 440.0 * 2.0 ** ((m - 69) / 12.0)


class Audio:
    def __init__(self):
        self.ok = False
        self.sfx_on = True
        self.music_on = True
        self.sfx_volume = 0.7
        self.music_volume = 0.4
        self.sounds = {}
        self.music = None
        self.music_channel = None
        self._duck = 1.0
        self._rr = 0
        try:
            if not pygame.mixer.get_init():
                pygame.mixer.init(22050, -16, 1, 512)
            self.rate, _, self.channels = pygame.mixer.get_init()
            pygame.mixer.set_num_channels(32)
            pygame.mixer.set_reserved(1)
            self.music_channel = pygame.mixer.Channel(0)
        except pygame.error:
            return
        self.ok = True
        self._build_sfx()
        threading.Thread(target=self._build_music, daemon=True).start()

    # ------------------------------------------------------------ synthesis
    def _tone(self, dur, f0, f1=None, wave='sq', vol=0.3, duty=0.5, curve=2.0,
              attack=0.003, noise=0.0, lp=1.0, vib=0.0, vibf=0.0):
        rate = self.rate
        n = max(1, int(rate * dur))
        f1 = f0 if f1 is None else f1
        ratio = f1 / f0
        att = max(1, int(attack * rate))
        out = [0.0] * n
        phase = lpv = 0.0
        rnd, sin = random.random, math.sin
        inv_n, inv_rate = 1.0 / n, 1.0 / rate
        for i in range(n):
            t = i * inv_n
            f = f0 * ratio ** t if ratio != 1.0 else f0
            if vib:
                f *= 1.0 + vib * sin(TAU * vibf * i * inv_rate)
            phase += f * inv_rate
            phase -= int(phase)
            if wave == 'sq':
                s = 1.0 if phase < duty else -1.0
            elif wave == 'tri':
                s = 4.0 * abs(phase - 0.5) - 1.0
            elif wave == 'saw':
                s = 2.0 * phase - 1.0
            elif wave == 'sin':
                s = sin(TAU * phase)
            else:
                s = rnd() * 2.0 - 1.0
            if noise:
                s += (rnd() * 2.0 - 1.0 - s) * noise
            if lp < 1.0:
                lpv += (s - lpv) * lp
                s = lpv
            e = (1.0 - t) ** curve
            if i < att:
                e *= i / att
            out[i] = s * e * vol
        return out

    def _mix(self, *parts):
        placed, total = [], 0
        for p in parts:
            off, data = p if isinstance(p, tuple) else (0.0, p)
            o = int(off * self.rate)
            placed.append((o, data))
            total = max(total, o + len(data))
        out = [0.0] * total
        for o, data in placed:
            for i, v in enumerate(data):
                out[o + i] += v
        return out

    def _sound(self, data, gain=1.0):
        arr = array.array('h', [int(32000 * max(-1.0, min(1.0, v * gain))) for v in data])
        if self.channels == 2:
            st = array.array('h', bytes(len(arr) * 4))
            st[0::2] = arr
            st[1::2] = arr
            arr = st
        return pygame.mixer.Sound(buffer=arr.tobytes())

    def _build_sfx(self):
        T, M, S = self._tone, self._mix, self._sound
        snd = self.sounds
        snd['jump'] = [S(M(T(0.11, 280 * k, 560 * k, 'sq', 0.22, duty=0.25, curve=1.6),
                           T(0.04, 1, wave='noise', vol=0.08, lp=0.35))) for k in (0.94, 1.0, 1.06)]
        snd['walljump'] = [S(M(T(0.12, 340 * k, 740 * k, 'sq', 0.22, duty=0.25, curve=1.5),
                               T(0.05, 1, wave='noise', vol=0.1, lp=0.4))) for k in (0.95, 1.05)]
        snd['super'] = S(M(T(0.2, 180, 900, 'saw', 0.2, curve=1.2),
                           T(0.16, 360, 1200, 'sq', 0.1, duty=0.125),
                           T(0.12, 1, wave='noise', vol=0.14, lp=0.45)))
        snd['land'] = [S(M(T(0.08, 1, wave='noise', vol=0.5 * k, lp=0.12, curve=3),
                           T(0.08, 110, 45, 'sin', 0.42 * k))) for k in (0.55, 1.0)]
        snd['dash'] = S(M(T(0.22, 1, wave='noise', vol=0.4, lp=0.5, curve=1.3),
                          T(0.13, 220, 55, 'sin', 0.55, curve=1.5),
                          T(0.08, 880, 220, 'sq', 0.07)))
        snd['refill'] = S(M((0.0, T(0.12, 1046, wave='sin', vol=0.25, curve=1.5)),
                            (0.045, T(0.12, 1318, wave='sin', vol=0.25, curve=1.5)),
                            (0.09, T(0.2, 1568, wave='sin', vol=0.25, curve=1.8)),
                            (0.0, T(0.05, 2093, wave='sq', vol=0.04))))
        snd['coin'] = [S(M(T(0.05, 988 * 2 ** (s / 12), wave='sq', vol=0.15, curve=0.4),
                           (0.05, T(0.16, 1319 * 2 ** (s / 12), wave='sq', vol=0.15, curve=1.6))))
                       for s in (0, 2, 4, 5, 7, 9, 11, 12)]
        snd['spring'] = S(M(T(0.28, 160, 640, 'sin', 0.45, curve=1.2, vib=0.12, vibf=28),
                            T(0.2, 320, 1280, 'sq', 0.06, duty=0.125)))
        snd['death'] = S(M(T(0.38, 1, wave='noise', vol=0.55, lp=0.55, curve=1.4),
                           T(0.42, 520, 55, 'sq', 0.2, curve=1.1),
                           T(0.3, 90, 30, 'sin', 0.5)))
        snd['respawn'] = S(M(T(0.22, 220, 880, 'tri', 0.3, curve=1.0),
                             T(0.18, 440, 1760, 'sin', 0.1)))
        snd['checkpoint'] = S(M(*[(i * 0.06, T(0.14, f, wave='sq', vol=0.14, curve=1.4))
                                  for i, f in enumerate((523, 659, 784, 1047))]))
        snd['break'] = S(M(T(0.28, 1, wave='noise', vol=0.5, lp=0.7, curve=2),
                           T(0.18, 140, 40, 'sq', 0.24),
                           T(0.3, 1, wave='noise', vol=0.3, lp=0.15, curve=1)))
        snd['stomp'] = S(M(T(0.13, 420, 90, 'sq', 0.24),
                           T(0.06, 1, wave='noise', vol=0.22, lp=0.3),
                           T(0.1, 150, 60, 'sin', 0.4)))
        snd['grapple'] = S(M(T(0.07, 500, 1600, 'saw', 0.15, curve=0.8),
                             T(0.05, 1, wave='noise', vol=0.1, lp=0.6),
                             (0.07, T(0.05, 1800, wave='sq', vol=0.07))))
        snd['whiff'] = S(T(0.08, 700, 300, 'saw', 0.08, curve=1.0))
        snd['release'] = S(M(T(0.16, 1, wave='noise', vol=0.26, lp=0.25, curve=1.2),
                             T(0.12, 300, 700, 'sin', 0.14)))
        snd['crumble'] = S(T(0.35, 1, wave='noise', vol=0.4, lp=0.08, curve=1.0))
        snd['enemy'] = S(M(T(0.15, 600, 150, 'sq', 0.2, duty=0.25),
                           T(0.1, 1, wave='noise', vol=0.22, lp=0.5)))
        snd['slide'] = S(T(0.06, 1, wave='noise', vol=0.06, lp=0.25, curve=1.0))
        snd['select'] = S(T(0.07, 660, 990, 'sq', 0.15, curve=1.0))
        snd['move'] = S(T(0.035, 520, wave='sq', vol=0.1, curve=1.0))
        snd['back'] = S(T(0.07, 660, 440, 'sq', 0.13, curve=1.0))
        snd['bonk'] = S(T(0.06, 200, 120, 'sq', 0.14))
        fan = [(0.0, 523), (0.09, 659), (0.18, 784), (0.27, 1047), (0.42, 988), (0.5, 1047)]
        parts = [(t0, T(0.55 if i == len(fan) - 1 else 0.12, f, wave='sq', vol=0.14, duty=0.25, curve=1.2))
                 for i, (t0, f) in enumerate(fan)]
        parts += [(0.0, T(0.3, 262, wave='tri', vol=0.25)), (0.27, T(0.75, 392, wave='tri', vol=0.25))]
        snd['complete'] = S(M(*parts))

    # ---------------------------------------------------------------- music
    def _compose(self):
        rate = self.rate
        step = 60.0 / 124 / 4            # one 16th note at 124 bpm
        n = int(8 * 16 * step * rate)    # 8 bars, loops seamlessly
        mix = [0.0] * n
        cache = {}

        def note(start, length, freq, wave, vol, duty=0.5, curve=1.4, lp=1.0, f1=None, vib=0.0):
            key = (round(freq, 2), length, wave, vol, duty, curve, lp, f1, vib)
            data = cache.get(key)
            if data is None:
                data = self._tone(length * step, freq, f1, wave, vol, duty=duty, curve=curve,
                                  attack=0.004, lp=lp, vib=vib, vibf=5.5)
                cache[key] = data
            o = int(start * step * rate)
            for i, v in enumerate(data):
                mix[(o + i) % n] += v

        prog = [(45, 0), (41, 1), (48, 1), (43, 1), (45, 0), (41, 1), (43, 1), (40, 1)]
        for bar, (root, major) in enumerate(prog):
            third = 4 if major else 3
            base = bar * 16
            for k in range(8):
                note(base + k * 2, 2, midi(root + (12 if k % 2 else 0)), 'tri', 0.3, curve=0.8)
            tones = (0, third, 7, 12, 7, third)
            for k in range(16):
                note(base + k, 1, midi(root + 24 + tones[k % 6]), 'sq', 0.05, duty=0.25, curve=2.2)
            for k in range(16):
                if k in (0, 7, 8, 10):
                    note(base + k, 2, 150, 'sin', 0.7, curve=2.5, f1=40)
                if k in (4, 12):
                    note(base + k, 1.2, 1, 'noise', 0.3, curve=2.0, lp=0.55)
                    note(base + k, 0.8, 200, 'tri', 0.15, curve=2.0, f1=150)
                if k % 2 == 0:
                    note(base + k, 0.3 if k % 4 else 0.5, 1, 'noise', 0.06 if k % 4 else 0.04, curve=3.0)
            if bar < 4:
                note(base, 6, midi(root + 36), 'sin', 0.07, curve=2.0)
        lead = [
            (4, 0, 3, 69), (4, 3, 3, 72), (4, 6, 2, 76), (4, 8, 4, 74), (4, 12, 4, 72),
            (5, 0, 3, 69), (5, 3, 3, 72), (5, 6, 2, 77), (5, 8, 6, 76), (5, 14, 2, 74),
            (6, 0, 3, 74), (6, 3, 3, 71), (6, 6, 2, 67), (6, 8, 4, 71), (6, 12, 4, 74),
            (7, 0, 4, 76), (7, 4, 4, 74), (7, 8, 4, 72), (7, 12, 4, 71),
        ]
        for bar, st, ln, m in lead:
            note(bar * 16 + st, ln, midi(m), 'sq', 0.08, duty=0.5, curve=0.9, vib=0.006)
        peak = max(1e-6, max(abs(v) for v in mix))
        gain = min(1.0, 0.92 / peak)
        return [v * gain for v in mix]

    def _build_music(self):
        try:
            self.music = self._sound(self._compose())
            if self.music_on:
                self.start_music()
        except Exception as exc:  # audio is a luxury, never crash for it
            print("music generation failed:", exc)

    # ----------------------------------------------------------------- api
    def start_music(self):
        if self.ok and self.music is not None:
            if not self.music_channel.get_busy():
                self.music_channel.play(self.music, loops=-1)
            self._apply()

    def set_music(self, on):
        self.music_on = on
        if not self.ok:
            return
        if on:
            self.start_music()
        else:
            self.music_channel.stop()

    def duck(self, amount):
        self._duck = amount
        self._apply()

    def _apply(self):
        if self.ok:
            self.music_channel.set_volume(self.music_volume * self._duck if self.music_on else 0.0)

    def play(self, name, vol=1.0, variant=None):
        if not self.ok or not self.sfx_on:
            return
        s = self.sounds.get(name)
        if s is None:
            return
        if isinstance(s, list):
            s = s[min(variant, len(s) - 1)] if variant is not None else random.choice(s)
        ch = pygame.mixer.find_channel()
        if ch is None:  # all busy: steal round-robin, never the reserved music channel
            self._rr = self._rr % 31 + 1
            ch = pygame.mixer.Channel(self._rr)
        ch.play(s)
        ch.set_volume(min(1.0, vol * self.sfx_volume))
