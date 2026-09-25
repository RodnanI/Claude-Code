#!/usr/bin/env python3
"""Turn the score MIDI from LilyPond into a human performance MIDI.

LilyPond gives exact score time.  This script adds what a pianist adds:
tempo shaping (section tempi, phrase rubato, ritardandi, fermatas), dynamics
and hairpins, voicing (melody over accompaniment, weighted bass), metric
accents, melody lead, rolled wide chords, legato overlap, pedalling with
realistic lift/catch timing, and small random deviations.

usage: perform.py score.midi score_meta.json out.mid [seed]
"""
import json
import math
import random
import sys
from bisect import bisect_right

import mido
import numpy as np

LEVEL = {"ppp": 1, "pp": 2, "p": 3, "mp": 4, "mf": 5, "f": 6, "ff": 7, "fff": 8}
VEL = [0, 30, 38, 47, 57, 67, 79, 92, 104]          # base velocity per level
ACCENT = {"sfz": 20, "sf": 16, "fz": 16, "sffz": 26}
MODE = {"motto": "tutti", "arpeggios": "line"}      # sections that are not melody + accompaniment


def load_notes(path):
    mf = mido.MidiFile(path)
    tpb = mf.ticks_per_beat
    notes = []
    for tr in mf.tracks:
        name, t, held = "", 0, {}
        for msg in tr:
            t += msg.time
            if msg.type == "track_name":
                name = msg.name
            elif msg.type == "note_on" and msg.velocity > 0:
                held.setdefault(msg.note, []).append((t, msg.velocity))
            elif msg.type in ("note_on", "note_off") and held.get(msg.note):
                st, vel = held[msg.note].pop(0)
                notes.append(dict(start=st / tpb, end=t / tpb, pitch=msg.note,
                                  hand="rh" if name.startswith("rh") else "lh", accent=vel > 90))
    notes.sort(key=lambda n: (n["start"], n["pitch"]))
    return notes


class Score:
    def __init__(self, meta):
        self.bars = meta["bars"]
        self.starts = [b["start"] for b in self.bars]
        self.total = meta["total"]

    def bar_at(self, t):
        return self.bars[max(0, bisect_right(self.starts, t + 1e-9) - 1)]

    def beat_len(self, b):
        return 1.5 if b["len"] == 3 else 1.0


def tempo_curve(score, step=1 / 96):
    """Seconds at every grid point of score time (quarter notes)."""
    grid = np.arange(0, score.total + 8, step)
    bpm = np.empty_like(grid)
    for k, t in enumerate(grid):
        b = score.bar_at(min(t, score.total - 1e-6))
        o = t - b["start"]
        pts = b["tempo"]
        v = pts[-1][1]
        for (o0, v0), (o1, v1) in zip(pts, pts[1:]):
            if o0 <= o < o1:
                v = v0 + (v1 - v0) * (o - o0) / (o1 - o0)
                break
            if o < o0:
                v = v0
                break
        if pts and o < pts[0][0]:
            v = pts[0][1]
        # phrase rubato: push through the middle of a phrase, breathe at its end
        rub = b["rub"]
        if rub:
            first = next(x for x in score.bars if x["sec"] == b["sec"])
            span = sum(x["len"] for x in score.bars[first["i"]:first["i"] + b["phr"]])
            x = ((t - first["start"]) % span) / span
            tail = max(0.0, (x - 0.78) / 0.22)
            v *= 1 + rub * 0.7 * math.sin(math.pi * x) - rub * 1.6 * tail * tail
        bpm[k] = v
    secs = np.concatenate([[0.0], np.cumsum(60.0 / bpm[:-1] * step)])
    ferm = sorted((b["start"] + o, s) for b in score.bars for o, s in b["ferm"])
    for tf, extra in ferm:
        secs[grid > tf + 1e-9] += extra
    return grid, secs


def build_levels(meta):
    """Resolve hairpins so a crescendo glides up to the dynamic that ends it."""
    ev = sorted(meta["dyn"], key=lambda e: e[0])
    knots, level, start = [(0.0, 3.0)], 3.0, None
    accents = []
    for t, cmd in ev:
        if cmd in ("<", ">", "cresc", "dim"):
            if start is not None:          # a new hairpin closes the old one
                level = max(1.0, min(8.0, level + start[1] * 1.0))
                knots.append((t, level))
            else:
                knots.append((t, level))
            start = (t, 1 if cmd in ("<", "cresc") else -1)
        elif cmd in LEVEL:
            new = float(LEVEL[cmd])
            if start is not None:
                knots.append((t, new))     # glide into the mark
                start = None
            else:
                knots.append((t, level))
                knots.append((t + 1e-3, new))
            level = new
        elif cmd == "!" and start is not None:
            level = max(1.0, min(8.0, level + start[1] * 1.2))
            knots.append((t, level))
            start = None
        elif cmd in ACCENT:
            accents.append((t, ACCENT[cmd]))
    knots.sort(key=lambda k: k[0])
    return np.array([k[0] for k in knots]), np.array([k[1] for k in knots]), accents


def level_to_vel(level):
    lo = int(math.floor(level))
    hi = min(8, lo + 1)
    f = level - lo
    return VEL[lo] * (1 - f) + VEL[hi] * f


def perform(notes, meta, seed=7):
    rng = random.Random(seed)
    score = Score(meta)
    grid, secs = tempo_curve(score)
    kx, ky, accents = build_levels(meta)

    def sec(t):
        return float(np.interp(t, grid, secs))

    # group simultaneous notes per hand
    groups = {}
    for n in notes:
        groups.setdefault((n["hand"], round(n["start"] * 96)), []).append(n)
    for (hand, _), g in groups.items():
        g.sort(key=lambda n: n["pitch"])
        for k, n in enumerate(g):
            n["rank"], n["size"] = k, len(g)

    mel_pitches = {}
    for n in notes:
        b = score.bar_at(n["start"])
        n["bar"] = b
        n["mode"] = MODE.get(b["sec"], b["mel"])
        top = n["rank"] == n["size"] - 1
        if n["mode"] == "rh":
            n["mel"] = n["hand"] == "rh" and (top or n["pitch"] >= _top_pitch(groups, n) - 12)
        elif n["mode"] == "lh":
            n["mel"] = n["hand"] == "lh"
        else:
            n["mel"] = True
        if n["mel"]:
            mel_pitches.setdefault(round(n["start"]), []).append(n["pitch"])

    out = []
    for n in notes:
        b = n["bar"]
        t = n["start"]
        level = float(np.interp(t, kx, ky))
        v = level_to_vel(level)
        pos = t - b["start"]
        beat = score.beat_len(b)
        on_beat = abs(pos / beat - round(pos / beat)) < 1e-6
        if pos < 1e-6:
            v += 4
        elif on_beat:
            v += 2
        mode = n["mode"]
        if mode == "tutti":
            v += 4 if n["rank"] == n["size"] - 1 else 0
        elif mode == "line":
            local = [p for k in range(round(t) - 2, round(t) + 3) for p in mel_pitches.get(k, [])]
            v += max(-6, min(8, 0.3 * (n["pitch"] - (sum(local) / len(local) if local else n["pitch"]))))
        elif n["mel"]:
            top = n["rank"] == n["size"] - 1
            if top:
                v += 10
            elif n["pitch"] == _top_pitch(groups, n) - 12:
                v += 4                             # the melody's lower octave
            else:
                v -= 3                             # inner harmony notes under the tune
            local = [p for k in range(round(t) - 3, round(t) + 4) for p in mel_pitches.get(k, [])]
            if local and top:
                v += max(-5, min(7, 0.35 * (n["pitch"] - sum(local) / len(local))))
        else:
            lowest = n["rank"] == 0 and n["hand"] == "lh"
            if lowest and on_beat:
                v -= 3
            elif lowest:
                v -= 9
            else:
                v -= 12 if n["size"] == 1 else 10
        if n["accent"]:
            v += 12
        for ta, extra in accents:
            if abs(ta - t) < 1e-4:
                v += extra
        v += rng.gauss(0, 2.0)
        vel = int(max(12, min(124, round(v))))

        # timing
        slow = b["tempo"][0][1] < 100
        on = sec(t) + rng.gauss(0, 0.004)
        if n["mel"] and mode in ("rh", "lh") and slow and n["rank"] == n["size"] - 1:
            on -= 0.014                          # melody lead
        elif n["size"] > 1:
            on += rng.uniform(0, 0.008)
        span = _span(groups, n)
        if b.get("roll") or (slow and span > 14 and n["size"] > 2):
            gap = 0.045 if b.get("roll") else 0.018
            base = 0 if n["hand"] == "lh" or not b.get("roll") else _lh_count(groups, n) * gap
            on += base + n["rank"] * gap
        off = sec(n["end"])
        if b["leg"] >= 1.0:
            off += 0.02 if n["mel"] else -0.004
        else:
            off = on + (off - on) * b["leg"]
        off = max(off, on + 0.04)
        out.append([on, off, n["pitch"], vel])

    out.sort()
    last = {}
    for e in out:
        prev = last.get(e[2])
        if prev is not None and prev[1] > e[0] - 0.003:
            prev[1] = max(prev[0] + 0.02, e[0] - 0.003)
        last[e[2]] = e

    pedal = []
    for t, what in meta["ped"]:
        s = sec(t)
        pedal.append((s + (0.11 if what == "on" else 0.02), 127 if what == "on" else 0))
    end = max(o[1] for o in out)
    pedal.append((end + 2.5, 0))
    return out, sorted(pedal), end + 5.0


def _top_pitch(groups, n):
    g = groups[(n["hand"], round(n["start"] * 96))]
    return g[-1]["pitch"]


def _span(groups, n):
    g = groups[(n["hand"], round(n["start"] * 96))]
    return g[-1]["pitch"] - g[0]["pitch"]


def _lh_count(groups, n):
    return len(groups.get(("lh", round(n["start"] * 96)), []))


def write_midi(events, pedal, length, path):
    mf = mido.MidiFile(ticks_per_beat=960)
    tr = mido.MidiTrack()
    mf.tracks.append(tr)
    tr.append(mido.MetaMessage("set_tempo", tempo=500000, time=0))   # 1 s = 1920 ticks
    # Salamander SFZ: CC72 scales the damper release (0.5 s full scale x 2); 40 gives ~0.6 s
    tr.append(mido.Message("control_change", control=72, value=40, time=0))
    ev = []
    for on, off, p, v in events:
        ev.append((on, 1, mido.Message("note_on", note=p, velocity=v)))
        ev.append((off, 0, mido.Message("note_off", note=p, velocity=0)))
    for s, val in pedal:
        ev.append((s, 2 if val else 0, mido.Message("control_change", control=64, value=val)))
    ev.sort(key=lambda e: (e[0], e[1]))
    last = 0
    for s, _, msg in ev:
        tick = max(0, int(round((s + 0.5) * 1920)))
        msg.time = tick - last
        last = tick
        tr.append(msg)
    tr.append(mido.MetaMessage("end_of_track", time=int((length + 0.5) * 1920) - last))
    mf.save(path)


def check_hands(notes, score):
    """Report spots where the hands collide (same key, or the left hand above the right)."""
    by_t = {}
    for n in notes:
        by_t.setdefault(round(n["start"] * 96), []).append(n)
    sounding = []
    issues = 0
    for key in sorted(by_t):
        t = key / 96
        sounding = [n for n in sounding if n["end"] > t + 1e-6] + by_t[key]
        rh = [n["pitch"] for n in sounding if n["hand"] == "rh"]
        lh = [n["pitch"] for n in sounding if n["hand"] == "lh"]
        if rh and lh and max(lh) >= min(rh) and score.bar_at(t)["sec"] not in ("arpeggios",):
            new = [n for n in by_t[key]]
            if any(n["hand"] == "lh" and n["pitch"] >= min(rh) for n in new) or \
               any(n["hand"] == "rh" and n["pitch"] <= max(lh) for n in new):
                issues += 1
                if issues <= 40:
                    print(f"  hands overlap: bar {score.bar_at(t)['i']} beat {t - score.bar_at(t)['start']:.2f}"
                          f"  lh {sorted(set(lh))} rh {sorted(set(rh))}")
    print(f"hand overlap checks: {issues}")


if __name__ == "__main__":
    notes = load_notes(sys.argv[1])
    meta = json.load(open(sys.argv[2]))
    for b in meta["bars"]:
        b.setdefault("roll", False)
    check_hands(notes, Score(meta))
    events, pedal, length = perform(notes, meta, int(sys.argv[4]) if len(sys.argv) > 4 else 7)
    write_midi(events, pedal, length, sys.argv[3])
    vels = [e[3] for e in events]
    print(f"{len(events)} notes, {int(length // 60)}:{length % 60:04.1f} long, "
          f"velocity {min(vels)}-{max(vels)} (median {sorted(vels)[len(vels) // 2]})")
