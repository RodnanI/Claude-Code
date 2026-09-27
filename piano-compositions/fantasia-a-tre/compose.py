#!/usr/bin/env python3
"""Fantasia a tre, in F minor.

The composition itself: every bar, with its dynamics, pedal and tempo plan.

    python3 compose.py OUTDIR
        -> OUTDIR/fantasia_a_tre.ly              (engraved score + MIDI score)
        -> OUTDIR/score_meta.json                (performance plan for perform.py)

Pitches are LilyPond absolute (c' = middle C), Dutch names (cis, bes, es, as).
Every bar also names its harmony, one chord symbol per beat (harm="Fm C7/E"),
which analyze.py checks every note and every outer-voice move against.
"""
import json
import os
import re
import sys
from fractions import Fraction as Fr

TITLE = "Fantasia a tre"
SUBTITLE = "in F minor"
SUBSUBTITLE = "for piano, after Mozart, Chopin and Liszt"
COMPOSER = "Claude"
STEM = "fantasia_a_tre"

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
        tempo=None, ferm=(), roll=False, cross=False, cadenza=None, harm=None):
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

    # harmony: "Fm C7/E:1.5 ..." one chord per beat unless ":quarters" is given
    hs = []
    if harm:
        t = Fr(0)
        for tok in harm.split():
            sym, _, d = tok.partition(":")
            d = Fr(d) if d else ST["beat"]
            if sym == "-" and hs:
                hs[-1][1] += float(d)
            else:
                hs.append([float(t), float(d), sym])
            t += d
        assert t == L, f"bar {n}: harm sums to {t}, bar is {L}"

    BARS.append({
        "n": n, "q0": float(q0), "len": float(L), "beat": float(ST["beat"]),
        "harm": hs,
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
# The motto is 5-1-3-b6-5: C F A-flat D-flat C. Its b6 (D flat) is the key of
# the Minuetto. Its deceptive cadence (V7 -> VI) drives the introduction round
# the cycle of major thirds, F -> C sharp (D flat) -> A -> F.


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


def trm(n, a, b):
    """Measured tremolo: n pairs of 32nds, a then b."""
    return f"\\repeat tremolo {n} {{ {a}32 {b}32 }}"


def ham(ch, n=2):
    """n beats of hammered 16th chords on `ch` (first one accented)."""
    return " ".join([f"{ch}16-> q q q"] + ["q16 q q q"] * (n - 1))


def trip(ch, n=2):
    """n beats of hammered triplet eighths on chord `ch` (first one accented)."""
    return " ".join([f"\\tuplet 3/2 {{ {ch}8-> q q }}"] + ["\\tuplet 3/2 { q q q }"] * (n - 1))


# ============================================================== I. INTRODUZIONE
# Statement 1: the motto in bare octaves, then V7 -> VI (C7 -> D flat).
section("intro", mel="rh", rub=0.0)
bar("c'2 f'4. as'8", "<c, c>2 <f, f>4. <as, as>8",
    dyn=r"s2\pp" + it("misterioso") + r" s4.\< s8", ped="1:c",
    glob=r"\key f \minor \time 4/4", rpre=r'\tempo "Lento misterioso" 4 = 46',
    tempo=46, harm="Fm:4")
bar(r"des''2 c''2\fermata", r"<des des'>2 <c c'>2\fermata",
    dyn=r"s2\> s2\!", ped="2:c 2:c", tempo=[(0, 46), (2, 40)], ferm=[(2, 1.2)],
    harm="Db:2 C5:2")
bar(r"<e' g' bes'>2 <f' as'>2\fermata", r"<c, c>2 <des, des>2\fermata",
    dyn=r"s2\pp s2", ped="2:c 2:c", tempo=44, ferm=[(2, 1.8)], harm="C7:2 Db:2")

# Statement 2: D flat turns minor (C sharp minor); the motto as a chorale,
# i - VI - iv - i6/4 - V7, and again the deceptive cadence (onto A).
section("intro-chorale", mel="rh", rub=0.0)
brk()
bar(("gis'2 cis''4. e''8", "<cis' e'~>2 <e' a'>2"), "<cis, cis>2 <a,, a,>2",
    dyn=r"s2\p" + it("dolente") + r" s4. s8\<", ped="2:c 2:c", tempo=46,
    harm="C#m:2 A:2")
bar(("a''2 gis''4 fis''", "<cis''~ fis''>2 <cis'' e''>4 <bis' dis''>"),
    "<fis,, fis,>2 <gis,, gis,>2", dyn=r"s2\mp\> s2", ped="2:c 4:c 4:c",
    harm="F#m:2 C#m/G#:1 G#7:1")
bar(("e''1", r"cis''2 <a' c''>2\fermata"), r"<a,, a,>1", dyn=r"s2\p s2\pp",
    ped="2:c 2:c", tempo=[(0, 46), (2, 42)], ferm=[(2, 0.8)], harm="A:2 Am:2")

# Statement 3: A minor, the motto in the bass under tremolos,
# V - i - Ger+6 - i6/4 - V7, deceptive again: onto F, which turns minor.
section("intro-tremolo", mel="lh", rub=0.0)
brk()
bar(trm(8, "<gis' e''>", "b'") + " " + trm(8, "<a' e''>", "c''"),
    "<e,, e,>2 <a,, a,>4. <c, c>8",
    dyn=r"s2\p\< s2", ped="2:c 2:c", tempo=48, harm="E:2 Am:1.5 Am/C:0.5")
bar(trm(8, "<a' dis''>", "c''") + " " + trm(4, "<a' e''>", "c''") + " "
    + trm(4, "<gis' d''>", "b'"),
    "<f, f>2 <e, e>2", dyn=r"s2\mf s2\<", ped="2:c 4:c 4:c", harm="FGer:2 Am/E:1 E7:1")
bar(trm(8, "a'", "c''") + " " + trm(8, "as'", "c''"), "<f, f>1",
    dyn=r"s2\f s2\<", ped="2:c 2:c", harm="F:2 Fm:2")
# iv6 - Ger+6 - i6/4 - V7 of F minor, hammered.
section("intro-climax", mel="rh", rub=0.0)
brk()
bar(ham("<bes' des'' f''>") + " " + ham("<b' des'' f'' as''>"), "<des, des>2 <des, des>2",
    dyn=r"s2\ff s2\<", ped="2:c 2:c", tempo=[(0, 52), (4, 58)], harm="Bbm/Db:2 DbGer:2")
bar(ham("<c'' f'' as''>") + " " + ham("<bes' c'' e'' g''>"), "<c, c>2 <c, c>2",
    dyn=r"s2\fff s2", ped="2:c 2:c", tempo=[(0, 58), (4, 50)], harm="Fm/C:2 C7:2")

# Cadenza: the diminished seventh over C (V7 flat 9) poured down four octaves,
# then a recitative that dies away on the dominant.
section("intro-cadenza", mel="rh", rub=0.0)
brk()
bar(r"<e' g' bes' des''>4->\fermata "
    + xs(bm(r"des'''32 bes'' g'' e'' des'' bes' g' e' des' bes g e des bes, g, e,\fermata", 4)),
    r"<c,, c,>4->\fermata s2", dyn=r"s4\sffz s2\>", ped="2.:c", length=3,
    tempo=[(0, 60), (1, 76)], ferm=[(0, 1.4), (2.875, 0.9)], cadenza="", harm="C7b9:3")
bar(r"c''8([ des'' c'' bes'] as'[ g' f' e']) g'4\fermata",
    r"s1 <c, bes, e>4\fermata", dyn=r"s1\pp" + it("recitativo") + " s4",
    ped="1:u 4:c", length=5, tempo=[(0, 54), (4, 44)], ferm=[(4, 2.0)],
    cadenza="||", harm="C7:5")

# ============================================================== II. BALLATA
# Chopin: a ballade theme in 6/8 whose head is the motto (F A-flat D-flat C).
section("ballata-up", mel="rh", rub=0.0)
brk()
bar("c'8", "r8", glob=r"\time 6/8 \partial 8", length=Fr(1, 2),
    rpre=r'\sectionLabel \markup { \concat { \bold "Ballata" \hspace #12 } } \tempo "Andante con moto" 4. = 46', tempo=69,
    harm="C7:0.5")

BA_A = [  # (right hand, left hand, harmony, pedal)
    ("f'4( as'8 des''4 c''8)", "f,8 <c as> q f, <c as> q", "Fm:3", "4.:c 4:c 8:c"),
    ("c''8( bes' as' g'4 f'8)", "bes,8 <f des'> <f bes> c <e bes> q", "Bbm C7", "4.:c 4.:c"),
    ("e'4( f'8 g' as' bes')", "f,8 <c as> q bes, <des g> q", "Fm Gdim/Bb", "4.:c 4.:c"),
    ("as'4( g'8 e'4) c'8", "c,8 <g, e> q g, <c e> q", "C C/G", "2.:c"),
    ("f'4( as'8 des''4 c''8)", "f,8 <c as> q f, <c as> q", "Fm:3", "4.:c 4:c 8:c"),
    ("f''4( es''8 des''4 c''8", "des8 <f as> q bes, <f des'> q", "Db Bbm", "4.:c 4.:c"),
    ("des''8 c'' bes' as'4 g'8)", "bes,8 <des g> q c <e bes> q", "Gdim/Bb C7", "4.:c 4.:c"),
    ("f'4. r4 es'8", "f,8 <c as> q bes, <g des'> q", "Fm Eb7/Bb", "4.:c 4.:c"),
]
BA_A_DYN = [r"s4.\p" + it("mezza voce") + " s4.", r"s4. s4.\<", r"s4.\> s4.", r"s4. s4.\!",
            r"s4.\p s4.\<", r"s4.\mp s4.\>", "s4. s4.", r"s4.\p s4."]
# B: the motto in A-flat major; the answer turns back, through D flat and
# its German sixth, onto the dominant of F minor; a fioritura leads back.
BA_B = [
    ("as'4( c''8 f''4 es''8)", "as,8 <es c'> q as, <es c'> q", "Ab:3", "4.:c 4:c 8:c"),
    ("es''8( des'' c'' des''4 bes'8)", "des8 <f as> q es <g des'> q", "Db Eb7", "4.:c 4.:c"),
    ("c''4( es''8 as''4 f''8)", "as,8 <es c'> q f, <as des'> q", "Ab Db/F", "4.:c 4.:c"),
    ("es''8( des'' c'' bes'4 as'8)", "c8 <es as> q es, <g des'> q", "Ab/C Eb7", "4.:c 4.:c"),
    ("as'4( f'8 des''4 c''8)", "f,8 <as c'> q bes, <f des'> q", "Fm Bbm", "4.:c 4.:c"),
    ("b'4.( c''4) r8", "des8 <f as> q c <f as> q", "DbGer Fm/C", "4.:c 4.:c"),
    ("g'16( as' g' f' e' f' g' bes' c'' des'' c'' bes'", "c8 <e bes> q c <e bes> q", "C7:3", "2.:c"),
    ("as'16 g' f' e' des' c' e'4) c'8", "c8 <e bes> q c4 r8", "C7:3", "2.:c"),
]
BA_B_DYN = [r"s4.\p" + it("dolce") + " s4.", "s4. s4.", r"s4.\< s4.", r"s4.\mf\> s4.",
            r"s4.\p s4.", r"s4.\< s4.\mp", r"s4.\pp" + it("leggiero") + r" s4.\<", r"s4.\> s4.\!"]
# A': the theme in octaves over wide arpeggios, rising to ff; the last
# cadence is deceptive (V7 -> VI, D flat).
BA_C = [
    ("<f' f''>4( <as' as''>8 <des'' des'''>4 <c'' c'''>8)", "f,8 c as c' as c", "Fm:3", "4.:c 4:c 8:c"),
    ("<c'' c'''>8( <bes' bes''> <as' as''> <g' g''>4 <f' f''>8)", "bes,8 des' f c e bes", "Bbm C7", "4.:c 4.:c"),
    ("<e' e''>4( <f' f''>8 <g' g''> <as' as''> <bes' bes''>)", "f,8 c as bes, des g", "Fm Gdim/Bb", "4.:c 4.:c"),
    ("<as' as''>4( <g' g''>8 <e' e''>4) <c' c''>8", "c,8 g, e g, c e", "C C/G", "2.:c"),
    ("<f' f''>4( <as' as''>8 <des'' des'''>4 <c'' c'''>8)", "f,8 c as c' as c", "Fm:3", "4.:c 4:c 8:c"),
    ("<f'' f'''>4( <es'' es'''>8 <des'' des'''>4 <c'' c'''>8", "des,8 as, f bes,, f, des", "Db Bbm", "4.:c 4.:c"),
    ("<des'' des'''>8 <c'' c'''> <bes' bes''> <as' as''>4 <g' g''>8)", "bes,8 des g c e bes", "Gdim/Bb C7", "4.:c 4.:c"),
    ("<f' f''>4.~ q4.", "des,8 as, f des' f as,", "Db:3", "2.:c"),
]
BA_C_DYN = [r"s4.\mf" + it("con passione") + r" s4.\<", r"s4.\f s4.", r"s4. s4.\<", r"s4.\f s4.",
            r"s4.\f\< s4.", r"s4.\ff s4.", r"s4. s4.\>", r"s4.\fp s4."]

section("ballata", mel="rh", rub=0.045, phr=4)
for i, (r, l, h, p) in enumerate(BA_A):
    if i == 4:
        brk()
    bar(r, l, dyn=BA_A_DYN[i], ped=p, harm=h,
        tempo=[(0, 69), (2, 64)] if i == 7 else None)
section("ballata-b", mel="rh", rub=0.05, phr=4)
for i, (r, l, h, p) in enumerate(BA_B):
    if i in (0, 4):
        brk()
    bar(r, l, dyn=BA_B_DYN[i], ped=p, harm=h,
        tempo=69 if i == 0 else ([(0, 66), (3, 58)] if i == 7 else None))
section("ballata-c", mel="rh", rub=0.04, phr=4)
for i, (r, l, h, p) in enumerate(BA_C):
    if i in (0, 4):
        brk()
    bar(r, l, dyn=BA_C_DYN[i], ped=p, harm=h,
        tempo=72 if i == 0 else ([(0, 72), (3, 64)] if i == 7 else None))

# ============================================================== AGITATO
# Liszt: the D flat of the deceptive cadence is taken as I of D flat major;
# waves in both hands over I - vi - IV - iv - ii7 - vii°7/ii... to V7.
AG = [  # (right hand, left hand, harmony, dynamics, tempo)
    (wave("f'", "as'", "des''", "f''") + " " + wave("as'", "des''", "f''", "as''"),
     "<des, des>4. as,16 des f as f des", "Db:3", r"s4.\p" + it("agitato") + r" s4.\<", 90),
    (wave("f'", "bes'", "des''", "f''") + " " + wave("bes'", "des''", "f''", "bes''"),
     "<bes,, bes,>4. f,16 bes, des f des bes,", "Bbm:3", r"s4.\mf s4.\<", None),
    (wave("ges'", "bes'", "des''", "ges''") + " " + wave("ges'", "beses'", "des''", "ges''"),
     "<ges,, ges,>4. des,16 ges, beses, des beses, ges,", "Gb Gbm", r"s4.\f s4.\<", [(0, 90), (3, 96)]),
    (wave("es'", "ges'", "bes'", "des''") + " " + wave("g'", "bes'", "des''", "e''"),
     "<es, es>4. <e, e>4.", "Ebm7 Edim7", r"s4.\ff s4.", 96),
    (wave("f'", "as'", "des''", "f''") + " " + wave("as'", "des''", "f''", "as''"),
     "<as,, as,>4. as,16 des f as f des", "Db/Ab:3", r"s4.\f s4.\>", 92),
    (wave("ges'", "c''", "es''", "ges''") + " " + wave("c''", "es''", "ges''", "c'''"),
     "<as,, as,>4. es,16 as, c es c as,", "Ab7:3", r"s4.\mf s4.\>", [(0, 88), (3, 80)]),
    (wave("ges''", "es''", "c''", "as'") + " " + wave("es''", "c''", "as'", "ges'"),
     "<as,, as,>4. es,16 as, c es c as,", "Ab7:3", r"s4.\p s4.\>", [(0, 76), (3, 66)]),
    (r"c''16( as' ges' es' c' es' ges'4.)\fermata", r"<as,, as,>2.\fermata", "Ab7:3",
     r"s4.\pp s4.", [(0, 60), (3, 48)]),
]
section("agitato", mel="rh", rub=0.0)
for i, (r, l, h, d, t) in enumerate(AG):
    if i in (0, 4):
        brk()
    bar(r, l, dyn=d, ped="4.:c 4.:c" if i < 7 else "2.:c", harm=h, tempo=t,
        rpre=r'\tempo "Più mosso" 4. = 60' if i == 0 else "",
        ferm=[(1.5, 1.2)] if i == 7 else ())

# ============================================================== III. MINUETTO
# Mozart: a minuet in D flat whose first bar is the motto in the major
# (A-flat D-flat F B-flat A-flat: 5 1 3 6 5).
section("minuetto-up", mel="rh", rub=0.0)
brk()
bar("as'4", "r4", glob=r'\bar "||" \key des \major \time 3/4 \partial 4', length=1,
    rpre=r'\sectionLabel \markup { \concat { \bold "Minuetto" \hspace #12 } } \tempo "Tempo di Minuetto, grazioso" 4 = 100',
    tempo=100, harm="Ab7:1")

MI_A = [  # plain: melody over bass and two staccato chords
    ("des''4.( es''8 f''4)", "des4 <f as>-. q-.", "Db:3", r"s2.\p" + it("dolce")),
    ("bes''2( as''4)", "ges,4 <des bes>-. <des f>-.", "Gb:2 Db:1", "s2."),
    ("ges''8( f'' es'' f'' es'' des'')", "as,4 <c es>-. q-.", "Ab7:3", r"s2\< s4\>"),
    ("des''2 as'4", "des4 <f as>-. r4", "Db:3", r"s2.\!"),
    ("f''4.( ges''8 as''4)", "f,4 <des as>-. q-.", "Db/F:3", r"s2.\<"),
    ("ges''4.( as''8 bes''4)", "bes,4 <des ges>-. q-.", "Gb/Bb:3", r"s2.\mf"),
    ("g''8( as'' bes'' as'' g'' as'')", "es,4 <g des'>-. q-.", "Eb7:3", r"s2.\>"),
    ("as''2 r4", "as,4 <as c'>-. r4", "Ab:3", r"s2.\p"),
]
MI_B = [  # the same with Mozart's ornaments over an Alberti bass; ends in D flat
    ("des''16( es'' f'' es'' des'' c'' des'' es'' f''4)", "des8 as f as des as", "Db:3", r"s2.\p"),
    ("bes''16( c''' bes'' as'' ges''8 f'' as''4)", "ges,8 des bes, des f, des", "Gb:2 Db/F:1", "s2."),
    ("ges''16( f'' es'' f'' ges'' f'' es'' des'' c''8 es'')", "as,8 es c es c es", "Ab7:3", r"s2\< s4\>"),
    ("des''2 as'4", "des8 as f as des4", "Db:3", r"s2.\!"),
    ("f''16( ges'' as'' ges'' f'' es'' f'' ges'' as''4)", "f,8 des as, des f, des", "Db/F:3", r"s2.\<"),
    ("ges''16( as'' bes'' as'' ges'' f'' ges'' as'' bes''4)", "bes,8 ges des ges bes, ges", "Gb/Bb:3", r"s2.\mf"),
    ("f''4 " + trill(r"es''2\trill",
                     "f''32 es'' f'' es'' f'' es'' f'' es'' f'' es'' f'' es'' f'' es'' des'' es''"),
     "as,8 f c es ges es", "Db/Ab:1 Ab7:2", r"s4 s2\>"),
    ("des''2 r4", "des8 as f as des4", "Db:3", r"s2.\p"),
]
MI_C = [  # duetto: two voices in thirds down the circle of fifths, then back to V7
    ("<des'' f''>4.( <c'' es''>8 <bes' des''>4)", "bes,4 <f des'>-. q-.", "Bbm:3",
     r"s2.\p" + it("a due voci")),
    ("<ges'' bes''>4.( <f'' as''>8 <es'' ges''>4)", "es,4 <ges bes>-. q-.", "Ebm:3", "s2."),
    ("<c'' es''>4.( <bes' des''>8 <as' c''>4)", "as,4 <es ges>-. q-.", "Ab7:3", "s2."),
    ("<f'' as''>4.( <es'' ges''>8 <des'' f''>4)", "des,4 <f as>-. q-.", "Db:3", r"s2.\<"),
    ("<bes' des''>4.( <as' c''>8 <ges' bes'>4)", "ges,4 <des bes>-. q-.", "Gb:3", r"s2.\mf"),
    ("<des'' fes''>4.( <bes' des''>8 <g' bes'>4)", "g,4 <bes des'>-. q-.", "Gdim7:3", r"s2.\>"),
    ("<as' f''>2( <ges' es''>4)", "as,4 <des f>-. <c ges>-.", "Db/Ab:2 Ab7:1", r"s2.\p"),
    (r"<ges' c'' es''>2\fermata as4", "as,,2 r4", "Ab7:3", r"s2 s4\pp"),
]
# Liszt's variation: the tune in the right thumb, filigree above, bass below.
# Every melody note is struck together with the lowest note of a filigree
# group, never more than an octave away.


def fil(*groups):
    """Sextuplet 16ths per beat; a group 'a b c' plays a b c a b c."""
    out = []
    for g in groups:
        ns = g.split()
        if len(ns) == 3:
            ns = ns * 2
        out.append(tup(6, 4, seq(ns, "16")))
    return " ".join(out)


MI_D = [  # (filigree, melody, left hand, harmony, dynamics)
    (fil("as' des'' f''", "as' des'' f''", "as' des'' f''"),
     "des'4.( es'8 f'4)", "des,4 <as, f>-. q-.", "Db:3", r"s2.\pp" + it("leggierissimo, il canto marcato")),
    (fil("ges'' bes'' des'''", "ges'' bes'' des'''", "des'' f'' as''"),
     "bes'2( as'4)", "ges,4 <des bes>-. <f, des>-.", "Gb:2 Db:1", "s2."),
    (fil("as' c'' es''", "as' c'' es''", "as' c'' es''"),
     "ges'8( f' es' f' es' des')", "as,,4 <es, c>-. q-.", "Ab7:3", r"s2\< s4\>"),
    (fil("f' as' des''", "f' as' des''", "f' as' des''"),
     "des'2 as4", "des,4 <as, f>-. r4", "Db:3", r"s2.\!"),
    (fil("as' des'' f''", "as' des'' f''", "des'' f'' as''"),
     "f'4.( ges'8 as'4)", "f,4 <as, des>-. q-.", "Db/F:3", r"s2.\<"),
    (fil("bes' des'' ges''", "bes' des'' ges''", "des'' ges'' bes''"),
     "ges'4.( as'8 bes'4)", "bes,4 <des ges>-. q-.", "Gb/Bb:3", r"s2.\p"),
    (fil("des'' f'' as''", "as' c'' es''", "as' c'' es''"),
     "f'4( es'2)", "as,,4 <as, es>-. <c ges>-.", "Db/Ab:1 Ab7:2", r"s2.\>"),
    (fil("f' as' des'' f'' as'' des'''", "des''' as'' f'' des'' as' f'") + " r4",
     "des'2 r4", "des,4 <as, f>-. r4", "Db:3", r"s2.\pp"),
]

section("minuetto", mel="rh", rub=0.02, phr=4, leg=0.92)
for i, (r, l, h, d) in enumerate(MI_A):
    if i == 4:
        brk()
    bar(r, l, dyn=d, harm=h, ped=None)
section("minuetto-var", mel="rh", rub=0.02, phr=4, leg=0.95)
for i, (r, l, h, d) in enumerate(MI_B):
    if i in (0, 4):
        brk()
    bar(r, l, dyn=d, harm=h, tempo=[(0, 100), (2, 92)] if i == 6 else (100 if i == 7 else None))
section("minuetto-duetto", mel="rh", rub=0.025, phr=4, leg=0.92)
for i, (r, l, h, d) in enumerate(MI_C):
    if i in (0, 4):
        brk()
    bar(r, l, dyn=d, harm=h, tempo=[(0, 100), (3, 90)] if i == 6 else ([(0, 86), (2, 80)] if i == 7 else None),
        ferm=[(0, 1.2)] if i == 7 else ())
section("minuetto-liszt", mel="rh", rub=0.03, phr=4)
for i, (f, m, l, h, d) in enumerate(MI_D):
    if i in (0, 3, 6):
        brk()
    bar((f, m), l, dyn=d, harm=h, ped="2.:c" if h.count(":") == 1 else "2:c 4:c" if h.startswith("Gb:2") else "4:c 2:c",
        tempo=92 if i == 0 else ([(0, 92), (3, 80)] if i == 7 else None),
        rpre=r'\tempo "Un poco più lento" 4 = 92' if i == 0 else "")
# Codetta: plagal close, the thumb sings G flat - F under the filigree.
brk()
bar((fil("bes' des'' ges''", "bes' des'' ges''", "as' des'' f''"), "<des' ges'>2 <des' f'>4"),
    "ges,2 des4", dyn=r"s2.\ppp", harm="Gb:2 Db:1", ped="2:c 4:c", tempo=[(0, 80), (3, 70)])
bar(r"<as' des'' f''>2.\fermata", r"<des, as, f>2.\fermata", harm="Db:3", ped="2.:c",
    tempo=66, ferm=[(0, 2.2)])


# ============================================================== IV. TEMPESTA
# Liszt: the motto hammered round the cycle of major thirds (F minor, C sharp
# minor, A minor), each answered by a falling "gypsy" scale on the dominant;
# the Minuetto's tune turned into a storm; a dominant pedal; the collapse.


def ltr(a, b, n=8):
    """Left-hand octave tremolo in 16ths, n pairs."""
    return f"\\repeat tremolo {n} {{ {a}16 {b}16 }}"


def alt8(a, b, n=4):
    return " ".join([f"{a}8-> {b}"] + [f"{a}8 {b}"] * (n - 1))


TE = [  # (right hand, left hand, harmony, dynamics, pedal)
    ("r8 <c' c''>-> <f' f''>4-> <as' as''>8-> <des'' des'''>4.->", ltr("f,,", "f,"),
     "Fm:2.5 Db/F:1.5", r"s1\ff", "2:c 8:- 4.:c"),
    ("<c'' c'''>8-> <bes' bes''> <as' as''> <g' g''> <f' f''> <e' e''> <des' des''> <c' c''>", ltr("c,", "c"),
     "C7:4", "s1", "1:c"),
    ("r8 <gis gis'>-> <cis' cis''>4-> <e' e''>8-> <a' a''>4.->", ltr("cis,,", "cis,"),
     "C#m:2.5 A/C#:1.5", r"s1\ff", "2:c 8:- 4.:c"),
    ("<gis' gis''>8-> <fis' fis''> <e' e''> <dis' dis''> <cis' cis''> <bis bis'> <a a'> <gis gis'>",
     ltr("gis,,", "gis,"), "G#7:4", r"s2 s2\<", "1:c"),
    ("r8 <e' e''>-> <a' a''>4-> <c'' c'''>8-> <f'' f'''>4.->", ltr("a,,", "a,"),
     "Am:2.5 F/A:1.5", r"s1\fff", "2:c 8:- 4.:c"),
    ("<gis' gis''>8-> <f' f''> <e' e''> <d' d''> <c' c''> <b b'> <a a'> <gis gis'>",
     ltr("e,,", "e,"), "E7:4", "s1", "1:c"),
    # deceptive: E7 -> F, which turns minor and runs up in octaves
    ("<a c' f' a'>4-> <f f'>16 <g g'> <as as'> <bes bes'> <c' c''> <des' des''> <e' e''> <f' f''>"
     " <g' g''> <as' as''> <b' b''> <c'' c'''>",
     "<f,, f,>4-> f,16 g, as, bes, c des e f g as b c'", "F:1 Fm:3", r"s4\fff s2.\<", "4:c 2.:u"),
    ("<des'' f'' as'' b''>2-> <c'' f'' as'' c'''>4-> <c'' e'' g''>4->",
     "<des, des>2-> <c, c>4-> <c, c>4->", "DbGer:2 Fm/C:1 C:1", r"s1\fff", "2:c 4:c 4:c"),
    # the Minuetto in F minor, in octaves over the thunder
    ("<f' as' c'' f''>4.-> <g' g''>8 <as' c'' f'' as''>2->", ltr("f,,", "f,"),
     "Fm:4", r"s1\ff" + it("il Minuetto, in tempesta"), "1:c"),
    ("<des'' f'' bes'' des'''>2.-> <c'' f'' as'' c'''>4", ltr("bes,,", "bes,", 6) + " " + ltr("f,,", "f,", 2),
     "Bbm:3 Fm:1", "s1", "2.:c 4:c"),
    ("<bes' bes''>8 <as' as''> <g' g''> <as' as''> <g' g''> <f' f''> <e' e''>4", ltr("c,", "c"),
     "C7:4", r"s2 s2\<", "1:c"),
    ("<f' as' c'' f''>2-> <g' bes' c'' e''>2->", ltr("f,,", "f,", 4) + " " + ltr("c,,", "c,", 4),
     "Fm:2 C7:2", r"s1\fff", "2:c 2:c"),
    # dominant pedal: i6/4 against vii°7/V
    (alt8("<c'' f'' as''>", "<b' d'' f'' as''>"), ltr("c,,", "c,"),
     " ".join(["Fm/C:0.5 Bdim7/C:0.5"] * 4), r"s1\ff\<", "2:c 2:c"),
    (alt8("<f'' as'' c'''>", "<f'' as'' b'' d'''>"), ltr("c,,", "c,"),
     " ".join(["Fm/C:0.5 Bdim7/C:0.5"] * 4), "s1", "2:c 2:c"),
    # the Ballata's head over the pedal, twice, climbing
    ("<f' as' c'' f''>4-> <as' c'' f'' as''>8 <des'' f'' bes'' des'''>4.-> <c'' f'' as'' c'''>4",
     ltr("c,,", "c,"), "Fm/C:1.5 Bbm/C:1.5 Fm/C:1", r"s1\fff", "4.:c 4.:c 4:c"),
    ("<as' c'' f'' as''>4-> <c'' f'' as'' c'''>8 <f'' bes'' des''' f'''>4.-> <e'' g'' c''' e'''>4",
     ltr("c,,", "c,"), "Fm/C:1.5 Bbm/C:1.5 C:1", "s1", "4.:c 4.:c 4:c"),
    (trip("<e'' g'' bes'' des'''>", 4), " ".join([r"\tuplet 3/2 { <c,, c,>8-> q q }"] * 4),
     "C7b9:4", r"s1\fff", "1:c"),
    (xs(bm("des'''16 bes'' g'' e'' des'' bes' g' e' des' bes g e", 4), split=60) + " r4",
     "<c,, c,>1", "C7b9:3 C7:1", r"s2.\ff\> s4", "1:c"),
    (trm(16, "<e' bes'>", "g'"), "<c, c>1", "C7:4", r"s1\p\>", "1:c"),
    (trm(8, "<e' bes'>", "g'") + r" <e' g' bes'>2\fermata", r"<c, c>1\fermata", "C7:4", r"s1\pp", "1:c"),
]
TE_T = {0: 126, 6: [(0, 126), (4, 132)], 7: [(0, 120), (4, 108)], 8: 120, 11: [(0, 120), (4, 112)],
        12: 116, 16: [(0, 112), (4, 100)], 17: [(0, 96), (4, 80)], 18: [(0, 76), (4, 60)],
        19: [(0, 56), (4, 44)]}
section("tempesta", mel="rh", rub=0.0)
for i, (r, l, h, d, p) in enumerate(TE):
    if i % 2 == 0:
        brk()
    if i == 12:
        section("tempesta-pedale", mel="rh", rub=0.0)
    if i == 17:
        section("tempesta-cascata", mel="rh", rub=0.0)
    bar(r, l, dyn=d, ped=p, harm=h, tempo=TE_T.get(i),
        lpre={0: r"\ottava #-1", 6: r"\ottava #0", 8: r"\ottava #-1", 18: r"\ottava #0"}.get(i, ""),
        glob=r'\bar "||" \key f \minor \time 4/4' if i == 0 else "",
        rpre=r'\sectionLabel \markup { \concat { \bold "Tempesta" \hspace #12 } } \tempo "Allegro con fuoco" 4 = 126' if i == 0 else "",
        ferm=[(2, 1.8)] if i == 19 else ())

# ============================================================== V. RIPRESA
# Chopin again: the Ballata theme, far away, ornamented; it stops on V7.
section("ripresa-up", mel="rh", rub=0.0)
brk()
bar("c'8", "r8", glob=r"\time 6/8 \partial 8", length=Fr(1, 2),
    rpre=r'\sectionLabel \markup { \concat { \bold "Ripresa" \hspace #12 } } \tempo "Tempo I" 4. = 44', tempo=66, harm="C7:0.5")
RI = [
    (r"f'4( as'8 \acciaccatura es''8 des''4 c''8)", "f,8 c as c' as c", "Fm:3",
     r"s4.\pp" + it("come una memoria") + " s4.", "4.:c 4:c 8:c"),
    ("c''16( des'' c'' bes' as'8 g'4 f'8)", "bes,8 des' f c e bes", "Bbm C7", r"s4. s4.\<", "4.:c 4.:c"),
    ("e'4( f'8 g' as' bes')", "f,8 c as bes, des g", "Fm Gdim/Bb", r"s4.\> s4.", "4.:c 4.:c"),
    ("as'4( g'8 e'4) c'8", "c,8 g, e g, c e", "C C/G", r"s4.\! s4.", "2.:c"),
    ("f'4( as'8 des''4 c''8)", "f,8 c as c' as c", "Fm:3", r"s4.\p s4.\<", "4.:c 4:c 8:c"),
    ("f''4( es''8 des''16 es'' des'' c'' bes' c''", "des,8 as, f bes,, f, des", "Db Bbm", r"s4.\mp s4.\>", "4.:c 4.:c"),
    ("des''8 c'' bes' as'4 g'8~)", "bes,8 des g c e bes", "Gdim/Bb C7", r"s4. s4.\p", "4.:c 4.:c"),
    (r"g'4.( e'4.)\fermata", r"c8 <e bes> q c4.\fermata", "C7:3", r"s4.\pp s4.", "2.:c"),
]
section("ripresa", mel="rh", rub=0.05, phr=4)
for i, (r, l, h, d, p) in enumerate(RI):
    if i == 4:
        brk()
    bar(r, l, dyn=d, ped=p, harm=h,
        tempo=[(0, 62), (3, 54)] if i == 7 else None, ferm=[(1.5, 2.2)] if i == 7 else ())

# ============================================================== VI. APOTEOSI
# Liszt: the Minuetto in F major, grandioso. The second time its cadence is
# interrupted by D flat (the motto's b6), which falls to C: b6 - 5 in the bass.
section("apoteosi-up", mel="rh", rub=0.0)
brk()
bar("<e' g' bes' c''>4->", "<c, c>4->", glob=r'\bar "||" \key f \major \time 3/4 \partial 4', length=1,
    rpre=r'\sectionLabel \markup { \concat { \bold "Apoteosi" \hspace #12 } } \tempo "Grandioso" 4 = 60', tempo=60, harm="C7:1",
    dyn=r"s4\ff", ped="4:c")


def lw(a, b, c, d):
    return tup(6, 4, wave(a, b, c, d))


AP_R = [
    "<f' a' c'' f''>4.-> <g' g''>8 <a' c'' f'' a''>4",
    "<d'' f'' bes'' d'''>2-> <c'' f'' a'' c'''>4",
    "<bes' bes''>8 <a' a''> <g' g''> <a' a''> <g' g''> <f' f''>",
    "<f' a' c'' f''>2-> <c' c''>4",
    "<a' c'' f'' a''>4.-> <bes' bes''>8 <c'' f'' a'' c'''>4",
    "<bes' d'' f'' bes''>4.-> <c'' c'''>8 <d'' f'' bes'' d'''>4",
]
AP1 = [  # strophe one: bass octaves and chords
    (AP_R[0], "<f,, f,>4 <c f a> q", "F:3", r"s2.\fff" + it("trionfale")),
    (AP_R[1], "<bes,, bes,>4 <d f bes> <f, c f>", "Bb:2 F:1", "s2."),
    (AP_R[2], "<c, c>4 <e g bes> q", "C7:3", "s2."),
    (AP_R[3], "<f, f>4 <c f a> q", "F:3", "s2."),
    (AP_R[4], "<a,, a,>4 <c f a> q", "F/A:3", r"s2.\<"),
    (AP_R[5], "<d, d>4 <f bes> q", "Bb/D:3", r"s2.\fff"),
    ("<a' c'' f'' a''>4 <g' bes' c'' e'' g''>2->", "<c,, c,>4 <c, g, e>2", "F/C:1 C7:2", "s2."),
    ("<f' a' c'' f''>2 <e' g' bes' c''>4", "<f,, f,>4 <c f a> <c, c>", "F:2 C7:1", r"s2 s4\ff"),
]
AP2 = [  # strophe two: sweeping waves; the cadence broken by D flat
    (AP_R[0], " ".join([lw("f,,", "c,", "a,", "c")] * 3), "F:3", r"s2.\ff"),
    (AP_R[1], " ".join([lw("bes,,", "f,", "d", "f")] * 2 + [lw("f,,", "c,", "a,", "c")]), "Bb:2 F:1", "s2."),
    (AP_R[2], " ".join([lw("c,", "g,", "bes,", "e")] * 3), "C7:3", "s2."),
    (AP_R[3], " ".join([lw("f,", "c", "a", "c'")] * 2 + [lw("e,", "g,", "bes,", "c")]), "F:2 C7/E:1", r"s2.\<"),
    (AP_R[4], " ".join([lw("a,,", "f,", "c", "f")] * 3), "F/A:3", r"s2.\fff"),
    (AP_R[5], " ".join([lw("d,", "bes,", "f", "bes")] * 3), "Bb/D:3", "s2."),
    ("<f'' as'' des''' f'''>2.->", "<des, des>2.->", "Db:3", r"s2.\sffz"),
    ("<f'' a'' c''' f'''>4 <e'' g'' bes'' e'''>2->", lw("c,", "f,", "a,", "c") + " "
     + " ".join([lw("c,", "g,", "bes,", "e")] * 2), "F/C:1 C7:2", "s2."),
    ("<f'' a'' f'''>2.->", "<f,, c, f,>2.->", "F:3", r"s2.\fff"),
]
AP_PED1 = ["2.:c", "2:c 4:c", "2.:c", "2.:c", "2.:c", "2.:c", "4:c 2:c", "2:c 4:c"]
AP_PED2 = ["2.:c", "2:c 4:c", "2.:c", "2:c 4:c", "2.:c", "2.:c", "2.:c", "4:c 2:c", "2.:c"]
section("apoteosi", mel="rh", rub=0.02, phr=4)
for i, (r, l, h, d) in enumerate(AP1):
    if i == 4:
        brk()
    bar(r, l, dyn=d, harm=h, ped=AP_PED1[i],
        tempo=[(0, 60), (3, 54)] if i == 7 else (60 if i == 0 else None))
section("apoteosi-ii", mel="rh", rub=0.02, phr=4)
for i, (r, l, h, d) in enumerate(AP2):
    if i in (0, 4, 6):
        brk()
    bar(r, l, dyn=d, harm=h, ped=AP_PED2[i],
        tempo={0: 58, 5: [(0, 58), (3, 52)], 6: 48, 7: [(0, 50), (3, 44)], 8: 44}.get(i),
        ferm=[(0, 1.4)] if i == 6 else ())

# ============================================================== VII. CODA
# Chopin's presto: waves over I-IV-V; the motto in the major on I, IV and V;
# a cadence, a silence; the motto in the minor once more, far away; then the
# last word, F major.
CO = [
    (wave("c''", "f''", "a''", "c'''") + " " + wave("f''", "a''", "c'''", "f'''"),
     "<f,, f,>8 <a c'>-. q-. <c, c>8 <a c'>-. q-.", "F:3", r"s4.\f s4.\<"),
    (wave("d''", "f''", "bes''", "d'''") + " " + wave("e''", "g''", "bes''", "c'''"),
     "<bes,, bes,>8 <bes d'>-. q-. <c, c>8 <bes e'>-. q-.", "Bb C7", "s4. s4."),
    (wave("a''", "c'''", "f'''", "a'''") + " " + wave("f''", "a''", "c'''", "f'''"),
     "<f,, f,>8 <a c'>-. q-. <c, c>8 <a c'>-. q-.", "F:3", r"s4.\ff s4."),
    (wave("bes''", "d'''", "f'''", "bes'''") + " " + wave("e''", "g''", "bes''", "c'''"),
     "<bes,, bes,>8 <d' f'>-. q-. <c, c>8 <bes e'>-. q-.", "Bb C7", r"s4. s4.\<"),
    ("<a' c'' f''>4-> <c'' f'' a''>8 <d'' f'' bes'' d'''>4-> <c'' f'' a'' c'''>8",
     "<f, f>4-> q8 q4 q8", "F:1.5 Bb/F:1 F:0.5", r"s4.\fff s4."),
    ("<d'' f'' bes''>4-> <f'' bes'' d'''>8 <g'' bes'' d''' g'''>4-> <f'' bes'' d''' f'''>8",
     "<bes,, bes,>4-> q8 q4 q8", "Bb:1.5 Gm/Bb:1 Bb:0.5", "s4. s4."),
    ("<e'' g'' c'''>4-> <g'' c''' e'''>8 <a'' c''' f''' a'''>4-> <g'' c''' e''' g'''>8",
     "<c, c>4-> q8 q4 q8", "C:1.5 F/C:1 C:0.5", "s4. s4."),
    ("<f'' a'' c''' f'''>4.-> <e'' g'' bes'' e'''>4.->", "<c, c>4.-> q4.->", "F/C C7", "s4. s4."),
    (r"<f'' a'' f'''>4.-> r4.\fermata", r"<f,, c, f,>4.-> r4.\fermata", "F:3", "s4. s4."),
]
section("coda", mel="rh", rub=0.0)
for i, (r, l, h, d) in enumerate(CO):
    if i in (0, 4, 7):
        brk()
    bar(r, l, dyn=d, harm=h, ped="4.:c 4.:c" if i < 8 else "4.:c 4.:u",
        tempo={0: 150, 6: [(0, 150), (3, 138)], 7: [(0, 126), (3, 112)], 8: 104}.get(i),
        glob=r"\time 6/8" if i == 0 else "",
        rpre=(r'\sectionLabel \markup { \concat { \bold "Coda" \hspace #12 } } \tempo "Presto con fuoco" 4. = 100' if i == 0 else
              {2: r"\ottava #1", 4: r"\ottava #0", 5: r"\ottava #1"}.get(i, "")),
        ferm=[(1.5, 1.6)] if i == 8 else ())
section("coda-adagio", mel="rh", rub=0.0)
brk()
bar("c'2( f'4. as'8", "<c, c>2 <f, f>4. <as, as>8", dyn=r"s1\pp" + it("come prima, lontano"),
    glob=r"\time 4/4", rpre=r'\ottava #0 \tempo "Adagio" 4 = 44', tempo=44, ped="1:c", harm="Fm:4")
bar("des''2 c''2)", "<des des'>2 <c c'>2", ped="2:c 2:c", harm="Db:2 C5:2",
    tempo=[(0, 44), (2, 40)])
bar(r"<bes' des'' f''>2( <a' c'' f''>2)\fermata", r"<f,, f,>2 <f,, c, f,>2\fermata",
    dyn=r"s2\pp s2\ppp", ped="2:c 2:c", harm="Bbm/F:2 F:2", tempo=38, ferm=[(2, 2.6)])
section("coda-finale", mel="rh", rub=0.0)
bar(xs("f,,32 c, f, a, c f a c' f' a' c'' f'' a'' c''' f''' a'''") + r" <f'' a'' c''' f'''>4-> q4\fermata",
    r"s2 <f,, c, f,>4-> q4\fermata", dyn=r"s2\ff\< s4\fff s4", ped="2:c 4:c 4:c",
    rpre=r'\tempo "Allegro assai"', tempo=[(0, 100), (2, 84)], ferm=[(3, 3.0)], harm="F:4",
    lpre="")

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
