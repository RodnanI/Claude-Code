"""Kapitel 8 — Eigenwerte und Eigenvektoren."""

from theme import *

TAG = "8 · Eigenwerte & Eigenvektoren"

A_DEMO = [[3, 1], [1, 3]]


class K8Card(Scene):
    def construct(self):
        chapter_card(self, "08", "Eigenwerte und\nEigenvektoren",
                     "Die Richtungen, die eine Matrix in Ruhe lässt", color=PINK,
                     topics=["Idee", "charakteristisches Polynom", "Eigenraum",
                             "Diagonalisierung"])


class E1Idee(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))

        intro = VGroup(
            h2("Eine Matrix dreht und streckt Vektoren.", size=34, color=MUTED),
            h1("Aber ein paar Richtungen bleiben, wie sie sind.", size=40),
        ).arrange(DOWN, buff=0.5)
        intro[1].set_color_by_gradient(PINK, PURPLE)
        place(intro, x=0, y=0, w=12)
        self.play(FadeIn(intro[0]), run_time=0.8)
        self.play(Write(intro[1]), run_time=2.0)
        self.wait(2.6)
        self.play(FadeOut(intro), run_time=0.7)

        pl = grid(x_range=(-14, 14, 1), y_range=(-9, 9, 1))
        pl.set_opacity(0.5)
        self.play(FadeIn(pl), run_time=0.8)

        arr = np.array(A_DEMO, dtype=float) * 0.55  # optisch angenehm skaliert
        exact = np.array(A_DEMO, dtype=float)

        bd = panel(MathTex("A=" + pmat(A_DEMO), font_size=40, color=PURPLE), pad=0.34,
                   fill=SURFACE, opacity=0.94).to_corner(UL, buff=0.45)
        self.play(FadeIn(bd), run_time=0.6)

        # Viele Testvektoren
        angles = np.linspace(0, TAU, 17)[:-1]
        vecs = VGroup()
        for a in angles:
            v = np.array([np.cos(a), np.sin(a)]) * 1.6
            vecs.add(Arrow(ORIGIN, [v[0], v[1], 0], buff=0, color=DIM, stroke_width=4,
                           tip_length=0.16))
        self.play(LaggedStart(*[GrowArrow(v) for v in vecs], lag_ratio=0.05), run_time=1.8)

        cap = panel(body("Was macht A mit all diesen Pfeilen?", size=26, color=FG),
                    pad=0.3, fill=SURFACE, opacity=0.92).to_edge(DOWN, buff=0.45)
        self.play(FadeIn(cap), run_time=0.7)
        self.wait(1.4)

        targets = VGroup()
        for a in angles:
            v = np.array([np.cos(a), np.sin(a)]) * 1.6
            w = exact @ v * 0.55
            targets.add(Arrow(ORIGIN, [w[0], w[1], 0], buff=0, color=DIM,
                              stroke_width=4, tip_length=0.16))

        self.play(*[Transform(vecs[k], targets[k]) for k in range(len(angles))],
                  run_time=2.6, rate_func=rate_functions.ease_in_out_sine)
        self.wait(1.8)

        cap2 = panel(body("Fast alle haben ihre Richtung geändert — zwei aber nicht.",
                          size=26, color=FG), pad=0.3, fill=SURFACE,
                     opacity=0.92).to_edge(DOWN, buff=0.45)
        self.play(FadeTransform(cap, cap2), run_time=0.8)
        self.wait(1.6)

        # Eigenrichtungen hervorheben
        line1 = Line([-5, -5, 0], [5, 5, 0], color=PINK, stroke_width=3)
        line2 = Line([-4, 4, 0], [4, -4, 0], color=AMBER, stroke_width=3)
        self.play(Create(line1), Create(line2), run_time=1.4)

        v1 = Arrow(ORIGIN, [1.6, 1.6, 0], buff=0, color=PINK, stroke_width=8,
                   tip_length=0.24)
        v2 = Arrow(ORIGIN, [1.6, -1.6, 0], buff=0, color=AMBER, stroke_width=8,
                   tip_length=0.24)
        self.play(GrowArrow(v1), GrowArrow(v2), run_time=1.0)
        l1 = MathTex(cvec([1, 1]), font_size=32, color=PINK).next_to(v1.get_end(), UR, buff=0.14)
        l2 = MathTex(cvec([1, -1]), font_size=32, color=AMBER).next_to(v2.get_end(), DR, buff=0.14)
        self.play(FadeIn(l1), FadeIn(l2), run_time=0.7)
        self.wait(2.0)

        # Wirkung auf diese beiden
        v1t = Arrow(ORIGIN, [1.6 * 4 * 0.55, 1.6 * 4 * 0.55, 0], buff=0, color=PINK,
                    stroke_width=8, tip_length=0.24)
        v2t = Arrow(ORIGIN, [1.6 * 2 * 0.55, -1.6 * 2 * 0.55, 0], buff=0, color=AMBER,
                    stroke_width=8, tip_length=0.24)
        cap3 = panel(body("Sie werden nur gestreckt — Faktor 4 und Faktor 2.",
                          size=26, color=FG), pad=0.3, fill=SURFACE,
                     opacity=0.92).to_edge(DOWN, buff=0.45)
        self.play(FadeOut(l1), FadeOut(l2), FadeTransform(cap2, cap3), run_time=0.7)
        self.play(Transform(v1, v1t), Transform(v2, v2t), run_time=2.0,
                  rate_func=rate_functions.ease_in_out_sine)
        self.wait(1.6)

        eq1 = MathTex(r"A\cdot" + cvec([1, 1]) + r"=4\cdot" + cvec([1, 1]),
                      font_size=34, color=PINK)
        eq2 = MathTex(r"A\cdot" + cvec([1, -1]) + r"=2\cdot" + cvec([1, -1]),
                      font_size=34, color=AMBER)
        eqs = VGroup(eq1, eq2).arrange(DOWN, buff=0.35)
        ep = panel(eqs, pad=0.34, fill=SURFACE, opacity=0.94).to_corner(UR, buff=0.45)
        self.play(FadeIn(ep), run_time=1.0)
        self.wait(3.6)

        self.play(FadeOut(VGroup(pl, vecs, v1, v2, line1, line2, bd, ep, cap3)),
                  run_time=0.9)


class E2Definition(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        section_header(self, "Definition", color=PINK)

        f = MathTex(r"A\cdot\vec{v}", "=", r"\lambda\cdot\vec{v}", font_size=72)
        f[0].set_color(CYAN)
        f[2].set_color(PINK)
        place(f, x=0, y=1.5)
        self.play(Write(f), run_time=1.8)
        self.wait(2.0)

        expl = VGroup(
            MathTex(r"\vec{v}\neq\vec{0}", font_size=40, color=CYAN),
            body("heißt Eigenvektor von A", size=26),
        ).arrange(RIGHT, buff=0.5)
        expl2 = VGroup(
            MathTex(r"\lambda", font_size=40, color=PINK),
            body("heißt zugehöriger Eigenwert", size=26),
        ).arrange(RIGHT, buff=0.5)
        both = VGroup(expl, expl2).arrange(DOWN, aligned_edge=LEFT, buff=0.45)
        place(both, x=0, y=0.15)
        self.play(FadeIn(expl, shift=UP * 0.2), run_time=0.9)
        self.wait(1.6)
        self.play(FadeIn(expl2, shift=UP * 0.2), run_time=0.9)
        self.wait(2.4)

        nb = note_box(
            body("In Worten: A verändert die Richtung von v nicht.\n"
                 "v wird nur um den Faktor λ gestreckt (λ < 0: zusätzlich gespiegelt).",
                 size=24, color=FG), color=PINK, label="Anschaulich")
        place(nb, x=0, top=-1.15, w=11)
        self.play(FadeIn(nb), run_time=0.9)
        self.wait(3.4)

        note2 = small("Der Nullvektor ist nie ein Eigenvektor — sonst würde jede Zahl passen.",
                      size=22, color=DIM)
        place(note2, x=0, top=nb.get_bottom()[1] - 0.4, w=12)
        self.play(FadeIn(note2), run_time=0.8)
        self.wait(3.0)
        self.play(*[FadeOut(m) for m in self.mobjects[1:]], run_time=0.8)


class E3CharPolynom(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        section_header(self, "Wie findet man die Eigenwerte?", color=PINK)

        steps = [
            (r"A\vec{v} = \lambda\vec{v}", "die Definition"),
            (r"A\vec{v} - \lambda\vec{v} = \vec{0}", "alles auf eine Seite"),
            (r"A\vec{v} - \lambda E\vec{v} = \vec{0}", "λ mit E aufblasen, damit es passt"),
            (r"(A - \lambda E)\,\vec{v} = \vec{0}", "v ausklammern"),
        ]
        prev = None
        shown = VGroup()
        for tex, why in steps:
            m = MathTex(tex, font_size=46)
            if prev is None:
                place(m, x=-1.0, top=TOP_Y - 0.2)
            else:
                m.next_to(prev, DOWN, buff=0.45).set_x(-1.0)
            n = small(why, size=21, color=DIM)
            n.next_to(m, RIGHT, buff=0.7).set_y(m.get_y())
            self.play(FadeIn(m, shift=UP * 0.15), FadeIn(n), run_time=0.9)
            self.wait(2.0)
            shown.add(m, n)
            prev = m

        arg = body("Dieses System hat nur dann eine Lösung v ≠ 0,\n"
                   "wenn die Matrix (A − λE) NICHT invertierbar ist.", size=26)
        place(arg, x=0, top=prev.get_bottom()[1] - 0.55, w=12)
        self.play(FadeIn(arg), run_time=1.0)
        self.wait(3.0)

        key = MathTex(r"\det(A - \lambda E) = 0", font_size=56, color=PINK)
        place(key, x=0, top=arg.get_bottom()[1] - 0.5)
        self.play(Write(key), run_time=1.4)
        self.play(Circumscribe(key, color=PINK, buff=0.18), run_time=1.2)
        self.wait(1.8)

        nm = small("charakteristische Gleichung", size=23, color=MUTED)
        place(nm, x=0, top=key.get_bottom()[1] - 0.3)
        self.play(FadeIn(nm), run_time=0.7)
        self.wait(3.2)
        self.play(*[FadeOut(m) for m in self.mobjects[1:]], run_time=0.8)


class E4Beispiel(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        section_header(self, "Beispiel — komplett durchgerechnet", color=PINK)

        A = MathTex("A=" + pmat(A_DEMO), font_size=46, color=PURPLE)
        place(A, x=0, top=TOP_Y - 0.15)
        self.play(FadeIn(A), run_time=0.8)
        self.wait(1.2)

        st = [
            (r"A - \lambda E = " + pmat([["3-\\lambda", 1], [1, "3-\\lambda"]]), FG),
            (r"\det(A-\lambda E) = (3-\lambda)^2 - 1 \overset{!}{=} 0", CYAN),
            (r"(3-\lambda)^2 = 1 \;\Longrightarrow\; 3-\lambda = \pm 1", FG),
            (r"\lambda_1 = 2, \qquad \lambda_2 = 4", PINK),
        ]
        prev = A
        shown = VGroup()
        for tex, col in st:
            m = MathTex(tex, font_size=42, color=col)
            m.next_to(prev, DOWN, buff=0.45)
            fit(m, w=12)
            self.play(FadeIn(m, shift=UP * 0.15), run_time=0.9)
            self.wait(2.2)
            shown.add(m)
            prev = m
        self.play(Circumscribe(prev, color=PINK, buff=0.14), run_time=1.2)
        self.wait(2.0)

        self.play(FadeOut(VGroup(A, shown)), run_time=0.7)

        # Eigenvektoren
        hdr2 = h3("Jetzt die Eigenvektoren — für jeden Eigenwert einzeln.",
                  size=30, color=FG)
        place(hdr2, x=0, top=TOP_Y - 0.15, w=12)
        self.play(FadeIn(hdr2), run_time=0.8)
        self.wait(1.6)

        blocks = [
            (r"\lambda_1 = 2", [
                r"(A-2E)\vec{v}=\vec{0}",
                pmat([[1, 1], [1, 1]]) + cvec(["x", "y"]) + "=" + cvec([0, 0]),
                r"x + y = 0 \;\Rightarrow\; y = -x",
                r"\vec{v}_1 = " + cvec([1, -1]),
            ], AMBER),
            (r"\lambda_2 = 4", [
                r"(A-4E)\vec{v}=\vec{0}",
                pmat([[-1, 1], [1, -1]]) + cvec(["x", "y"]) + "=" + cvec([0, 0]),
                r"-x + y = 0 \;\Rightarrow\; y = x",
                r"\vec{v}_2 = " + cvec([1, 1]),
            ], PINK),
        ]

        cols = VGroup()
        for title, lines, col in blocks:
            t = MathTex(title, font_size=42, color=col)
            ls = VGroup(*[MathTex(l, font_size=34) for l in lines])
            ls[-1].set_color(col)
            ls.arrange(DOWN, buff=0.42)
            g = VGroup(t, ls).arrange(DOWN, buff=0.5)
            cols.add(g)
        cols.arrange(RIGHT, buff=1.6)
        place(cols, x=0, top=hdr2.get_bottom()[1] - 0.55, w=12.4, h=4.6)

        for g in cols:
            self.play(FadeIn(g[0], shift=UP * 0.2), run_time=0.7)
            for l in g[1]:
                self.play(FadeIn(l, shift=UP * 0.12), run_time=0.65)
                self.wait(1.3)
            self.wait(0.8)
        self.wait(3.4)

        self.play(*[FadeOut(m) for m in self.mobjects[1:]], run_time=0.8)


class E5Eigenraum(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        section_header(self, "Der Eigenraum", color=PINK)

        txt = body("Ist v ein Eigenvektor, dann auch jedes Vielfache von v.", size=28)
        place(txt, x=0, top=TOP_Y - 0.15, w=12)
        self.play(FadeIn(txt), run_time=0.9)
        self.wait(1.8)

        pr = MathTex(r"A(k\vec{v}) = k\,(A\vec{v}) = k\,(\lambda\vec{v})"
                     r" = \lambda\,(k\vec{v})", font_size=42, color=CYAN)
        place(pr, x=0, top=txt.get_bottom()[1] - 0.5, w=12)
        self.play(Write(pr), run_time=2.0)
        self.wait(2.6)

        pl = grid(x_range=(-4, 4, 1), y_range=(-2.6, 2.6, 1), width=7.0, height=4.6)
        pl.move_to([0, -1.35, 0])
        self.play(FadeIn(pl), run_time=0.8)
        gerade = Line(pl.c2p(-2.4, 2.4), pl.c2p(2.4, -2.4), color=AMBER, stroke_width=4)
        vs = VGroup(*[vec_arrow(pl, (k, -k), color=AMBER, width=5, tip_len=0.16)
                      for k in [0.6, 1.2, 1.8, -0.8, -1.6]])
        self.play(Create(gerade), run_time=0.9)
        self.play(LaggedStart(*[GrowArrow(v) for v in vs], lag_ratio=0.2), run_time=1.6)
        self.wait(1.4)

        lab = MathTex(r"E_{\lambda=2} = \Big\{\,t\cdot" + cvec([1, -1])
                      + r"\;\Big|\; t\in\mathbb{R}\,\Big\}", font_size=36, color=AMBER)
        lp = panel(lab, pad=0.3, fill=SURFACE, opacity=0.94)
        lp.move_to([3.6, -1.0, 0])
        fit(lp, w=6.0)
        lp.move_to([3.7, -1.0, 0])
        self.play(FadeIn(lp), run_time=0.9)
        self.wait(3.4)

        cap = small("Die ganze Gerade heißt Eigenraum zum Eigenwert 2.", size=23,
                    color=MUTED)
        place(cap, x=0, top=-3.5, w=12)
        self.play(FadeIn(cap), run_time=0.8)
        self.wait(3.0)
        self.play(*[FadeOut(m) for m in self.mobjects[1:]], run_time=0.8)


class E6Diagonalisierung(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        section_header(self, "Diagonalisieren — der große Nutzen", color=PINK)

        idea = body("Wenn man genügend Eigenvektoren hat, wird A ganz einfach.", size=27)
        place(idea, x=0, top=TOP_Y - 0.15, w=12)
        self.play(FadeIn(idea), run_time=0.9)
        self.wait(2.0)

        S = MathTex(r"S=\Big(\vec{v}_1\;\Big|\;\vec{v}_2\Big)=" + pmat([[1, 1], [-1, 1]]),
                    font_size=40, color=CYAN)
        D = MathTex(r"D=" + pmat([[2, 0], [0, 4]]), font_size=40, color=PINK)
        row = VGroup(S, D).arrange(RIGHT, buff=1.4)
        place(row, x=0, top=idea.get_bottom()[1] - 0.6, w=12)
        self.play(FadeIn(S), run_time=1.0)
        self.wait(1.4)
        self.play(FadeIn(D), run_time=1.0)
        self.wait(1.6)

        capS = small("Eigenvektoren als Spalten", size=21, color=DIM).next_to(S, DOWN, buff=0.3)
        capD = small("Eigenwerte auf der Diagonale", size=21, color=DIM).next_to(D, DOWN, buff=0.3)
        self.play(FadeIn(capS), FadeIn(capD), run_time=0.7)
        self.wait(2.2)

        key = MathTex(r"A = S\,D\,S^{-1}", font_size=58, color=GREEN)
        place(key, x=0, top=-0.85)
        self.play(Write(key), run_time=1.4)
        self.play(Circumscribe(key, color=GREEN, buff=0.16), run_time=1.2)
        self.wait(2.6)

        self.play(FadeOut(VGroup(idea, row, capS, capD)), run_time=0.7)
        self.play(key.animate.move_to([0, 2.1, 0]).scale(0.85), run_time=0.9)

        pow_ = VGroup(
            MathTex(r"A^{n} = S\,D^{n}\,S^{-1}", font_size=48, color=GREEN),
            MathTex(r"D^{n} = " + pmat([["2^n", 0], [0, "4^n"]]), font_size=44, color=PINK),
            body("Potenzen einer Diagonalmatrix sind kinderleicht —\n"
                 "damit wird auch Aⁿ berechenbar, ohne n-mal zu multiplizieren.",
                 size=25),
        ).arrange(DOWN, buff=0.55)
        place(pow_, x=0, top=1.1, w=12)
        for m in pow_:
            self.play(FadeIn(m, shift=UP * 0.15), run_time=0.9)
            self.wait(2.2)
        self.wait(3.0)

        use = note_box(body("Genau so berechnet man Langzeit-Prognosen:\n"
                            "Wie sieht ein Prozess nach 100 Schritten aus?\n"
                            "Der größte Eigenwert bestimmt das Verhalten.",
                            size=24, color=FG), color=PINK, label="Wozu das gut ist")
        place(use, x=0, top=pow_.get_bottom()[1] - 0.5, w=11)
        self.play(FadeIn(use), run_time=0.9)
        self.wait(4.0)
        self.play(*[FadeOut(m) for m in self.mobjects[1:]], run_time=0.8)
