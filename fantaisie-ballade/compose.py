#!/usr/bin/env python3
"""Fantaisie-Ballade in D minor - the composition.

Every bar is written out here: right hand, left hand, dynamics, pedalling and
the tempo plan used for the recorded performance.  Running the script writes

  <out>/fantaisie_ballade.ly   LilyPond source (engraved score + MIDI score)
  <out>/score_meta.json        bar map, dynamics, pedal and tempo data for perform.py

Pitches are LilyPond absolute pitches: c' = middle C, a' = A440.
"""
import json
import re
import sys
from fractions import Fraction as Fr
from pathlib import Path

OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).with_name("build")

# --------------------------------------------------------------------- helpers
STEP = {"c": 0, "d": 2, "e": 4, "f": 5, "g": 7, "a": 9, "b": 11}


def midi(p):
    m = re.fullmatch(r"([a-g])((?:is|es|s)*)([',]*)", p)
    if not m:
        raise ValueError(p)
    alter = sum(1 if t == "is" else -1 for t in re.findall(r"is|es|s", m.group(2)))
    octave = m.group(3).count("'") - m.group(3).count(",")
    return 48 + STEP[m.group(1)] + alter + 12 * octave


def xs(notes, dur="16", home="LH"):
    """One line that travels between the staves (middle C and up sits on the upper staff)."""
    out, cur = [], home
    for p in notes.split():
        st = "RH" if midi(p) >= 60 else "LH"
        if st != cur:
            out.append(f'\\change Staff = "{st}"')
            cur = st
        out.append(p + dur)
    if cur != home:
        out.append(f'\\change Staff = "{home}"')
    return " ".join(out)


def wave(a, b, c, d):
    """Six sixteenths rising to the top chord tone and falling back."""
    return f"{a}16 {b} {c} {d} {c} {b}"


def trem(low, dyad):
    """Six sixteenths shuddering between a single note and a dyad above it."""
    return f"{low}16 {dyad} {low} {dyad} {low} {dyad}"


def trill(layout, perform):
    """Printed ornament for the score, written-out realisation for the MIDI."""
    return f"\\tag #'layout {{ {layout} }} \\tag #'midi {{ {perform} }}"


def dur_q(s):
    m = re.fullmatch(r"(\d+)(\.*)(?:\*(\d+)(?:/(\d+))?)?", s)
    if not m:
        raise ValueError(s)
    base = Fr(4, int(m.group(1)))
    q = base * (2 - Fr(1, 2 ** len(m.group(2))))
    if m.group(3):
        q *= Fr(int(m.group(3)), int(m.group(4) or 1))
    return q


def spacer(length):
    table = {Fr(4): "1", Fr(3): "2.", Fr(2): "2", Fr(3, 2): "4.", Fr(1): "4", Fr(1, 2): "8"}
    return "s" + table.get(length, f"4*{length}")


# ------------------------------------------------------------------ bar store
BARS = []
STATE = {"ts": Fr(4), "bpm": 60.0, "sec": "", "mel": "rh", "rub": 0.0, "phr": 4, "leg": 1.0}
PEDAL_DOWN = [False]


def section(name, mel="rh", rub=0.03, phr=4, leg=1.0):
    STATE.update(sec=name, mel=mel, rub=rub, phr=phr, leg=leg)


def bar(rh, lh, dyn=None, ped=None, glob="", rpre="", lpre="", length=None,
        tempo=None, ferm=(), roll=False):
    m = re.search(r"\\time (\d+)/(\d+)", glob)
    if m:
        STATE["ts"] = Fr(4 * int(m.group(1)), int(m.group(2)))
    length = Fr(length) if length is not None else STATE["ts"]
    if tempo is None:
        tempo = [(0, STATE["bpm"])]
    elif isinstance(tempo, (int, float)):
        tempo = [(0, float(tempo))]
    STATE["bpm"] = tempo[-1][1]

    # pedal: tokens "dur:c" (press / change), "dur:u" (lift), "dur" (nothing)
    ped_ly, ped_ev, t = [], [], Fr(0)
    for tok in (ped or spacer(length)[1:]).split():
        d, _, act = tok.partition(":")
        cmd = ""
        if act == "c":
            cmd = "\\sustainOff\\sustainOn" if PEDAL_DOWN[0] else "\\sustainOn"
            if PEDAL_DOWN[0]:
                ped_ev.append((t, "off"))
            ped_ev.append((t, "on"))
            PEDAL_DOWN[0] = True
        elif act == "u" and PEDAL_DOWN[0]:
            cmd = "\\sustainOff"
            ped_ev.append((t, "off"))
            PEDAL_DOWN[0] = False
        ped_ly.append(f"s{d}{cmd}")
        t += dur_q(d)
    assert t == length, f"pedal length {t} != {length} in bar {len(BARS)}"

    dyn = dyn or spacer(length)
    dyn_ev, t = [], Fr(0)
    for tok in dyn.split():
        m = re.fullmatch(r"s([\d.*/]+)((?:\\[A-Za-z!<>]+)*)", tok)
        assert m, f"bad dynamics token {tok!r} in bar {len(BARS)}"
        for cmd in re.findall(r"\\([A-Za-z!<>]+)", m.group(2)):
            dyn_ev.append((t, cmd))
        t += dur_q(m.group(1))
    assert t == length, f"dynamics length {t} != {length} in bar {len(BARS)}"

    BARS.append(dict(rh=rh, lh=lh, dyn=dyn, ped=" ".join(ped_ly), glob=glob, rpre=rpre,
                     lpre=lpre, length=length, tempo=tempo, ferm=list(ferm),
                     dyn_ev=dyn_ev, ped_ev=ped_ev, sec=STATE["sec"], mel=STATE["mel"],
                     rub=STATE["rub"], phr=STATE["phr"], leg=STATE["leg"], roll=roll))


def it(text):
    return f'\\markup {{ \\italic "{text}" }}'


# =============================================================================
# I. INTRODUZIONE  (Grave - Andante misterioso - Cadenza)
# =============================================================================
section("motto", rub=0.0, phr=2)
bar(r"<a a'>4->", r"<a,, a,>4->", length=1, glob=r"\key d \minor \time 4/4 \partial 4",
    rpre=r'\tempo "Grave" 4 = 44', dyn=r"s4\ff", ped="4:c", tempo=42)
bar(r"<f' f''>2.-> <e' e''>4", r"<f, f>2.-> <e, e>4", ped="2.:c 4:c",
    tempo=[(0, 42), (3, 40)])
bar(r"<d' d''>4-> <e' g' cis''>2\fermata <bes bes'>4->",
    r"<d, d>4-> <cis, bes,>2\fermata <bes,, bes,>4->",
    dyn=r"s4 s2\p s4\ff", ped="4:c 2:c 4:c", tempo=[(0, 40), (3, 44)], ferm=[(1, 1.4)])
bar(r"<ges' ges''>2.-> <f' f''>4", r"<ges, ges>2.-> <f, f>4", ped="2.:c 4:c",
    tempo=[(0, 44), (3, 40)])
bar(r"<es' es''>4-> <e' g' bes' cis''>2\fermata r4", r"<es, es>4-> <a,,, a,,>2\fermata r4",
    dyn=r"s4 s2\sfz s4", ped="4:c 2:c 4:u", tempo=[(0, 38)], ferm=[(1, 2.4), (3, 0.6)])

section("arpeggios", mel="lh", rub=0.025, phr=2)
ARP = ["d, a, d f a d' f' a' d'' a' f' d' a f d a,",
       "cis, a, e g cis' e' g' a' e'' cis'' a' g' e' cis' g e",
       "c, a, d f a c' d' a' f'' d'' a' f' d' c' a f",
       "b,, g, d g b d' g' b' g'' d'' b' g' d' b g d",
       "bes,, f, d gis d' f' gis' d'' gis'' f'' d'' gis' f' d' gis d",
       "a,, a, d f a d' f' a' cis'' e'' g'' a'' g'' e'' cis'' a'"]
ARP_DYN = [r"s1\pp", None, r"s1\<", r"s1\mp", r"s2\< s2\mf", r"s2\> s2\p"]
ARP_TEMPO = [[(0, 56)], [(0, 57)], [(0, 58)], [(0, 60)], [(0, 60), (4, 56)], [(0, 55), (4, 44)]]
for k, notes in enumerate(ARP):
    bar("s1", xs(notes), dyn=ARP_DYN[k], ped="2:c 2:c" if k == 5 else "1:c",
        rpre=r'\tempo "Andante misterioso" 4 = 58' if k == 0 else "",
        lpre=r"\stemNeutral" if k == 0 else "", tempo=ARP_TEMPO[k])

section("cadenza", mel="rh", rub=0.0)
bar(r"\cadenzaOn \magnifyMusic 0.7 { e''4^" + it("a piacere, leggierissimo") +
    r" f''16[ e'' dis'' e''] g''16[ bes'' \ottava #1 cis''' e'''] g'''8\fermata"
    r" f'''32[ e''' d''' cis''' \ottava #0 bes'' a'' g'' f''] e''32[ d'' cis'' bes' a' g' f' e']"
    r" f'16[ g' a' bes'] } a'4\fermata \cadenzaOff \bar " + '"||"',
    r"<a,, e, a,>1*15/8\fermata", length=Fr(15, 2), dyn=r"s4\p s4*13/2",
    ped="4:c 4 4 8 4:c 4 4 4",
    tempo=[(0, 54), (1, 60), (2, 92), (3, 96), (3.5, 76), (5.5, 60), (6.5, 36)],
    ferm=[(3, 0.8), (6.5, 1.6)])

# =============================================================================
# II. BALLATA  (Andante con moto, 6/8) - the Chopin theme, then its variation
# =============================================================================
section("ballata", rub=0.045, phr=4)
bar(r"r4. r4 a'8^" + it("cantabile, con dolore") + "(", "d,8 a, f a f a,",
    glob=r"\time 6/8", rpre=r'\tempo "Andante con moto" 4. = 50',
    dyn=r"s4.\pp s4 s8\p", ped="2.:c", tempo=[(0, 72), (2.5, 74)])
bar(r"f''4. e''8 d'') a'8(", "d,8 a, f a f a,", ped="2.:c", tempo=75)
bar(r"g''4. f''8 e'') a'8(", "g,8 d bes e' bes d", dyn=r"s4. s4.\<", ped="2.:c")
bar(r"a''4. g''8 f'' e''", "a,8 f d' a, e cis'", dyn=r"s4.\! s4.\>", ped="4.:c 4.:c")
bar(r"d''4 cis''8 e''4) a'8(", "a,8 e g cis' g e", dyn=r"s4. s4 s8\!", ped="2.:c",
    tempo=[(0, 74), (3, 70)])
bar(r"f''4. e''8 d'') a'8(", "d,8 a, f c, a, fis", ped="4.:c 4.:c", tempo=75)
bar(r"g''4. f''8 e'') a'8(", "bes,,8 g, d g d g,", dyn=r"s4.\< s4.", ped="2.:c")
bar(r"bes''4.-- a''8 g'' e''", "g,8 bes es' a, g cis'", dyn=r"s4.\mf s4.\>",
    ped="4.:c 4.:c", tempo=[(0, 72), (3, 66)], ferm=[(0, 0.35)])
bar(r"d''4.) r4 a'8(", "d,8 a, f a d' a", dyn=r"s4. s4 s8\p", ped="2.:c",
    tempo=[(0, 68), (3, 74)])

# the consoling middle phrase: B-flat major, turning through E-flat (= the
# Neapolitan of D minor) back to the dominant
section("ballata_b", rub=0.05, phr=4)
bar(r"f''4.^" + it("sotto voce") + r" d''8 es'' f''", "bes,,8 f, d f d f,", dyn=r"s2.\pp",
    ped="2.:c", rpre=r"\tempo \markup \italic { meno mosso }", tempo=70)
bar(r"g''4. f''8 es'' d'')", "g,,8 d, f c, g, es", ped="4.:c 4.:c")
bar(r"c''4.( d''8 es'' c''", "f,,8 c, es a es c,", ped="2.:c")
bar(r"d''4.) r4 f'8(", "bes,,8 f, d as d f,", ped="4.:c 4.:c", tempo=[(0, 70), (3, 64)])
bar(r"es''4. g''8 f'' es''", "es,8 bes, g bes g bes,", dyn=r"s4.\< s4.", ped="2.:c", tempo=70)
bar(r"e''4. f''8 e'' cis''", "a,,8 e, g cis' bes g", dyn=r"s4.\mp s4.\>", ped="2.:c",
    tempo=[(0, 68), (3, 66)])
bar(r"d''4. f''8 e'' d''", "a,,8 d f a f d", ped="2.:c", tempo=66)
bar(r"cis''4.) r4 a'8(", "a,,8 e, g cis' g e,", dyn=r"s4. s4 s8\p", ped="2.:c",
    tempo=[(0, 64), (3, 72)])

section("ballata2", rub=0.05, phr=4)
bar(r"f''4. e''16 f'' e'' d'') a'8(", "d,16 a, f a d' a f d a, d f a", ped="2.:c",
    rpre=r"\tempo \markup \italic { poco più mosso }", tempo=78)
bar(r"g''4. f''16 g'' f'' e'') a'8(", "g,16 d bes e' bes d g, d bes e' bes d",
    dyn=r"s4.\< s4.", ped="2.:c")
bar(r"a''4. bes''16 a'' g'' f'' e''8", "a,16 d f a d' a a, e g cis' e' cis'",
    ped="4.:c 4.:c", tempo=[(0, 78), (3, 74)])
bar(r"d''4 cis''8) e''16( f'' e'' d'' cis'' <a a'>", "a,16 e g cis' e' cis' a,, e, a, cis e g",
    ped="4.:c 4.:c", tempo=[(0, 72), (1.5, 76), (3, 80)])
bar(r"<f' f''>4. <e' e''>8 <d' d''>) <a a'>(", "d,16 a, d f a d' c, a, d fis d a,",
    dyn=r"s4.\f s4.", ped="4.:c 4.:c", tempo=80)
bar(r"<g' g''>4. <f' f''>8 <e' e''>) <a a'>(", "bes,,16 g, d g bes d' bes,, g, d g d g,",
    dyn=r"s4.\< s4.", ped="2.:c", tempo=[(0, 80), (3, 76)])
bar(r"<bes' bes''>4.-> <a' a''>8 <g' g''> <e' e''>", "g,16 es bes es' g' es' a,16 e g cis' g e",
    dyn=r"s4.\ff s4.", ped="4.:c 4.:c", tempo=[(0, 70), (1.5, 66), (3, 70)],
    ferm=[(0, 0.45)])
bar(r"<d' d''>4. <c' c''>8 <bes bes'> <a a'>)", "bes,,16 f, d f bes f bes,, f, d f d f,",
    dyn=r"s4.\> s4.", ped="2.:c", tempo=[(0, 72), (3, 66)])

section("transition", rub=0.02, phr=2)
bar(r"g'4.( f'8 e' d')", "c,16 g, bes, d f bes c, g, bes, e g bes",
    dyn=r"s4.\p s4.\>", ped="4.:c 4.:c", rpre=r"\tempo \markup \italic { calando }",
    tempo=[(0, 66), (3, 56)])
bar(r"r4. <e' g' bes'>4\fermata \tempo " + '"Allegretto grazioso" 4 = 92' +
    r" c''8^" + it("dolce"), r"c,16 g, bes, e g bes c'4\fermata r8",
    dyn=r"s4. s4\! s8\p", ped="4.:c 4 8:u",
    tempo=[(0, 54), (1.5, 48), (2.5, 48), (2.5, 88)], ferm=[(1.5, 1.4)])

# =============================================================================
# III. ALLEGRETTO GRAZIOSO  (2/4, F major) - the Mozart theme
# =============================================================================
section("mozart", rub=0.02, phr=4, leg=0.9)
TRILL_C = trill(r"c'''8( a'' g''8.\trill f''32 g'')",
                r"c'''8( a'' a''32 g'' a'' g'' a'' g'' f'' g'')")
F_ALB = "f16 c' a c' f c' a c'"
bar(r"a''4( g''8 f'')", F_ALB, glob=r"\time 2/4 \key f \major", ped="4:c 4:u", tempo=92)
bar(r"e''8.( f''16 g''8 bes'')", "e16 c' bes c' e c' bes c'", dyn=r"s4\< s4\>", ped="4:c 4:u")
bar(r"a''8( c''' f'' a'')", F_ALB, dyn=r"s4\! s4", ped="4:c 4:u")
bar(r"g''4 r8 c''8", "c16 g e g c g e g", ped="4:c 4:u", tempo=[(0, 92), (2, 88)])
bar(r"a''4( g''8 f'')", F_ALB, ped="4:c 4:u", tempo=92)
bar(r"d'''4( c'''8 bes'')", "d16 bes f bes d bes f bes", dyn=r"s4\< s4", ped="4:c 4:u")
bar(TRILL_C, "c16 a f a c bes g bes", dyn=r"s4\mf s4\>", ped="4:c 4:c",
    tempo=[(0, 90), (2, 84)])
bar(r"f''4 r8 c''8", "f16 c' a c' f8 r8", dyn=r"s4\p s4", ped="4:c 4:u", tempo=90)
bar(r"e''16( f'' g'' a'' bes''8) g''", "c16 g bes g c g bes g", dyn=r"s2\<", ped="2:c",
    tempo=92)
bar(r"a''16( g'' f'' e'' f''8) c''", "c16 a f a c a f a", ped="2:c")
bar(r"d''16( e'' f'' g'' a''8) bes''", "c16 g bes g c g bes g", ped="2:c")
bar(r"c'''16( bes'' a'' g'' f'' e'' d'' c'')", "c16 g bes g c g bes g",
    dyn=r"s4\mf s4\>", ped="2:c", tempo=[(0, 92), (2, 84)])
bar(r"a''16( g'' f'' g'' a'' bes'' c''' a'')", F_ALB, dyn=r"s2\p", ped="4:c 4:u", tempo=94)
bar(r"g''16( f'' e'' f'' g'' a'' bes'' g'')", "e16 c' bes c' e c' bes c'", ped="4:c 4:u")
bar(r"a''16( c''' f''' c''' a'' f'' c'' f'')", F_ALB, dyn=r"s4\< s4\>", ped="4:c 4:u")
bar(r"g''16( a'' g'' fis'' g''8) r16 c''", "c16 g e g c g e g", dyn=r"s4\! s4", ped="4:c 4:u",
    tempo=[(0, 94), (2, 88)])
bar(r"a''16( bes'' a'' gis'' a''8) g''16( f'')", F_ALB, ped="4:c 4:u", tempo=94)
bar(r"e'''8( d''' c''' bes'')", "d16 bes f bes d bes f bes", dyn=r"s2\<", ped="4:c 4:u")
bar(TRILL_C, "c16 a f a c bes g bes", dyn=r"s4\f s4\>", ped="4:c 4:c",
    tempo=[(0, 90), (2, 80)])
bar(r"f''4 r8 a'8", "f16 c' a c' f8 r8", dyn=r"s4\p s4", ped="4:c 4:u", tempo=[(0, 86), (2, 96)])

section("minore", rub=0.015, phr=2, leg=0.95)
MURKY = "{0}16 {1} {0} {1} {0} {1} {0} {1}"
bar(r"f''4( e''8 d'')", MURKY.format("d,", "d"), glob=r"\key d \minor",
    rpre=r'\tempo "Minore. Poco agitato"', dyn=r"s2\f", ped="4:c 4:c", tempo=98)
bar(r"cis''8.( d''16 e''8 g'')", MURKY.format("cis,", "cis"), ped="4:c 4:c", tempo=100)
bar(r"f''8( a'' d'' f'')", MURKY.format("d,", "d"), dyn=r"s2\<", ped="4:c 4:c", tempo=102)
bar(r"e''4 r8 <a a'>8", MURKY.format("a,,", "a,"), ped="4:c 4:c", tempo=104)
bar(r"<f' f''>4( <e' e''>8 <d' d''>)", MURKY.format("bes,,", "bes,"), dyn=r"s2\ff",
    ped="4:c 4:c", tempo=106)
bar(r"<g' g''>8.( <f' f''>16 <e' e''>8 <cis' cis''>)", MURKY.format("g,,", "g,"),
    ped="4:c 4:c", tempo=[(0, 106), (2, 98)])
bar(r"<cis'' e'' g'' a''>4-> r4", r"<a,, a,>4-> r4", dyn=r"s4\sfz s4", ped="4:c 4:u",
    tempo=90, ferm=[(1, 0.9)])

# =============================================================================
# IV. TEMPESTA  (Allegro agitato, 6/8) - the Liszt storm
# =============================================================================
section("storm", mel="lh", rub=0.02, phr=2, leg=1.0)
DM, GM6, A7a, A7b = ("a'", "d''", "f''", "a''"), ("bes'", "d''", "e''", "g''"), \
    ("a'", "cis''", "e''", "g''"), ("g'", "cis''", "e''", "a''")
bar(wave(*DM) + " " + wave(*DM), r"r4. r4 <a,, a,>8",
    glob=r"\time 6/8", rpre=r'\tempo "Allegro agitato e tempestoso" 4. = 84',
    dyn=r"s4.\pp\< s4 s8\f", ped="4.:c 4.:c", tempo=[(0, 118), (3, 126)])
bar(wave(*DM) + " " + wave(*DM), r"<f, f>4.-> <e, e>8 <d, d> <a,, a,>", ped="4.:c 4.:c",
    tempo=126)
bar(wave(*GM6) + " " + wave(*GM6), r"<g, g>4.-> <f, f>8 <e, e> <a,, a,>", ped="4.:c 4.:c")
bar(wave(*DM) + " " + wave(*A7a), r"<a, a>4.-> <g, g>8 <f, f> <e, e>", ped="4.:c 4.:c")
bar(wave(*A7a) + " " + wave(*A7b), r"<d, d>4 <cis, cis>8 <e, e>4 <a,, a,>8", ped="4.:c 4.:c",
    tempo=[(0, 126), (3, 122)])
bar(trem("a'", "<d'' f''>") + " " + trem("a'", "<d'' f''>"),
    r"<f, f>4.-> <e, e>8 <d, d> <a,, a,>", dyn=r"s2.\ff", ped="4.:c 4.:c", tempo=126)
bar(trem("bes'", "<d'' g''>") + " " + trem("g'", "<bes' e''>"),
    r"<g, g>4.-> <f, f>8 <e, e> <a,, a,>", ped="4.:c 4.:c")
bar(trem("g'", "<cis'' e''>") + " " + trem("a'", "<cis'' g''>"),
    r"<bes, bes>4.-> <a, a>8 <g, g> <e, e>", ped="4.:c 4.:c", tempo=[(0, 124), (3, 120)])
bar(trem("a'", "<d'' f''>") + " " + trem("bes'", "<c'' e''>"), r"<d, d>4.-> r8 r8 <c, c>8",
    dyn=r"s4. s4.\<", ped="4.:c 4.:c", tempo=[(0, 124), (3, 128)])
bar(wave("as'", "c''", "f''", "as''") + " " + wave("g'", "bes'", "des''", "es''"),
    r"<as, as>4.-> <g, g>8 <f, f> <es, es>", ped="4.:c 4.:c", tempo=128)
bar(wave("gis'", "b'", "dis''", "gis''") + " " + wave("ais'", "cis''", "e''", "fis''"),
    r"<b,, b,>4.-> <ais,, ais,>8 <gis,, gis,> <fis,, fis,>", ped="4.:c 4.:c", tempo=130)
bar(wave("b'", "d''", "fis''", "b''") + " " + wave(*A7a),
    r"<d, d>4.-> <cis, cis>8 <b,, b,> <a,, a,>", dyn=r"s4. s4 s8\fff", ped="4.:c 4.:c",
    tempo=[(0, 130), (3, 126)])

section("storm2", mel="rh", rub=0.02, phr=2)
bar(r"<f' f''>4.-> <e' e''>8 <d' d''> <c' c''>", "d,16 a, d f d a, c, g, bes, e bes, g,",
    ped="4.:c 4.:c", tempo=128)
bar(r"<as' as''>4.-> <g' g''>8 <f' f''> <es' es''>", "f,16 c f as f c es, bes, des g des bes,",
    ped="4.:c 4.:c", tempo=130)
bar(r"<b' b''>4.-> <ais' ais''>8 <gis' gis''> <fis' fis''>",
    "gis,16 dis gis b gis dis fis,16 cis e ais e cis", ped="4.:c 4.:c", tempo=132)
bar(r"<d'' d'''>4.-> <cis'' cis'''>8 <b' b''> <a' a''>",
    "b,,16 fis, b, d b, fis, a,,16 e, g, cis g, e,", ped="4.:c 4.:c", tempo=[(0, 132), (3, 126)])

section("pedal", mel="rh", rub=0.0, phr=2)
TREM = "a,,16 a, a,, a, a,, a, a,, a, a,, a, a,, a,"
PED_CHORDS = [("<g' a' cis'' e''>", "<f' a' d'' f''>"),
              ("<a' cis'' e'' g''>", "<a' d'' f'' a''>"),
              ("<cis'' e'' g'' bes''>", "<d'' f'' gis'' b''>"),
              ("<dis'' fis'' a'' c'''>", "<e'' g'' a'' cis'''>")]
for k, (c1, c2) in enumerate(PED_CHORDS):
    bar(f"{c1}8-> q q {c2}8-> q q", TREM, dyn=r"s2.\ff\<" if k == 0 else None,
        ped="4.:c 4.:c", tempo=[(0, 128 - 3 * k)])
bar(r"<d'' f'' a'' d'''>4.-> <cis'' e'' g'' bes'' cis'''>4.->", TREM, dyn=r"s2.\fff",
    ped="4.:c 4.:c", tempo=[(0, 112), (3, 108)])
bar(r"\ottava #1 bes'''16 g''' e''' cis''' \ottava #0 bes'' g'' e'' cis'' bes' g' e' cis'",
    r"\clef treble bes''16 g'' e'' cis'' bes' g' e' cis' \clef bass bes g e cis",
    ped="4.:c 4.:c", tempo=[(0, 116), (3, 112)])
bar(r"r2 <cis' e' g' bes' cis''>4\fermata",
    r"bes,16 g, e, cis, bes,, g,, e,, cis,, <a,,, a,,>4\fermata",
    dyn=r"s2 s4\sfz", ped="2:c 4:c", tempo=[(0, 108), (2, 84)], ferm=[(2, 2.0)])

# =============================================================================
# V. APOTEOSI  (Grandioso, D major) - the ballade theme transfigured
# =============================================================================
section("apotheosis", mel="rh", rub=0.03, phr=4)
bar(r"<a a'>8->", r"<a,, a,>8->", length=Fr(1, 2), glob=r"\key d \major \partial 8",
    rpre=r'\tempo "Grandioso" 4. = 44', dyn=r"s8\ff", ped="8:c", tempo=64)
D_HARP = "d,,16 a,, d, a, d fis"
bar(r"<fis' a' d'' fis''>4. <g' cis'' e''>8 <fis' a' d''> <d' fis' a'>", f"{D_HARP} {D_HARP}",
    ped="4.:c 4.:c", tempo=66)
bar(r"<g' b' e'' g''>4. <a' d'' fis''>8 <g' b' e''> <e' a'>",
    "g,,16 d, g, b, e g g,,16 d, g, b, e g", ped="2.:c")
bar(r"<a' d'' fis'' a''>4. <a' cis'' e'' g''>8 <a' d'' fis''> <g' cis'' e''>",
    "a,,16 e, a, d fis a a,,16 e, a, cis e g", ped="4.:c 4.:c")
bar(r"<g' a' d''>4 <g' a' cis''>8 <g' cis'' e''>4 <cis' e' a'>8",
    "a,,16 e, a, cis e g a,,16 e, g, cis e a", ped="2.:c", tempo=[(0, 66), (3, 62)])
bar(r"<fis' a' d'' fis''>4. <fis' c'' e''>8 <fis' a' c'' d''> <c' fis' a'>",
    f"{D_HARP} c,16 a, d fis a fis", dyn=r"s4. s4.\<", ped="4.:c 4.:c", tempo=66)
bar(r"<g' b' d'' g''>4. <b' d'' fis''>8 <g' b' e''> <a a'>",
    "b,,16 g, d g b d' b,, g, d g d g,", ped="2.:c", tempo=[(0, 66), (3, 60)])
bar(r"<bes' d'' f'' bes''>4.-> <cis'' e'' g'' a''>8 <cis'' e'' g''> <g' cis'' e''>",
    "bes,,16 f, bes, d f bes a,,16 e, a, cis e g", dyn=r"s4.\fff s4.", ped="4.:c 4.:c",
    tempo=[(0, 58), (1.5, 60), (3, 62)], ferm=[(0, 0.5)])
bar(r"<d' fis' a' d''>4. <e' e''>8 <fis' fis''> <g' g''>", f"{D_HARP} {D_HARP}",
    dyn=r"s4.\ff s4.\<", ped="2.:c", tempo=[(0, 64), (3, 60)])
bar(r"<b' d'' g'' b''>4. <b' d'' g'' a''>4.", "g,,16 d, g, b, d g g,,16 d, g, b, d g",
    rpre=r"\tempo \markup \italic { largamente }", ped="2.:c", tempo=58)
bar(r"<bes' d'' g'' bes''>4. <bes' d'' g'' a''>4.", "bes,,16 g, d g bes d' bes,, g, d g bes d'",
    ped="2.:c", tempo=56)
bar(r"<a' d'' fis'' a''>4. <a' cis'' e'' g''>8 <a' d'' fis''> <g' cis'' e''>",
    "a,,16 e, a, d fis a a,,16 e, a, cis e g", dyn=r"s4.\fff s4.", ped="4.:c 4.:c",
    tempo=[(0, 54), (3, 44)])
bar(r"<d' fis' a' d''>2.\arpeggio\fermata", r"<d,, a,, d,>2.\arpeggio\fermata",
    ped="2.:c", tempo=44, ferm=[(0, 2.2)], roll=True)

# =============================================================================
# VI. CODA  (a memory of the Mozart theme - Presto con fuoco - the motto in major)
# =============================================================================
section("ricordo", rub=0.04, phr=4, leg=0.95)
bar(r"a'8^" + it("dolcissimo"), "r8", length=Fr(1, 2), glob=r"\time 2/4 \partial 8",
    rpre=r'\tempo "Andantino, come un ricordo" 4 = 72', dyn=r"s8\pp", ped="8:u",
    tempo=66)
bar(r"fis''4( e''8 d'')", "d16 a fis a d a fis a", ped="4:c 4:c", tempo=70)
bar(r"cis''8.( d''16 e''8 g'')", "cis16 a g a cis a g a", ped="4:c 4:c")
bar(r"fis''8( a'' d'' fis'')", "d16 a fis a d a fis a", ped="4:c 4:c")
bar(r"e''4 r8 a'8", "a,16 e cis e a, e cis e", ped="4:c 4:c", tempo=[(0, 70), (2, 64)])
bar(r"fis''4( e''8 d'')", "d16 a fis a d a fis a", dyn=r"s2\<", ped="4:c 4:c", tempo=70)
bar(r"b''4( a''8 g'')", "b,16 g d g b, g d g", dyn=r"s4\> s4", ped="4:c 4:c",
    tempo=[(0, 68), (2, 62)])
bar(trill(r"a''8( fis'' e''8.\trill d''32 e'')",
          r"a''8( fis'' fis''32 e'' fis'' e'' fis'' e'' d'' e'')"),
    "a,16 fis d fis a, g e g", ped="4:c 4:c", tempo=[(0, 60), (2, 50)])
bar(r"d''4 r4\fermata", "d16 a fis a d8 r8", dyn=r"s4\ppp s4", ped="4:c 4:u",
    tempo=48, ferm=[(1, 1.2)])

# the storm's texture returns in D major: the ballade theme in left-hand octaves
section("presto", mel="lh", rub=0.0, phr=2, leg=1.0)
DMAJ, EM7 = ("a'", "d''", "fis''", "a''"), ("b'", "d''", "e''", "g''")
bar(wave(*DMAJ) + " " + wave(*DMAJ), r"r4. r4 <a,, a,>8", glob=r"\time 6/8",
    rpre=r'\tempo "Presto con fuoco" 4. = 108', dyn=r"s4.\f\< s4 s8\ff", ped="4.:c 4.:c",
    tempo=[(0, 150), (3, 158)])
bar(wave(*DMAJ) + " " + wave(*DMAJ), r"<fis, fis>4.-> <e, e>8 <d, d> <a,, a,>", ped="4.:c 4.:c",
    tempo=158)
bar(wave(*EM7) + " " + wave(*EM7), r"<g, g>4.-> <fis, fis>8 <e, e> <a,, a,>", ped="4.:c 4.:c")
bar(wave(*DMAJ) + " " + wave(*A7a), r"<a, a>4.-> <g, g>8 <fis, fis> <e, e>", ped="4.:c 4.:c")
bar(wave(*A7a) + " " + wave(*A7b), r"<d, d>4 <cis, cis>8 <e, e>4 <a,, a,>8", ped="4.:c 4.:c",
    tempo=[(0, 158), (3, 154)])
bar(wave(*DMAJ) + " " + wave(*DMAJ), r"<fis, fis>4.-> <e, e>8 <d, d> <a,, a,>", ped="4.:c 4.:c",
    tempo=160)
bar(wave("b'", "d''", "g''", "b''") + " " + wave(*EM7), r"<g, g>4.-> <fis, fis>8 <e, e> <a,, a,>",
    ped="4.:c 4.:c")
bar(wave("bes'", "d''", "g''", "bes''") + " " + wave(*A7a), r"<bes, bes>4.-> <a, a>8 <g, g> <e, e>",
    dyn=r"s4. s4.\<", ped="4.:c 4.:c", tempo=[(0, 158), (3, 154)])

section("presto2", mel="rh", rub=0.0, phr=2, leg=1.0)
HD, HG, HGm = "<a d' fis'>", "<b d' g'>", "<bes d' g'>"
bar(r"\ottava #1 fis''16 a'' d''' fis''' d''' a'' fis''16 a'' d''' fis''' d''' a''",
    f"<d,, d,>8 {HD} {HD} <fis,, fis,>8 {HD} {HD}", ped="4.:c 4.:c", tempo=160)
bar(r"g''16 b'' d''' g''' d''' b'' g''16 b'' d''' g''' d''' b''",
    f"<g,, g,>8 {HG} {HG} <g,, g,>8 {HG} {HG}", ped="4.:c 4.:c")
bar(r"g''16 bes'' d''' g''' d''' bes'' g''16 bes'' d''' g''' d''' bes''",
    f"<bes,, bes,>8 {HGm} {HGm} <bes,, bes,>8 {HGm} {HGm}", ped="4.:c 4.:c",
    tempo=[(0, 160), (3, 156)])
bar(r"gis''16 bes'' d''' f''' d''' bes'' gis''16 bes'' d''' f''' d''' bes''",
    "<bes,, bes,>8 <d' f' gis'> <d' f' gis'> <bes,, bes,>8 <d' f' gis'> <d' f' gis'>",
    ped="4.:c 4.:c", tempo=[(0, 156), (3, 150)])
bar(r"a''16 d''' fis''' a''' fis''' d''' \ottava #0 cis'''16 a'' g'' e'' <a a'>8->",
    f"<a,, a,>8 {HD} {HD} <a,, a,>4.", dyn=r"s2.\fff", ped="4.:c 4.:c",
    tempo=[(0, 146), (3, 120)])
bar(r"<fis' a' d'' fis''>2.-> <e' g' cis'' e''>4", r"<d,, d,>2.-> <a,,, a,,>4",
    glob=r"\time 4/4", rpre=r'\break \tempo "Grave" 4 = 40', ped="2.:c 4:c",
    tempo=[(0, 40), (3, 34)], ferm=[(0, 0.4)])
bar(r"<d' fis' a' d''>1\arpeggio\fermata \bar " + '"|."', r"<d,, a,, d,>1\arpeggio\fermata",
    ped="1:c", tempo=32, ferm=[(0, 3.0)], roll=True)


# ------------------------------------------------------------------ output
HEADER = r"""\version "2.24.0"
\header {
  dedication = \markup \italic "à la mémoire de W. A. Mozart, F. Chopin et F. Liszt"
  title = "Fantaisie-Ballade"
  subtitle = "in D minor"
  subsubtitle = "for piano"
  composer = "Claude"
  tagline = ##f
}
\paper {
  #(set-paper-size "a4")
  top-margin = 12\mm
  bottom-margin = 12\mm
  left-margin = 14\mm
  right-margin = 14\mm
  system-system-spacing.basic-distance = #14
  ragged-last-bottom = ##t
  print-page-number = ##t
}
#(set-global-staff-size 18)
"""


def assemble():
    rh, lh, dy, pe = [], [], [], []
    for i, b in enumerate(BARS):
        tag = f"% {i}"
        rh.append(f"  {b['glob']} {b['rpre']} {b['rh']} | {tag}")
        lh.append(f"  {b['glob']} {b['lpre']} {b['lh']} | {tag}")
        dy.append(f"  {b['dyn']} |")
        pe.append(f"  {b['ped']} |")
    body = HEADER
    body += "rhMusic = {\n" + "\n".join(rh) + "\n}\n"
    body += "lhMusic = {\n" + "\n".join(lh) + "\n}\n"
    body += "dynMusic = {\n" + "\n".join(dy) + "\n}\n"
    body += "pedMusic = {\n" + "\n".join(pe) + "\n}\n"
    body += r"""
\score {
  \new PianoStaff \with { connectArpeggios = ##t } <<
    \new Staff = "RH" \new Voice = "rh" { \clef treble \removeWithTag #'midi \rhMusic }
    \new Dynamics \dynMusic
    \new Staff = "LH" \new Voice = "lh" { \clef bass \removeWithTag #'midi \lhMusic }
    \new Dynamics \with { pedalSustainStyle = #'mixed } \pedMusic
  >>
  \layout {
    \context { \Score \override SpacingSpanner.common-shortest-duration = #(ly:make-moment 1/12) }
  }
}
\score {
  \new PianoStaff <<
    \new Staff = "RH" \new Voice = "rh" { \removeWithTag #'layout \rhMusic }
    \new Staff = "LH" \new Voice = "lh" { \removeWithTag #'layout \lhMusic }
  >>
  \midi {
    \context { \Staff \remove "Staff_performer" }
    \context { \Voice \consists "Staff_performer" }
  }
}
"""
    return body


def meta():
    bars, dyn, ped, t = [], [], [], Fr(0)
    for i, b in enumerate(BARS):
        bars.append(dict(i=i, start=float(t), len=float(b["length"]),
                         tempo=[[float(o), float(v)] for o, v in b["tempo"]],
                         ferm=[[float(o), float(s)] for o, s in b["ferm"]],
                         sec=b["sec"], mel=b["mel"], rub=b["rub"], phr=b["phr"], leg=b["leg"],
                         roll=b["roll"]))
        dyn += [[float(t + o), c] for o, c in b["dyn_ev"]]
        ped += [[float(t + o), c] for o, c in b["ped_ev"]]
        t += b["length"]
    return dict(bars=bars, dyn=dyn, ped=ped, total=float(t))


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "fantaisie_ballade.ly").write_text(assemble())
    (OUT / "score_meta.json").write_text(json.dumps(meta(), indent=1))
    print(f"{len(BARS)} bars, {float(sum(b['length'] for b in BARS))} quarter notes -> {OUT}")
