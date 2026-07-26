"""Kapitel 3 — Rechnen mit Matrizen."""

from theme import *

TAG = "3 · Rechnen mit Matrizen"


def numgrid(vals, cw=1.05, ch=0.9, size=34, color=FG):
    """Reines Zahlenraster ohne Klammern (für das Falk-Schema)."""
    g = VGroup()
    for i, row in enumerate(vals):
        for j, v in enumerate(row):
            t = MathTex(fnum(v), font_size=size, color=color)
            t.move_to([j * cw, -i * ch, 0])
            g.add(t)
    g.ncols = len(vals[0])
    g.nrows = len(vals)
    g.cw, g.ch = cw, ch
    return g


def gcell(g, i, j):
    return g[i * g.ncols + j]


def grow(g, i):
    return VGroup(*[gcell(g, i, j) for j in range(g.ncols)])


def gcol(g, j):
    return VGroup(*[gcell(g, i, j) for i in range(g.nrows)])


class K3Card(Scene):
    def construct(self):
        chapter_card(self, "03", "Rechnen mit Matrizen",
                     "Addition, Vielfache und das berühmte Matrixprodukt",
                     color=BLUE,
                     topics=["Addition", "Skalar", "Matrix · Vektor", "Falk-Schema"])


class A1Addition(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        section_header(self, "Addition und Subtraktion", color=BLUE)

        intro = body("Zwei Matrizen gleichen Formats addiert man Feld für Feld.", size=27)
        place(intro, x=0, top=TOP_Y - 0.1, w=11.5)
        self.play(FadeIn(intro), run_time=0.9)
        self.wait(2.0)

        Av = [[2, -1], [0, 4]]
        Bv = [[3, 5], [1, -2]]
        Cv = [[5, 4], [1, 2]]

        A = mmat(Av, size=40)
        B = mmat(Bv, size=40)
        plus = MathTex("+", font_size=52)
        eq = MathTex("=", font_size=52)
        C = mmat(Cv, size=40, color=GREEN)
        line = VGroup(A, plus, B, eq, C).arrange(RIGHT, buff=0.42)
        place(line, x=0, y=0.55, w=12)

        self.play(FadeIn(A), FadeIn(plus), FadeIn(B), run_time=1.0)
        self.wait(1.2)
        self.play(FadeIn(eq), FadeIn(C.get_brackets()), run_time=0.6)

        cols = [AMBER, PINK, CYAN, PURPLE]
        for k, (i, j) in enumerate([(0, 0), (0, 1), (1, 0), (1, 1)]):
            a, b, c = entry(A, i, j, 2), entry(B, i, j, 2), entry(C, i, j, 2)
            ra = SurroundingRectangle(a, color=cols[k], stroke_width=3, buff=0.13,
                                      corner_radius=0.06)
            rb = SurroundingRectangle(b, color=cols[k], stroke_width=3, buff=0.13,
                                      corner_radius=0.06)
            calc = MathTex(f"{fnum(Av[i][j])} + ({fnum(Bv[i][j])}) = {fnum(Cv[i][j])}",
                           font_size=38, color=cols[k])
            place(calc, x=0, y=-1.5)
            self.play(Create(ra), Create(rb), FadeIn(calc), run_time=0.7)
            self.play(TransformFromCopy(VGroup(a, b), c), run_time=0.8)
            self.wait(0.9)
            self.play(FadeOut(ra), FadeOut(rb), FadeOut(calc), run_time=0.4)

        self.wait(1.6)

        warn = caution_box(
            body("Addieren geht nur, wenn beide Matrizen\ngenau dasselbe Format haben.",
                 size=24, color=FG), label="Achtung")
        place(warn, x=0, top=-1.35, w=9)
        self.play(FadeIn(warn), run_time=0.9)
        self.wait(2.8)

        bad = MathTex(r"\underbrace{" + pmat([[1, 2], [3, 4]]) + r"}_{2\times 2}"
                      r"\;+\;\underbrace{" + pmat([[1, 2, 3]]) + r"}_{1\times 3}"
                      r"\;=\;\text{nicht definiert}", font_size=34, color=RED)
        place(bad, x=0, top=warn.get_bottom()[1] - 0.4, w=11)
        self.play(FadeIn(bad), run_time=0.9)
        self.wait(3.0)

        self.play(*[FadeOut(m) for m in self.mobjects[1:]], run_time=0.8)


class A2Skalar(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        section_header(self, "Multiplikation mit einer Zahl", color=BLUE)

        intro = body("Jeder einzelne Eintrag wird mit der Zahl multipliziert.", size=27)
        place(intro, x=0, top=TOP_Y - 0.1, w=11.5)
        self.play(FadeIn(intro), run_time=0.9)
        self.wait(1.8)

        Av = [[2, -1, 3], [0, 4, 5]]
        A = mmat(Av, size=38)
        k = MathTex("3\\cdot", font_size=52, color=AMBER)
        eq = MathTex("=", font_size=48)
        C = mmat([[6, -3, 9], [0, 12, 15]], size=38, color=GREEN)
        line = VGroup(k, A, eq, C).arrange(RIGHT, buff=0.4)
        place(line, x=0, y=0.5, w=12.4)

        self.play(FadeIn(k), FadeIn(A), run_time=0.8)
        self.wait(1.0)
        self.play(FadeIn(eq), FadeIn(C.get_brackets()), run_time=0.5)
        self.play(LaggedStart(*[
            TransformFromCopy(entry(A, i, j, 3), entry(C, i, j, 3))
            for i in range(2) for j in range(3)], lag_ratio=0.22), run_time=2.6)
        self.wait(2.0)

        rules = VGroup(
            MathTex(r"k\cdot(A+B) = k\cdot A + k\cdot B", font_size=40),
            MathTex(r"(k+l)\cdot A = k\cdot A + l\cdot A", font_size=40),
            MathTex(r"(-1)\cdot A = -A \quad\Longrightarrow\quad A-B = A+(-B)",
                    font_size=40, color=MUTED),
        ).arrange(DOWN, buff=0.45)
        place(rules, x=0, top=-1.15, w=11.5)
        for r in rules:
            self.play(FadeIn(r, shift=UP * 0.15), run_time=0.8)
            self.wait(1.7)
        self.wait(2.0)
        self.play(*[FadeOut(m) for m in self.mobjects[1:]], run_time=0.8)


class A3MatrixVektor(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        section_header(self, "Matrix mal Vektor — das Herzstück", color=BLUE)

        Av = [[2, 1], [3, -1]]
        vv = [3, 2]
        res = [8, 7]

        A = mmat(Av, size=44)
        dot = MathTex(r"\cdot", font_size=48)
        v = mmat([[vv[0]], [vv[1]]], size=44, color=CYAN)
        eq = MathTex("=", font_size=48)
        C = mmat([[res[0]], [res[1]]], size=44, color=GREEN)
        line = VGroup(A, dot, v, eq, C).arrange(RIGHT, buff=0.4)
        place(line, x=0, y=1.35, w=9)

        self.play(FadeIn(A), FadeIn(dot), FadeIn(v), run_time=1.0)
        self.wait(1.2)

        regel = h3("Regel: Zeile mal Spalte", size=32, color=AMBER)
        place(regel, x=0, y=-0.35)
        self.play(FadeIn(regel, shift=UP * 0.2), run_time=0.8)
        self.wait(1.6)
        self.play(regel.animate.scale(0.75).set_color(MUTED).move_to([0, -3.35, 0]),
                  run_time=0.8)

        self.play(FadeIn(eq), FadeIn(C.get_brackets()), run_time=0.5)

        for i, col in enumerate([AMBER, PINK]):
            rr = SurroundingRectangle(A.get_rows()[i], color=col, stroke_width=3,
                                      buff=0.14, corner_radius=0.08)
            cc = SurroundingRectangle(v.get_columns()[0], color=CYAN, stroke_width=3,
                                      buff=0.14, corner_radius=0.08)
            self.play(Create(rr), Create(cc), run_time=0.8)

            # Rechnung aufbauen
            terms = MathTex(
                pnum(Av[i][0]), r"\cdot", pnum(vv[0]), "+",
                pnum(Av[i][1]), r"\cdot", pnum(vv[1]), "=", fnum(res[i]),
                font_size=46,
            )
            place(terms, x=0, y=-0.5)
            terms[0].set_color(col); terms[4].set_color(col)
            terms[2].set_color(CYAN); terms[6].set_color(CYAN)
            terms[8].set_color(GREEN)

            self.play(
                TransformFromCopy(entry(A, i, 0, 2), terms[0]),
                TransformFromCopy(entry(v, 0, 0, 1), terms[2]),
                FadeIn(terms[1]), run_time=1.1,
            )
            self.play(FadeIn(terms[3]), run_time=0.3)
            self.play(
                TransformFromCopy(entry(A, i, 1, 2), terms[4]),
                TransformFromCopy(entry(v, 1, 0, 1), terms[6]),
                FadeIn(terms[5]), run_time=1.1,
            )
            self.wait(0.9)
            self.play(FadeIn(terms[7]), FadeIn(terms[8], scale=1.4), run_time=0.7)
            self.wait(1.1)
            self.play(TransformFromCopy(terms[8], entry(C, i, 0, 1)), run_time=1.0)
            self.wait(0.9)
            self.play(FadeOut(rr), FadeOut(cc), FadeOut(terms), run_time=0.5)

        self.play(Circumscribe(C, color=GREEN, buff=0.18), run_time=1.2)
        self.wait(1.6)

        merk = note_box(
            body("Die i-te Zeile der Matrix trifft auf den Vektor —\n"
                 "das ergibt den i-ten Eintrag des Ergebnisses.", size=24, color=FG),
            color=AMBER, label="Merke")
        place(merk, x=0, y=-1.35, w=10)
        self.play(FadeIn(merk), run_time=0.9)
        self.wait(3.2)
        self.play(FadeOut(merk), run_time=0.5)

        allg = MathTex(
            pmat([["a", "b"], ["c", "d"]]) + cvec(["x", "y"]) + "="
            + cvec([r"a\,x+b\,y", r"c\,x+d\,y"]), font_size=48)
        place(allg, x=0, y=-1.35, w=10)
        self.play(Write(allg), run_time=2.0)
        self.wait(3.4)
        self.play(*[FadeOut(m) for m in self.mobjects[1:]], run_time=0.8)


class A4Format(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        section_header(self, "Wann darf man multiplizieren?", color=BLUE)

        head = body("Bevor gerechnet wird: passen die Formate zusammen?", size=27)
        place(head, x=0, top=TOP_Y - 0.1, w=11.5)
        self.play(FadeIn(head), run_time=0.9)
        self.wait(1.8)

        f = MathTex(r"(\,m \times n\,)", r"\cdot", r"(\,n \times p\,)", r"=",
                    r"(\,m \times p\,)", font_size=54)
        place(f, x=0, y=0.9)
        f[0].set_color(PURPLE); f[2].set_color(CYAN); f[4].set_color(GREEN)
        self.play(Write(f), run_time=1.6)
        self.wait(1.4)

        inner = VGroup(f[0][4], f[2][1])
        br = VGroup(*[SurroundingRectangle(m, color=AMBER, stroke_width=3, buff=0.09,
                                           corner_radius=0.05) for m in inner])
        cap1 = h3("Die inneren Zahlen müssen gleich sein.", size=29, color=AMBER)
        place(cap1, x=0, y=-0.35)
        self.play(Create(br), FadeIn(cap1), run_time=1.0)
        self.wait(2.4)

        outer = VGroup(f[0][1], f[4][3])
        br2 = VGroup(*[SurroundingRectangle(m, color=GREEN, stroke_width=3, buff=0.09,
                                            corner_radius=0.05) for m in [f[0][1], f[2][3]]])
        cap2 = h3("Die äußeren Zahlen ergeben das Format des Ergebnisses.",
                  size=29, color=GREEN)
        place(cap2, x=0, y=-1.15, w=11.5)
        self.play(Create(br2), FadeIn(cap2), run_time=1.0)
        self.wait(2.8)

        self.play(FadeOut(VGroup(br, br2, cap1, cap2)), run_time=0.5)

        ex = VGroup(
            MathTex(r"(2\times 3)\cdot(3\times 2) = (2\times 2)", font_size=40, color=GREEN),
            MathTex(r"(3\times 2)\cdot(2\times 4) = (3\times 4)", font_size=40, color=GREEN),
            MathTex(r"(2\times 3)\cdot(2\times 3) \;=\; \text{geht nicht!}",
                    font_size=40, color=RED),
        ).arrange(DOWN, buff=0.45)
        place(ex, x=0, top=-0.35, w=11)
        for e in ex:
            self.play(FadeIn(e, shift=UP * 0.15), run_time=0.8)
            self.wait(1.9)
        self.wait(2.4)
        self.play(*[FadeOut(m) for m in self.mobjects[1:]], run_time=0.8)


class A5FalkSchema(Scene):
    """Matrix mal Matrix im Falkschen Schema."""

    def construct(self):
        self.add(chapter_tag(TAG))
        section_header(self, "Matrix mal Matrix — das Falk-Schema", color=BLUE)

        Av = [[1, 2, 0], [3, -1, 4]]
        Bv = [[2, 1], [0, 3], [5, -2]]
        Cv = [[2, 7], [26, -8]]

        intro = body("Ein Trick, mit dem man sich nie verzählt:\n"
                     "B nach oben rechts, A nach unten links.", size=26)
        place(intro, x=0, top=TOP_Y - 0.1, w=11)
        self.play(FadeIn(intro), run_time=1.0)
        self.wait(2.6)
        self.play(FadeOut(intro), run_time=0.5)

        cw, ch = 1.15, 0.85
        A = numgrid(Av, cw, ch, size=34, color=PURPLE)
        B = numgrid(Bv, cw, ch, size=34, color=CYAN)
        C = numgrid(Cv, cw, ch, size=34, color=GREEN)

        # Positionierung: A unten links, B oben rechts, C unten rechts
        A.move_to([0, 0, 0])
        A.shift([-4.3, -1.1, 0] - gcell(A, 0, 0).get_center())
        B.shift([0.35, 2.05, 0] - gcell(B, 0, 0).get_center())
        C.shift([0.35, -1.1, 0] - gcell(C, 0, 0).get_center())

        lblA = MathTex("A", font_size=36, color=PURPLE).next_to(A, LEFT, buff=0.55)
        lblB = MathTex("B", font_size=36, color=CYAN).next_to(B, UP, buff=0.35)
        lblC = MathTex(r"C=A\cdot B", font_size=32, color=GREEN).next_to(C, RIGHT, buff=0.6)

        vline = Line([-0.35, 2.65, 0], [-0.35, -2.15, 0], color=BORDER, stroke_width=2.5)
        hline = Line([-5.1, -0.55, 0], [2.4, -0.55, 0], color=BORDER, stroke_width=2.5)

        self.play(FadeIn(B), FadeIn(lblB), run_time=0.9)
        self.play(FadeIn(A), FadeIn(lblA), run_time=0.9)
        self.play(Create(vline), Create(hline), run_time=0.8)
        self.wait(1.4)

        hint = small("Jedes Feld unten rechts:  Zeile von A  ×  Spalte von B", size=23,
                     color=MUTED)
        place(hint, x=0, top=-2.45, w=12)
        self.play(FadeIn(hint), run_time=0.7)
        self.wait(1.6)

        self.play(FadeIn(lblC), FadeOut(hint), run_time=0.5)

        for (i, j), col in zip([(0, 0), (0, 1), (1, 0), (1, 1)],
                               [AMBER, PINK, AMBER, PINK]):
            rband = SurroundingRectangle(grow(A, i), color=col, stroke_width=3,
                                         buff=0.18, corner_radius=0.08)
            cband = SurroundingRectangle(gcol(B, j), color=CYAN, stroke_width=3,
                                         buff=0.18, corner_radius=0.08)
            target = gcell(C, i, j)
            tbox = SurroundingRectangle(target, color=GREEN, stroke_width=2.5,
                                        buff=0.22, corner_radius=0.06)

            self.play(Create(rband), Create(cband), Create(tbox), run_time=0.8)

            parts = []
            for kk in range(3):
                parts += [pnum(Av[i][kk]), r"\cdot", pnum(Bv[kk][j])]
                if kk < 2:
                    parts.append("+")
            parts += ["=", fnum(Cv[i][j])]
            calc = MathTex(*parts, font_size=38)
            place(calc, x=0, y=-2.95, w=12)
            for kk in range(3):
                calc[4 * kk].set_color(col)
                calc[4 * kk + 2].set_color(CYAN)
            calc[-1].set_color(GREEN)

            for kk in range(3):
                self.play(
                    TransformFromCopy(gcell(A, i, kk), calc[4 * kk]),
                    TransformFromCopy(gcell(B, kk, j), calc[4 * kk + 2]),
                    FadeIn(calc[4 * kk + 1]),
                    *( [FadeIn(calc[4 * kk + 3])] if kk < 2 else [] ),
                    run_time=0.85,
                )
            self.play(FadeIn(calc[-2]), FadeIn(calc[-1], scale=1.3), run_time=0.6)
            self.wait(0.8)
            self.play(TransformFromCopy(calc[-1], target), run_time=0.9)
            self.wait(0.7)
            self.play(FadeOut(rband), FadeOut(cband), FadeOut(tbox), FadeOut(calc),
                      run_time=0.5)

        self.play(Circumscribe(C, color=GREEN, buff=0.3), run_time=1.3)
        self.wait(1.4)

        done = MathTex(pmat(Av) + r"\cdot" + pmat(Bv) + "=" + pmat(Cv), font_size=40)
        place(done, x=0, y=-3.05, w=12)
        self.play(FadeIn(done), run_time=0.9)
        self.wait(4.0)
        self.play(*[FadeOut(m) for m in self.mobjects[1:]], run_time=0.9)


class A6NichtKommutativ(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        section_header(self, "Vorsicht: A·B ist nicht B·A", color=RED)

        intro = body("Bei Zahlen ist 3·5 = 5·3. Bei Matrizen gilt das nicht!", size=28)
        place(intro, x=0, top=TOP_Y - 0.1, w=11.5)
        self.play(FadeIn(intro), run_time=0.9)
        self.wait(2.2)

        Av, Bv = [[1, 2], [0, 1]], [[1, 0], [1, 1]]
        defs = MathTex("A=" + pmat(Av) + r",\qquad B=" + pmat(Bv), font_size=44)
        place(defs, x=0, y=1.35)
        self.play(Write(defs), run_time=1.4)
        self.wait(1.6)

        left = MathTex(r"A\cdot B=" + pmat(Av) + pmat(Bv) + "=" + pmat([[3, 2], [1, 1]]),
                       font_size=40, color=BLUE)
        right = MathTex(r"B\cdot A=" + pmat(Bv) + pmat(Av) + "=" + pmat([[1, 2], [1, 3]]),
                        font_size=40, color=PINK)
        place(left, x=0, y=-0.15, w=11)
        place(right, x=0, y=-1.65, w=11)

        self.play(Write(left), run_time=1.8)
        self.wait(2.4)
        self.play(Write(right), run_time=1.8)
        self.wait(2.4)

        neq = MathTex(r"A\cdot B \;\neq\; B\cdot A", font_size=50, color=RED)
        place(neq, x=0, y=-3.0)
        self.play(FadeIn(neq, scale=1.2), run_time=0.9)
        self.play(Flash(neq, color=RED, line_length=0.3, num_lines=16), run_time=1.0)
        self.wait(2.4)

        self.play(FadeOut(VGroup(intro, defs, left, right, neq)), run_time=0.7)

        why = VGroup(
            h2("Warum ist das so?", size=36, color=FG),
            body("Weil ein Matrixprodukt zwei Abbildungen nacheinander ausführt.\n"
                 "Erst drehen und dann spiegeln ist eben etwas anderes\n"
                 "als erst spiegeln und dann drehen.", size=27),
        ).arrange(DOWN, buff=0.55)
        place(why, x=0, y=0.4, w=11.5)
        self.play(FadeIn(why[0]), run_time=0.8)
        self.play(FadeIn(why[1], shift=UP * 0.2), run_time=1.0)
        self.wait(4.0)
        outlook = small("Genau das schauen wir uns in Kapitel 4 an.", size=24, color=BLUE)
        place(outlook, x=0, top=why.get_bottom()[1] - 0.7)
        self.play(FadeIn(outlook), run_time=0.8)
        self.wait(2.6)
        self.play(*[FadeOut(m) for m in self.mobjects[1:]], run_time=0.8)


class A7Rechengesetze(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        hdr = section_header(self, "Die Rechengesetze im Überblick", color=BLUE)

        gilt = [
            (r"A+B = B+A", "Addition ist vertauschbar"),
            (r"(A+B)+C = A+(B+C)", "Klammern beliebig setzen"),
            (r"(A\cdot B)\cdot C = A\cdot(B\cdot C)", "auch beim Produkt"),
            (r"A\cdot(B+C) = A\cdot B + A\cdot C", "Distributivgesetz"),
            (r"E\cdot A = A\cdot E = A", "E wirkt wie die Zahl 1"),
            (r"(A\cdot B)^{T} = B^{T}\cdot A^{T}", "Reihenfolge dreht sich um!"),
        ]
        nicht = [
            (r"A\cdot B \neq B\cdot A", "nicht vertauschbar"),
            (r"A\cdot B = 0 \;\not\Rightarrow\; A=0 \text{ oder } B=0", "es gibt Nullteiler"),
        ]

        def block(title, items, col):
            t = Text(title, font=FONT, font_size=27, color=col, weight=SEMIBOLD)
            ln = Line(LEFT, RIGHT, color=col, stroke_width=2.5).set_width(1.0)
            head = VGroup(t, ln).arrange(DOWN, aligned_edge=LEFT, buff=0.14)
            rows = VGroup()
            for tex, desc in items:
                m = MathTex(tex, font_size=32, color=FG)
                fit(m, w=5.4)
                d = Text(desc, font=FONT, font_size=19, color=DIM)
                fit(d, w=5.4)
                r = VGroup(m, d).arrange(DOWN, aligned_edge=LEFT, buff=0.14)
                rows.add(r)
            rows.arrange(DOWN, aligned_edge=LEFT, buff=0.34)
            return VGroup(head, rows).arrange(DOWN, aligned_edge=LEFT, buff=0.42)

        g1 = block("Das gilt immer", gilt, GREEN)
        g2 = block("Das gilt NICHT", nicht, RED)
        both = VGroup(g1, g2).arrange(RIGHT, aligned_edge=UP, buff=1.5)
        place(both, x=0, top=hdr.get_bottom()[1] - 0.5, h=5.3, w=12.4)

        self.play(FadeIn(g1[0], shift=RIGHT * 0.2), run_time=0.7)
        for r in g1[1]:
            self.play(FadeIn(r, shift=RIGHT * 0.2), run_time=0.55)
            self.wait(1.1)
        self.wait(1.2)
        self.play(FadeIn(g2[0], shift=RIGHT * 0.2), run_time=0.7)
        for r in g2[1]:
            self.play(FadeIn(r, shift=RIGHT * 0.2), run_time=0.55)
            self.wait(1.4)
        self.wait(4.0)
        self.play(*[FadeOut(m) for m in self.mobjects[1:]], run_time=0.8)


class A8Potenzen(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        section_header(self, "Potenzen einer Matrix", color=BLUE)

        intro = body("Quadratische Matrizen darf man mit sich selbst multiplizieren.",
                     size=27)
        place(intro, x=0, top=TOP_Y - 0.1, w=11.5)
        self.play(FadeIn(intro), run_time=0.9)
        self.wait(1.8)

        defs = MathTex(r"A^{2}=A\cdot A,\qquad A^{3}=A\cdot A\cdot A,\qquad A^{0}=E",
                       font_size=42)
        place(defs, x=0, y=1.5, w=11.5)
        self.play(Write(defs), run_time=1.6)
        self.wait(2.2)

        Av = [[1, 1], [0, 1]]
        chain = [
            (r"A=" + pmat([[1, 1], [0, 1]]), FG),
            (r"A^{2}=" + pmat([[1, 2], [0, 1]]), CYAN),
            (r"A^{3}=" + pmat([[1, 3], [0, 1]]), GREEN),
            (r"A^{n}=" + pmat([[1, "n"], [0, 1]]), AMBER),
        ]
        grp = VGroup(*[MathTex(t, font_size=42, color=c) for t, c in chain])
        grp.arrange(RIGHT, buff=0.7)
        place(grp, x=0, y=-0.4, w=12.4)

        for m in grp:
            self.play(FadeIn(m, shift=UP * 0.2), run_time=0.8)
            self.wait(1.6)

        self.play(Circumscribe(grp[3], color=AMBER, buff=0.16), run_time=1.2)
        note = note_box(
            body("Muster erkennen spart Arbeit: statt 100-mal zu multiplizieren,\n"
                 "setzt man n = 100 ein. Später geht das mit Eigenwerten\n"
                 "sogar für beliebige Matrizen.", size=23, color=FG),
            color=AMBER, label="Tipp")
        place(note, x=0, top=-1.6, w=10.5)
        self.play(FadeIn(note), run_time=0.9)
        self.wait(4.2)
        self.play(*[FadeOut(m) for m in self.mobjects[1:]], run_time=0.8)
