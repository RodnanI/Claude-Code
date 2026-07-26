"""Kapitel 10 — Übungsaufgaben mit vollständigem Lösungsweg."""

from theme import *

TAG = "10 · Übungsaufgaben"


class K10Card(Scene):
    def construct(self):
        chapter_card(self, "10", "Übungsaufgaben",
                     "Sechs Aufgaben — erst selbst rechnen, dann vergleichen",
                     color=GREEN,
                     topics=["Produkt", "Determinante", "Inverse", "LGS",
                             "Abbildung", "Eigenwerte"])


def aufgabe(scene, nummer, titel, aufgabe_mob, pause=7.0, color=GREEN):
    """Zeigt die Aufgabenstellung und lädt zum Pausieren ein."""
    tag = badge(f"AUFGABE {nummer}", color=color, size=23)
    t = h2(titel, size=34, color=FG)
    head = VGroup(tag, t).arrange(DOWN, buff=0.32)
    place(head, x=0, top=TOP_Y + 0.35, w=12)

    place(aufgabe_mob, x=0, top=head.get_bottom()[1] - 0.75, w=12, h=3.0)

    scene.play(FadeIn(tag, shift=DOWN * 0.15), run_time=0.6)
    scene.play(FadeIn(t, shift=UP * 0.15), run_time=0.7)
    scene.play(FadeIn(aufgabe_mob, shift=UP * 0.15), run_time=0.9)
    scene.wait(1.6)

    hint = VGroup(
        h3("Jetzt pausieren und selbst rechnen.", size=28, color=AMBER),
        small("Weiter geht es mit dem Lösungsweg.", size=22, color=DIM),
    ).arrange(DOWN, buff=0.25)
    place(hint, x=0, top=-2.20, w=12)
    scene.play(FadeIn(hint), run_time=0.8)

    bar = Line(LEFT * 2.2, RIGHT * 2.2, color=BORDER, stroke_width=5)
    bar.next_to(hint, DOWN, buff=0.4)
    fill = Line(bar.get_left(), bar.get_left(), color=AMBER, stroke_width=5)
    scene.add(bar, fill)
    scene.play(fill.animate.put_start_and_end_on(bar.get_left(), bar.get_right()),
               run_time=pause, rate_func=linear)
    scene.play(FadeOut(VGroup(hint, bar, fill)), run_time=0.5)
    return VGroup(head, aufgabe_mob)


def loesung(scene, steps, top, buff=0.42, size=38, wait=2.0):
    lbl = h3("Lösung", size=28, color=GREEN)
    place(lbl, x=-5.4, top=top)
    scene.play(FadeIn(lbl, shift=RIGHT * 0.2), run_time=0.6)

    shown = VGroup(lbl)
    prev = lbl
    for tex, note, col in steps:
        m = MathTex(tex, font_size=size, color=col) if isinstance(tex, str) else tex
        fit(m, w=8.4)
        m.next_to(prev, DOWN, buff=buff).set_x(-1.1)
        anims = [FadeIn(m, shift=UP * 0.12)]
        if note:
            n = small(note, size=20, color=DIM)
            n.next_to(m, RIGHT, buff=0.6).set_y(m.get_y())
            fit(n, w=4.4)
            anims.append(FadeIn(n))
            shown.add(n)
        scene.play(*anims, run_time=0.8)
        scene.wait(wait)
        shown.add(m)
        prev = m
    return shown


class U1Produkt(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        Av = [[1, 0, 2], [3, -1, 1]]
        Bv = [[2, 1], [0, 4], [-1, 3]]
        task = MathTex(r"A=" + pmat(Av) + r",\quad B=" + pmat(Bv)
                       + r"\qquad \text{Berechne } A\cdot B.", font_size=40)
        head = aufgabe(self, 1, "Matrixprodukt", task)

        self.play(FadeOut(head), run_time=0.6)
        steps = [
            (r"(2\times 3)\cdot(3\times 2) = (2\times 2)", "Format prüfen", MUTED),
            (r"c_{11}=1\cdot 2+0\cdot 0+2\cdot(-1)=0", "Zeile 1 mal Spalte 1", FG),
            (r"c_{12}=1\cdot 1+0\cdot 4+2\cdot 3=7", "Zeile 1 mal Spalte 2", FG),
            (r"c_{21}=3\cdot 2+(-1)\cdot 0+1\cdot(-1)=5", "Zeile 2 mal Spalte 1", FG),
            (r"c_{22}=3\cdot 1+(-1)\cdot 4+1\cdot 3=2", "Zeile 2 mal Spalte 2", FG),
            (r"A\cdot B=" + pmat([[0, 7], [5, 2]]), "fertig", GREEN),
        ]
        s = loesung(self, steps, top=TOP_Y + 0.3, wait=1.9)
        self.play(Circumscribe(s[-1], color=GREEN, buff=0.14), run_time=1.2)
        self.wait(3.0)
        self.play(*[FadeOut(m) for m in self.mobjects[1:]], run_time=0.8)


class U2Determinante(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        Mv = [[1, 2, 0], [3, -1, 2], [0, 4, 1]]
        task = MathTex(r"\text{Berechne } \det M \text{ für } M=" + pmat(Mv),
                       font_size=42)
        head = aufgabe(self, 2, "Determinante einer 3×3-Matrix", task)

        self.play(FadeOut(head), run_time=0.6)
        steps = [
            (r"1\cdot(-1)\cdot 1 \;+\; 2\cdot 2\cdot 0 \;+\; 0\cdot 3\cdot 4 = -1",
             "Diagonalen nach rechts unten", GREEN),
            (r"0\cdot(-1)\cdot 0 \;+\; 4\cdot 2\cdot 1 \;+\; 1\cdot 3\cdot 2 = 14",
             "Diagonalen nach rechts oben", RED),
            (r"\det M = -1 - 14 = -15", "Sarrus: erste minus zweite Summe", FG),
            (r"\det M \neq 0 \;\Rightarrow\; M \text{ ist invertierbar}",
             "und das LGS wäre eindeutig lösbar", GREEN),
        ]
        s = loesung(self, steps, top=TOP_Y + 0.3, wait=2.3)
        self.wait(3.2)
        self.play(*[FadeOut(m) for m in self.mobjects[1:]], run_time=0.8)


class U3Inverse(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        Av = [[4, 3], [2, 2]]
        task = MathTex(r"\text{Bestimme } A^{-1} \text{ für } A=" + pmat(Av)
                       + r"\quad\text{und mache die Probe.}", font_size=40)
        head = aufgabe(self, 3, "Inverse einer 2×2-Matrix", task)

        self.play(FadeOut(head), run_time=0.6)
        steps = [
            (r"\det A = 4\cdot 2 - 3\cdot 2 = 2", "erst die Determinante", CYAN),
            (r"A^{-1}=\frac{1}{2}" + pmat([[2, -3], [-2, 4]]),
             "Diagonale tauschen, Nebendiagonale × (−1)", FG),
            (r"A^{-1}=" + pmat([[1, r"-\tfrac{3}{2}"], [-1, 2]]), "ausmultipliziert", GREEN),
            (r"A\cdot A^{-1}=" + pmat(Av) + pmat([[1, r"-\tfrac{3}{2}"], [-1, 2]])
             + "=" + pmat([[1, 0], [0, 1]]), "Probe stimmt", GREEN),
        ]
        s = loesung(self, steps, top=TOP_Y + 0.3, wait=2.3, size=36)
        self.wait(3.2)
        self.play(*[FadeOut(m) for m in self.mobjects[1:]], run_time=0.8)


class U4LGS(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        task = MathTex(r"\begin{aligned}"
                       r"x + y + z &= 6\\ 2x - y + z &= 3\\ x + 2y - z &= 2"
                       r"\end{aligned}\qquad\text{Löse mit dem Gauß-Verfahren.}",
                       font_size=40)
        head = aufgabe(self, 4, "Lineares Gleichungssystem", task, pause=9.0)

        self.play(FadeOut(head), run_time=0.6)

        def board(rows):
            return MathTex(r"\left(\begin{array}{ccc|c}"
                           + r"\\".join(" & ".join(fnum(v) for v in r) for r in rows)
                           + r"\end{array}\right)", font_size=40)

        stages = [
            ([[1, 1, 1, 6], [2, -1, 1, 3], [1, 2, -1, 2]], "erweiterte Koeffizientenmatrix"),
            ([[1, 1, 1, 6], [0, -3, -1, -9], [1, 2, -1, 2]], r"Z₂ − 2·Z₁"),
            ([[1, 1, 1, 6], [0, -3, -1, -9], [0, 1, -2, -4]], r"Z₃ − Z₁"),
            ([[1, 1, 1, 6], [0, 1, -2, -4], [0, -3, -1, -9]], r"Z₂ ↔ Z₃"),
            ([[1, 1, 1, 6], [0, 1, -2, -4], [0, 0, -7, -21]], r"Z₃ + 3·Z₂"),
            ([[1, 1, 1, 6], [0, 1, -2, -4], [0, 0, 1, 3]], r"Z₃ : (−7)"),
        ]

        lbl = h3("Lösung", size=28, color=GREEN)
        place(lbl, x=-5.4, top=TOP_Y + 0.3)
        self.play(FadeIn(lbl), run_time=0.6)

        cur = board(stages[0][0])
        place(cur, x=-1.4, y=0.9)
        note = small(stages[0][1], size=21, color=DIM)
        note.next_to(cur, RIGHT, buff=0.9).set_y(cur.get_y())
        self.play(FadeIn(cur), FadeIn(note), run_time=0.9)
        self.wait(2.0)

        for rows, op in stages[1:]:
            new = board(rows).scale_to_fit_width(cur.width).move_to(cur)
            nn = small(op, size=21, color=AMBER)
            nn.next_to(cur, RIGHT, buff=0.9).set_y(cur.get_y())
            self.play(FadeTransform(note, nn), run_time=0.5)
            self.play(FadeTransform(cur, new), run_time=1.1)
            cur, note = new, nn
            self.wait(1.5)

        self.play(FadeOut(note), run_time=0.4)
        back = VGroup(
            MathTex(r"z = 3", font_size=38),
            MathTex(r"y - 2\cdot 3 = -4 \;\Rightarrow\; y = 2", font_size=38),
            MathTex(r"x + 2 + 3 = 6 \;\Rightarrow\; x = 1", font_size=38),
            MathTex(r"L=\{(1\,|\,2\,|\,3)\}", font_size=42, color=GREEN),
        ).arrange(DOWN, buff=0.38)
        place(back, x=-1.4, top=cur.get_bottom()[1] - 0.55, w=11)
        for b in back:
            self.play(FadeIn(b, shift=UP * 0.12), run_time=0.7)
            self.wait(1.7)
        self.play(Circumscribe(back[-1], color=GREEN, buff=0.14), run_time=1.1)
        self.wait(3.0)
        self.play(*[FadeOut(m) for m in self.mobjects[1:]], run_time=0.8)


class U5Abbildung(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        task = body("Gesucht ist die Matrix der Abbildung, die einen Punkt zuerst\n"
                    "um 90° gegen den Uhrzeigersinn dreht und ihn danach\n"
                    "an der x-Achse spiegelt.", size=30, color=FG)
        head = aufgabe(self, 5, "Abbildungsmatrix bestimmen", task)

        self.play(FadeOut(head), run_time=0.6)

        steps = [
            (r"D_{90}=" + pmat([[0, -1], [1, 0]]), "Drehung um 90°", BLUE),
            (r"S_x=" + pmat([[1, 0], [0, -1]]), "Spiegelung an der x-Achse", PINK),
            (r"A = S_x \cdot D_{90}", "erst drehen heißt: rechts stehen!", AMBER),
            (r"A = " + pmat([[1, 0], [0, -1]]) + pmat([[0, -1], [1, 0]])
             + "=" + pmat([[0, -1], [-1, 0]]), "ausmultipliziert", GREEN),
        ]
        s = loesung(self, steps, top=TOP_Y + 0.3, wait=2.2, size=36)
        self.wait(1.6)

        probe = MathTex(r"\text{Probe: } A\cdot" + cvec([1, 0]) + "="
                        + cvec([0, -1]) + r"\quad\checkmark", font_size=36, color=GREEN)
        place(probe, x=-1.1, top=s[-1].get_bottom()[1] - 0.5, w=10)
        self.play(FadeIn(probe), run_time=0.9)
        expl = small("e₁ wird zu (0|1) gedreht und dann zu (0|−1) gespiegelt.",
                     size=21, color=DIM)
        place(expl, x=-1.1, top=probe.get_bottom()[1] - 0.3, w=11)
        self.play(FadeIn(expl), run_time=0.7)
        self.wait(3.6)
        self.play(*[FadeOut(m) for m in self.mobjects[1:]], run_time=0.8)


class U6Eigenwerte(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        Av = [[4, -2], [1, 1]]
        task = MathTex(r"\text{Bestimme Eigenwerte und Eigenvektoren von } A="
                       + pmat(Av), font_size=40)
        head = aufgabe(self, 6, "Eigenwerte und Eigenvektoren", task, pause=9.0)

        self.play(FadeOut(head), run_time=0.6)
        steps = [
            (r"A-\lambda E=" + pmat([["4-\\lambda", -2], [1, "1-\\lambda"]]), "", FG),
            (r"\det(A-\lambda E)=(4-\lambda)(1-\lambda)+2", "Kreuzprodukt der Diagonalen", FG),
            (r"=\lambda^{2}-5\lambda+6 \overset{!}{=} 0", "charakteristisches Polynom", CYAN),
            (r"\lambda_{1}=2,\qquad \lambda_{2}=3", "Satz von Vieta oder pq-Formel", PINK),
        ]
        s = loesung(self, steps, top=TOP_Y + 0.3, wait=2.2, size=38)
        self.wait(2.0)
        self.play(FadeOut(s), run_time=0.7)

        hdr = h3("Und nun die Eigenvektoren:", size=30, color=FG)
        place(hdr, x=0, top=TOP_Y + 0.3, w=12)
        self.play(FadeIn(hdr), run_time=0.7)

        blocks = [
            (r"\lambda_1 = 2", [
                pmat([[2, -2], [1, -1]]) + cvec(["x", "y"]) + "=" + cvec([0, 0]),
                r"x - y = 0 \;\Rightarrow\; y = x",
                r"\vec{v}_1=" + cvec([1, 1]),
            ], AMBER),
            (r"\lambda_2 = 3", [
                pmat([[1, -2], [1, -2]]) + cvec(["x", "y"]) + "=" + cvec([0, 0]),
                r"x - 2y = 0 \;\Rightarrow\; x = 2y",
                r"\vec{v}_2=" + cvec([2, 1]),
            ], PINK),
        ]
        cols = VGroup()
        for title, lines, col in blocks:
            t = MathTex(title, font_size=40, color=col)
            ls = VGroup(*[MathTex(l, font_size=32) for l in lines])
            ls[-1].set_color(col)
            ls.arrange(DOWN, buff=0.45)
            cols.add(VGroup(t, ls).arrange(DOWN, buff=0.5))
        cols.arrange(RIGHT, buff=1.8)
        place(cols, x=0, top=hdr.get_bottom()[1] - 0.6, w=12.4, h=4.0)

        for g in cols:
            self.play(FadeIn(g[0], shift=UP * 0.15), run_time=0.6)
            for l in g[1]:
                self.play(FadeIn(l, shift=UP * 0.1), run_time=0.6)
                self.wait(1.4)
            self.wait(0.7)

        probe = MathTex(r"\text{Probe: } " + pmat(Av) + cvec([2, 1]) + "="
                        + cvec([6, 3]) + r"= 3\cdot" + cvec([2, 1]),
                        font_size=34, color=GREEN)
        place(probe, x=0, top=cols.get_bottom()[1] - 0.55, w=11)
        self.play(FadeIn(probe), run_time=0.9)
        self.wait(3.6)
        self.play(*[FadeOut(m) for m in self.mobjects[1:]], run_time=0.8)


class U7Schluss(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        msg = VGroup(
            h2("Alle sechs geschafft?", size=38, color=FG),
            body("Dann beherrschst du die wichtigsten Rechenwege dieses Kurses.\n"
                 "Falls nicht: das entsprechende Kapitel noch einmal ansehen —\n"
                 "und die Aufgabe danach ohne Hilfe wiederholen.", size=27),
        ).arrange(DOWN, buff=0.6)
        place(msg, x=0, y=0.2, w=12)
        self.play(FadeIn(msg[0]), run_time=0.8)
        self.play(FadeIn(msg[1], shift=UP * 0.2), run_time=1.0)
        self.wait(5.0)
        self.play(FadeOut(msg), run_time=0.8)
