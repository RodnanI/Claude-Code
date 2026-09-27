#!/usr/bin/env python3
"""Harmony and voice-leading audit of the score MIDI.

    python3 analyze.py score.midi score_meta.json [--verbose]

Every bar of compose.py carries a chord per beat (bar(..., harm="Fm C7/E")).
Against those chords this checks:

  * every note is a chord tone or a classified non-chord tone: passing (P),
    neighbour (N), suspension (S), appoggiatura (A), escape tone (E),
    anticipation (Ant). Anything else is FREE. An appoggiatura or suspension
    whose resolution is not a chord tone is UNRESOLVED. A note held into a
    chord it does not belong to must resolve by step (a tied suspension).
  * outer voices (highest right-hand note, lowest left-hand note, one pair per
    chord): parallel fifths and octaves, direct fifths and octaves reached by
    a leap in the soprano, and chord sevenths in an outer voice that do not
    resolve down by step or stay as a common tone.
  * spacing: seconds, thirds and fourths low in the bass; right-hand chords
    wider than a ninth and left-hand chords wider than a tenth (rolled bars
    excepted).

Chord symbols: root (C, Db, F#) + quality + optional /bass.
Qualities: '' m dim aug 5 7 maj7 m7 m7b5 dim7 mM7 6 m6 9 m9 7b9 maj9 add9
madd9 sus4 sus2 7sus4 7b5 aug7 7b13 It Fr Ger (augmented sixths named by
their bass: DbGer = Db F Ab B). '*' switches the audit off for that span.
"""
import bisect
import json
import re
import sys

import mido

PC = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
ACC = {"": 0, "#": 1, "##": 2, "b": -1, "bb": -2}
QUAL = {
    "": (0, 4, 7), "m": (0, 3, 7), "dim": (0, 3, 6), "aug": (0, 4, 8),
    "5": (0, 7), "1": (0,),
    "7": (0, 4, 7, 10), "maj7": (0, 4, 7, 11), "m7": (0, 3, 7, 10),
    "m7b5": (0, 3, 6, 10), "dim7": (0, 3, 6, 9), "mM7": (0, 3, 7, 11),
    "6": (0, 4, 7, 9), "m6": (0, 3, 7, 9),
    "9": (0, 4, 7, 10, 2), "m9": (0, 3, 7, 10, 2), "7b9": (0, 4, 7, 10, 1),
    "maj9": (0, 4, 7, 11, 2), "add9": (0, 4, 7, 2), "madd9": (0, 3, 7, 2),
    "sus4": (0, 5, 7), "sus2": (0, 2, 7), "7sus4": (0, 5, 7, 10),
    "7b5": (0, 4, 6, 10), "aug7": (0, 4, 8, 10), "7b13": (0, 4, 7, 10, 8),
    "It": (0, 4, 10), "Fr": (0, 4, 6, 10), "Ger": (0, 4, 7, 10),
}
SEVENTH = {"7": 10, "m7": 10, "m7b5": 10, "dim7": 9, "maj7": 11, "mM7": 11,
           "9": 10, "m9": 10, "7b9": 10, "maj9": 11, "7sus4": 10, "7b5": 10,
           "aug7": 10, "7b13": 10}
SYM_RE = re.compile(r"^([A-G])(##|#|bb|b)?(.*?)(?:/([A-G])(##|#|bb|b)?)?$")
NAMES = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]


def chord(sym):
    """Chord symbol -> (pitch classes, seventh pc or None, bass pc or None)."""
    m = SYM_RE.match(sym)
    if not m or m.group(3) not in QUAL:
        raise SystemExit(f"unknown chord symbol {sym!r}")
    root = (PC[m.group(1)] + ACC[m.group(2) or ""]) % 12
    q = m.group(3)
    pcs = {(root + i) % 12 for i in QUAL[q]}
    sev = (root + SEVENTH[q]) % 12 if q in SEVENTH else None
    bass = None
    if m.group(4):
        bass = (PC[m.group(4)] + ACC[m.group(5) or ""]) % 12
        pcs.add(bass)
    return pcs, sev, bass


def pname(p):
    return f"{NAMES[p % 12]}{p // 12 - 1}"


def read_notes(path):
    mf = mido.MidiFile(path)
    tpb = mf.ticks_per_beat
    notes = []
    for tr in mf.tracks:
        name, t, held = "", 0, {}
        for msg in tr:
            t += msg.time
            if msg.type == "track_name":
                name = msg.name.split(":")[0]
            elif msg.type == "note_on" and msg.velocity > 0:
                held.setdefault(msg.note, []).append(t)
            elif msg.type in ("note_off", "note_on") and held.get(msg.note):
                t0 = held[msg.note].pop(0)
                notes.append({"q": t0 / tpb, "qoff": t / tpb, "p": msg.note,
                              "trk": name, "hand": "lh" if name.startswith("lh") else "rh"})
    notes.sort(key=lambda n: (n["q"], n["p"]))
    return notes


class Harmony:
    def __init__(self, bars):
        self.segs = []
        for b in bars:
            for off, dur, sym in b.get("harm", []):
                q = b["q0"] + off
                seg = {"q": q, "end": q + dur, "sym": sym, "bar": b, "off": off}
                if sym != "*":
                    seg["pcs"], seg["sev"], seg["bass"] = chord(sym)
                self.segs.append(seg)
        self.segs.sort(key=lambda s: s["q"])
        self.qs = [s["q"] for s in self.segs]

    def at(self, q):
        i = bisect.bisect_right(self.qs, q + 1e-6) - 1
        if i < 0:
            return None
        s = self.segs[i]
        return s if q < s["end"] - 1e-6 else None


def where(b, q):
    beat = 1 + (q - b["q0"]) / b["beat"]
    return f"bar {b['n']:>3} beat {beat:5.2f}"


def main():
    score, metap = sys.argv[1:3]
    verbose = "--verbose" in sys.argv
    meta = json.load(open(metap))
    bars = meta["bars"]
    q0s = [b["q0"] for b in bars]
    harm = Harmony(bars)
    notes = read_notes(score)

    def bar_of(q):
        return bars[max(0, bisect.bisect_right(q0s, q + 1e-9) - 1)]

    report = []

    def flag(q, kind, text):
        report.append((q, kind, f"{where(bar_of(q), q)}  {kind:<10} {text}"))

    # ---- per-track onset groups
    tracks = {}
    for n in notes:
        tracks.setdefault(n["trk"], []).append(n)
    groups = {}
    for trk, lst in tracks.items():
        g = []
        for n in lst:
            if g and abs(g[-1][0]["q"] - n["q"]) < 1e-6:
                g[-1].append(n)
            else:
                g.append([n])
        groups[trk] = g

    def nearest(grp, p):
        return min(grp, key=lambda m: (abs(m["p"] - p), m["p"])) if grp else None

    def is_ct(n, q):
        s = harm.at(q)
        if s is None or s["sym"] == "*":
            return None
        return n["p"] % 12 in s["pcs"]

    counts = {}
    step = lambda x: 1 <= abs(x) <= 2
    for trk, g in groups.items():
        for i, grp in enumerate(g):
            for n in grp:
                ct = is_ct(n, n["q"])
                if ct is None or ct:
                    continue
                prev = None
                if i > 0 and g[i - 1][0]["q"] > n["q"] - 4:
                    prev = nearest(g[i - 1], n["p"])
                    if prev["qoff"] < n["q"] - 2:
                        prev = None
                nxt = nearest(g[i + 1], n["p"]) if i + 1 < len(g) else None
                a = n["p"] - prev["p"] if prev else None
                d = nxt["p"] - n["p"] if nxt else None
                if a is not None and d is not None and step(a) and step(d):
                    kind = "P" if (a > 0) == (d > 0) else "N"
                elif a == 0 and d is not None and step(d):
                    kind = "S"
                elif d is not None and step(d) and (a is None or abs(a) > 2):
                    kind = "A"
                elif a is not None and step(a) and d is not None and abs(d) > 2:
                    kind = "E"
                elif d == 0:
                    kind = "Ant"
                else:
                    kind = "FREE"
                counts[kind] = counts.get(kind, 0) + 1
                s = harm.at(n["q"])
                desc = (f"{trk} {pname(n['p'])} over {s['sym']}"
                        f"  (from {pname(prev['p']) if prev else '-'}"
                        f" to {pname(nxt['p']) if nxt else '-'})")
                if kind in ("A", "S", "E") and nxt is not None:
                    r = is_ct(nxt, nxt["q"])
                    if r is False:
                        # a passing chain (two non-chord tones in a row by step, same direction) is fine
                        k2 = nxt
                        chained = False
                        if i + 2 < len(g):
                            n3 = nearest(g[i + 2], k2["p"])
                            if step(n3["p"] - k2["p"]) and (n3["p"] - k2["p"] > 0) == (d > 0) \
                                    and is_ct(n3, n3["q"]):
                                chained = True
                        if not chained:
                            flag(n["q"], "UNRESOLVED", desc)
                            continue
                if kind == "FREE":
                    flag(n["q"], "FREE", desc)
                elif kind == "E" and abs(d) > 5:
                    flag(n["q"], "ESC-LEAP", desc)
                elif verbose:
                    flag(n["q"], kind, desc)

    # ---- tied notes held into a chord they do not belong to
    for s in harm.segs:
        if s["sym"] == "*":
            continue
        for n in notes:
            if n["q"] < s["q"] - 1e-6 < n["qoff"] - 2e-6 and n["qoff"] > s["q"] + 1e-6:
                if n["p"] % 12 in s["pcs"]:
                    continue
                g = groups[n["trk"]]
                idx = next(i for i, grp in enumerate(g) if n in grp)
                nxt = nearest(g[idx + 1], n["p"]) if idx + 1 < len(g) else None
                ok = nxt is not None and step(nxt["p"] - n["p"]) and is_ct(nxt, nxt["q"]) is not False
                counts["S"] = counts.get("S", 0) + 1
                if not ok:
                    flag(s["q"], "HELD", f"{n['trk']} {pname(n['p'])} held into {s['sym']}"
                                         f" -> {pname(nxt['p']) if nxt else '-'}")
                elif verbose:
                    flag(s["q"], "S(tie)", f"{n['trk']} {pname(n['p'])} into {s['sym']}")

    # ---- outer voices, one pair per chord
    starts = [n["q"] for n in notes]

    def sounding(q):
        lo = bisect.bisect_left(starts, q - 64)
        return [n for n in notes[lo:bisect.bisect_right(starts, q + 1e-6)]
                if n["q"] <= q + 1e-6 and n["qoff"] > q + 1e-6]

    def top_rh(q, window=0.13):
        """Highest right-hand note sounding at q or struck within `window` after it."""
        lo = bisect.bisect_left(starts, q - 1e-6)
        hi = bisect.bisect_left(starts, q + window)
        cand = [n for n in sounding(q) if n["hand"] == "rh"]
        cand += [n for n in notes[lo:hi] if n["hand"] == "rh"]
        return max((n["p"] for n in cand), default=None)

    def before_rh(q):
        """Highest right-hand note sounding in the last 32nd before q (both notes of a tremolo)."""
        lo = bisect.bisect_left(starts, q - 64)
        cand = [n for n in notes[lo:bisect.bisect_left(starts, q - 1e-6)]
                if n["hand"] == "rh" and n["qoff"] > q - 0.13]
        return max((n["p"] for n in cand), default=None)

    pairs = []
    for s in harm.segs:
        if s["sym"] == "*":
            pairs.append(None)
            continue
        lo = bisect.bisect_left(starts, s["q"] - 1e-6)
        hi = bisect.bisect_left(starts, s["end"] - 1e-6)
        lh = [n["p"] for n in notes[lo:hi] if n["hand"] == "lh"]
        if not lh:
            lh = [n["p"] for n in sounding(s["q"]) if n["hand"] == "lh"]
        sop, last = top_rh(s["q"]), before_rh(s["end"])
        if sop is None:     # the segment starts with a rest: its first right-hand note
            first = [n for n in notes[lo:hi] if n["hand"] == "rh"]
            sop = max((n["p"] for n in first if abs(n["q"] - first[0]["q"]) < 1e-6), default=None)
        if sop is None or not lh:
            pairs.append(None)
            continue
        # a unison passage: every attack in the segment is one pitch class (octave doublings)
        byq = {}
        for n in notes[lo:hi]:
            byq.setdefault(round(n["q"] * 96), set()).add(n["p"] % 12)
        unison = bool(byq) and all(len(v) == 1 for v in byq.values())
        pairs.append({"s": s, "sop": sop, "last": last if last is not None else sop,
                      "bass": min(lh), "unison": unison})

    def parallel(q, kind, b1, p1, b2, p2, s1, s2):
        ds, db = p2 - p1, b2 - b1
        i1, i2 = (p1 - b1) % 12, (p2 - b2) % 12
        if ds and db and (ds > 0) == (db > 0) and i1 == i2 and i1 in (0, 7):
            flag(q, kind, f"{'octaves' if i1 == 0 else 'fifths'} {pname(b1)}/{pname(p1)}"
                          f" -> {pname(b2)}/{pname(p2)} ({s1['sym']} -> {s2['sym']})")
            return True
        return False

    for x, y in zip(pairs, pairs[1:]):
        if not x or not y or abs(x["s"]["end"] - y["s"]["q"]) > 1e-6:
            continue
        if x["unison"] and y["unison"]:
            continue
        s1, s2 = x["s"], y["s"]
        b1, b2 = x["bass"], y["bass"]
        # the notes either side of the chord change, then downbeat to downbeat
        if not parallel(s2["q"], "PARALLEL", b1, x["last"], b2, y["sop"], s1, s2):
            parallel(s2["q"], "PAR-BEATS", b1, x["sop"], b2, y["sop"], s1, s2)
        ds, db = y["sop"] - x["last"], b2 - b1
        if ds and db and (ds > 0) == (db > 0) and (y["sop"] - b2) % 12 in (0, 7) and abs(ds) > 2:
            flag(s2["q"], "DIRECT", f"{'octave' if (y['sop'] - b2) % 12 == 0 else 'fifth'} by leap"
                                    f" {pname(b1)}/{pname(x['last'])} -> {pname(b2)}/{pname(y['sop'])}")
        for voice, p1, p2 in (("soprano", x["last"], y["sop"]), ("bass", b1, b2)):
            if s1["sev"] is not None and p1 % 12 == s1["sev"]:
                if not (1 <= p1 - p2 <= 2 or p1 == p2 or (p1 % 12 in y["s"]["pcs"] and abs(p2 - p1) <= 12)):
                    flag(s2["q"], "SEVENTH", f"{voice} {pname(p1)} (7th of {s1['sym']})"
                                             f" -> {pname(p2)} over {s2['sym']}")

    # ---- inner voices: chord to chord, voices paired by height, parallel fifths
    # (octaves are left alone here: in piano writing most are deliberate doublings)
    att = {}
    for n in notes:
        att.setdefault(round(n["q"] * 96), []).append(n)
    keys = sorted(att)
    for k1, k2 in zip(keys, keys[1:]):
        c1 = sorted({n["p"] for n in att[k1]})
        c2 = sorted({n["p"] for n in att[k2]})
        q2 = att[k2][0]["q"]
        s = harm.at(q2)
        if s is None or s["sym"] == "*" or len(c1) != len(c2) or len(c1) < 3:
            continue
        if {p % 12 for p in c1} == {p % 12 for p in c2}:
            continue
        for i in range(len(c1)):
            for j in range(i + 1, len(c1)):
                a1, b1, a2, b2 = c1[i], c1[j], c2[i], c2[j]
                if (b1 - a1) % 12 == 7 and (b2 - a2) % 12 == 7 and a1 != a2 and (a2 - a1) * (b2 - b1) > 0:
                    flag(q2, "FIFTHS", f"inner {pname(a1)}-{pname(b1)} -> {pname(a2)}-{pname(b2)}")

    # ---- spacing
    for trkhand in ("rh", "lh"):
        byq = {}
        for n in notes:
            if n["hand"] == trkhand:
                byq.setdefault(round(n["q"] * 96), []).append(n)
        for k, grp in sorted(byq.items()):
            b = bar_of(grp[0]["q"])
            ps = sorted(m["p"] for m in grp)
            span = ps[-1] - ps[0]
            if not b.get("roll") and span > (14 if trkhand == "rh" else 16):
                flag(grp[0]["q"], "SPAN", f"{trkhand} chord {' '.join(pname(p) for p in ps)} spans {span}")
            if trkhand == "lh" and len(ps) >= 2:
                lo, iv = ps[0], ps[1] - ps[0]
                if (iv <= 2 and lo < 52) or (iv in (3, 4) and lo < 48) or (iv in (5, 6) and lo < 41):
                    flag(grp[0]["q"], "LOW", f"{pname(ps[0])}-{pname(ps[1])} too close in the bass")

    report.sort()
    for _, _, line in report:
        print(line)
    kinds = {}
    for _, k, _ in report:
        kinds[k] = kinds.get(k, 0) + 1
    print("non-chord tones:", ", ".join(f"{k} {v}" for k, v in sorted(counts.items())))
    print("problems:", ", ".join(f"{k} {v}" for k, v in sorted(kinds.items()) if k in
                                 ("FREE", "UNRESOLVED", "HELD", "PARALLEL", "PAR-BEATS", "FIFTHS", "SEVENTH", "SPAN", "LOW", "ESC-LEAP"))
          or "none")


if __name__ == "__main__":
    main()
