#!/usr/bin/env python3
"""Passacaglia, Chorale and Fugue in C minor.

The composition itself: every bar, with its dynamics, pedal and tempo plan.

    python3 compose.py OUTDIR
        -> OUTDIR/passacaglia_chorale_fugue.ly   (engraved score + MIDI score)
        -> OUTDIR/score_meta.json                (performance plan for perform.py)

Pitches are LilyPond absolute (c' = middle C), Dutch names (cis, bes, es, as).
"""
import json
import os
import re
import sys
from fractions import Fraction as Fr

TITLE = "Passacaglia, Chorale and Fugue"
SUBTITLE = "in C minor"
SUBSUBTITLE = "on a ground of eight bars"
COMPOSER = "Claude"
STEM = "passacaglia_chorale_fugue"

# ---------------------------------------------------------------- pitch helpers
STEP = {"c": 0, "d": 2, "e": 4, "f": 5, "g": 7, "a": 9, "b": 11}
PITCH_RE = re.compile(r"([a-g])(isis|eses|ses|is|es|s)?([',]*)$")


def _alter(letter, acc):
    acc = acc or ""
    if acc in ("s", "ses") and letter in "ea":
        acc = "e" + acc
    return acc.count("is") - acc.count("es")


def midi(p):
    letter, acc, marks = PITCH_RE.match(p).groups()
    return (48 + STEP[letter] + _alter(letter, acc)
            + 12 * (marks.count("'") - marks.count(",")))


def octv(p, k):
    """Move pitch p by k octaves."""
    letter, acc, marks = PITCH_RE.match(p).groups()
    n = marks.count("'") - marks.count(",") + k
    return letter + (acc or "") + ("'" * n if n > 0 else "," * -n)


def at(name, lo):
    """Pitch class `name` placed at the lowest octave with MIDI >= lo."""
    k = -((midi(name) - lo) // 12)
    return octv(name, k)


def tones(pcs, lo, hi):
    """Every pitch of the chord `pcs` (a string like 'c es g') within [lo, hi]."""
    out = []
    for pc in pcs.split():
        p = at(pc, lo)
        while midi(p) <= hi:
            out.append(p)
            p = octv(p, 1)
    return sorted(out, key=midi)


def seq(notes, dur):
    """Notes as a LilyPond run: the first carries the duration."""
    notes = notes.split() if isinstance(notes, str) else list(notes)
    return " ".join([notes[0] + dur] + notes[1:])


def ch(notes):
    return "<" + notes + ">"


NOTE_RE = re.compile(r"^([a-g](?:isis|eses|ses|is|es|s)?[',]*)(.*)$")


def xs(line, start="rh", split=60):
    """One line that hops between the staves: middle C (or `split`) and above
    sits on the upper staff. Returns to the starting staff at the end."""
    cur, out = start, []
    for tok in line.split():
        m = NOTE_RE.match(tok)
        if m:
            want = "rh" if midi(m.group(1)) >= split else "lh"
            if want != cur:
                out.append('\\change Staff = "%s"' % want)
                cur = want
        out.append(tok)
    if cur != start:
        out.append('\\change Staff = "%s"' % start)
    return " ".join(out)


def wave(a, b, c, d):
    """Six sixteenths a b c d c b: the storm figuration."""
    return f"{a}16 {b} {c} {d} {c} {b}"


def trem(low, dyad):
    """Six sixteenths alternating a note and a dyad."""
    return f"{low}16 {dyad} {low} {dyad} {low} {dyad}"


def trill(layout, perform):
    """Print a trill, play written-out 32nds."""
    return f"\\tag #'layout {{ {layout} }} \\tag #'midi {{ {perform} }}"


def it(text, pos="-"):
    return f'{pos}\\markup {{ \\italic "{text}" }}'


def tx(text):
    """Italic tempo-line words (rit., a tempo, ...), printed above the staff."""
    return f'\\tempo \\markup {{ \\normal-text \\italic "{text}" }}'


def rep(s, n):
    return " ".join([s] * n)


# ---------------------------------------------------------------- the machine
BARS = []
VOICES = {"rh": [[], [], []], "lh": [[], [], []]}
DYN, PED = [], []
EVENTS = {"dyn": [], "ped": []}
SEC = {"name": None, "mel": "rh", "rub": 0.03, "phr": 4, "leg": 1.0, "start": 0}
ST = {"meter": Fr(4), "beat": Fr(1), "q": Fr(0), "tempo": 60.0, "ped": False,
      "mode": {"rh": 1, "lh": 1}}

TIME_RE = re.compile(r"\\time\s+(\d+)/(\d+)")
SPACER_RE = re.compile(r"(?<![a-zA-Z\\])s(\d+)(\.*)(?:\*(\d+)(?:/(\d+))?)?")
MARK_RE = re.compile(r"\\(ppp|pp|p|mp|mf|fff|ff|f|sffz|sfz|sfp|sf|fz|rfz|fp|"
                     r"cresc|decresc|dim|<|>|!)(?![a-zA-Z])")


def dur_q(base, dots="", num=None, den=None):
    q = Fr(4, int(base))
    add = q
    for _ in dots:
        add /= 2
        q += add
    if num:
        q *= Fr(int(num), int(den or 1))
    return q


def strip_text(s):
    """Remove quoted strings and \\markup { ... } blocks."""
    s = re.sub(r'"[^"]*"', '""', s)
    while True:
        m = re.search(r"\\markup\s*\{", s)
        if not m:
            return s
        depth, i = 0, m.end() - 1
        while True:
            if s[i] == "{":
                depth += 1
            elif s[i] == "}":
                depth -= 1
                if depth == 0:
                    break
            i += 1
        s = s[:m.start()] + s[i + 1:]


def unwrap_tags(s):
    """Keep what the MIDI score plays: drop \\tag #'layout {..}, open \\tag #'midi {..}."""
    while True:
        m = re.search(r"\\tag\s+#'(layout|midi)\s*\{", s)
        if not m:
            return s
        depth, i = 0, m.end() - 1
        while True:
            if s[i] == "{":
                depth += 1
            elif s[i] == "}":
                depth -= 1
                if depth == 0:
                    break
            i += 1
        inner = s[m.end():i] if m.group(1) == "midi" else ""
        s = s[:m.start()] + " " + inner + " " + s[i + 1:]


TOKEN_RE = re.compile(
    r"\\(?:tuplet|times)\s+(\d+)/(\d+)(?:\s+\d+\.*)?\s*\{"      # 1,2 tuplet
    r"|\\repeat\s+tremolo\s+(\d+)\s*\{"                          # 3 tremolo
    r"|\\(?:grace|acciaccatura|appoggiatura|slashedGrace)\b"     # grace
    r"|(\{)|(\})"                                                # 4,5 braces
    r"|(?<![\\\w])((?:[a-g](?:isis|eses|ses|is|es|s)?[',]*[!?]?|[rsRq]|<[^<>]*>)"
    r"(?![a-zA-Z]))(\d+\.*(?:\*\d+(?:/\d+)?)?)?"                 # 6 note, 7 dur
    r"|\\[a-zA-Z]+")


def music_len(s, where):
    """Length in quarters of one voice's music for one bar."""
    s = strip_text(unwrap_tags(s))
    toks = list(TOKEN_RE.finditer(s))
    pos = [0]
    state = {"dur": None}

    def block(scale, grace):
        total = Fr(0)
        while pos[0] < len(toks):
            t = toks[pos[0]]
            pos[0] += 1
            txt = t.group(0)
            if t.group(1):
                total += block(Fr(int(t.group(2)), int(t.group(1))), False)
            elif t.group(3):
                total += int(t.group(3)) * block(Fr(1), False)
            elif txt.startswith(("\\grace", "\\acciaccatura", "\\appoggiatura", "\\slashedGrace")):
                nxt = toks[pos[0]]
                pos[0] += 1
                if nxt.group(4):
                    block(Fr(1), True)
                elif nxt.group(6) and nxt.group(7):
                    state["dur"] = dur_q(*re.match(r"(\d+)(\.*)(?:\*(\d+)(?:/(\d+))?)?", nxt.group(7)).groups())
            elif t.group(4):
                total += block(Fr(1), grace)
            elif t.group(5):
                return total * scale
            elif t.group(6):
                if t.group(7):
                    state["dur"] = dur_q(*re.match(r"(\d+)(\.*)(?:\*(\d+)(?:/(\d+))?)?", t.group(7)).groups())
                elif state["dur"] is None:
                    raise AssertionError(f"{where}: the first note needs a duration")
                if not grace:
                    total += state["dur"]
        return total * scale

    return block(Fr(1), False)


def spell(q):
    """A spacer of q quarters."""
    w = Fr(q) / 4
    table = {Fr(1): "1", Fr(1, 2): "2", Fr(1, 4): "4", Fr(1, 8): "8",
             Fr(1, 16): "16", Fr(3, 4): "2.", Fr(3, 8): "4.", Fr(3, 16): "8.",
             Fr(3, 2): "1."}
    if w in table:
        return "s" + table[w]
    return f"s1*{w.numerator}/{w.denominator}"


def brk():
    """Start a new system at the next bar (automatic line breaks are off)."""
    ST["brk"] = True


def section(name, mel="rh", rub=0.03, phr=4, leg=1.0):
    SEC.update(name=name, mel=mel, rub=rub, phr=phr, leg=leg, start=len(BARS))


def bar(rh, lh, dyn=None, ped=None, glob="", rpre="", lpre="", length=None,
        tempo=None, ferm=(), roll=False, cross=False, cadenza=None):
    n = len(BARS) + 1
    if ST.pop("brk", False):
        rpre = "\\break " + rpre
    if ST.pop("after_cadenza", False):
        glob = f"\\set Score.currentBarNumber = #{n} " + glob
    m = TIME_RE.search(glob)
    if m:
        num, den = int(m.group(1)), int(m.group(2))
        ST["meter"] = Fr(4 * num, den)
        ST["beat"] = Fr(3, 2) if (den == 8 and num % 3 == 0) else Fr(4, den)
    L = Fr(length) if length is not None else ST["meter"]
    q0 = ST["q"]

    # dynamics line
    if dyn is None:
        dyn = spell(L)
    plain = strip_text(dyn)
    sp = list(SPACER_RE.finditer(plain))
    tot, t = Fr(0), q0
    for i, s in enumerate(sp):
        seg = plain[s.end(): sp[i + 1].start() if i + 1 < len(sp) else len(plain)]
        for mk in MARK_RE.findall(seg):
            EVENTS["dyn"].append((float(t), mk))
        d = dur_q(*s.groups())
        tot += d
        t += d
    assert tot == L, f"bar {n}: dyn sums to {tot}, bar is {L}"
    DYN.append(dyn)

    # pedal line
    out = []
    if ped:
        tot, t = Fr(0), q0
        for tok in ped.split():
            d, act = tok.split(":")
            mm = re.match(r"(\d+)(\.*)(?:\*(\d+)(?:/(\d+))?)?$", d)
            dq = dur_q(*mm.groups())
            cmd = ""
            if act == "c":
                cmd = "\\sustainOff\\sustainOn" if ST["ped"] else "\\sustainOn"
                EVENTS["ped"].append((float(t), "change" if ST["ped"] else "press"))
                ST["ped"] = True
            elif act == "u":
                if ST["ped"]:
                    cmd = "\\sustainOff"
                    EVENTS["ped"].append((float(t), "lift"))
                ST["ped"] = False
            out.append(spell(dq) + cmd)
            tot += dq
            t += dq
        assert tot == L, f"bar {n}: ped sums to {tot}, bar is {L}"
    else:
        out.append(spell(L))
    PED.append(" ".join(out))

    # the two hands
    for hand, music, pre in (("rh", rh, rpre), ("lh", lh, lpre)):
        vs = [music] if isinstance(music, str) else list(music)
        k = len(vs)
        for v, text in enumerate(vs):
            got = music_len(text, f"bar {n} {hand} voice {v + 1}")
            assert got == L, f"bar {n} {hand} voice {v + 1}: {got} quarters, bar is {L}"
        for v in range(3):
            if v < k:
                cmd = ""
                if k != ST["mode"][hand] or v > 0:
                    cmd = ["\\oneVoice" if k == 1 else "\\voiceOne",
                           "\\voiceTwo", "\\voiceThree"][v]
                head = (glob + " " + pre + " ") if v == 0 else ""
                if cadenza is not None and v == 0:
                    head = "\\cadenzaOn " + head
                tail = ""
                if cadenza is not None and v == 0:
                    tail = " \\cadenzaOff \\bar \"" + cadenza + "\"" \
                        if isinstance(cadenza, str) else " \\cadenzaOff"
                VOICES[hand][v].append(f"{head}{cmd} {vs[v]}{tail} |")
            else:
                VOICES[hand][v].append(f"{spell(L)} |")
        ST["mode"][hand] = k

    # tempo
    if tempo is None:
        bps = [(0.0, ST["tempo"])]
    elif isinstance(tempo, (int, float)):
        bps = [(0.0, float(tempo))]
    else:
        bps = [(float(o), float(b)) for o, b in tempo]
        if bps[0][0] > 0:
            bps.insert(0, (0.0, ST["tempo"]))
    ST["tempo"] = bps[-1][1]

    BARS.append({
        "n": n, "q0": float(q0), "len": float(L), "beat": float(ST["beat"]),
        "meter": float(ST["meter"]), "tempo": bps,
        "ferm": [(float(o), float(s)) for o, s in ferm],
        "section": SEC["name"], "sec_start": SEC["start"], "mel": SEC["mel"],
        "rub": SEC["rub"], "phr": SEC["phr"], "leg": SEC["leg"],
        "roll": bool(roll), "cross": bool(cross),
    })
    ST["q"] = q0 + L
    if cadenza is not None:
        ST["after_cadenza"] = True


# ================================================================= THE MUSIC
# ============================================================== MOTTO & GROUND
# The ground (eight bars of 3/4). Its first half, C Eb D G Ab F B C, is also
# the fugue subject; its second half climbs C Eb F F# G.
GROUND = ["c2 es4", "d2 g,4", "as,2 f,4", "b,,2.", "c,2 es,4", "f,2 fis,4", "g,2.", "g,,2."]
GPED = ["2:c 4:c", "2:c 4:c", "2:c 4:c", "2.:c", "2:c 4:c", "2:c 4:c", "2.:c", "2.:c"]
BRK = '\\bar ""'      # a possible line break inside a cadenza


def dbl(s, k=1):
    """Double every note of a simple line k octaves away (above if k > 0)."""
    out = []
    for tok in s.split():
        p, rest = NOTE_RE.match(tok).groups()
        pair = [p, octv(p, k)] if k > 0 else [octv(p, k), p]
        out.append("<" + " ".join(pair) + ">" + rest)
    return " ".join(out)


def bm(line, n):
    """Manual beams in groups of n notes (cadenzas have no autobeaming)."""
    out, k = [], 0
    toks = line.split()
    idx = [i for i, t in enumerate(toks) if NOTE_RE.match(t)]
    for j, i in enumerate(idx):
        if j % n == 0 and j + 1 < len(idx):
            toks[i] += "["
        if j % n == n - 1 or j == len(idx) - 1:
            if not toks[i].endswith("[") and (j % n != 0):
                toks[i] += "]"
    return " ".join(toks)


def tup(n, m, music, span="4"):
    return f"\\tuplet {n}/{m} {span} {{ {music} }}"


def variation(name, rhs, lhs, dyns, peds=GPED, mel="rh", rub=0.03, phr=4,
              label=None, tempo=None, tempos=None, glob0="", rpre0="", ferms=None,
              breaks=(0, 4)):
    section(name, mel=mel, rub=rub, phr=phr)
    for i in range(len(rhs)):
        rpre = ""
        if i == 0:
            rpre = (f'\\sectionLabel "{label}" ' if label else "") + rpre0
        t = tempos[i] if tempos else (tempo if i == 0 else None)
        if i in breaks:
            brk()
        bar(rhs[i], lhs[i], dyn=dyns[i], ped=peds[i], glob=glob0 if i == 0 else "",
            rpre=rpre, tempo=t, ferm=(ferms or {}).get(i, ()))


# ============================================================== I. INTRODUZIONE
section("intro-bells", mel="rh", rub=0.0)
bar("<c' c''>2-> <es' es''>4-> <d' d''>4->",
    "<c,, c,>2-> <es,, es,>4-> <d,, d,>4->",
    dyn=r"s1\fff", ped="2:c 4:c 4:c", glob=r"\key c \minor \time 4/4",
    rpre=r'\tempo "Maestoso" 4 = 50', tempo=50)
bar(r"<g' b' d'' g''>2.-> r4\fermata", r"<g,, d, g,>2.-> r4\fermata",
    ped="1:c", ferm=[(3, 1.2)])
bar("<as' c'' es'' as''>2-> <as' c'' f'' as''>4-> <as' b' d'' f''>4->",
    "<as,, es, as,>2-> <f,, c, f,>4-> <b,,, b,,>4->",
    ped="2:c 4:c 4:c", tempo=[(0, 50), (3, 46)])
bar(r"<g' c'' es'' g''>1\fermata", r"<c,, g,, c,>1\fermata",
    dyn=r"s1\ff", ped="1:c", tempo=44, ferm=[(0, 1.8)])

section("intro-torrent", mel="rh", rub=0.0)
brk()
bar(xs("c,,32 g,, c, es, g, c es g c' es' g' c'' es'' g'' c''' es''' "
       "g''' es''' c''' g'' es'' c'' g' es' c' g es c g, es, c, g,,"),
    "s1", dyn=r"s1\p\<", ped="2:c 2:c",
    rpre=r'\tempo "Allegro agitato" 4 = 96', tempo=96)
brk()
bar(xs("f,,32 c, f, as, c f as c' f' as' c'' f'' as'' c''' f''' as''' "
       "fis''' es''' c''' a'' fis'' es'' c'' a' fis' es' c' a fis es c a,"),
    "s1", ped="2:c 2:c", tempo=[(0, 96), (4, 100)])
brk()
bar(xs("g,,32 c, es, g, c es g c' es' g' c'' es'' g'' c''' es''' g''' "
       "b''' g''' d''' b'' g'' d'' b' g' d' b g d b, g, d, b,,"),
    "s1", dyn=r"s2\f\< s2", ped="2:c 2:c", tempo=100)
brk()
bar(r"\ottava #1 <b'' d''' f''' g'''>16-> r <g'' b'' d''' f'''> r <f'' g'' b'' d'''> r "
    r"<d'' f'' g'' b''> r \ottava #0 <b' d'' f'' g''> r <g' b' d'' f''> r "
    r"<f' g' b' d''> r <d' f' g' b'> r",
    r"\clef treble r16 <b d' f' g'> r <g b d' f'> r <f g b d'> r \clef bass "
    r"<d f g b> r <b, d f g> r <g, b, d f> r <f, g, b, d> r <d, f, g, b,>",
    dyn=r"s1\fff", ped="1:c", tempo=[(0, 100), (4, 88)])

section("cadenza", mel="rh", rub=0.0)
bar("r8 " + xs(bm("b,,32 d, f, as, b, d f as b d' f' as' b' d'' f'' as'' b'' d''' f''' as'''", 4), split=59),
    "<g,, g,>8-> s8 s2", dyn=r"s8\sffz s8 s2", ped="2.:c", length=3,
    tempo=[(0, 84), (3, 92)], cadenza="")
brk()
bar(bm("g'''32 ges''' f''' e''' es''' d''' des''' c'''", 8) + " " + BRK + " "
    + bm("b'' bes'' a'' as'' g'' ges'' f'' e''", 8) + " " + BRK + " "
    + bm("es'' d'' des'' c'' b' bes' a' as'", 8) + " "
    + bm("g'16 f' es' d'", 4) + r" c'8[ b]\fermata",
    "s1 s4", dyn=r"s1\> s4\pp", ped="4:c 4:c 4:c 4:c 4:c", length=5,
    tempo=[(0, 90), (3, 72), (4, 46)], ferm=[(4.5, 1.2)], cadenza="||")

# ============================================================== II. PASSACAGLIA
# Tema: the ground alone, in octaves.
variation("tema", ["R2."] * 8, [dbl(g) for g in GROUND],
          [r"s2.\pp" + it("sotto voce, legatissimo"), "s2.", r"s4 s2\<", r"s2.\p\>",
           r"s2.\pp", r"s4 s2\<", r"s2.\p\>", r"s2.\pp"],
          mel="lh", rub=0.035, label="Passacaglia", glob0=r"\time 3/4",
          rpre0=r'\tempo "Andante sostenuto" 4 = 63', tempo=63)

# Var. 1: sarabande chords, the stress on the second beat.
variation("var1-sarabande",
          ["r4 <g' c'' es''>2", "r4 <g' b' f''>2", "r4 <as' c'' es''>4 <as' c'' f''>",
           "r4 <as' b' d'' f''>2", "r4 <g' c'' es''>2", "r4 <f' as' c''>4 <es' a' c''>",
           "r4 <es' g' c''>4 <d' g' b'>", "r4 <d' f' b'>2"],
          GROUND,
          [r"s2.\p" + it("dolce"), "s2.", r"s4 s2\<", r"s2.\mp\>", r"s2.\p",
           r"s4 s2\<", r"s4\mp\> s2", r"s2.\p"],
          rub=0.035, label="Var. 1", tempo=63)

# Var. 2: a cantabile line over broken chords.
variation("var2-cantabile",
          ["es''4.( d''8 c'' g'", "b'4 c''8 d'' f''4)", "es''4.( d''8 c''4",
           "b'8 d'' f''4 as'')", "g''4.( f''8 es'' c''", "f''8 as'' c'''4 es'')",
           "es''2( d''4", "d''8 b' g' b' d'' f'')"],
          ["c8 g c' g es g", "d8 g b g g, f", "as,8 es as es f, c", "b,,8 as, d f as f",
           "c,8 g, c g, es, g,", "f,8 c as c fis, es", "g,8 c es c g, b,", "g,,8 d, g, b, d f"],
          [r"s2.\p" + it("cantabile"), r"s4 s2\<", r"s2.\mp\>", r"s2 s4\<",
           r"s2.\mf\>", r"s4\mp s2\<", r"s2.\mf\>", r"s2.\mp"],
          rub=0.04, label="Var. 2", tempo=66)


# Var. 3: triplet waves.
def wave3(c1, c2):
    a, b, c = c1.split()
    a2, b2, c2 = c2.split()
    notes = [a, b, c, octv(a, 1), octv(b, 1), octv(c, 1), octv(b2, 1), octv(a2, 1), c2]
    return tup(3, 2, seq(notes, "8"))


V3 = [("g c' es'", "g c' es'"), ("g b f'", "g b f'"), ("as c' es'", "as c' f'"),
      ("as b d'", "as b d'"), ("g c' es'", "g c' es'"), ("f as c'", "es a c'"),
      ("es g c'", "d g b"), ("d f b", "d f b")]
variation("var3-onde", [wave3(*c) for c in V3], GROUND,
          [r"s2.\mp" + it("scorrevole"), "s2.", r"s4 s2\<", r"s2.\mf\>", r"s2.\mp",
           r"s4 s2\<", r"s2.\mf", r"s2.\>"],
          rub=0.03, label="Var. 3", tempo=69)

# Var. 4: running sixteenths over hammered octaves.
V4 = [["g' c'' es''"] * 3, ["g' b' f''"] * 3, ["as' c'' es''"] * 2 + ["as' c'' f''"],
      ["as' d'' f''"] * 3, ["g' c'' es''"] * 3, ["f' as' c''"] * 2 + ["es' a' c''"],
      ["es' g' c''"] * 2 + ["d' g' b'"], ["d' f' b'"] * 3]
L4 = [("<c, c>", "<c, c>", "<es, es>"), ("<d, d>", "<d, d>", "<g,, g,>"),
      ("<as,, as,>", "<as,, as,>", "<f,, f,>"), ("<b,,, b,,>",) * 3,
      ("<c,, c,>", "<c,, c,>", "<es,, es,>"), ("<f,, f,>", "<f,, f,>", "<fis,, fis,>"),
      ("<g,, g,>",) * 3, ("<g,, g,>",) * 3]


def fig4(v):
    a, b, c = v.split()
    return f"{a}16 {c} {b} {c}"


variation("var4-corrente", [" ".join(fig4(v) for v in bb) for bb in V4],
          [" ".join(o + "4-." for o in bb) for bb in L4],
          [r"s2.\mf" + it("energico"), "s2.", r"s4 s2\<", r"s2.\f", r"s2.\mf",
           r"s4 s2\<", r"s2.\f", "s2."],
          peds=["4:c 4:c 4:c"] * 8, rub=0.02, label="Var. 4", tempo=76)

# Var. 5: the ground in the soprano over a falling bass that sinks to the dominant.
W5 = [[("c,", "g,", "c", "es")] * 3, [("b,,", "g,", "d", "g")] * 3,
      [("bes,,", "f,", "as,", "d")] * 3, [("as,,", "f,", "b,", "d")] * 3,
      [("g,,", "es,", "g,", "c")] * 3,
      [("as,,", "f,", "as,", "c")] * 2 + [("a,,", "es,", "fis,", "c")],
      [("g,,", "es,", "g,", "c")] * 2 + [("g,,", "d,", "g,", "b,")],
      [("g,,", "d,", "f,", "b,")] * 3]
variation("var5-maestoso",
          ["<c'' g'' c'''>2-> <es'' g'' es'''>4->", "<d'' g'' d'''>2-> <g' d'' g''>4->",
           "<as' d'' f'' as''>2-> <f' as' d'' f''>4->", "<b d' f' b'>2.->",
           "<c' es' g' c''>2-> <es' g' c'' es''>4->",
           "<f' as' c'' f''>2-> <fis' a' c'' es'' fis''>4->",
           "<g' c'' es'' g''>2-> <g' b' d'' g''>4->", "<g' b' d'' f'' g''>2.->"],
          [" ".join(tup(6, 4, wave(*w)) for w in bb) for bb in W5],
          [r"s2.\f" + it("maestoso, il tema nel soprano"), "s2.", r"s4 s2\<", r"s2.\ff",
           r"s2.\f", r"s4 s2\<", r"s2.\ff", r"s2.\>"],
          peds=["2:c 4:c", "2:c 4:c", "2:c 4:c", "2.:c", "2:c 4:c", "2:c 4:c", "2:c 4:c", "2.:c"],
          rub=0.03, label="Var. 5", tempo=69, breaks=(0, 3, 6))

# Var. 6: maggiore. The ground in C major, bells above.
V6 = [["e'' g'' c'''"] * 3, ["d'' f'' b''"] * 3, ["e'' a'' c'''"] * 2 + ["f'' a'' c'''"],
      ["f'' as'' b''"] * 3, ["e'' g'' c'''"] * 3, ["f'' a'' c'''"] * 2 + ["es'' a'' c'''"],
      ["e'' g'' c'''"] * 2 + ["d'' g'' b''"], ["d'' f'' b''"] * 3]


def fig6(v):
    a, b, c = v.split()
    return tup(6, 4, f"{a}16 {b} {c} {octv(a, 1)} {c} {b}")


GMAJ = ["c2 e4", "d2 g,4", "a,2 f,4", "b,,2.", "c,2 e,4", "f,2 fis,4", "g,2.", "g,,2."]
variation("var6-maggiore", [" ".join(fig6(v) for v in bb) for bb in V6],
          [dbl(g) for g in GMAJ],
          [r"s2.\pp" + it("dolcissimo, luminoso"), "s2.", r"s4 s2\<", r"s2.\p\>",
           r"s2.\pp", r"s4 s2\<", r"s2.\p\>", r"s2.\pp"],
          rub=0.04, label="Var. 6", glob0=r'\bar "||" \key c \major',
          rpre0=r'\tempo "Poco più lento" 4 = 58', tempo=58,
          breaks=(0, 3, 6))

# Var. 7: minore, galloping chords.
V7 = [["g' c'' es''", "c'' es'' g''", "es'' g'' c'''"],
      ["d'' f'' b''", "b' d'' g''", "g' b' f''"],
      ["as' c'' es''", "c'' es'' as''", "c'' f'' as''"],
      ["b' d'' as''", "d'' f'' b''", "f'' as'' d'''"],
      ["es'' g'' c'''", "c'' es'' g''", "g' c'' es''"],
      ["f' as' c''", "as' c'' f''", "a' c'' es''"],
      ["g' c'' es''", "c'' es'' g''", "b' d'' g''"],
      ["b' d'' f''", "d'' f'' b''", "f'' b'' d'''"]]
L7 = [("<c, c>", "<c, c>", "<es, es>"), ("<d, d>", "<d, d>", "<g,, g,>"),
      ("<as,, as,>", "<as,, as,>", "<f,, f,>"), ("<b,,, b,,>",) * 3,
      ("<c,, c,>", "<c,, c,>", "<es,, es,>"), ("<f,, f,>", "<f,, f,>", "<fis,, fis,>"),
      ("<g,, g,>",) * 3, ("<g,, g,>",) * 3]
variation("var7-galoppo",
          [" ".join(f"<{v}>8-> q16 q" for v in bb) for bb in V7],
          [" ".join(f"{o}8 q16 q" for o in bb) for bb in L7],
          [r"s2.\f" + it("con fuoco"), "s2.", r"s4 s2\<", r"s2.\ff", r"s2.\f",
           r"s4 s2\<", r"s2.\ff", "s2."],
          peds=["4:c 4:c 4:c"] * 8, rub=0.015, label="Var. 7",
          glob0=r'\bar "||" \key c \minor', rpre0=r'\tempo "Allegro" 4 = 80', tempo=80)

# Var. 8: tempest. Tremolos above, rushing octaves below.
V8 = [[("g'", "<c'' es'' g''>")] * 3, [("f'", "<b' d'' g''>")] * 3,
      [("es'", "<as' c'' es''>")] * 2 + [("f'", "<as' c'' f''>")],
      [("as'", "<b' d'' f''>")] * 3, [("g'", "<c'' es'' g''>")] * 3,
      [("f'", "<as' c'' f''>")] * 2 + [("es'", "<a' c'' es''>")],
      [("g'", "<c'' es'' g''>")] * 2 + [("g'", "<b' d'' g''>")],
      [("f'", "<b' d'' g''>")] * 3]
variation("var8-tempesta",
          [" ".join(tup(6, 4, trem(x, t)) for x, t in bb) for bb in V8],
          ["<c, c>4 g,16 f, es, d, <es, es>4", "<d, d>4 d16 c b, a, <g,, g,>4",
           "<as,, as,>4 as,16 g, f, es, <f,, f,>4", "<b,,, b,,>4 b,,16 d, f, as, <b,, b,>4",
           "<c,, c,>4 g,,16 f,, es,, d,, <es,, es,>4", "<f,, f,>4 f,16 es, d, c, <fis,, fis,>4",
           "<g,, g,>4 g,16 as, g, fis, <g,, g,>4", "<g,, g,>4 g,,16 b,, d, f, <g, g>4"],
          [r"s2.\ff" + it("tempestoso"), "s2.", r"s4 s2\<", r"s2.\fff", r"s2.\ff",
           r"s4 s2\<", r"s2.\fff", r"s2.\ff"],
          peds=["4:c 4:c 4:c"] * 8, rub=0.015, label="Var. 8", tempo=84, breaks=(0, 3, 6))

# Var. 9: grandioso. At bar seven the ground breaks off onto a German sixth.
variation("var9-grandioso",
          ["<g' c'' es'' g''>2-> <c'' es'' g'' c'''>4->",
           "<b' d'' f'' b''>2-> <f'' g'' b'' d'''>4->",
           "<c'' es'' as'' c'''>2-> <as' c'' f'' as''>4->",
           "<as' b' d'' f'' as''>2-> as''32 f'' d'' b' as' f' d' b",
           "<g' c'' es'' g''>2-> <c'' es'' g'' c'''>4->",
           "<f' as' c'' f''>2-> f'32 as' c'' f'' as'' c''' f''' as'''",
           r"<c'' es'' fis'' c'''>2.->\fermata"],
          ["<c,, g,, c,>2 <es,, g,, es,>4", "<d,, d,>2 <g,, d, g,>4",
           "<as,, es, as,>2 <f,, c, f,>4", "<b,,, f,, b,,>2.",
           "<c,, g,, c,>2 <es,, g,, es,>4", "<f,, c, f,>2.", r"<as,, es, as,>2.\fermata"],
          [r"s2.\fff" + it("grandioso"), "s2.", "s2.", "s2.", "s2.", r"s2 s4\<",
           r"s2.\sffz"],
          peds=["2:c 4:c", "2:c 4:c", "2:c 4:c", "2:c 4:c", "2:c 4:c", "2:c 4:c", "2.:c"],
          rub=0.0, label="Var. 9", rpre0=r'\tempo "Grandioso" 4 = 66',
          tempos=[66, None, None, None, None, [(0, 66), (3, 54)], 50], ferms={6: [(0, 2.0)]})

# The German sixth becomes the dominant seventh of D flat.
section("cadenza-pivot", mel="rh", rub=0.0)
brk()
bar(xs(bm("ges'''32 es''' c''' as'' ges'' es'' c'' as' ges' es' c' as ges es c as, ges, es, c, as,,", 4))
    + " " + xs(bm("as,,16 es, ges, c es ges c' es'", 4)) + r" ges'4\fermata",
    "s1 s4.", dyn=r"s1*5/8\ff\> s2 s4\pp", ped="1*5/8:c 2:- 4:-", length=Fr(11, 2),
    tempo=[(0, 80), (2.5, 60), (4.5, 44)], ferm=[(4.5, 1.6)], cadenza="||")

# ============================================================== III. CHORALE
# D flat major, the key of the German sixth's resolution. Strophe one in four
# parts (soprano and inner voices in the right hand, bass octaves below).
CH_S = ["f''2 ges''4 f''", "es''2 as''", "bes''4. as''8 ges''4 f''", r"es''1\fermata",
        "f''2 ges''4 as''", "bes''2 des'''", "c'''4. bes''8 as''4 ges''",
        r"f''4 es'' des''2\fermata"]
CH_AT = ["<as' des''>2 <bes' es''>4 <as' des''>", "<as' c''>2 <as' des''>",
         "<des'' ges''>2 <bes' es''>4 <bes' des''>", "<ges' c''>1",
         "<f' des''>2 <bes' es''>4 <des'' f''>", "<des'' ges''>2 <fes'' bes''>",
         "<es'' as''>2 <c'' es''>4 q", "<as' des''>4 <as' c''> <f' as'>2"]
CH_B = ["<des, des>2 <es, es>4 <f, f>", "<ges, ges>2 <f, f>",
        "<ges, ges>2 <es, es>4 <bes,, bes,>", r"<as,, as,>1\fermata",
        "<des, des>2 <es, es>4 <f, f>", "<ges, ges>2 <g, g>", "<as,, as,>1",
        r"<des, des>1\fermata"]
CH_PED = ["2:c 4:c 4:c", "2:c 2:c", "2:c 4:c 4:c", "1:c", "2:c 4:c 4:c", "2:c 2:c",
          "2:c 4:c 4:c", "4:c 4:c 2:c"]
CH_DYN = [r"s1\p" + it("dolce, religioso"), "s1", r"s2\< s2", r"s1\mp", r"s1\p",
          r"s2\< s2\mf", r"s2\> s2", r"s1\p"]
CH_T = [52, None, None, None, 52, None, None, [(0, 52), (2, 46)]]
CH_F = {3: [(0, 1.3)], 7: [(2, 2.0)]}
section("chorale", mel="rh", rub=0.03, phr=4)
for i in range(8):
    if i in (0, 4):
        brk()
    bar((CH_S[i], CH_AT[i]), CH_B[i], dyn=CH_DYN[i], ped=CH_PED[i], tempo=CH_T[i],
        ferm=CH_F.get(i, ()),
        glob=r"\key des \major \time 4/4" if i == 0 else "",
        rpre=r'\sectionLabel "Chorale" \tempo "Adagio religioso" 4 = 52' if i == 0 else "")

# Strophe two: the tune in octaves, harp triplets below, growing to ff.
CH2_R = [
    "<f' as' des'' f''>2 <ges' bes' es'' ges''>4 <f' as' des'' f''>",
    "<es' as' c'' es''>2 <as' des'' f'' as''>",
    "<bes' des'' ges'' bes''>4. <as' as''>8 <ges' bes' es'' ges''>4 <f' bes' des'' f''>",
    "<es' ges' c'' es''>1",
    "<f' as' des'' f''>2 <ges' bes' es'' ges''>4 <as' des'' f'' as''>",
    "<bes' des'' ges'' bes''>2 <des'' fes'' bes'' des'''>",
    "<c'' es'' as'' c'''>4. <bes' bes''>8 <as' c'' es'' as''>4 <ges' c'' es'' ges''>",
    "<f' as' des'' f''>4 <es' as' c'' es''> <des' f' as' des''>2",
]
CH2_L = [
    "des,8 as, f des, as, f es, bes, ges f, des as",
    "ges,8 c es ges, c es f, des as f, des as",
    "ges,8 des bes ges, des bes es, bes, ges bes,, f, des",
    "as,,8 es, c as, es ges as,, es, c as, es ges",
    "des,8 as, f des, as, f es, bes, ges f, des as",
    "ges,8 des bes ges, des bes g, des fes g, des fes",
    "as,,8 es, c as,, es, c as,, ges, c as,, ges, c",
    "des,8 as, f des, as, f des, as, f des, as, f",
]
CH2_DYN = [r"s1\mf" + it("con anima"), r"s1\<", r"s1\f", r"s1\mf\<", r"s2 s2\f\<",
           r"s2\ff s2", r"s2\f\> s2", r"s2\mf\> s2\p"]
CH2_T = [56, None, None, None, None, [(0, 56), (4, 52)], 54, [(0, 54), (4, 46)]]
section("chorale-ii", mel="rh", rub=0.035, phr=4)
for i in range(8):
    if i in (0, 4):
        brk()
    bar(CH2_R[i], tup(3, 2, seq(CH2_L[i], "")), dyn=CH2_DYN[i], ped=CH_PED[i],
        tempo=CH2_T[i], rpre=r'\tempo "Più mosso" 4 = 56' if i == 0 else "")

# Codetta: the chorale's last phrase, far away; D flat becomes the Neapolitan
# of C minor and falls onto its dominant.
section("chorale-coda", mel="rh", rub=0.0)
brk()
bar(("as''4( ges'' f''2)", "<des'' f''>4 <c'' es''> <as' des''>2"), "<des, des>1",
    dyn=r"s1\pp" + it("lontano"), ped="4:c 4:c 2:c", tempo=48,
    rpre=r'\tempo "Adagio" 4 = 48')
bar("<as' des'' f''>1", "<f, f>1", ped="1:c", tempo=[(0, 46), (4, 42)])
bar(r"<g' b' f''>1\fermata", r"<g,, d, g,>1\fermata", dyn=r"s1\ppp",
    ped="1:c", glob=r'\bar "||" \key c \minor', tempo=42, ferm=[(0, 2.2)])

# ============================================================== IV. FUGUE
# Three voices. Subject = the ground's first half (C Eb D G Ab F B C) with a
# tail that climbs the ground's second half (Eb F F# G). Real answer in G
# minor; the countersubject moves in thirds and sixths against it, so it
# inverts at the octave (it sits above the subject in bars 6-7 and 14-15).
FUGUE = [
    # (soprano, alto, bass); a plain string = one voice in the right hand
    ("c'4 es'8 d' g'4 as'8 f'", None, "R1"),
    ("b8 c' es'16 f' fis' g' as' g' f' es' d'8 g", None, "R1"),
    # answer + countersubject
    ("g'4 bes'8 a' d''4 es''8 c''", "bes16 c' es' c' d' es' c' d' bes c' bes a g a c' es'", "R1"),
    ("fis'8 g' bes'16 c'' cis'' d'' es'' d'' c'' bes' a'8 d'", "d'8 bes g' a' g' es' c' bes", "R1"),
    # codetta, back to C minor
    ("g'8 bes'16 d'' es''8 c''16 g' as'8 f'16 d'' b'8 d''16 f''", "bes8 d' c' es' f' d' g' f'", "R1"),
    # subject in the bass, countersubject above it
    ("c''4 bes'8 as' g'4 f'8 as'", "es'16 f' as' f' g' as' f' g' es' f' es' d' c' d' f' as'",
     "c4 es8 d g4 as8 f"),
    ("f''8 es'' g'' c'''~ c'''4 as''8 g''", "g'8 es' c'' d'' c'' as' f' es'",
     "b,8 c es16 f fis g as g f es d8 g,"),
    # episode: the head motif walks down by fifths in the bass
    ("es''16 d'' c'' es'' d''8 b' as''16 g'' f'' as'' g''8 e''", "g'2 c''", "c8 es d g, f as g c"),
    ("d''16 c'' bes' d'' c''8 a' g''16 f'' es'' g'' f''8 d''", "f'2 bes'", "bes,8 d c f, es g f bes,"),
    # subject in E flat major, countersubject a third lower
    ("es''4 g''8 f'' bes''4 c'''8 as''", "g'16 as' c'' as' bes' c'' as' bes' g' as' g' f' es' f' as' c''",
     "es8 as, bes, d es g as f"),
    ("d''8 es'' g''16 as'' a'' bes'' c''' bes'' as'' g'' f''8 bes'", "bes'8 g' es'' f'' es'' c'' as' g'",
     "bes,8 es c a, as,4 bes,8 g,"),
    # episode: the ground's rising bass, E flat E F F sharp, under the head motif
    ("es''8 g''16 f'' bes''8 g'' e''8 g''16 f'' c'''8 bes''", "g'8 bes'16 as' g'8 es' g'8 c''16 bes' g'8 e'",
     "<es, es>4 q <e, e> q"),
    # subject in an inner voice, F minor (the texture thickens to four voices),
    # countersubject above it
    ("as'16 bes' des'' bes' c'' des'' bes' c'' as' bes' as' g' f' g' bes' des''", None,
     ("f4 as8 g c'4 des'8 bes", "f,8 des, f, e, f,4 bes,,8 g,,")),
    ("c''8 as' f'' g'' f'' des'' bes' as'", None,
     ("e8 f as16 bes b c' des' c' bes as g8 c", "c,8 f,4 d,8 f, g,, c, as,,")),
    ("f''8 as''16 g'' c'''8 as'' a''8 c'''16 bes'' es'''8 c'''", "as'8 c''16 bes' as'8 f' c''8 es''16 d'' c''8 a'",
     "<f, f>4 q <fis, fis> q"),
    # the answer in the bass, countersubject above
    ("d''8 es'' g'' fis'' g''4 c'''8 a''", "bes16 c' es' c' d' es' c' d' bes c' bes a g a c' es'",
     "g,4 bes,8 a, d4 es8 c"),
    ("a''8 g''4 e'''8 es'''4 fis''8 g''", "d'8 bes g' a' g' es' c' bes",
     "fis,8 g, bes,16 c cis d es d c bes, a,8 d,"),
    # to the dominant through the Neapolitan
    ("d'''8 bes'' c''' g'' des''' as'' b'' d'''", "d'8 g' g' es' as' f' f' d'",
     "g,8 bes, es c f, as, g, g,,"),
]
F_DYN = [r"s1\mp" + it("marcato"), "s1", "s1", "s1", r"s1\<", r"s1\mf", "s1", r"s1\<",
         r"s2\f s2\>", r"s1\mf", r"s2\< s2", r"s1\f", r"s1\mf" + it("il soggetto nel tenore"),
         r"s2 s2\<", r"s1\f\<", r"s1\ff", "s1", r"s2 s2\<"]
F_T = [100] + [None] * 16 + [[(0, 100), (4, 90)]]
section("fugue", mel="rh", rub=0.012, phr=4)
for i, (s, a, b) in enumerate(FUGUE):
    rh = s if a is None else (s, a)
    if i % 3 == 0:
        brk()
    bar(rh, b, dyn=F_DYN[i], ped="1:u" if i == 0 else None, tempo=F_T[i],
        glob=r'\time 4/4' if i == 0 else "",
        lpre=r"\clef bass" if i == 0 else "",
        rpre=r'\sectionLabel "Fuga" \tempo "Allegro energico" 4 = 100' if i == 0 else "")

# Climax: the subject in octaves above its own augmentation in the bass,
# which is the ground itself.
section("fugue-climax", mel="rh", rub=0.0)
brk()
bar("<c' es' g' c''>4-> <es' g' es''>8 <d' f' d''> <g' c'' es'' g''>4-> <as' d'' as''>8 <f' as' f''>",
    "<c, g, c>2-> <es, g, es>4-> <d, as, d>->", dyn=r"s1\fff" + it("grandioso: il soggetto e la sua aumentazione"),
    ped="2:c 4:c 4:c", tempo=76, rpre=r'\tempo "Grandioso" 4 = 76')
bar("<b d' b'>8-> <c' es' c''> <es' es''>16 <f' f''> <fis' fis''> <g' g''> <as' as''> <g' g''> "
    "<f' f''> <es' es''> <d' f' d''>8 <b d' b'>",
    "<g, d g>2-> <as, c as>4-> <f, d f>->", ped="2:c 4:c 4:c")
brk()
bar("<d' g' b' d''>4-> <c' es' g' c''>-> <c' es' fis' c''>-> <b d' g' b'>->",
    "<b,, b,>4-> <c, c>-> <as,, as,>-> <g,, g,>->", ped="4:c 4:c 4:c 4:c",
    tempo=[(0, 76), (4, 62)])
bar(r"<g' b' d'' f'' g''>1\arpeggio\fermata", r"<g,, d, g,>1\arpeggio\fermata",
    dyn=r"s1\sffz", ped="1:c", roll=True, tempo=56, ferm=[(0, 2.6)])

# ============================================================== V. APOTHEOSIS
# The chorale in C major, fff. Tune in octave chords; the left hand strides
# between bass octaves and chords that stay under the right hand.
AP_R = [
    "<e' g' c'' e''>2-> <f' a' d'' f''>4 <e' g' c'' e''>",
    "<d' g' b' d''>2 <g' c'' e'' g''>2",
    "<a' c'' f'' a''>4. <g' g''>8 <f' a' d'' f''>4 <e' a' c'' e''>",
    "<d' f' b' d''>1",
    "<e' g' c'' e''>2 <f' a' d'' f''>4 <g' c'' e'' g''>",
    "<a' c'' f'' a''>2 <c'' es'' a'' c'''>2->",
    "<b' d'' g'' b''>4. <a' a''>8 <g' b' d'' g''>4 <f' b' d'' f''>",
    "<e' g' c'' e''>4 <d' g' b' d''> <c' e' g' c''>2",
]
C_ = ("c,", "g,", "c", "e")
D_ = ("d,", "a,", "d", "f")
E_ = ("e,", "g,", "c", "e")
F_ = ("f,", "c", "f", "a")
F7_ = ("f,", "g,", "b,", "d")
Fs_ = ("fis,", "c", "es", "a")
G_ = ("g,,", "d,", "g,", "b,")
G7_ = ("g,,", "f,", "b,", "d")
A_ = ("a,,", "e,", "a,", "c")
AP_W = [[C_, C_, D_, E_], [F7_, F7_, E_, E_], [F_, F_, D_, A_], [G_, G_, G7_, G7_],
        [C_, C_, D_, E_], [F_, F_, Fs_, Fs_], [G_, G_, G_, G7_], [C_, G_]]
AP_L = [" ".join(tup(6, 4, wave(*w)) for w in bb) for bb in AP_W]
AP_L[7] += " <c,, c,>2"
AP_DYN = [r"s1\fff" + it("trionfale"), "s1", "s1", r"s1\ff", r"s2\ff\< s2",
          r"s2 s2\fff", r"s1\ff", r"s2 s2\fff"]
AP_PED = ["2:c 4:c 4:c", "2:c 2:c", "4.:c 8:- 4:c 4:c", "1:c", "2:c 4:c 4:c", "2:c 2:c",
          "2:c 4:c 4:c", "4:c 4:c 2:c"]
AP_T = [54, None, None, [(0, 54), (4, 50)], 54, [(0, 54), (4, 50)], 52, [(0, 52), (4, 46)]]
section("apotheosis", mel="rh", rub=0.02, phr=4)
for i in range(8):
    if i % 2 == 0:
        brk()
    bar(AP_R[i], AP_L[i], dyn=AP_DYN[i], ped=AP_PED[i], tempo=AP_T[i],
        glob=r'\bar "||" \key c \major' if i == 0 else "",
        rpre=r'\sectionLabel "Apoteosi" \tempo "Grandioso" 4 = 54' if i == 0 else "")

# ============================================================== VI. CODA
# The ground once more, in C major, under bells; then its first half,
# C E D G A F B C, as the last cadence (the F turns minor on the way).
CO_R = [
    rep("<e'' g'' c''' e'''>8", 6),
    rep("<d'' g'' b'' d'''>8", 6),
    rep("<e'' a'' c''' e'''>8", 4) + " " + rep("<f'' a'' c''' f'''>8", 2),
    rep("<f'' as'' b'' d'''>8", 6),
    rep("<e'' g'' c''' e'''>8", 6),
    rep("<f'' a'' c''' f'''>8", 4) + " " + rep("<es'' fis'' a'' c'''>8", 2),
    rep("<e'' g'' c''' e'''>8", 4) + " " + rep("<d'' g'' b'' d'''>8", 2),
    rep("<d'' f'' g'' b''>8", 6),
]
CO_L = ["<c, c>2 <e, e>4", "<d, d>2 <g,, g,>4", "<a,, a,>2 <f,, f,>4", "<b,,, b,,>2.",
        "<c,, c,>2 <e,, e,>4", "<f,, f,>2 <fis,, fis,>4", "<g,, g,>2.", "<g,, g,>2."]
CO_DYN = [r"s2.\ff" + it("campane"), "s2.", r"s4 s2\<", r"s2.\fff", r"s2.\ff", r"s4 s2\<",
          r"s2.\fff", "s2."]
section("coda", mel="rh", rub=0.015, phr=4)
for i in range(8):
    if i in (0, 4):
        brk()
    bar(CO_R[i], CO_L[i], dyn=CO_DYN[i],
        ped=GPED[i], tempo=60 if i == 0 else ([(0, 60), (3, 56)] if i == 7 else None),
        glob=r"\time 3/4" if i == 0 else "",
        rpre=r'\sectionLabel "Coda" \tempo "Tempo I, maestoso" 4 = 60' if i == 0 else "")
brk()
bar("<c'' e'' g'' c'''>2-> <e'' g'' c''' e'''>4->", "<c,, g,, c,>2-> <e,, g,, e,>4->",
    dyn=r"s2.\fff" + it("allargando"), ped="2:c 4:c", tempo=54)
bar("<d'' g'' b'' d'''>2-> <b' d'' g'' b''>4->", "<d,, d,>2-> <g,, d, g,>4->",
    ped="2:c 4:c", tempo=50)
bar("<c'' e'' a'' c'''>2-> <c'' f'' as'' c'''>4->", "<a,, e, a,>2-> <f,, c, f,>4->",
    ped="2:c 4:c", tempo=46)
bar("<b' d'' f'' g'' b''>2.->", "<b,,, b,,>2.->", ped="2.:c", tempo=[(0, 44), (3, 38)])
bar(r"<c'' e'' g'' c'''>2.\arpeggio\fermata", r"<c,, g,, c,>2.\arpeggio\fermata",
    dyn=r"s2.\fff", ped="2.:c", roll=True, tempo=38, ferm=[(0, 4.0)])


# ================================================================= output
def voice_block(hand, v):
    lines = []
    for i, s in enumerate(VOICES[hand][v]):
        lines.append(f"  {s}  % {i + 1}")
    return "{\n" + "\n".join(lines) + "\n}"


def write(outdir):
    os.makedirs(outdir, exist_ok=True)
    head = f"""\\version "2.24.0"
#(set-global-staff-size 18)
sffz = #(make-dynamic-script "sffz")

\\header {{
  title = "{TITLE}"
  subtitle = "{SUBTITLE}"
  subsubtitle = "{SUBSUBTITLE}"
  composer = "{COMPOSER}"
  tagline = ##f
}}

\\paper {{
  #(set-paper-size "a4")
  top-margin = 11
  bottom-margin = 11
  left-margin = 14
  right-margin = 12
  ragged-last-bottom = ##f
  max-systems-per-page = 5
  markup-system-spacing.basic-distance = 12
  system-system-spacing = #'((basic-distance . 14) (minimum-distance . 10) (padding . 2.5) (stretchability . 60))
  print-first-page-number = ##f
}}
"""
    body = []
    for hand in ("rh", "lh"):
        for v, tag in enumerate("ABC"):
            block = voice_block(hand, v)
            if hand == "rh" and v == 0:
                block = "{\n  \\autoLineBreaksOff" + block[1:]
            body.append(f"{hand}{tag} = {block}\n")
    body.append("dyn = {\n" + "\n".join(f"  {d} |  % {i + 1}" for i, d in enumerate(DYN)) + "\n}\n")
    body.append("ped = {\n" + "\n".join(f"  {d} |  % {i + 1}" for i, d in enumerate(PED)) + "\n}\n")

    staves = """\\new PianoStaff <<
    \\new Staff = "rh" \\with { \\consists "Merge_rests_engraver" } <<
      \\new Voice = "rhA" { \\rhA }
      \\new Voice = "rhB" { \\rhB }
      \\new Voice = "rhC" { \\rhC }
    >>
    \\new Dynamics \\dyn
    \\new Staff = "lh" \\with { \\consists "Merge_rests_engraver" } <<
      \\new Voice = "lhA" { \\clef bass \\lhA }
      \\new Voice = "lhB" { \\lhB }
      \\new Voice = "lhC" { \\lhC }
    >>
    \\new Dynamics \\with { pedalSustainStyle = #'mixed } \\ped
  >>"""
    score = f"""
\\score {{
  \\removeWithTag #'midi
  {staves}
  \\layout {{
    \\context {{ \\PianoStaff \\consists "Span_arpeggio_engraver" connectArpeggios = ##t }}
    \\context {{ \\Score \\override SpacingSpanner.common-shortest-duration = #(ly:make-moment 1/10) }}
    \\context {{ \\Voice \\override TupletBracket.bracket-visibility = #'if-no-beam }}
    \\context {{ \\Voice \\override Stem.details.beamed-extreme-minimum-free-lengths = #'(0.5 0.5) }}
  }}
}}

\\score {{
  \\removeWithTag #'layout
  \\unfoldRepeats
  {staves}
  \\midi {{
    \\context {{ \\Staff \\remove "Staff_performer" }}
    \\context {{ \\Voice \\consists "Staff_performer" }}
    \\context {{ \\Score midiMinimumVolume = #0.7 midiMaximumVolume = #0.7 }}
  }}
}}
"""
    with open(os.path.join(outdir, STEM + ".ly"), "w") as f:
        f.write(head + "\n".join(body) + score)
    meta = {"bars": BARS, "dyn": EVENTS["dyn"], "ped": EVENTS["ped"],
            "length_q": float(ST["q"])}
    with open(os.path.join(outdir, "score_meta.json"), "w") as f:
        json.dump(meta, f, indent=0)
    print(f"{len(BARS)} bars, {float(ST['q']):.1f} quarters -> {outdir}/{STEM}.ly")


if __name__ == "__main__":
    write(sys.argv[1] if len(sys.argv) > 1 else "build")
