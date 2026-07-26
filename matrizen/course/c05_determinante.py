"""Kapitel 5 — Die Determinante."""

from theme import *

TAG = "5 · Determinante"


class K5Card(Scene):
    def construct(self):
        chapter_card(self, "05", "Die Determinante",
                     "Eine einzige Zahl, die sehr viel über eine Matrix verrät",
                     color=CYAN,
                     topics=["Flächenfaktor", "ad − bc", "Sarrus", "det = 0"])


class D1Flaeche(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))

        intro = VGroup(
            h2("Frage:", size=34, color=MUTED),
            h1("Um welchen Faktor verändert eine Matrix\nden Flächeninhalt?", size=40),
        ).arrange(DOWN, buff=0.5)
        place(intro, x=0, y=0, w=12)
        self.play(FadeIn(intro[0]), run_time=0.7)
        self.play(Write(intro[1]), run_time=2.2)
        self.wait(2.6)
        self.play(FadeOut(intro), run_time=0.7)

        pl = grid(x_range=(-3, 6, 1), y_range=(-2, 4.5, 1), width=8.4, height=6.0)
        pl.move_to([-1.4, -0.3, 0])
        self.play(FadeIn(pl), run_time=0.9)

        sq = Polygon(pl.c2p(0, 0), pl.c2p(1, 0), pl.c2p(1, 1), pl.c2p(0, 1),
                     stroke_color=AMBER, stroke_width=4,
                     fill_color=AMBER, fill_opacity=0.28)
        e1 = vec_arrow(pl, (1, 0), color=AMBER, width=7, tip_len=0.2)
        e2 = vec_arrow(pl, (0, 1), color=GREEN, width=7, tip_len=0.2)
        self.play(FadeIn(sq), GrowArrow(e1), GrowArrow(e2), run_time=1.2)

        info = VGroup(
            h3("Einheitsquadrat", size=28, color=AMBER),
            MathTex(r"\text{Fläche}=1", font_size=36, color=AMBER),
        ).arrange(DOWN, buff=0.28)
        place(info, x=4.9, top=2.4, w=4.0)
        self.play(FadeIn(info), run_time=0.8)
        self.wait(2.0)

        M = [[3, 1], [1, 2]]
        bd = MathTex("A=" + pmat(M), font_size=40, color=PURPLE)
        bp = panel(bd, pad=0.32, fill=SURFACE, opacity=0.94)
        place(bp, x=4.9, top=info.get_bottom()[1] - 0.6, w=4.2)
        self.play(FadeIn(bp), run_time=0.8)
        self.wait(1.2)

        arr = np.array(M, dtype=float)
        origin = pl.c2p(0, 0)
        self.play(
            ApplyMatrix(arr, pl, about_point=origin),
            ApplyMatrix(arr, sq, about_point=origin),
            ApplyMatrix(arr, e1, about_point=origin),
            ApplyMatrix(arr, e2, about_point=origin),
            run_time=2.6, rate_func=rate_functions.ease_in_out_sine,
        )
        self.wait(1.4)

        info2 = VGroup(
            h3("Parallelogramm", size=28, color=CYAN),
            MathTex(r"\text{Fläche}=5", font_size=36, color=CYAN),
        ).arrange(DOWN, buff=0.28)
        place(info2, x=4.9, top=2.4, w=4.0)
        self.play(FadeTransform(info, info2), run_time=0.9)
        self.wait(2.0)

        det = MathTex(r"\det A = 5", font_size=44, color=CYAN)
        dp = panel(det, pad=0.3, fill=SURFACE, opacity=0.94)
        place(dp, x=4.9, top=bp.get_bottom()[1] - 0.6, w=4.2)
        self.play(FadeIn(dp), run_time=0.9)
        self.play(Circumscribe(dp, color=CYAN, buff=0.08), run_time=1.2)
        self.wait(2.4)

        self.play(FadeOut(VGroup(pl, sq, e1, e2, info2, bp, dp)), run_time=0.9)

        key = VGroup(
            h1("Die Determinante ist der Flächenfaktor.", size=42, color=CYAN),
            body("Jede Fläche wird bei der Abbildung mit |det A| multipliziert —\n"
                 "egal, wie sie aussieht.", size=27),
        ).arrange(DOWN, buff=0.6)
        place(key, x=0, y=0, w=12)
        self.play(Write(key[0]), run_time=2.0)
        self.play(FadeIn(key[1]), run_time=1.0)
        self.wait(3.6)
        self.play(FadeOut(key), run_time=0.8)


class D2Formel(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        section_header(self, "Die Formel für 2×2", color=CYAN)

        f = MathTex(r"\det\begin{pmatrix} a & b\\ c & d\end{pmatrix}", "=", "a\\,d", "-",
                    "b\\,c", font_size=58)
        f[2].set_color(GREEN)
        f[4].set_color(RED)
        place(f, x=0, y=1.5, w=11)
        self.play(Write(f), run_time=2.0)
        self.wait(1.6)

        # Diagonalen visualisieren
        m = MathTex(pmat([["a", "b"], ["c", "d"]]), font_size=60)
        place(m, x=0, y=-0.55)
        self.play(FadeIn(m), run_time=0.7)
        d1 = Line(m.get_corner(UL) + DR * 0.42, m.get_corner(DR) + UL * 0.42,
                  color=GREEN, stroke_width=4)
        d2 = Line(m.get_corner(DL) + UR * 0.42, m.get_corner(UR) + DL * 0.42,
                  color=RED, stroke_width=4)
        t1 = small("Hauptdiagonale: plus", size=23, color=GREEN)
        t2 = small("Nebendiagonale: minus", size=23, color=RED)
        VGroup(t1, t2).arrange(DOWN, buff=0.25)
        place(VGroup(t1, t2), x=0, top=-1.85)
        self.play(Create(d1), FadeIn(t1), run_time=0.9)
        self.play(Create(d2), FadeIn(t2), run_time=0.9)
        self.wait(3.0)

        self.play(FadeOut(VGroup(m, d1, d2, t1, t2)), run_time=0.6)

        ex = [
            ([[3, 1], [1, 2]], r"3\cdot 2 - 1\cdot 1 = 5", GREEN),
            ([[2, 4], [1, 2]], r"2\cdot 2 - 4\cdot 1 = 0", RED),
            ([[0, -1], [1, 0]], r"0\cdot 0 - (-1)\cdot 1 = 1", BLUE),
            ([[1, 0], [0, -1]], r"1\cdot(-1) - 0\cdot 0 = -1", PINK),
        ]
        rows = VGroup()
        for M, calc, col in ex:
            a = MathTex(r"\det" + pmat(M) + "=" + calc, font_size=38, color=col)
            rows.add(a)
        rows.arrange(DOWN, buff=0.42)
        place(rows, x=0, top=-0.35, w=11)
        for r in rows:
            self.play(FadeIn(r, shift=UP * 0.15), run_time=0.8)
            self.wait(1.7)
        self.wait(2.6)
        self.play(*[FadeOut(m_) for m_ in self.mobjects[1:]], run_time=0.8)


class D3Vorzeichen(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        section_header(self, "Was bedeutet ein negatives Vorzeichen?", color=CYAN)

        pl = grid(x_range=(-4, 4, 1), y_range=(-2.6, 2.6, 1), width=7.4, height=4.8)
        pl.move_to([0, -0.6, 0])
        self.play(FadeIn(pl), run_time=0.8)

        sq = Polygon(pl.c2p(0, 0), pl.c2p(1, 0), pl.c2p(1, 1), pl.c2p(0, 1),
                     stroke_color=AMBER, stroke_width=4,
                     fill_color=AMBER, fill_opacity=0.25)
        e1 = vec_arrow(pl, (1, 0), color=AMBER, width=7, tip_len=0.2)
        e2 = vec_arrow(pl, (0, 1), color=GREEN, width=7, tip_len=0.2)
        self.play(FadeIn(sq), GrowArrow(e1), GrowArrow(e2), run_time=1.0)

        cap = body("e₁ liegt rechts, e₂ liegt links davon — Drehsinn gegen den Uhrzeigersinn.",
                   size=25)
        place(cap, x=0, top=TOP_Y - 0.15, w=12)
        self.play(FadeIn(cap), run_time=0.8)
        self.wait(2.4)

        M = [[0, 1], [1, 0]]
        bd = MathTex(r"A=" + pmat(M) + r",\quad \det A = -1", font_size=38, color=RED)
        bp = panel(bd, pad=0.3, fill=SURFACE, opacity=0.94)
        place(bp, x=0, top=-2.35, w=10)
        self.play(FadeIn(bp), run_time=0.8)

        o = pl.c2p(0, 0)
        arr = np.array(M, dtype=float)
        self.play(ApplyMatrix(arr, pl, about_point=o),
                  ApplyMatrix(arr, sq, about_point=o),
                  ApplyMatrix(arr, e1, about_point=o),
                  ApplyMatrix(arr, e2, about_point=o),
                  run_time=2.4, rate_func=rate_functions.ease_in_out_sine)
        self.wait(1.4)

        cap2 = body("Jetzt liegt e₁ links von e₂ — die Orientierung ist gekippt.",
                    size=25, color=RED)
        place(cap2, x=0, top=TOP_Y - 0.15, w=12)
        self.play(FadeTransform(cap, cap2), run_time=0.9)
        self.wait(3.0)

        self.play(FadeOut(VGroup(pl, sq, e1, e2, cap2, bp)), run_time=0.8)

        merk = VGroup(
            MathTex(r"\det A > 0 \;:\; \text{Orientierung bleibt}", font_size=40, color=GREEN),
            MathTex(r"\det A < 0 \;:\; \text{Orientierung kippt (Spiegelung)}",
                    font_size=40, color=RED),
            MathTex(r"|\det A| \;:\; \text{der reine Flächenfaktor}", font_size=40, color=CYAN),
        ).arrange(DOWN, buff=0.5)
        place(merk, x=0, y=0.2, w=11.5)
        for m_ in merk:
            self.play(FadeIn(m_, shift=UP * 0.15), run_time=0.9)
            self.wait(1.9)
        self.wait(2.6)
        self.play(*[FadeOut(m_) for m_ in self.mobjects[1:]], run_time=0.8)


class D4NullDeterminante(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        section_header(self, "Der wichtigste Fall: det A = 0", color=RED)

        pl = grid(x_range=(-5, 5, 1), y_range=(-3, 3, 1), width=8.6, height=5.2)
        pl.move_to([0, -0.8, 0])
        sq = Polygon(pl.c2p(0, 0), pl.c2p(1, 0), pl.c2p(1, 1), pl.c2p(0, 1),
                     stroke_color=AMBER, stroke_width=4,
                     fill_color=AMBER, fill_opacity=0.3)
        self.play(FadeIn(pl), FadeIn(sq), run_time=1.0)

        M = [[2, 4], [1, 2]]
        bd = MathTex(r"A=" + pmat(M) + r",\quad \det A = 2\cdot2-4\cdot1 = 0",
                     font_size=36, color=RED)
        bp = panel(bd, pad=0.3, fill=SURFACE, opacity=0.94)
        place(bp, x=0, top=TOP_Y - 0.15, w=11)
        self.play(FadeIn(bp), run_time=0.9)
        self.wait(1.8)

        o = pl.c2p(0, 0)
        arr = np.array(M, dtype=float)
        self.play(ApplyMatrix(arr, pl, about_point=o),
                  ApplyMatrix(arr, sq, about_point=o),
                  run_time=2.8, rate_func=rate_functions.ease_in_out_sine)
        self.wait(1.6)

        cap = h3("Die ganze Ebene ist auf eine Gerade zusammengefallen.",
                 size=30, color=RED)
        place(cap, x=0, top=-3.0, w=12)
        self.play(FadeIn(cap, shift=UP * 0.2), run_time=0.9)
        self.wait(3.0)

        self.play(FadeOut(VGroup(pl, sq, cap, bp)), run_time=0.8)

        folgen = VGroup(
            h2("Wenn det A = 0 ist, gilt:", size=34, color=FG),
            bullets([
                "Die Spalten sind Vielfache voneinander (linear abhängig).",
                "Fläche wird zu 0 — Information geht verloren.",
                "Die Abbildung ist nicht umkehrbar: es gibt kein A⁻¹.",
                "Das LGS A·x = b hat keine oder unendlich viele Lösungen.",
            ], size=26, dot_color=RED, buff=0.45),
        ).arrange(DOWN, buff=0.7)
        place(folgen, x=0, y=0.1, w=12)
        self.play(FadeIn(folgen[0]), run_time=0.8)
        for b in folgen[1]:
            self.play(FadeIn(b, shift=RIGHT * 0.25), run_time=0.7)
            self.wait(1.6)
        self.wait(3.4)

        krit = MathTex(r"A \text{ ist invertierbar} \iff \det A \neq 0",
                       font_size=44, color=GREEN)
        place(krit, x=0, top=folgen.get_bottom()[1] - 0.65, w=11)
        self.play(Write(krit), run_time=1.4)
        self.wait(3.2)
        self.play(*[FadeOut(m_) for m_ in self.mobjects[1:]], run_time=0.8)


class D5Sarrus(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        section_header(self, "3×3: die Regel von Sarrus", color=CYAN)

        Av = [[2, 1, 3], [0, -1, 4], [5, 2, 1]]
        cw, ch = 1.15, 0.95

        def cell(v, i, j, color=FG):
            t = MathTex(fnum(v), font_size=38, color=color)
            t.move_to([(j - 2) * cw, (1 - i) * ch, 0])
            return t

        core = VGroup(*[cell(Av[i][j], i, j) for i in range(3) for j in range(3)])
        core.shift(UP * 0.55 + LEFT * 0.9)
        lb = MathTex(r"\det", font_size=40).next_to(core, LEFT, buff=0.7)
        br_l = MathTex(r"\Big|", font_size=40)
        self.play(FadeIn(core), FadeIn(lb), run_time=1.0)
        self.wait(1.2)

        hint = body("Trick: die ersten beiden Spalten noch einmal rechts danebenschreiben.",
                    size=25)
        place(hint, x=0, top=TOP_Y - 0.15, w=12)
        self.play(FadeIn(hint), run_time=0.8)

        extra = VGroup()
        for i in range(3):
            for j in range(2):
                t = MathTex(fnum(Av[i][j]), font_size=38, color=MUTED)
                t.move_to(core[i * 3 + j].get_center() + RIGHT * 3 * cw)
                extra.add(t)
        self.play(LaggedStart(*[TransformFromCopy(core[i * 3 + j], extra[i * 2 + j])
                                for i in range(3) for j in range(2)],
                              lag_ratio=0.12), run_time=2.0)
        self.wait(1.4)

        allg = VGroup(core, extra)

        def pos(i, j):
            """j von 0..4 über beide Blöcke."""
            if j < 3:
                return core[i * 3 + j].get_center()
            return extra[i * 2 + (j - 3)].get_center()

        plus_terms = []
        minus_terms = []
        plus_lines = VGroup()
        minus_lines = VGroup()
        for s in range(3):
            p = [pos(k, s + k) for k in range(3)]
            plus_lines.add(Line(p[0] + UL * 0.02, p[2], color=GREEN, stroke_width=3.5))
            plus_terms.append([Av[k][(s + k) % 3] if s + k < 3 else Av[k][s + k - 3]
                               for k in range(3)])
        for s in range(3):
            p = [pos(2 - k, s + k) for k in range(3)]
            minus_lines.add(Line(p[0], p[2], color=RED, stroke_width=3.5))
            minus_terms.append([Av[2 - k][s + k] if s + k < 3 else Av[2 - k][s + k - 3]
                                for k in range(3)])

        self.play(FadeOut(hint), run_time=0.4)
        cap = small("Diagonalen nach rechts unten: addieren", size=24, color=GREEN)
        place(cap, x=0, top=-1.30, w=12)
        self.play(FadeIn(cap), Create(plus_lines), run_time=1.6)
        self.wait(1.6)

        pt = MathTex(*sum([[r"+" if k else "", pnum(t[0]), r"\cdot", pnum(t[1]),
                            r"\cdot", pnum(t[2])] for k, t in enumerate(plus_terms)], []),
                     font_size=34, color=GREEN)
        place(pt, x=0, top=-1.68, w=12)
        self.play(FadeIn(pt), run_time=1.0)
        self.wait(2.2)

        cap2 = small("Diagonalen nach rechts oben: subtrahieren", size=24, color=RED)
        place(cap2, x=0, top=-2.28, w=12)
        self.play(FadeIn(cap2), Create(minus_lines), run_time=1.6)
        self.wait(1.6)

        mt = MathTex(*sum([[r"-", pnum(t[0]), r"\cdot", pnum(t[1]), r"\cdot", pnum(t[2])]
                           for t in minus_terms], []), font_size=34, color=RED)
        place(mt, x=0, top=-2.66, w=12)
        self.play(FadeIn(mt), run_time=1.0)
        self.wait(2.4)

        self.play(FadeOut(VGroup(plus_lines, minus_lines, cap, cap2)), run_time=0.6)

        total = MathTex(r"\det A = (-2) + 20 + 0 + 15 - 16 - 0 = 17",
                        font_size=40, color=CYAN)
        place(total, x=0, top=-3.30, w=12)
        self.play(FadeIn(total, shift=UP * 0.2), run_time=1.2)
        self.play(Circumscribe(total, color=CYAN, buff=0.14), run_time=1.2)
        self.wait(3.4)

        self.play(*[FadeOut(m_) for m_ in self.mobjects[1:]], run_time=0.8)

        warn = caution_box(
            body("Sarrus funktioniert NUR bei 3×3-Matrizen.\n"
                 "Für größere Matrizen nimmt man den Laplace-Entwicklungssatz\n"
                 "oder bringt die Matrix mit dem Gauß-Verfahren auf Dreiecksform.",
                 size=24, color=FG), label="Achtung")
        place(warn, x=0, y=0, w=11)
        self.play(FadeIn(warn), run_time=1.0)
        self.wait(4.0)
        self.play(FadeOut(warn), run_time=0.8)


class D6Eigenschaften(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        hdr = section_header(self, "Rechenregeln für Determinanten", color=CYAN)

        items = [
            (r"\det(A\cdot B) = \det A \cdot \det B", "Produkt der Flächenfaktoren"),
            (r"\det(A^{T}) = \det A", "Transponieren ändert nichts"),
            (r"\det(k\cdot A) = k^{n}\cdot\det A", "bei einer n×n-Matrix"),
            (r"\det(E) = 1", "die Einheitsmatrix ändert keine Fläche"),
            (r"\det(A^{-1}) = \dfrac{1}{\det A}", "die Umkehrung staucht zurück"),
            (r"\text{Dreiecksmatrix: } \det A = a_{11}\cdot a_{22}\cdots a_{nn}",
             "einfach die Diagonale multiplizieren"),
        ]
        rows = VGroup()
        for tex, desc in items:
            m = MathTex(tex, font_size=34, color=FG)
            fit(m, w=5.6)
            d = Text(desc, font=FONT, font_size=20, color=DIM)
            holder = Rectangle(width=5.8, height=0.85, stroke_opacity=0, fill_opacity=0)
            m.move_to(holder).align_to(holder, LEFT)
            d.next_to(holder, RIGHT, buff=0.3).set_y(holder.get_y())
            rows.add(VGroup(holder, m, d))
        rows.arrange(DOWN, aligned_edge=LEFT, buff=0.32)
        place(rows, x=0, top=hdr.get_bottom()[1] - 0.5, h=5.3, w=12.5)

        for r in rows:
            self.play(FadeIn(r, shift=RIGHT * 0.25), run_time=0.7)
            self.wait(1.6)
        self.wait(4.0)
        self.play(*[FadeOut(m_) for m_ in self.mobjects[1:]], run_time=0.8)
