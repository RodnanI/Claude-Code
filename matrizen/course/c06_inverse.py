"""Kapitel 6 — Die inverse Matrix."""

from theme import *

TAG = "6 · Inverse Matrix"


class K6Card(Scene):
    def construct(self):
        chapter_card(self, "06", "Die inverse Matrix",
                     "Wie man eine lineare Abbildung rückgängig macht",
                     color=CYAN,
                     topics=["Idee", "2×2-Formel", "Gauß-Jordan", "LGS lösen"])


class I1Idee(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))

        intro = VGroup(
            h2("Bei Zahlen ist das leicht:", size=34, color=MUTED),
            MathTex(r"5 \cdot \tfrac{1}{5} = 1", font_size=56, color=AMBER),
            h2("Gibt es so etwas auch für Matrizen?", size=34, color=FG),
        ).arrange(DOWN, buff=0.55)
        place(intro, x=0, y=0, w=11)
        for m in intro:
            self.play(FadeIn(m, shift=UP * 0.2), run_time=0.9)
            self.wait(1.6)
        self.wait(1.6)
        self.play(FadeOut(intro), run_time=0.7)

        ghost = grid(x_range=(-14, 14, 1), y_range=(-9, 9, 1))
        ghost.set_opacity(0.28)
        pl = grid(x_range=(-14, 14, 1), y_range=(-9, 9, 1))
        pts = [(-1, -1), (1, -1), (1, 1), (0, 1.8), (-1, 1), (-1, -1)]
        house = VMobject(stroke_color=CYAN, stroke_width=6)
        house.set_points_as_corners([pl.c2p(*p) for p in pts])
        self.play(FadeIn(ghost), FadeIn(pl), Create(house), run_time=1.3)

        M = [[2, 1], [1, 1]]
        arr = np.array(M, dtype=float)
        bd = panel(MathTex("A=" + pmat(M), font_size=40, color=PURPLE), pad=0.34,
                   fill=SURFACE, opacity=0.94).to_corner(UL, buff=0.45)
        cap = panel(body("A verzerrt die Ebene.", size=26, color=FG), pad=0.3,
                    fill=SURFACE, opacity=0.92).to_edge(DOWN, buff=0.45)
        self.play(FadeIn(bd), FadeIn(cap), run_time=0.7)
        self.play(ApplyMatrix(arr, pl), ApplyMatrix(arr, house), run_time=2.3,
                  rate_func=rate_functions.ease_in_out_sine)
        self.wait(1.6)

        Minv = np.linalg.inv(arr)
        bd2 = panel(MathTex("A^{-1}=" + pmat([[1, -1], [-1, 2]]), font_size=40,
                            color=GREEN), pad=0.34, fill=SURFACE, opacity=0.94)
        bd2.next_to(bd, DOWN, buff=0.3).align_to(bd, LEFT)
        cap2 = panel(body("A⁻¹ macht genau das rückgängig.", size=26, color=GREEN),
                     pad=0.3, fill=SURFACE, opacity=0.92).to_edge(DOWN, buff=0.45)
        self.play(FadeIn(bd2), FadeTransform(cap, cap2), run_time=0.9)
        self.wait(1.2)
        self.play(ApplyMatrix(Minv, pl), ApplyMatrix(Minv, house), run_time=2.3,
                  rate_func=rate_functions.ease_in_out_sine)
        self.wait(2.0)

        cap3 = panel(body("Nacheinander ausgeführt ergeben sie „nichts tun“ — also E.",
                          size=26, color=FG), pad=0.3, fill=SURFACE,
                     opacity=0.92).to_edge(DOWN, buff=0.45)
        self.play(FadeTransform(cap2, cap3), run_time=0.9)
        self.wait(3.0)
        self.play(FadeOut(VGroup(pl, ghost, house, bd, bd2, cap3)), run_time=0.9)

        defi = VGroup(
            h2("Definition", size=34, color=CYAN),
            MathTex(r"A\cdot A^{-1} = A^{-1}\cdot A = E", font_size=54),
            body("A⁻¹ heißt die zu A inverse Matrix.\n"
                 "Es gibt sie nur für quadratische Matrizen mit det A ≠ 0.", size=26),
        ).arrange(DOWN, buff=0.6)
        place(defi, x=0, y=0, w=11.5)
        self.play(FadeIn(defi[0]), run_time=0.7)
        self.play(Write(defi[1]), run_time=1.6)
        self.wait(1.4)
        self.play(FadeIn(defi[2]), run_time=0.9)
        self.wait(4.0)
        self.play(FadeOut(defi), run_time=0.8)


class I2Formel2x2(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        section_header(self, "Die Formel für 2×2-Matrizen", color=CYAN)

        f = MathTex(r"A=\begin{pmatrix} a & b\\ c & d\end{pmatrix}"
                    r"\quad\Longrightarrow\quad "
                    r"A^{-1}=\frac{1}{ad-bc}\begin{pmatrix} d & -b\\ -c & a\end{pmatrix}",
                    font_size=48)
        place(f, x=0, y=1.6, w=12.4)
        self.play(Write(f), run_time=2.6)
        self.wait(2.2)

        merk = note_box(body("Merksatz: Hauptdiagonale tauschen,\n"
                             "Nebendiagonale mit −1 multiplizieren,\n"
                             "alles durch die Determinante teilen.", size=24, color=FG),
                        color=AMBER, label="So merkt man sich das")
        place(merk, x=0, top=0.55, w=9.5)
        self.play(FadeIn(merk), run_time=0.9)
        self.wait(3.6)
        self.play(FadeOut(merk), run_time=0.6)

        # Konkretes Beispiel
        steps = [
            (r"A=" + pmat([[3, 1], [1, 2]]), FG),
            (r"\det A = 3\cdot 2 - 1\cdot 1 = 5", CYAN),
            (r"A^{-1}=\frac{1}{5}" + pmat([[2, -1], [-1, 3]]), GREEN),
            (r"A^{-1}=" + pmat([[r"\tfrac{2}{5}", r"-\tfrac{1}{5}"],
                                [r"-\tfrac{1}{5}", r"\tfrac{3}{5}"]]), GREEN),
        ]
        prev = None
        shown = VGroup()
        for tex, col in steps:
            m = MathTex(tex, font_size=42, color=col)
            if prev is None:
                place(m, x=0, top=0.6)
            else:
                m.next_to(prev, DOWN, buff=0.45)
            self.play(FadeIn(m, shift=UP * 0.15), run_time=0.9)
            self.wait(1.9)
            shown.add(m)
            prev = m
        self.wait(1.6)

        self.play(FadeOut(VGroup(f, shown)), run_time=0.7)

        # Probe
        probe = h3("Probe:", size=32, color=FG)
        place(probe, x=0, top=TOP_Y - 0.2)
        check = MathTex(pmat([[3, 1], [1, 2]]), r"\cdot", r"\frac{1}{5}",
                        pmat([[2, -1], [-1, 3]]), "=", r"\frac{1}{5}",
                        pmat([[5, 0], [0, 5]]), "=", pmat([[1, 0], [0, 1]]), "=", "E",
                        font_size=44)
        check[-1].set_color(GREEN)
        check[-3].set_color(GREEN)
        place(check, x=0, y=0.6, w=12.4)
        self.play(FadeIn(probe), run_time=0.6)
        self.play(Write(check), run_time=2.8)
        self.wait(2.4)

        detail = MathTex(r"3\cdot 2 + 1\cdot(-1) = 5,\qquad 3\cdot(-1)+1\cdot 3 = 0",
                         font_size=34, color=MUTED)
        place(detail, x=0, y=-0.9, w=12)
        self.play(FadeIn(detail), run_time=0.9)
        self.wait(2.8)

        fin = h3("Es kommt tatsächlich die Einheitsmatrix heraus.", size=30, color=GREEN)
        place(fin, x=0, y=-2.1, w=12)
        self.play(FadeIn(fin, shift=UP * 0.2), run_time=0.9)
        self.wait(3.2)
        self.play(*[FadeOut(m) for m in self.mobjects[1:]], run_time=0.8)


class I3GaussJordan(Scene):
    """[A | E]  ->  [E | A^-1] Schritt für Schritt."""

    def construct(self):
        self.add(chapter_tag(TAG))
        section_header(self, "Größere Matrizen: das Gauß-Jordan-Verfahren", color=CYAN)

        idea = body("Man schreibt A und E nebeneinander und formt A mit Zeilenumformungen\n"
                    "zur Einheitsmatrix um. Rechts entsteht dabei automatisch A⁻¹.",
                    size=26)
        place(idea, x=0, top=TOP_Y - 0.15, w=12)
        self.play(FadeIn(idea), run_time=1.0)
        self.wait(3.0)

        schema = MathTex(r"\left(\,A \;\middle|\; E\,\right) \;\longrightarrow\;"
                         r"\left(\,E \;\middle|\; A^{-1}\,\right)", font_size=52)
        place(schema, x=0, y=0.9)
        self.play(Write(schema), run_time=1.6)
        self.wait(2.6)
        self.play(FadeOut(schema), FadeOut(idea), run_time=0.7)

        half = r"\tfrac{1}{2}"
        mhalf = r"-\tfrac{1}{2}"
        stages = [
            ([[1, 1, 0], [0, 1, 1], [1, 0, 1]],
             [[1, 0, 0], [0, 1, 0], [0, 0, 1]], ""),
            ([[1, 1, 0], [0, 1, 1], [0, -1, 1]],
             [[1, 0, 0], [0, 1, 0], [-1, 0, 1]], r"Z_3 - Z_1"),
            ([[1, 1, 0], [0, 1, 1], [0, 0, 2]],
             [[1, 0, 0], [0, 1, 0], [-1, 1, 1]], r"Z_3 + Z_2"),
            ([[1, 1, 0], [0, 1, 1], [0, 0, 1]],
             [[1, 0, 0], [0, 1, 0], [mhalf, half, half]], r"Z_3 : 2"),
            ([[1, 1, 0], [0, 1, 0], [0, 0, 1]],
             [[1, 0, 0], [half, half, mhalf], [mhalf, half, half]], r"Z_2 - Z_3"),
            ([[1, 0, 0], [0, 1, 0], [0, 0, 1]],
             [[half, mhalf, half], [half, half, mhalf], [mhalf, half, half]],
             r"Z_1 - Z_2"),
        ]

        def board(L, R):
            rows = [[fnum(v) for v in L[i]] + [r"\;\Big|"] + [fnum(v) for v in R[i]]
                    for i in range(3)]
            tex = r"\left(\begin{array}{ccc|ccc}" + \
                  r"\\".join(" & ".join([fnum(v) for v in L[i]] +
                                        [fnum(v) for v in R[i]]) for i in range(3)) + \
                  r"\end{array}\right)"
            return MathTex(tex, font_size=44)

        cur = board(*stages[0][:2])
        place(cur, x=0, y=0.35, w=9)
        lbl = MathTex(r"(\,A \mid E\,)", font_size=34, color=MUTED)
        lbl.next_to(cur, UP, buff=0.45)
        self.play(FadeIn(cur), FadeIn(lbl), run_time=1.0)
        self.wait(2.0)

        for L, R, op in stages[1:]:
            new = board(L, R)
            new.move_to(cur).scale_to_fit_width(cur.width)
            opm = MathTex(op, font_size=40, color=AMBER)
            opm.next_to(cur, RIGHT, buff=1.0)
            self.play(FadeIn(opm, shift=LEFT * 0.2), run_time=0.7)
            self.wait(0.9)
            self.play(FadeTransform(cur, new), run_time=1.3)
            cur = new
            self.wait(1.6)
            self.play(FadeOut(opm), run_time=0.4)

        self.play(lbl.animate.become(
            MathTex(r"(\,E \mid A^{-1}\,)", font_size=34, color=GREEN)
            .next_to(cur, UP, buff=0.45)), run_time=0.7)
        self.wait(1.4)

        res = MathTex(r"A^{-1}=\frac{1}{2}" + pmat([[1, -1, 1], [1, 1, -1], [-1, 1, 1]]),
                      font_size=44, color=GREEN)
        place(res, x=0, top=-1.7, w=10)
        self.play(FadeIn(res, shift=UP * 0.2), run_time=1.1)
        self.play(Circumscribe(res, color=GREEN, buff=0.16), run_time=1.2)
        self.wait(3.8)
        self.play(*[FadeOut(m) for m in self.mobjects[1:]], run_time=0.8)


class I4Regeln(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        hdr = section_header(self, "Regeln rund um die Inverse", color=CYAN)

        items = [
            (r"(A^{-1})^{-1} = A", "zweimal umkehren = nichts tun"),
            (r"(A\cdot B)^{-1} = B^{-1}\cdot A^{-1}", "Reihenfolge dreht sich um"),
            (r"(A^{T})^{-1} = (A^{-1})^{T}", "Transponieren und Invertieren vertauschen"),
            (r"\det(A^{-1}) = \dfrac{1}{\det A}", "Flächenfaktor kehrt sich um"),
        ]
        rows = VGroup()
        for tex, desc in items:
            m = MathTex(tex, font_size=38, color=FG)
            d = Text(desc, font=FONT, font_size=21, color=DIM)
            holder = Rectangle(width=5.2, height=0.95, stroke_opacity=0, fill_opacity=0)
            fit(m, w=5.0)
            m.move_to(holder).align_to(holder, LEFT)
            d.next_to(holder, RIGHT, buff=0.35).set_y(holder.get_y())
            rows.add(VGroup(holder, m, d))
        rows.arrange(DOWN, aligned_edge=LEFT, buff=0.45)
        place(rows, x=0, top=hdr.get_bottom()[1] - 0.6, w=12.4)

        for r in rows:
            self.play(FadeIn(r, shift=RIGHT * 0.25), run_time=0.7)
            self.wait(1.9)
        self.wait(2.2)

        sock = note_box(body("Eselsbrücke zu (A·B)⁻¹ = B⁻¹·A⁻¹:\n"
                             "Erst Socken, dann Schuhe anziehen —\n"
                             "beim Ausziehen erst Schuhe, dann Socken.",
                             size=24, color=FG), color=AMBER, label="Merkhilfe")
        place(sock, x=0, top=rows.get_bottom()[1] - 0.6, w=10)
        self.play(FadeIn(sock), run_time=0.9)
        self.wait(4.0)
        self.play(*[FadeOut(m) for m in self.mobjects[1:]], run_time=0.8)


class I5LGSmitInverse(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        section_header(self, "Gleichungssysteme mit der Inversen lösen", color=CYAN)

        sys_ = MathTex(r"\begin{aligned} 3x + y &= 11\\ x + 2y &= 12 \end{aligned}",
                       font_size=46)
        place(sys_, x=COL_L, top=TOP_Y - 0.2)
        self.play(Write(sys_), run_time=1.4)
        self.wait(1.6)

        mform = MathTex(pmat([[3, 1], [1, 2]]) + cvec(["x", "y"]) + "="
                        + cvec([11, 12]), font_size=44)
        place(mform, x=COL_R, top=TOP_Y - 0.2, w=COL_W)
        self.play(Write(mform), run_time=1.6)
        self.wait(2.0)

        short = MathTex(r"A\cdot \vec{x} = \vec{b}", font_size=52, color=PURPLE)
        place(short, x=0, y=0.85)
        self.play(FadeIn(short, shift=UP * 0.2), run_time=0.9)
        self.wait(1.8)

        arrow = MathTex(r"\Big\Downarrow\;\; \text{beidseitig mit } A^{-1} \text{ multiplizieren}",
                        font_size=34, color=MUTED)
        place(arrow, x=0, y=0.05, w=11)
        sol = MathTex(r"\vec{x} = A^{-1}\cdot\vec{b}", font_size=52, color=GREEN)
        place(sol, x=0, y=-0.75)
        self.play(FadeIn(arrow), run_time=0.8)
        self.play(Write(sol), run_time=1.2)
        self.wait(2.6)

        calc = MathTex(r"\vec{x}=\frac{1}{5}" + pmat([[2, -1], [-1, 3]]) + cvec([11, 12])
                       + r"=\frac{1}{5}" + cvec([r"22-12", r"-11+36"])
                       + r"=\frac{1}{5}" + cvec([10, 25]) + "=" + cvec([2, 5]),
                       font_size=36)
        place(calc, x=0, top=-1.55, w=12.6)
        self.play(Write(calc), run_time=3.0)
        self.wait(2.6)

        res = MathTex(r"x=2,\quad y=5", font_size=44, color=GREEN)
        place(res, x=0, top=calc.get_bottom()[1] - 0.45)
        self.play(FadeIn(res, shift=UP * 0.2), run_time=0.9)
        self.play(Circumscribe(res, color=GREEN, buff=0.14), run_time=1.1)
        self.wait(3.0)

        self.play(FadeOut(VGroup(sys_, mform, short, arrow, sol, calc, res)), run_time=0.8)

        nb = note_box(
            body("Praktisch, wenn man dasselbe A mit vielen verschiedenen b braucht:\n"
                 "A⁻¹ einmal berechnen, dann nur noch multiplizieren.\n"
                 "Für ein einzelnes LGS ist das Gauß-Verfahren aber schneller.",
                 size=24, color=FG), color=CYAN, label="Wann lohnt sich das?")
        place(nb, x=0, y=0, w=11)
        self.play(FadeIn(nb), run_time=1.0)
        self.wait(4.4)
        self.play(FadeOut(nb), run_time=0.8)
