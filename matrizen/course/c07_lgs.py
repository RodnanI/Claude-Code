"""Kapitel 7 — Lineare Gleichungssysteme in Matrixform."""

from theme import *

TAG = "7 · Gleichungssysteme"


class K7Card(Scene):
    def construct(self):
        chapter_card(self, "07", "Gleichungssysteme",
                     "Der Gauß-Algorithmus in Matrixform", color=GREEN,
                     topics=["A·x = b", "Stufenform", "Rang", "Lösungsmengen"])


class G1Matrixform(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        section_header(self, "Ein LGS wird zu einer Gleichung", color=GREEN)

        sys_ = MathTex(r"\begin{aligned}"
                       r"x + 2y + z &= 8\\ 2x + y - z &= 1\\ 3x - y + 2z &= 7"
                       r"\end{aligned}", font_size=46)
        place(sys_, x=COL_L, y=0.7)
        self.play(Write(sys_), run_time=2.0)
        self.wait(2.0)

        A = MathTex(pmat([[1, 2, 1], [2, 1, -1], [3, -1, 2]]), font_size=44,
                    color=PURPLE)
        x = MathTex(cvec(["x", "y", "z"]), font_size=44, color=CYAN)
        eq = MathTex("=", font_size=44)
        b = MathTex(cvec([8, 1, 7]), font_size=44, color=GREEN)
        line = VGroup(A, x, eq, b).arrange(RIGHT, buff=0.28)
        place(line, x=COL_R, y=0.7, w=COL_W)

        self.play(FadeIn(A, shift=LEFT * 0.2), run_time=1.0)
        self.wait(1.2)
        self.play(FadeIn(x), FadeIn(eq), FadeIn(b), run_time=1.0)
        self.wait(2.0)

        labels = VGroup(
            MathTex(r"A", font_size=30, color=PURPLE).next_to(A, DOWN, buff=0.28),
            MathTex(r"\vec{x}", font_size=30, color=CYAN).next_to(x, DOWN, buff=0.28),
            MathTex(r"\vec{b}", font_size=30, color=GREEN).next_to(b, DOWN, buff=0.28),
        )
        self.play(FadeIn(labels), run_time=0.8)
        self.wait(1.4)

        short = MathTex(r"A\cdot\vec{x}=\vec{b}", font_size=58)
        short[0][0].set_color(PURPLE)
        short[0][2].set_color(CYAN)
        short[0][-1].set_color(GREEN)
        place(short, x=0, top=-1.55)
        self.play(Write(short), run_time=1.2)
        self.play(Circumscribe(short, color=GREEN, buff=0.2), run_time=1.2)
        self.wait(2.2)

        cap = body("Aus drei Gleichungen wird eine einzige Zeile.", size=27)
        place(cap, x=0, top=short.get_bottom()[1] - 0.5, w=11)
        self.play(FadeIn(cap), run_time=0.8)
        self.wait(3.0)
        self.play(*[FadeOut(m) for m in self.mobjects[1:]], run_time=0.8)


class G2Gauss(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        section_header(self, "Der Gauß-Algorithmus", color=GREEN)

        intro = body("Man schreibt nur noch die Zahlen auf — die erweiterte Koeffizientenmatrix.",
                     size=26)
        place(intro, x=0, top=TOP_Y - 0.15, w=12.4)
        self.play(FadeIn(intro), run_time=0.9)
        self.wait(2.2)

        def board(rows, size=46):
            tex = r"\left(\begin{array}{ccc|c}" + \
                  r"\\".join(" & ".join(fnum(v) for v in r) for r in rows) + \
                  r"\end{array}\right)"
            return MathTex(tex, font_size=size)

        stages = [
            ([[1, 2, 1, 8], [2, 1, -1, 1], [3, -1, 2, 7]], ""),
            ([[1, 2, 1, 8], [0, -3, -3, -15], [3, -1, 2, 7]], r"Z_2 - 2\,Z_1"),
            ([[1, 2, 1, 8], [0, -3, -3, -15], [0, -7, -1, -17]], r"Z_3 - 3\,Z_1"),
            ([[1, 2, 1, 8], [0, 1, 1, 5], [0, -7, -1, -17]], r"Z_2 : (-3)"),
            ([[1, 2, 1, 8], [0, 1, 1, 5], [0, 0, 6, 18]], r"Z_3 + 7\,Z_2"),
            ([[1, 2, 1, 8], [0, 1, 1, 5], [0, 0, 1, 3]], r"Z_3 : 6"),
        ]

        cur = board(stages[0][0])
        place(cur, x=0, y=1.55, w=8.6)
        self.play(FadeOut(intro), FadeIn(cur), run_time=1.0)
        self.wait(2.0)

        for rows, op in stages[1:]:
            new = board(rows).scale_to_fit_width(cur.width).move_to(cur)
            opm = MathTex(op, font_size=40, color=AMBER)
            opm.next_to(cur, RIGHT, buff=1.1)
            self.play(FadeIn(opm, shift=LEFT * 0.2), run_time=0.7)
            self.wait(0.8)
            self.play(FadeTransform(cur, new), run_time=1.2)
            cur = new
            self.wait(1.5)
            self.play(FadeOut(opm), run_time=0.4)

        stufen = h3("Stufenform erreicht — jetzt von unten nach oben einsetzen.",
                    size=29, color=GREEN)
        place(stufen, x=0, top=0.30, w=12)
        self.play(FadeIn(stufen, shift=UP * 0.2), run_time=0.9)
        self.wait(2.2)

        back = [
            (r"z = 3", "aus der letzten Zeile"),
            (r"y + 3 = 5 \;\Rightarrow\; y = 2", "in die zweite Zeile einsetzen"),
            (r"x + 4 + 3 = 8 \;\Rightarrow\; x = 1", "in die erste Zeile einsetzen"),
        ]
        prev = stufen
        shown = VGroup()
        for tex, why in back:
            m = MathTex(tex, font_size=38)
            m.next_to(prev, DOWN, buff=0.40).set_x(-1.4)
            note = small(why, size=20, color=DIM)
            note.next_to(m, RIGHT, buff=0.55).set_y(m.get_y())
            self.play(FadeIn(m, shift=UP * 0.15), FadeIn(note), run_time=0.8)
            self.wait(1.8)
            shown.add(m, note)
            prev = m

        res = MathTex(r"L=\{(1\,|\,2\,|\,3)\}", font_size=44, color=GREEN)
        res.next_to(prev, DOWN, buff=0.42).set_x(-1.4)
        self.play(Write(res), run_time=1.0)
        self.play(Circumscribe(res, color=GREEN, buff=0.14), run_time=1.1)
        self.wait(3.2)
        self.play(*[FadeOut(m) for m in self.mobjects[1:]], run_time=0.8)


class G3Zeilenumformungen(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        section_header(self, "Was ist erlaubt?", color=GREEN)

        intro = body("Diese drei Umformungen ändern die Lösungsmenge nicht:", size=27)
        place(intro, x=0, top=TOP_Y - 0.15, w=12)
        self.play(FadeIn(intro), run_time=0.9)
        self.wait(1.6)

        ops = [
            (r"Z_i \leftrightarrow Z_j", "Zwei Zeilen vertauschen", BLUE),
            (r"Z_i \to k\cdot Z_i \;\; (k\neq 0)", "Eine Zeile mit einer Zahl ≠ 0 multiplizieren", AMBER),
            (r"Z_i \to Z_i + k\cdot Z_j", "Das Vielfache einer Zeile zu einer anderen addieren", GREEN),
        ]
        rows = VGroup()
        for tex, desc, col in ops:
            m = MathTex(tex, font_size=40, color=col)
            d = Text(desc, font=FONT, font_size=23, color=MUTED)
            holder = Rectangle(width=4.6, height=0.9, stroke_opacity=0, fill_opacity=0)
            fit(m, w=4.4)
            m.move_to(holder).align_to(holder, LEFT)
            d.next_to(holder, RIGHT, buff=0.35).set_y(holder.get_y())
            rows.add(VGroup(holder, m, d))
        rows.arrange(DOWN, aligned_edge=LEFT, buff=0.55)
        place(rows, x=0, top=1.7, w=12.4)
        for r in rows:
            self.play(FadeIn(r, shift=RIGHT * 0.25), run_time=0.8)
            self.wait(2.0)
        self.wait(1.8)

        warn = caution_box(body("Niemals eine Zeile mit 0 multiplizieren —\n"
                                "dann verlierst du eine Gleichung.", size=24, color=FG))
        place(warn, x=0, top=rows.get_bottom()[1] - 0.7, w=10)
        self.play(FadeIn(warn), run_time=0.9)
        self.wait(3.4)
        self.play(*[FadeOut(m) for m in self.mobjects[1:]], run_time=0.8)


class G4Loesungsfaelle(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        section_header(self, "Drei mögliche Ergebnisse", color=GREEN)

        cases = [
            ("Genau eine Lösung",
             r"\left(\begin{array}{ccc|c}1&2&1&8\\0&1&1&5\\0&0&1&3\end{array}\right)",
             "Jede Variable ist festgelegt.\nDie drei Ebenen schneiden sich in einem Punkt.",
             GREEN),
            ("Keine Lösung",
             r"\left(\begin{array}{ccc|c}1&2&1&8\\0&1&1&5\\0&0&0&4\end{array}\right)",
             "Letzte Zeile heißt 0 = 4 — ein Widerspruch.\nDie Ebenen haben keinen gemeinsamen Punkt.",
             RED),
            ("Unendlich viele Lösungen",
             r"\left(\begin{array}{ccc|c}1&2&1&8\\0&1&1&5\\0&0&0&0\end{array}\right)",
             "Letzte Zeile heißt 0 = 0 — sie sagt nichts aus.\nEine Variable bleibt frei wählbar.",
             AMBER),
        ]

        for name, tex, desc, col in cases:
            ttl = h2(name, size=36, color=col)
            m = MathTex(tex, font_size=48)
            d = body(desc, size=25)
            grp = VGroup(ttl, m, d).arrange(DOWN, buff=0.6)
            place(grp, x=0, y=-0.15, w=11)
            self.play(FadeIn(ttl, shift=UP * 0.2), run_time=0.8)
            self.play(FadeIn(m), run_time=0.9)
            self.wait(1.4)
            zeile = SurroundingRectangle(m, color=col, stroke_width=3, buff=0.12,
                                         corner_radius=0.08)
            zeile.stretch_to_fit_height(0.55).align_to(m, DOWN).shift(UP * 0.34)
            self.play(Create(zeile), run_time=0.7)
            self.play(FadeIn(d), run_time=0.8)
            self.wait(4.0)
            self.play(FadeOut(VGroup(ttl, m, d, zeile)), run_time=0.7)

        self.play(*[FadeOut(m) for m in self.mobjects[1:]], run_time=0.7)


class G5Ebenen(ThreeDScene):
    """Geometrische Deutung: drei Ebenen im Raum."""

    def construct(self):
        self.set_camera_orientation(phi=64 * DEGREES, theta=-52 * DEGREES, zoom=0.9)

        axes = ThreeDAxes(
            x_range=[-3.4, 3.4, 1], y_range=[-3.4, 3.4, 1], z_range=[-2.6, 2.6, 1],
            x_length=6.4, y_length=6.4, z_length=4.6,
            axis_config={"stroke_color": DIM, "stroke_width": 2, "include_ticks": False},
        )
        self.add(axes)

        def plane_from(n, d, color):
            """Ebene n·x = d als Surface."""
            n = np.array(n, dtype=float)
            # zwei Richtungsvektoren senkrecht zu n
            tmp = np.array([1.0, 0, 0]) if abs(n[0]) < 0.9 else np.array([0, 1.0, 0])
            u = np.cross(n, tmp); u /= np.linalg.norm(u)
            w = np.cross(n, u); w /= np.linalg.norm(w)
            p0 = n * d / np.dot(n, n)
            s = Surface(
                lambda a, b: axes.c2p(*(p0 + a * u + b * w)),
                u_range=[-2.6, 2.6], v_range=[-2.6, 2.6],
                resolution=(10, 10), fill_opacity=0.42, stroke_width=0.6,
                checkerboard_colors=[color, color], stroke_color=color,
            )
            return s

        title = h2("Drei Ebenen im Raum", size=34, color=GREEN)
        title.to_edge(UP, buff=0.5)
        self.add_fixed_in_frame_mobjects(title)
        self.play(FadeIn(title), run_time=0.8)

        p1 = plane_from([1, 1, 1], 1, BLUE)
        p2 = plane_from([1, -1, 0], 0, PINK)
        p3 = plane_from([0, 1, -1], 0, AMBER)

        cap = body("Jede Gleichung beschreibt eine Ebene.", size=25)
        cp = panel(cap, pad=0.28, fill=SURFACE, opacity=0.92).to_edge(DOWN, buff=0.5)
        self.add_fixed_in_frame_mobjects(cp)

        self.play(FadeIn(p1), run_time=1.0)
        self.play(FadeIn(cp), run_time=0.5)
        self.play(FadeIn(p2), run_time=1.0)
        self.play(FadeIn(p3), run_time=1.0)
        self.wait(1.0)

        dot = Dot3D(axes.c2p(1 / 3, 1 / 3, 1 / 3), color=GREEN, radius=0.11)
        self.play(FadeIn(dot, scale=2.5), run_time=0.9)

        cap2 = body("Ein gemeinsamer Punkt  =  genau eine Lösung.", size=25, color=GREEN)
        cp2 = panel(cap2, pad=0.28, fill=SURFACE, opacity=0.92).to_edge(DOWN, buff=0.5)
        self.add_fixed_in_frame_mobjects(cp2)
        self.play(FadeOut(cp), FadeIn(cp2), run_time=0.7)

        self.begin_ambient_camera_rotation(rate=0.16)
        self.wait(9.0)
        self.stop_ambient_camera_rotation()

        cap3 = body("Liegen die Ebenen parallel oder schneiden sie sich in einer Geraden,\n"
                    "gibt es keine bzw. unendlich viele Lösungen.", size=24)
        cp3 = panel(cap3, pad=0.28, fill=SURFACE, opacity=0.92).to_edge(DOWN, buff=0.5)
        self.add_fixed_in_frame_mobjects(cp3)
        self.play(FadeOut(cp2), FadeIn(cp3), run_time=0.7)
        self.wait(4.0)

        self.play(FadeOut(VGroup(p1, p2, p3, dot, axes)), FadeOut(cp3), FadeOut(title),
                  run_time=1.0)


class G6UnendlichVieleLoesungen(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        section_header(self, "Wenn eine Variable frei bleibt", color=GREEN)

        board = MathTex(r"\left(\begin{array}{ccc|c}"
                        r"1&2&1&8\\0&1&1&5\\0&0&0&0\end{array}\right)", font_size=50)
        place(board, x=0, top=TOP_Y - 0.15)
        self.play(FadeIn(board), run_time=0.9)
        self.wait(1.8)

        steps = [
            (r"z = t \quad (t \in \mathbb{R})", "z frei wählen — der Parameter", AMBER),
            (r"y + t = 5 \;\Rightarrow\; y = 5 - t", "aus Zeile 2", FG),
            (r"x + 2(5-t) + t = 8 \;\Rightarrow\; x = t - 2", "aus Zeile 1", FG),
        ]
        prev = board
        shown = VGroup()
        for tex, why, col in steps:
            m = MathTex(tex, font_size=38, color=col)
            m.next_to(prev, DOWN, buff=0.45).set_x(-1.6)
            n = small(why, size=20, color=DIM)
            n.next_to(m, RIGHT, buff=0.6).set_y(m.get_y())
            self.play(FadeIn(m, shift=UP * 0.15), FadeIn(n), run_time=0.8)
            self.wait(2.0)
            shown.add(m, n)
            prev = m

        sol = MathTex(r"\vec{x}=" + cvec(["t-2", "5-t", "t"]) + "="
                      + cvec([-2, 5, 0]) + r"+\;t\cdot" + cvec([1, -1, 1]),
                      font_size=42, color=GREEN)
        place(sol, x=0, top=prev.get_bottom()[1] - 0.55, w=11)
        self.play(Write(sol), run_time=2.0)
        self.wait(2.4)

        cap = body("Das ist die Gleichung einer Geraden im Raum —\n"
                   "die Lösungsmenge ist unendlich groß.", size=25)
        place(cap, x=0, top=sol.get_bottom()[1] - 0.45, w=11)
        self.play(FadeIn(cap), run_time=0.9)
        self.wait(3.6)
        self.play(*[FadeOut(m) for m in self.mobjects[1:]], run_time=0.8)


class G7Rang(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        section_header(self, "Der Rang einer Matrix", color=GREEN)

        defi = VGroup(
            h3("Rang = Anzahl der Zeilen ≠ 0 in der Stufenform", size=30, color=FG),
            body("Er sagt, wie viele Gleichungen wirklich neue Information liefern.",
                 size=25),
        ).arrange(DOWN, buff=0.4)
        place(defi, x=0, top=TOP_Y - 0.15, w=12)
        self.play(FadeIn(defi[0], shift=UP * 0.2), run_time=0.9)
        self.play(FadeIn(defi[1]), run_time=0.8)
        self.wait(2.6)

        ex = VGroup(
            MathTex(r"\left(\begin{array}{ccc}1&2&1\\0&1&1\\0&0&1\end{array}\right)",
                    font_size=42, color=GREEN),
            MathTex(r"\left(\begin{array}{ccc}1&2&1\\0&1&1\\0&0&0\end{array}\right)",
                    font_size=42, color=AMBER),
        ).arrange(RIGHT, buff=2.2)
        place(ex, x=0, y=0.35)
        lab = VGroup(
            MathTex(r"\text{Rang}=3", font_size=36, color=GREEN).next_to(ex[0], DOWN, buff=0.4),
            MathTex(r"\text{Rang}=2", font_size=36, color=AMBER).next_to(ex[1], DOWN, buff=0.4),
        )
        self.play(FadeIn(ex), run_time=1.0)
        self.play(FadeIn(lab), run_time=0.8)
        self.wait(2.6)

        krit = VGroup(
            MathTex(r"\text{Rang}(A) = \text{Rang}(A|\vec{b}) = n"
                    r"\;\Rightarrow\; \text{genau eine Lösung}", font_size=34, color=GREEN),
            MathTex(r"\text{Rang}(A) = \text{Rang}(A|\vec{b}) < n"
                    r"\;\Rightarrow\; \text{unendlich viele Lösungen}", font_size=34,
                    color=AMBER),
            MathTex(r"\text{Rang}(A) < \text{Rang}(A|\vec{b})"
                    r"\;\Rightarrow\; \text{keine Lösung}", font_size=34, color=RED),
        ).arrange(DOWN, buff=0.4)
        place(krit, x=0, top=-1.5, w=12.4)
        for k in krit:
            self.play(FadeIn(k, shift=UP * 0.15), run_time=0.8)
            self.wait(1.9)
        self.wait(3.2)

        self.play(*[FadeOut(m) for m in self.mobjects[1:]], run_time=0.8)
