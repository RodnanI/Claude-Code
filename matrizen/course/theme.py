"""Gemeinsames Design-System für den Matrizen-Kurs.

Dunkles, ruhiges Farbschema, eine Schriftfamilie (Inter) für Fließtext,
JetBrains Mono für Zahlen in Tabellen, Latin Modern (LaTeX) für Formeln.
"""

import os

from manim import *

# --------------------------------------------------------------------------
# Lesetempo
# --------------------------------------------------------------------------
# Der Kurs hat keine Sprachspur — alles muss gelesen werden. Deshalb werden
# alle Standzeiten (Scene.wait) global gestreckt. Die Einblend-Animationen
# selbst bleiben unverändert flott.
#   MATRIZEN_PACE=1.0  -> Rohtempo (nur zum schnellen Prüfen)
#   MATRIZEN_PACE=1.5  -> Standard: bequem mitlesbar
PACE = float(os.environ.get("MATRIZEN_PACE", "1.5"))

_manim_wait = Scene.wait


def _paced_wait(self, duration=DEFAULT_WAIT_TIME, *args, **kwargs):
    return _manim_wait(self, duration * PACE, *args, **kwargs)


Scene.wait = _paced_wait

# --------------------------------------------------------------------------
# Farbpalette (Dark Mode)
# --------------------------------------------------------------------------
BG = "#0E1117"
SURFACE = "#161B24"
SURFACE2 = "#1D2430"
BORDER = "#2B3444"

FG = "#E8EFF6"
MUTED = "#94A3B8"
DIM = "#5B6879"

BLUE = "#6FC3FF"
CYAN = "#5EE0D0"
AMBER = "#FFC46B"
GREEN = "#7EE787"
RED = "#FF8A80"
PURPLE = "#C6A0FF"
PINK = "#FF9ECF"
LIME = "#C9E86B"

# Rollen-Farben, damit ein Begriff im ganzen Kurs die gleiche Farbe hat
C_ROW = AMBER  # Zeilen
C_COL = BLUE  # Spalten
C_MAT = PURPLE  # Matrix
C_VEC = CYAN  # Vektor
C_RES = GREEN  # Ergebnis
C_WARN = RED  # Achtung / Fehler

FONT = "Inter"
MONO = "JetBrains Mono"

# --------------------------------------------------------------------------
# Globale Manim-Konfiguration
# --------------------------------------------------------------------------
config.background_color = BG


def setup_defaults():
    """Einheitliche Defaults für alle Szenen."""
    Text.set_default(font=FONT, color=FG)
    MathTex.set_default(color=FG)
    Tex.set_default(color=FG)


setup_defaults()


# --------------------------------------------------------------------------
# Text-Bausteine
# --------------------------------------------------------------------------
def h1(t, size=54, color=FG, weight=BOLD):
    return Text(t, font_size=size, color=color, weight=weight)


def h2(t, size=40, color=FG, weight=SEMIBOLD):
    return Text(t, font_size=size, color=color, weight=weight)


def h3(t, size=32, color=FG, weight=MEDIUM):
    return Text(t, font_size=size, color=color, weight=weight)


def body(t, size=28, color=MUTED, weight=NORMAL):
    return Text(t, font_size=size, color=color, weight=weight)


def small(t, size=22, color=DIM, weight=NORMAL):
    return Text(t, font_size=size, color=color, weight=weight)


def mono(t, size=28, color=FG, weight=MEDIUM):
    return Text(t, font=MONO, font_size=size, color=color, weight=weight)


# --------------------------------------------------------------------------
# Layout-Bausteine
# --------------------------------------------------------------------------
def fit(mob, w=None, h=None):
    """Skaliert ein Mobject herunter, bis es in w × h passt."""
    s = 1.0
    if w and mob.width > w:
        s = min(s, w / mob.width)
    if h and mob.height > h:
        s = min(s, h / mob.height)
    if s < 1.0:
        mob.scale(s)
    return mob


def place(mob, x=0.0, top=None, y=0.0, w=None, h=None):
    """Skaliert und positioniert: Mittelpunkt x, Oberkante top (oder Mitte y)."""
    fit(mob, w, h)
    if top is not None:
        mob.move_to([x, top - mob.height / 2, 0])
    else:
        mob.move_to([x, y, 0])
    return mob


# Standard-Spalten für zweispaltige Folien
COL_L = -3.62
COL_R = 3.62
COL_W = 6.3
TOP_Y = 2.45  # unterhalb der Kapitelüberschrift


def rule(width=10.0, color=BORDER, stroke=2.0):
    return Line(LEFT * width / 2, RIGHT * width / 2, color=color, stroke_width=stroke)


def panel(content, pad=0.45, fill=SURFACE, stroke=BORDER, radius=0.22, opacity=1.0,
          stroke_width=2.0, min_w=0.0, min_h=0.0):
    """Legt eine abgerundete Karte hinter ein Mobject."""
    w = max(content.width + 2 * pad, min_w)
    h = max(content.height + 2 * pad, min_h)
    bgr = RoundedRectangle(
        width=w, height=h, corner_radius=radius,
        fill_color=fill, fill_opacity=opacity,
        stroke_color=stroke, stroke_width=stroke_width,
    )
    bgr.move_to(content.get_center())
    return VGroup(bgr, content)


def badge(t, color=BLUE, size=22, pad_x=0.28, pad_y=0.16):
    """Kleines farbiges Label."""
    label = Text(t, font=FONT, font_size=size, color=color, weight=SEMIBOLD)
    box = RoundedRectangle(
        width=label.width + 2 * pad_x, height=label.height + 2 * pad_y,
        corner_radius=0.12, stroke_color=color, stroke_width=1.8,
        fill_color=color, fill_opacity=0.10,
    ).move_to(label)
    return VGroup(box, label)


def section_header(scene, text, color=BLUE, run_time=0.9, y=3.15):
    """Überschrift oben; gibt die Gruppe zurück (zum späteren FadeOut)."""
    t = h2(text, size=38, color=FG)
    t.to_edge(UP, buff=0.55)
    ln = Line(LEFT, RIGHT, color=color, stroke_width=3)
    ln.set_width(t.width + 0.8)
    ln.next_to(t, DOWN, buff=0.22)
    grp = VGroup(t, ln)
    scene.play(FadeIn(t, shift=DOWN * 0.25), GrowFromCenter(ln), run_time=run_time)
    return grp


def bullets(items, size=30, color=FG, dot_color=BLUE, buff=0.42, dot_r=0.055,
            width=None):
    """Aufzählung mit farbigen Punkten."""
    rows = VGroup()
    for it in items:
        d = Dot(radius=dot_r, color=dot_color)
        if isinstance(it, str):
            txt = Text(it, font=FONT, font_size=size, color=color)
        else:
            txt = it
        d.next_to(txt, LEFT, buff=0.3).align_to(txt, UP).shift(DOWN * txt.height * 0.42)
        rows.add(VGroup(d, txt))
    rows.arrange(DOWN, aligned_edge=LEFT, buff=buff)
    return rows


# --------------------------------------------------------------------------
# LaTeX-Helfer
# --------------------------------------------------------------------------
def _fmt(x):
    if isinstance(x, str):
        return x
    if isinstance(x, float) and abs(x - round(x)) < 1e-9:
        x = int(round(x))
    return str(x)


fnum = _fmt  # öffentlicher Alias


def pnum(x):
    """Wie fnum, aber negative Zahlen bekommen Klammern: -1 -> (-1)."""
    s = _fmt(x)
    return "(" + s + ")" if s.startswith("-") else s


def pmat(rows, kind="pmatrix"):
    """Erzeugt einen LaTeX-String für eine Matrix."""
    body_ = r"\\".join(" & ".join(_fmt(v) for v in r) for r in rows)
    return r"\begin{%s}%s\end{%s}" % (kind, body_, kind)


def cvec(entries):
    return pmat([[e] for e in entries])


def mtex(*args, size=48, color=FG, **kw):
    return MathTex(*args, font_size=size, color=color, **kw)


def mmat(rows, size=42, color=FG, h_buff=1.35, v_buff=0.95, bracket=BORDER):
    """Matrix-Mobject im Kursdesign (runde Klammern, einzeln ansprechbare Einträge)."""
    data = [[_fmt(v) for v in r] for r in rows]
    m = Matrix(
        data,
        h_buff=h_buff, v_buff=v_buff,
        bracket_h_buff=0.16, bracket_v_buff=0.16,
        left_bracket="(", right_bracket=")",
        element_to_mobject_config={"font_size": size, "color": color},
    )
    m.get_brackets().set_color(bracket if bracket else color)
    return m


def entry(m, i, j, ncols):
    """Eintrag (i, j) einer mmat, 0-basiert."""
    return m.get_entries()[i * ncols + j]


# --------------------------------------------------------------------------
# Kapitelkarte
# --------------------------------------------------------------------------
def chapter_card(scene, number, title, subtitle=None, color=BLUE, hold=1.6,
                 topics=None):
    """Kapitel-Zwischenkarte: große Nummer links, Titel rechts daneben."""
    num = Text(number, font=FONT, font_size=140, weight=BOLD, color=color)

    right = VGroup(h1(title, size=58, color=FG))
    if subtitle:
        right.add(body(subtitle, size=28, color=MUTED))
    right.arrange(DOWN, aligned_edge=LEFT, buff=0.3)

    sep = Line(UP, DOWN, color=color, stroke_width=3)
    sep.set_height(max(num.height, right.height) + 0.5)

    row = VGroup(num, sep, right).arrange(RIGHT, buff=0.62).move_to(ORIGIN)

    extras = VGroup()
    if topics:
        chips = VGroup(*[badge(t, color=MUTED, size=21) for t in topics])
        chips.arrange(RIGHT, buff=0.28)
        if chips.width > 12:
            chips.scale(12 / chips.width)
        chips.next_to(row, DOWN, buff=0.95)
        extras.add(chips)
        VGroup(row, extras).move_to(ORIGIN)

    scene.play(FadeIn(num, shift=RIGHT * 0.4), run_time=0.7)
    scene.play(GrowFromEdge(sep, UP), run_time=0.5)
    scene.play(
        LaggedStart(*[FadeIn(m, shift=RIGHT * 0.3) for m in right], lag_ratio=0.25),
        run_time=0.9,
    )
    if len(extras):
        scene.play(LaggedStart(*[FadeIn(c, shift=UP * 0.2) for c in extras[0]],
                               lag_ratio=0.12), run_time=0.9)
    scene.wait(hold)
    scene.play(FadeOut(VGroup(row, extras), shift=UP * 0.4), run_time=0.7)


def title_slide(scene, title, subtitle, tag=None, color=BLUE, hold=1.6):
    parts = VGroup()
    if tag:
        parts.add(badge(tag, color=color, size=24))
    parts.add(h1(title, size=68))
    parts.add(body(subtitle, size=30, color=MUTED))
    parts.arrange(DOWN, buff=0.45).move_to(ORIGIN)
    scene.play(LaggedStart(*[FadeIn(m, shift=UP * 0.3) for m in parts],
                           lag_ratio=0.25), run_time=1.4)
    scene.wait(hold)
    scene.play(FadeOut(parts, shift=UP * 0.3), run_time=0.7)


# --------------------------------------------------------------------------
# Merksatz / Hinweis-Box
# --------------------------------------------------------------------------
def note_box(text_mob, color=AMBER, label="Merke", width=None, pad=0.42):
    """Farbig markierte Merk-Box mit Balken links."""
    if label:
        lbl = Text(label, font=FONT, font_size=22, color=color, weight=BOLD)
        inner = VGroup(lbl, text_mob).arrange(DOWN, aligned_edge=LEFT, buff=0.24)
    else:
        inner = VGroup(text_mob)
    w = width or (inner.width + 2 * pad + 0.25)
    h = inner.height + 2 * pad
    box = RoundedRectangle(width=w, height=h, corner_radius=0.16,
                           fill_color=color, fill_opacity=0.07,
                           stroke_color=color, stroke_width=0).move_to(ORIGIN)
    inner.move_to(box).align_to(box, LEFT).shift(RIGHT * (pad + 0.25))
    bar = Line(box.get_corner(UL) + DOWN * 0.04, box.get_corner(DL) + UP * 0.04,
               color=color, stroke_width=5)
    return VGroup(box, bar, inner)


def caution_box(text_mob, label="Achtung", **kw):
    return note_box(text_mob, color=RED, label=label, **kw)


# --------------------------------------------------------------------------
# Koordinatensystem im Kursdesign
# --------------------------------------------------------------------------
def grid(x_range=(-6, 6, 1), y_range=(-4, 4, 1), width=None, height=None,
         faded=2, color=BORDER, axis_color=DIM):
    ng = NumberPlane(
        x_range=list(x_range), y_range=list(y_range),
        x_length=width, y_length=height,
        background_line_style={
            "stroke_color": color, "stroke_width": 1.6, "stroke_opacity": 0.75,
        },
        faded_line_style={
            "stroke_color": color, "stroke_width": 1.0, "stroke_opacity": 0.28,
        },
        faded_line_ratio=faded,
        axis_config={"stroke_color": axis_color, "stroke_width": 2.4,
                     "include_ticks": False},
    )
    return ng


def vec_arrow(plane, coords, color=CYAN, width=6, tip_len=0.24):
    return Arrow(
        plane.c2p(0, 0), plane.c2p(*coords), buff=0,
        color=color, stroke_width=width,
        max_tip_length_to_length_ratio=0.28, tip_length=tip_len,
    )


def vec_label(tex, arrow, color=CYAN, size=34, buff=0.22, direction=None):
    lab = MathTex(tex, font_size=size, color=color)
    d = direction if direction is not None else normalize(arrow.get_vector())
    lab.next_to(arrow.get_end(), d, buff=buff)
    return lab


# --------------------------------------------------------------------------
# Kleine Animationshelfer
# --------------------------------------------------------------------------
def show_steps(scene, steps, pos=ORIGIN, buff=0.5, wait=1.1, size=44,
               align=LEFT, fade_prev=False, run_time=0.8):
    """Zeigt eine Kette von Rechenschritten untereinander."""
    grp = VGroup()
    prev = None
    for s in steps:
        m = MathTex(s, font_size=size) if isinstance(s, str) else s
        if prev is None:
            m.move_to(pos)
        else:
            m.next_to(prev, DOWN, buff=buff).align_to(prev, align)
        grp.add(m)
        scene.play(FadeIn(m, shift=UP * 0.2), run_time=run_time)
        scene.wait(wait)
        prev = m
    return grp


def highlight(scene, mob, color=AMBER, run_time=0.8, buff=0.12):
    r = SurroundingRectangle(mob, color=color, stroke_width=3,
                             corner_radius=0.08, buff=buff)
    scene.play(Create(r), run_time=run_time)
    return r


def chapter_tag(text, color=DIM, size=20):
    """Dezenter Kapitelhinweis unten links, bleibt die ganze Szene stehen."""
    t = Text(text, font=FONT, font_size=size, color=color, weight=MEDIUM)
    t.to_corner(DL, buff=0.36)
    return t


def clear_all(scene, run_time=0.6, exclude=()):
    keep = set(id(m) for m in exclude)
    stuff = [m for m in scene.mobjects if id(m) not in keep]
    if stuff:
        scene.play(*[FadeOut(m) for m in stuff], run_time=run_time)


def pulse(mob, color=AMBER, scale=1.12):
    return Indicate(mob, color=color, scale_factor=scale)
