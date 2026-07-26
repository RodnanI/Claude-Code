"""Kapitel 9 — Anwendungen."""

from theme import *

TAG = "9 · Anwendungen"


class K9Card(Scene):
    def construct(self):
        chapter_card(self, "09", "Anwendungen",
                     "Wofür man das im echten Leben braucht", color=AMBER,
                     topics=["Übergangsmatrizen", "Materialverflechtung",
                             "Fibonacci", "3D-Grafik"])


class P1Markow(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        section_header(self, "Übergangsmatrizen: das Wetter von morgen", color=AMBER)

        story = body("Modell: Auf einen sonnigen Tag folgt zu 80 % wieder Sonne.\n"
                     "Auf einen Regentag folgt zu 40 % Sonne.", size=26)
        place(story, x=0, top=TOP_Y - 0.15, w=12)
        self.play(FadeIn(story), run_time=1.0)
        self.wait(2.8)

        # Zustandsdiagramm
        s = Circle(radius=0.72, color=AMBER, stroke_width=3,
                   fill_color=AMBER, fill_opacity=0.12).move_to([-2.6, -0.15, 0])
        r = Circle(radius=0.72, color=BLUE, stroke_width=3,
                   fill_color=BLUE, fill_opacity=0.12).move_to([2.6, -0.15, 0])
        sl = Text("Sonne", font=FONT, font_size=24, color=AMBER).move_to(s)
        rl = Text("Regen", font=FONT, font_size=24, color=BLUE).move_to(r)

        a_sr = CurvedArrow(s.get_top() + UP * 0.05, r.get_top() + UP * 0.05,
                           angle=-0.8, color=DIM, stroke_width=3, tip_length=0.18)
        a_rs = CurvedArrow(r.get_bottom() + DOWN * 0.05, s.get_bottom() + DOWN * 0.05,
                           angle=-0.8, color=DIM, stroke_width=3, tip_length=0.18)
        loop_s = CurvedArrow(s.get_left() + UP * 0.35, s.get_left() + DOWN * 0.35,
                             angle=3.6, color=AMBER, stroke_width=3, tip_length=0.16)
        loop_r = CurvedArrow(r.get_right() + DOWN * 0.35, r.get_right() + UP * 0.35,
                             angle=3.6, color=BLUE, stroke_width=3, tip_length=0.16)

        t_sr = MathTex("0{,}2", font_size=28, color=MUTED).next_to(a_sr, UP, buff=0.08)
        t_rs = MathTex("0{,}4", font_size=28, color=MUTED).next_to(a_rs, DOWN, buff=0.08)
        t_ss = MathTex("0{,}8", font_size=28, color=AMBER).next_to(loop_s, LEFT, buff=0.1)
        t_rr = MathTex("0{,}6", font_size=28, color=BLUE).next_to(loop_r, RIGHT, buff=0.1)

        diagram = VGroup(s, r, sl, rl, a_sr, a_rs, loop_s, loop_r,
                         t_sr, t_rs, t_ss, t_rr)
        self.play(FadeIn(VGroup(s, r, sl, rl)), run_time=0.9)
        self.play(Create(a_sr), FadeIn(t_sr), Create(a_rs), FadeIn(t_rs), run_time=1.2)
        self.play(Create(loop_s), FadeIn(t_ss), Create(loop_r), FadeIn(t_rr), run_time=1.2)
        self.wait(2.4)

        M = MathTex(r"M=" + pmat([["0{,}8", "0{,}4"], ["0{,}2", "0{,}6"]]),
                    font_size=44, color=PURPLE)
        place(M, x=0, top=-1.75)
        self.play(Write(M), run_time=1.4)
        self.wait(1.6)

        hint = small("Spalte 1: was aus Sonne wird.   Spalte 2: was aus Regen wird.\n"
                     "Jede Spalte summiert sich zu 1.", size=22, color=MUTED)
        place(hint, x=0, top=M.get_bottom()[1] - 0.4, w=12)
        self.play(FadeIn(hint), run_time=0.9)
        self.wait(3.4)

        self.play(FadeOut(VGroup(story, diagram, hint)), run_time=0.7)
        self.play(M.animate.scale(0.75).move_to([-5.1, 2.15, 0]), run_time=0.9)

        # Iteration
        states = [(1.0, 0.0)]
        Mn = np.array([[0.8, 0.4], [0.2, 0.6]])
        for _ in range(6):
            states.append(tuple(Mn @ np.array(states[-1])))

        bar_h, bar_w = 2.6, 0.72
        base_y = -2.2

        def bars(p, x0):
            g = VGroup()
            for k, (val, col, name) in enumerate([(p[0], AMBER, "Sonne"),
                                                  (p[1], BLUE, "Regen")]):
                b = Rectangle(width=bar_w, height=max(val * bar_h, 0.02),
                              stroke_width=0, fill_color=col, fill_opacity=0.85)
                b.move_to([x0 + (k - 0.5) * (bar_w + 0.14),
                           base_y + max(val * bar_h, 0.02) / 2, 0])
                g.add(b)
            lab = MathTex(f"{p[0]:.3f}".replace(".", "{,}"), font_size=22, color=AMBER)
            lab.move_to([x0 - 0.5 * (bar_w + 0.14), base_y - 0.28, 0])
            lab2 = MathTex(f"{p[1]:.3f}".replace(".", "{,}"), font_size=22, color=BLUE)
            lab2.move_to([x0 + 0.5 * (bar_w + 0.14), base_y - 0.28, 0])
            g.add(lab, lab2)
            return g

        axis = Line([-5.6, base_y, 0], [6.0, base_y, 0], color=BORDER, stroke_width=2)
        self.play(Create(axis), run_time=0.6)

        head = h3("Wie entwickelt sich das Wetter, wenn heute die Sonne scheint?",
                  size=28, color=FG)
        place(head, x=1.1, top=TOP_Y - 0.2, w=7.9)
        self.play(FadeIn(head), run_time=0.9)

        xs = [-4.6 + i * 1.78 for i in range(7)]
        prev_bar = None
        for i, p in enumerate(states):
            g = bars(p, xs[i])
            tag = small(f"Tag {i}", size=20, color=DIM)
            tag.move_to([xs[i], base_y - 0.62, 0])
            self.play(FadeIn(g, shift=UP * 0.2), FadeIn(tag), run_time=0.6)
            if i == 0:
                self.wait(1.2)
            else:
                self.wait(0.85)
        self.wait(2.2)

        conv = h3("Es pendelt sich ein — unabhängig vom Startwetter.",
                  size=29, color=GREEN)
        place(conv, x=1.1, top=head.get_bottom()[1] - 0.45, w=8.4)
        self.play(FadeIn(conv, shift=UP * 0.2), run_time=0.9)
        self.wait(3.0)

        self.play(*[FadeOut(m) for m in self.mobjects[1:]], run_time=0.8)

        # Stationäre Verteilung
        section_header(self, "Der stabile Endzustand", color=AMBER)
        t1 = body("Gesucht ist der Vektor, den M nicht mehr verändert:", size=27)
        place(t1, x=0, top=TOP_Y - 0.15, w=12)
        self.play(FadeIn(t1), run_time=0.8)

        eq = MathTex(r"M\cdot\vec{x} = \vec{x}", font_size=54, color=PINK)
        place(eq, x=0, top=t1.get_bottom()[1] - 0.5)
        self.play(Write(eq), run_time=1.2)
        self.wait(1.6)

        hint2 = body("Das ist genau ein Eigenvektor zum Eigenwert λ = 1!", size=27,
                     color=PINK)
        place(hint2, x=0, top=eq.get_bottom()[1] - 0.45, w=12)
        self.play(FadeIn(hint2), run_time=0.9)
        self.wait(2.6)

        calc = VGroup(
            MathTex(r"0{,}8\,s + 0{,}4\,r = s \quad\text{und}\quad s + r = 1",
                    font_size=38),
            MathTex(r"0{,}8\,s + 0{,}4\,(1-s) = s", font_size=38),
            MathTex(r"0{,}4 = 0{,}6\,s \;\Longrightarrow\; s = \tfrac{2}{3}", font_size=38),
            MathTex(r"\vec{x} = " + cvec([r"\tfrac{2}{3}", r"\tfrac{1}{3}"])
                    + r"\;\approx\;" + cvec(["0{,}667", "0{,}333"]),
                    font_size=40, color=GREEN),
        ).arrange(DOWN, buff=0.42)
        place(calc, x=0, top=hint2.get_bottom()[1] - 0.5, w=12)
        for c in calc:
            self.play(FadeIn(c, shift=UP * 0.15), run_time=0.8)
            self.wait(1.9)
        self.wait(1.6)

        fin = small("Auf lange Sicht: an zwei von drei Tagen scheint die Sonne.",
                    size=23, color=MUTED)
        place(fin, x=0, top=calc.get_bottom()[1] - 0.4, w=12)
        self.play(FadeIn(fin), run_time=0.8)
        self.wait(3.2)
        self.play(*[FadeOut(m) for m in self.mobjects[1:]], run_time=0.8)


class P2Verflechtung(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        section_header(self, "Materialverflechtung", color=AMBER)

        story = body("Eine Fabrik macht aus 2 Rohstoffen 3 Zwischenprodukte\n"
                     "und daraus 2 Endprodukte.", size=27)
        place(story, x=0, top=TOP_Y - 0.15, w=12)
        self.play(FadeIn(story), run_time=1.0)
        self.wait(2.4)

        # Fluss-Diagramm
        def col(labels, x, color):
            g = VGroup()
            for k, l in enumerate(labels):
                box = RoundedRectangle(width=1.5, height=0.6, corner_radius=0.12,
                                       stroke_color=color, stroke_width=2,
                                       fill_color=color, fill_opacity=0.12)
                t = Text(l, font=FONT, font_size=20, color=color).move_to(box)
                grp = VGroup(box, t)
                grp.move_to([x, 0.6 - k * 0.95, 0])
                g.add(grp)
            g.move_to([x, -0.35, 0])
            return g

        R = col(["R₁", "R₂"], -4.6, CYAN)
        Z = col(["Z₁", "Z₂", "Z₃"], 0.0, PURPLE)
        E = col(["E₁", "E₂"], 4.6, GREEN)

        arrows1 = VGroup(*[Arrow(a.get_right(), b.get_left(), buff=0.12, color=BORDER,
                                 stroke_width=2, tip_length=0.12)
                           for a in R for b in Z])
        arrows2 = VGroup(*[Arrow(a.get_right(), b.get_left(), buff=0.12, color=BORDER,
                                 stroke_width=2, tip_length=0.12)
                           for a in Z for b in E])

        self.play(FadeIn(R), FadeIn(Z), FadeIn(E), run_time=1.0)
        self.play(Create(arrows1), Create(arrows2), run_time=1.4)
        lab1 = MathTex("A", font_size=34, color=CYAN).move_to([-2.3, 1.75, 0])
        lab2 = MathTex("B", font_size=34, color=PURPLE).move_to([2.3, 1.75, 0])
        self.play(FadeIn(lab1), FadeIn(lab2), run_time=0.6)
        self.wait(2.6)

        self.play(FadeOut(VGroup(R, Z, E, arrows1, arrows2, lab1, lab2, story)),
                  run_time=0.7)

        Av = [[2, 1, 3], [1, 4, 0]]
        Bv = [[1, 2], [3, 0], [2, 1]]
        Cv = [[11, 7], [13, 2]]

        A = MathTex("A=" + pmat(Av), font_size=40, color=CYAN)
        capA = small("Rohstoff pro Zwischenprodukt", size=21, color=DIM)
        B = MathTex("B=" + pmat(Bv), font_size=40, color=PURPLE)
        capB = small("Zwischenprodukt pro Endprodukt", size=21, color=DIM)
        gA = VGroup(A, capA).arrange(DOWN, buff=0.3)
        gB = VGroup(B, capB).arrange(DOWN, buff=0.3)
        row = VGroup(gA, gB).arrange(RIGHT, buff=1.6)
        place(row, x=0, top=TOP_Y - 0.2, w=12)
        self.play(FadeIn(gA), run_time=0.9)
        self.wait(1.8)
        self.play(FadeIn(gB), run_time=0.9)
        self.wait(2.2)

        q = h3("Wie viel Rohstoff steckt direkt in einem Endprodukt?", size=29, color=FG)
        place(q, x=0, top=row.get_bottom()[1] - 0.6, w=12)
        self.play(FadeIn(q), run_time=0.9)
        self.wait(2.0)

        prod = MathTex("C = A\\cdot B =" + pmat(Av) + pmat(Bv) + "=" + pmat(Cv),
                       font_size=40, color=GREEN)
        place(prod, x=0, top=q.get_bottom()[1] - 0.5, w=12.4)
        self.play(Write(prod), run_time=2.4)
        self.wait(2.4)

        read = body("Beispiel: für ein Stück E₁ braucht man 11 Einheiten R₁ und 13 Einheiten R₂.",
                    size=25)
        place(read, x=0, top=prod.get_bottom()[1] - 0.45, w=12.4)
        self.play(FadeIn(read), run_time=0.9)
        self.wait(3.4)

        self.play(FadeOut(VGroup(row, q, prod, read)), run_time=0.7)

        auf = VGroup(
            h3("Und wenn 5 Stück E₁ und 8 Stück E₂ bestellt werden?", size=29, color=FG),
            MathTex(r"\vec{r} = C\cdot\vec{e} = " + pmat(Cv) + cvec([5, 8])
                    + "=" + cvec([r"55+56", r"65+16"]) + "=" + cvec([111, 81]),
                    font_size=40, color=GREEN),
            body("Also 111 Einheiten R₁ und 81 Einheiten R₂.", size=26),
        ).arrange(DOWN, buff=0.6)
        place(auf, x=0, y=0.2, w=12.4)
        for m in auf:
            self.play(FadeIn(m, shift=UP * 0.15), run_time=1.0)
            self.wait(2.4)
        self.wait(3.0)
        self.play(*[FadeOut(m) for m in self.mobjects[1:]], run_time=0.8)


class P3Fibonacci(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        section_header(self, "Fibonacci mit einer Matrix", color=AMBER)

        seq = MathTex("1,\\;1,\\;2,\\;3,\\;5,\\;8,\\;13,\\;21,\\;34,\\;\\dots",
                      font_size=48, color=CYAN)
        place(seq, x=0, top=TOP_Y - 0.15)
        self.play(Write(seq), run_time=1.6)
        rule = body("Jede Zahl ist die Summe der beiden vorherigen.", size=26)
        place(rule, x=0, top=seq.get_bottom()[1] - 0.4, w=12)
        self.play(FadeIn(rule), run_time=0.8)
        self.wait(2.6)

        idea = MathTex(pmat([[1, 1], [1, 0]]) + cvec(["f_n", "f_{n-1}"]) + "="
                       + cvec(["f_n+f_{n-1}", "f_n"]) + "=" + cvec(["f_{n+1}", "f_n"]),
                       font_size=42)
        place(idea, x=0, top=rule.get_bottom()[1] - 0.6, w=12.4)
        self.play(Write(idea), run_time=2.4)
        self.wait(2.8)

        cap = h3("Ein Schritt der Folge = eine Multiplikation mit dieser Matrix.",
                 size=29, color=GREEN)
        place(cap, x=0, top=idea.get_bottom()[1] - 0.5, w=12)
        self.play(FadeIn(cap), run_time=0.9)
        self.wait(2.4)

        pow_ = MathTex(pmat([[1, 1], [1, 0]]) + r"^{\,n}=" +
                       pmat([["f_{n+1}", "f_n"], ["f_n", "f_{n-1}"]]),
                       font_size=44, color=AMBER)
        place(pow_, x=0, top=cap.get_bottom()[1] - 0.5, w=11)
        self.play(Write(pow_), run_time=1.8)
        self.wait(2.4)

        note = small("Mit Diagonalisierung bekommt man daraus sogar eine geschlossene Formel —\n"
                     "die Formel von Binet, in der der Goldene Schnitt auftaucht.",
                     size=22, color=MUTED)
        place(note, x=0, top=pow_.get_bottom()[1] - 0.4, w=12.4)
        self.play(FadeIn(note), run_time=0.9)
        self.wait(3.6)
        self.play(*[FadeOut(m) for m in self.mobjects[1:]], run_time=0.8)


class P4Grafik(ThreeDScene):
    def construct(self):
        self.set_camera_orientation(phi=68 * DEGREES, theta=-45 * DEGREES, zoom=0.95)

        title = h2("3D-Grafik: alles sind Matrizen", size=34, color=AMBER)
        title.to_edge(UP, buff=0.5)
        self.add_fixed_in_frame_mobjects(title)

        axes = ThreeDAxes(
            x_range=[-3, 3, 1], y_range=[-3, 3, 1], z_range=[-2, 2, 1],
            x_length=5.6, y_length=5.6, z_length=3.6,
            axis_config={"stroke_color": DIM, "stroke_width": 2, "include_ticks": False},
        )
        cube = Cube(side_length=1.6, fill_opacity=0.35, fill_color=BLUE,
                    stroke_color=CYAN, stroke_width=2.5)
        self.play(FadeIn(axes), FadeIn(title), run_time=0.9)
        self.play(FadeIn(cube), run_time=0.9)

        cap = panel(body("Jede Drehung, Streckung und Verzerrung eines 3D-Objekts\n"
                         "ist eine Multiplikation mit einer 3×3-Matrix.", size=24),
                    pad=0.3, fill=SURFACE, opacity=0.92).to_edge(DOWN, buff=0.45)
        self.add_fixed_in_frame_mobjects(cap)
        self.play(FadeIn(cap), run_time=0.7)
        self.wait(1.8)

        Rz = MathTex(r"R_z=" + pmat([[r"\cos\alpha", r"-\sin\alpha", 0],
                                     [r"\sin\alpha", r"\cos\alpha", 0],
                                     [0, 0, 1]]), font_size=34, color=PURPLE)
        rp = panel(Rz, pad=0.3, fill=SURFACE, opacity=0.94).to_corner(UL, buff=0.45)
        self.add_fixed_in_frame_mobjects(rp)
        self.play(FadeIn(rp), run_time=0.7)

        self.play(Rotate(cube, angle=TAU * 0.75, axis=OUT, about_point=ORIGIN),
                  run_time=4.0, rate_func=rate_functions.ease_in_out_sine)
        self.wait(0.6)

        S = MathTex(r"S=" + pmat([[1.6, 0, 0], [0, 0.6, 0], [0, 0, 1.4]]),
                    font_size=34, color=GREEN)
        sp = panel(S, pad=0.3, fill=SURFACE, opacity=0.94)
        sp.to_corner(UL, buff=0.45)
        self.add_fixed_in_frame_mobjects(sp)
        self.play(FadeOut(rp), FadeIn(sp), run_time=0.7)
        self.play(cube.animate.apply_matrix(np.diag([1.6, 0.6, 1.4])), run_time=2.0)
        self.wait(1.0)
        self.play(cube.animate.apply_matrix(np.diag([1 / 1.6, 1 / 0.6, 1 / 1.4])),
                  run_time=1.6)

        self.begin_ambient_camera_rotation(rate=0.22)
        cap2 = panel(body("Computerspiele rechnen davon Millionen pro Sekunde.",
                          size=25, color=FG), pad=0.3, fill=SURFACE,
                     opacity=0.92).to_edge(DOWN, buff=0.45)
        self.add_fixed_in_frame_mobjects(cap2)
        self.play(FadeOut(cap), FadeIn(cap2), run_time=0.8)
        self.wait(5.0)
        self.stop_ambient_camera_rotation()

        self.play(FadeOut(VGroup(cube, axes)), FadeOut(cap2), FadeOut(sp),
                  FadeOut(title), run_time=1.0)


class P5Weitere(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        hdr = section_header(self, "Und wo noch?", color=AMBER)

        items = [
            ("Bildbearbeitung", "Weichzeichnen, Schärfen und Kantenerkennung\n"
                                "sind Faltungen mit kleinen Matrizen.", BLUE),
            ("Suchmaschinen", "Der PageRank-Algorithmus ist ein Eigenvektor\n"
                              "einer riesigen Übergangsmatrix.", PURPLE),
            ("Neuronale Netze", "Jede Schicht ist im Kern eine Matrixmultiplikation\n"
                                "mit anschließender Aktivierungsfunktion.", GREEN),
            ("Statistik", "Kovarianzmatrizen, Regression, Hauptkomponenten —\n"
                          "alles lineare Algebra.", PINK),
        ]
        cards = VGroup()
        for name, desc, c in items:
            t1 = Text(name, font=FONT, font_size=26, color=c, weight=SEMIBOLD)
            t2 = Text(desc, font=FONT, font_size=20, color=MUTED, line_spacing=0.85)
            inner = VGroup(t1, t2).arrange(DOWN, aligned_edge=LEFT, buff=0.22)
            card = panel(inner, pad=0.38, fill=SURFACE, stroke=BORDER)
            card[0].stretch_to_fit_width(6.0)
            card[0].stretch_to_fit_height(1.85)
            inner.move_to(card[0]).align_to(card[0], LEFT).shift(RIGHT * 0.38)
            cards.add(card)
        cards.arrange_in_grid(rows=2, cols=2, buff=(0.5, 0.45))
        place(cards, x=0, top=hdr.get_bottom()[1] - 0.6, w=12.6, h=5.0)

        for c in cards:
            self.play(FadeIn(c, shift=UP * 0.2), run_time=0.7)
            self.wait(2.0)
        self.wait(3.6)
        self.play(*[FadeOut(m) for m in self.mobjects[1:]], run_time=0.8)
