#!/usr/bin/env python3
"""Performance model: exact LilyPond MIDI + score_meta.json -> humanised MIDI.

    python3 perform.py score.midi score_meta.json performance.mid [seed]

Tempo (bar breakpoints, phrase arch, fermatas), dynamics (marks, hairpins,
accents), voicing (melody, bass, inner voices, metre, contour), timing
(jitter, melody lead, chord spread and rolls, legato overlap) and legato
pedalling. Also checks that the hands never strike the same key or cross
unintentionally, and prints the section timestamps.
"""
import bisect
import json
import math
import random
import sys

import mido

LEVEL = {"ppp": 1, "pp": 2, "p": 3, "mp": 4, "mf": 5, "f": 6, "ff": 7, "fff": 8}
VEL = [30, 38, 47, 57, 67, 79, 92, 104]
ACCENT = {"sf": 16, "rfz": 16, "fz": 18, "sfz": 20, "sffz": 26}
SUBITO = {"fp": ("f", "p", 16), "sfp": ("sf", "p", 20)}
# Voicing mode by section name. Anything not listed uses the section's
# melody hand ("rh" or "lh"). Modes: rh, lh, tutti, line, bass, fugue.
MODE = {
    "intro-bells": "tutti",
    "intro-torrent": "line",
    "cadenza": "line",
    "cadenza-pivot": "line",
    "var3-onde": "bass",
    "var4-corrente": "tutti",
    "var6-maggiore": "bass",
    "var7-galoppo": "tutti",
    "var8-tempesta": "tutti",
    "var9-grandioso": "tutti",
    "fugue": "fugue",
    "fugue-climax": "tutti",
    "apotheosis": "tutti",
    "coda": "tutti",
}

LEAD_IN = 0.5
TPQ = 960           # at 120 BPM: 1 s = 1920 ticks
RES = 1 / 96        # tempo integration grid, in quarters


def read_score(path):
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
            elif msg.type in ("note_off", "note_on") and held.get(msg.note):
                t0, v = held[msg.note].pop(0)
                notes.append({"q": t0 / tpb, "qoff": t / tpb, "p": msg.note,
                              "v0": v, "hand": "lh" if name.lower().startswith("lh") else "rh"})
    notes.sort(key=lambda n: (n["q"], n["p"]))
    return notes


class Clock:
    """Quarter-note score time -> seconds."""

    def __init__(self, meta):
        self.bars = meta["bars"]
        self.q0s = [b["q0"] for b in self.bars]
        total = meta["length_q"]
        n = int(math.ceil(total / RES)) + 4
        cum = [0.0] * (n + 1)
        for k in range(n):
            q = (k + 0.5) * RES
            cum[k + 1] = cum[k] + RES * 60.0 / (self.bpm(q) * self.arch(q))
        self.cum = cum
        ferms = []
        for b in self.bars:
            for off, extra in b["ferm"]:
                ferms.append((b["q0"] + off, extra))
        ferms.sort()
        self.fq = [f[0] for f in ferms]
        self.fsum = [0.0]
        for f in ferms:
            self.fsum.append(self.fsum[-1] + f[1])

    def bar_of(self, q):
        return max(0, bisect.bisect_right(self.q0s, q + 1e-9) - 1)

    def bpm(self, q):
        b = self.bars[self.bar_of(q)]
        o = q - b["q0"]
        bps = b["tempo"]
        if o <= bps[0][0]:
            return bps[0][1]
        for (o1, t1), (o2, t2) in zip(bps, bps[1:]):
            if o1 <= o < o2:
                return t1 + (t2 - t1) * (o - o1) / (o2 - o1)
        return bps[-1][1]

    def arch(self, q):
        i = self.bar_of(q)
        b = self.bars[i]
        rub = b["rub"]
        if rub <= 0:
            return 1.0
        s, phr = b["sec_start"], b["phr"]
        start = s + ((i - s) // phr) * phr
        end = start + phr
        # a phrase never runs past its section
        j = start
        while j < len(self.bars) and j < end and self.bars[j]["sec_start"] == s:
            j += 1
        qa = self.bars[start]["q0"]
        qb = self.bars[j - 1]["q0"] + self.bars[j - 1]["len"]
        x = min(1.0, max(0.0, (q - qa) / (qb - qa)))
        tail = min(1.0, max(0.0, (x - 0.7) / 0.3))
        return 1 + rub * 0.7 * math.sin(math.pi * x) - rub * 1.6 * tail * tail

    def sec(self, q):
        k = q / RES
        i = min(int(k), len(self.cum) - 2)
        base = self.cum[i] + (self.cum[i + 1] - self.cum[i]) * (k - i)
        j = bisect.bisect_left(self.fq, q - 1e-9)
        return base + self.fsum[j]


class Dynamics:
    """Dynamic level (1..8, fractional inside hairpins) over score time."""

    def __init__(self, events):
        self.pts = [(0.0, 4.0)]
        self.acc = {}
        cur, hp = 4.0, None          # hp = (q, level, direction)
        ev = sorted(enumerate(events), key=lambda e: (e[1][0], e[0]))
        ev = [e[1] for e in ev]
        for i, (q, m) in enumerate(ev):
            if m in ACCENT:
                self.acc[round(q * 96)] = self.acc.get(round(q * 96), 0) + ACCENT[m]
                continue
            if m in SUBITO:
                self.acc[round(q * 96)] = self.acc.get(round(q * 96), 0) + SUBITO[m][2]
                m = SUBITO[m][1]
            if m in LEVEL:
                lv = float(LEVEL[m])
                if hp:
                    self.pts.append((q, lv))
                    hp = None
                else:
                    self.pts.append((q - 1e-6, cur))
                    self.pts.append((q, lv))
                cur = lv
            elif m in ("<", "cresc", ">", "dim", "decresc"):
                if hp:   # a new hairpin ends the running one a step on
                    cur = cur + hp[2]
                    self.pts.append((q, cur))
                hp = (q, cur, 1 if m in ("<", "cresc") else -1)
                self.pts.append((q, cur))
            elif m == "!" and hp:
                target = cur + hp[2]
                for q2, m2 in ev[i + 1:]:
                    if m2 in LEVEL:
                        if (LEVEL[m2] - cur) * hp[2] > 0:
                            target = float(LEVEL[m2])
                        break
                self.pts.append((q, target))
                cur, hp = target, None
        self.pts.sort()
        self.qs = [p[0] for p in self.pts]

    def level(self, q):
        i = bisect.bisect_right(self.qs, q) - 1
        if i < 0:
            return self.pts[0][1]
        if i + 1 >= len(self.pts):
            return self.pts[-1][1]
        (q1, l1), (q2, l2) = self.pts[i], self.pts[i + 1]
        if q2 - q1 < 1e-9:
            return l2
        return l1 + (l2 - l1) * (q - q1) / (q2 - q1)

    def accent(self, q):
        return self.acc.get(round(q * 96), 0)


def vel_of(level):
    level = min(8.0, max(1.0, level))
    i = min(int(level), 7)
    return VEL[i - 1] + (level - i) * ((VEL[i] if i < 8 else VEL[7]) - VEL[i - 1])


def sounding(pool, n, hand, higher):
    """Is another note of `hand`, higher (or lower) than n, sounding at n's onset?"""
    for m in pool:
        if m is n or m["hand"] != hand:
            continue
        if m["q"] <= n["q"] + 1e-6 and m["qoff"] > n["q"] + 1e-6:
            if (m["p"] > n["p"]) if higher else (m["p"] < n["p"]):
                return True
    return False


def main():
    score, metap, outp = sys.argv[1:4]
    seed = int(sys.argv[4]) if len(sys.argv) > 4 else 7
    rnd = random.Random(seed)
    meta = json.load(open(metap))
    bars = meta["bars"]
    clock = Clock(meta)
    dyn = Dynamics(meta["dyn"])
    notes = read_score(score)

    for n in notes:
        b = bars[clock.bar_of(n["q"])]
        n["bar"] = b
        n["mode"] = MODE.get(b["section"], b["mel"])
        if n["mode"] == "line":
            n["hand"] = "rh" if n["p"] >= 60 else "lh"

    # neighbourhood lists for "sounding" queries (notes overlapping in time)
    starts = [n["q"] for n in notes]
    maxdur = max(n["qoff"] - n["q"] for n in notes)

    def around(n):
        lo = bisect.bisect_left(starts, n["q"] - maxdur - 1e-6)
        hi = bisect.bisect_right(starts, n["q"] + 1e-6)
        return notes[lo:hi]

    # ---- roles
    onset = {}
    for n in notes:
        onset.setdefault((n["hand"], round(n["q"] * 96)), []).append(n)
    for n in notes:
        pool = around(n)
        n["top"] = not sounding(pool, n, n["hand"], True)
        n["bottom"] = not sounding(pool, n, n["hand"], False)
    for n in notes:
        grp = onset[(n["hand"], round(n["q"] * 96))]
        mode, hand = n["mode"], n["hand"]
        b = n["bar"]
        o = n["q"] - b["q0"]
        on_beat = abs(o / b["beat"] - round(o / b["beat"])) < 1e-6
        role, adj = "acc", 0.0
        if mode in ("rh", "lh"):
            mel_hand = mode
            if hand == mel_hand:
                if n["top"]:
                    role, adj = "mel", 10
                elif any(m["top"] and m["p"] - n["p"] == 12 for m in grp):
                    adj = 4
                elif any(m["top"] for m in grp):
                    adj = -3
                else:
                    adj = -7
            else:
                if hand == "lh" and n["bottom"]:
                    adj = -3 if on_beat else -9
                else:
                    adj = -10 if len(grp) == 1 else -12
        elif mode == "tutti":
            if hand == "rh" and n["top"]:
                role, adj = "mel", 6
            elif hand == "lh" and n["bottom"]:
                adj = 5
            else:
                adj = -2
        elif mode == "bass":
            if hand == "lh" and n["bottom"]:
                role, adj = "mel", 8
            elif hand == "rh" and n["top"]:
                adj = 2
            else:
                adj = -6
        elif mode == "fugue":
            if (hand == "rh" and n["top"]) or (hand == "lh" and n["bottom"]):
                adj = 3
            role = "voice"
        elif mode == "line":
            role = "line"
        n["role"], n["adj"] = role, adj
        n["metric"] = 4 if o < 1e-6 else (2 if on_beat else 0)

    # ---- contour: +-0.35 velocity per semitone against the local average
    for role in ("mel", "line", "voice"):
        seq = [n for n in notes if n["role"] == role]
        qs = [n["q"] for n in seq]
        for n in seq:
            lo = bisect.bisect_left(qs, n["q"] - 2)
            hi = bisect.bisect_right(qs, n["q"] + 2)
            avg = sum(m["p"] for m in seq[lo:hi]) / (hi - lo)
            n["adj"] += max(-6, min(6, 0.35 * (n["p"] - avg)))

    # ---- velocity
    for n in notes:
        v = vel_of(dyn.level(n["q"]))
        if n["v0"] > 118:
            v += 18
        elif n["v0"] > 100:
            v += 12
        v += dyn.accent(n["q"]) + n["adj"] + n["metric"]
        v += max(-3, min(3, rnd.gauss(0, 1.5)))
        n["vel"] = int(round(min(127, max(8, v))))

    # ---- timing
    for n in notes:
        t = clock.sec(n["q"]) + LEAD_IN
        t += max(-0.008, min(0.008, rnd.gauss(0, 0.004)))
        if n["role"] == "mel" and clock.bpm(n["q"]) < 80:
            t -= 0.014
        n["t"] = t
    done = set()
    for key, grp in onset.items():
        if len(grp) < 2:
            continue
        b = grp[0]["bar"]
        if b["roll"]:
            continue
        grp = sorted(grp, key=lambda m: m["p"])
        if grp[-1]["p"] - grp[0]["p"] > 14:
            for k, m in enumerate(grp):
                m["t"] += 0.018 * k
        else:
            for m in grp:
                if m["role"] != "mel":
                    m["t"] += rnd.uniform(0, 0.008)
    for n in notes:
        b = n["bar"]
        if b["roll"] and id(n) not in done:
            grp = [m for m in notes if abs(m["q"] - n["q"]) < 1e-6]
            grp.sort(key=lambda m: (m["hand"] != "lh", m["p"]))
            for k, m in enumerate(grp):
                m["t"] += 0.045 * k
                done.add(id(m))
    for n in notes:
        b = n["bar"]
        off = clock.sec(n["qoff"]) + LEAD_IN
        if b["leg"] >= 1.0:
            off += 0.020
        else:
            off = n["t"] + (off - n["t"]) * b["leg"]
        n["off"] = max(off, n["t"] + 0.03)
    bykey = {}
    for n in notes:
        bykey.setdefault(n["p"], []).append(n)
    for lst in bykey.values():
        lst.sort(key=lambda m: m["t"])
        for a, c in zip(lst, lst[1:]):
            if a["off"] > c["t"] - 0.012:
                a["off"] = max(a["t"] + 0.02, c["t"] - 0.012)

    # ---- pedal
    ped = []
    for q, kind in meta["ped"]:
        t = clock.sec(q) + LEAD_IN
        if kind == "press":
            ped.append((t + 0.05, 127))
        elif kind == "change":
            ped.append((t + 0.020, 0))
            ped.append((t + 0.110, 127))
        else:
            ped.append((t + 0.020, 0))
    end = max(n["off"] for n in notes)
    ped.append((end + 0.3, 0))

    # ---- hands: same key or crossing
    bad = 0
    for n in notes:
        for m in around(n):
            if m["hand"] == n["hand"] or m is n:
                continue
            if not (m["q"] <= n["q"] + 1e-6 and m["qoff"] > n["q"] + 1e-6):
                continue
            same = m["p"] == n["p"]
            crossed = ((n["hand"] == "rh" and m["p"] > n["p"]) or
                       (n["hand"] == "lh" and m["p"] < n["p"]))
            if same or (crossed and not n["bar"]["cross"]):
                b = n["bar"]
                beat = 1 + (n["q"] - b["q0"]) / b["beat"]
                what = "same key" if same else "crossed"
                print(f"hands overlap: bar {b['n']} beat {beat:.2f} ({what}, {n['p']}/{m['p']})")
                bad += 1
    print(f"hand overlap checks: {bad}")

    # ---- write
    ev = [(0.0, 0, mido.Message("control_change", control=72, value=40)),
          (0.0, 0, mido.Message("control_change", control=64, value=0))]
    for n in notes:
        ev.append((n["t"], 2, mido.Message("note_on", note=n["p"], velocity=n["vel"])))
        ev.append((n["off"], 1, mido.Message("note_off", note=n["p"], velocity=0)))
    for t, v in ped:
        ev.append((t, 0, mido.Message("control_change", control=64, value=v)))
    ev.sort(key=lambda e: (e[0], e[1]))
    mf = mido.MidiFile(type=0, ticks_per_beat=TPQ)
    tr = mido.MidiTrack()
    mf.tracks.append(tr)
    tr.append(mido.MetaMessage("set_tempo", tempo=500000, time=0))
    tr.append(mido.Message("program_change", program=0, time=0))
    last = 0
    for t, _, msg in ev:
        tick = max(0, int(round(t * 2 * TPQ)))
        tr.append(msg.copy(time=tick - last))
        last = tick
    tr.append(mido.MetaMessage("end_of_track", time=int(2 * TPQ)))
    mf.save(outp)

    length = end + 1.0
    print(f"notes: {len(notes)}  length: {int(length // 60)}:{int(length % 60):02d}")
    seen = None
    for b in bars:
        if b["section"] != seen:
            seen = b["section"]
            t = clock.sec(b["q0"]) + LEAD_IN
            print(f"  {int(t // 60)}:{t % 60:05.2f}  bar {b['n']:>3}  {seen}")


if __name__ == "__main__":
    main()
