"""Kapitel 2 — Was ist eine Matrix? Notation, Typen, Transponierte."""

from theme import *

TAG = "2 · Grundlagen"


class K2Card(Scene):
    def construct(self):
        chapter_card(self, "02", "Was ist eine Matrix?",
                     "Von der Tabelle zum mathematischen Objekt", color=BLUE,
                     topics=["Notation", "Format m×n", "Spezielle Matrizen", "Transponierte"])


class M1VonDerTabelle(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        section_header(self, "Von der Tabelle zur Matrix", color=BLUE)

        story = body("Eine Fahrradfirma hat drei Werke und baut zwei Modelle.\n"
                     "Die Stückzahlen pro Monat stehen in einer Tabelle.", size=27)
        place(story, x=0, top=TOP_Y - 0.1, w=11)
        self.play(FadeIn(story, shift=UP * 0.2), run_time=1.0)
        self.wait(2.6)

        # --- Tabelle bauen
        col_heads = ["Werk A", "Werk B", "Werk C"]
        row_heads = ["City-Bike", "E-Bike"]
        vals = [[120, 90, 150], [60, 80, 40]]

        cell_w, cell_h = 2.0, 0.95
        tbl = VGroup()
        cells = {}
        for i in range(2):
            for j in range(3):
                c = Rectangle(width=cell_w, height=cell_h, stroke_color=BORDER,
                              stroke_width=1.5, fill_color=SURFACE, fill_opacity=1)
                c.move_to([(j - 1) * cell_w, -i * cell_h, 0])
                t = Text(str(vals[i][j]), font=MONO, font_size=30, color=FG).move_to(c)
                cells[(i, j)] = t
                tbl.add(VGroup(c, t))
        heads_c = VGroup(*[
            Text(h, font=FONT, font_size=24, color=BLUE, weight=MEDIUM)
            .move_to([(j - 1) * cell_w, cell_h * 0.85, 0])
            for j, h in enumerate(col_heads)])
        heads_r = VGroup(*[
            Text(h, font=FONT, font_size=24, color=AMBER, weight=MEDIUM)
            .move_to([-cell_w * 1.5 - 0.9, -i * cell_h, 0])
            for i, h in enumerate(row_heads)])

        table = VGroup(tbl, heads_c, heads_r)
        table.move_to([0, -0.4, 0])

        self.play(FadeOut(story), run_time=0.5)
        self.play(LaggedStart(*[FadeIn(c) for c in tbl], lag_ratio=0.08), run_time=1.6)
        self.play(FadeIn(heads_c, shift=DOWN * 0.15), FadeIn(heads_r, shift=RIGHT * 0.15),
                  run_time=0.9)
        self.wait(2.6)

        say = body("Die Beschriftungen weglassen — die reinen Zahlen bleiben.", size=26)
        place(say, x=0, top=TOP_Y - 0.1, w=11)
        self.play(FadeIn(say), run_time=0.8)
        self.wait(1.8)

        M = mmat(vals, size=40)
        M.move_to([0, -0.4, 0])
        self.play(
            FadeOut(heads_c, shift=UP * 0.3), FadeOut(heads_r, shift=LEFT * 0.3),
            run_time=0.8,
        )
        self.play(
            FadeOut(VGroup(*[c[0] for c in tbl])),
            *[Transform(cells[(i, j)], entry(M, i, j, 3)) for i in range(2) for j in range(3)],
            FadeIn(M.get_brackets()),
            run_time=1.5,
        )
        self.remove(*[cells[k] for k in cells])
        self.add(M)
        self.wait(1.4)

        name = MathTex(r"A=", font_size=48, color=PURPLE).next_to(M, LEFT, buff=0.3)
        self.play(FadeIn(name, shift=RIGHT * 0.2), run_time=0.7)
        self.play(Circumscribe(VGroup(name, M), color=PURPLE, buff=0.2), run_time=1.3)
        self.wait(1.2)

        defn = h3("Eine Matrix ist ein rechteckiges Zahlenschema.", size=30, color=FG)
        place(defn, x=0, top=-1.55, w=11)
        self.play(FadeTransform(say, defn), run_time=1.0)
        self.wait(3.0)
        self.play(*[FadeOut(m) for m in self.mobjects if m is not self.mobjects[0]],
                  run_time=0.8)


class M2Notation(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        section_header(self, "Format, Zeilen, Spalten", color=BLUE)

        vals = [[120, 90, 150], [60, 80, 40]]
        M = mmat(vals, size=40)
        M.move_to([COL_L + 0.4, 0.2, 0])
        lbl = MathTex("A=", font_size=46, color=PURPLE).next_to(M, LEFT, buff=0.25)
        self.play(FadeIn(VGroup(lbl, M)), run_time=0.9)
        self.wait(0.8)

        # Zeilen markieren
        rowrects = VGroup(*[SurroundingRectangle(M.get_rows()[i], color=C_ROW,
                                                 stroke_width=3, corner_radius=0.08,
                                                 buff=0.14) for i in range(2)])
        t1 = VGroup(h3("2 Zeilen", size=32, color=C_ROW),
                    body("waagrecht — von links nach rechts", size=23))
        t1.arrange(DOWN, buff=0.25)
        place(t1, x=COL_R, top=TOP_Y - 0.1, w=COL_W)
        self.play(Create(rowrects), FadeIn(t1), run_time=1.2)
        self.wait(2.4)

        colrects = VGroup(*[SurroundingRectangle(M.get_columns()[j], color=C_COL,
                                                 stroke_width=3, corner_radius=0.08,
                                                 buff=0.14) for j in range(3)])
        t2 = VGroup(h3("3 Spalten", size=32, color=C_COL),
                    body("senkrecht — von oben nach unten", size=23))
        t2.arrange(DOWN, buff=0.25)
        place(t2, x=COL_R, top=t1.get_bottom()[1] - 0.6, w=COL_W)
        self.play(FadeOut(rowrects), Create(colrects), FadeIn(t2), run_time=1.2)
        self.wait(2.4)
        self.play(FadeOut(colrects), run_time=0.5)

        fmt = MathTex(r"A \text{ ist eine } 2\times 3\text{-Matrix}", font_size=40)
        fmt[0][8:11].set_color(AMBER)
        place(fmt, x=COL_R, top=t2.get_bottom()[1] - 0.7, w=COL_W)
        self.play(Write(fmt), run_time=1.2)
        merk = note_box(body("Immer zuerst Zeilen, dann Spalten:\n„Zeilen mal Spalten“ — Z vor S,\nwie im Alphabet.", size=22, color=FG),
                        color=AMBER, label="Merkhilfe")
        place(merk, x=COL_R, top=fmt.get_bottom()[1] - 0.55, w=COL_W)
        self.play(FadeIn(merk), run_time=0.9)
        self.wait(3.6)

        self.play(FadeOut(VGroup(t1, t2, fmt, merk)), run_time=0.7)

        # Indexschreibweise
        self.play(VGroup(lbl, M).animate.move_to([COL_L + 0.4, 0.3, 0]), run_time=0.6)
        gen = MathTex(
            r"A=\begin{pmatrix} a_{11} & a_{12} & a_{13}\\ a_{21} & a_{22} & a_{23}\end{pmatrix}",
            font_size=44)
        place(gen, x=COL_R, top=TOP_Y - 0.2, w=COL_W)
        self.play(Write(gen), run_time=1.6)
        self.wait(1.4)

        idx = MathTex(r"a_{ij}", font_size=54, color=AMBER)
        expl = VGroup(
            MathTex(r"i = \text{Zeile}", font_size=34, color=C_ROW),
            MathTex(r"j = \text{Spalte}", font_size=34, color=C_COL),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.3)
        blk = VGroup(idx, expl).arrange(RIGHT, buff=0.6)
        place(blk, x=COL_R, top=gen.get_bottom()[1] - 0.7, w=COL_W)
        self.play(FadeIn(blk, shift=UP * 0.2), run_time=1.0)
        self.wait(2.4)

        # konkretes Beispiel a_23
        ex = MathTex(r"a_{23}=40", font_size=44, color=GREEN)
        place(ex, x=COL_R, top=blk.get_bottom()[1] - 0.6, w=COL_W)
        e = entry(M, 1, 2, 3)
        box = SurroundingRectangle(e, color=GREEN, stroke_width=3, corner_radius=0.06,
                                   buff=0.16)
        rr = SurroundingRectangle(M.get_rows()[1], color=C_ROW, stroke_width=2,
                                  corner_radius=0.06, buff=0.14)
        cc = SurroundingRectangle(M.get_columns()[2], color=C_COL, stroke_width=2,
                                  corner_radius=0.06, buff=0.14)
        self.play(Create(rr), run_time=0.6)
        self.play(Create(cc), run_time=0.6)
        self.play(Create(box), FadeIn(ex), run_time=0.9)
        self.wait(3.2)

        self.play(*[FadeOut(m) for m in self.mobjects if m is not self.mobjects[0]],
                  run_time=0.8)


class M3Spezialfaelle(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        section_header(self, "Wichtige Sonderfälle", color=BLUE)

        def make(tex, name, desc, col):
            m = MathTex(tex, font_size=34, color=col)
            fit(m, h=1.35)
            n = Text(name, font=FONT, font_size=25, color=FG, weight=MEDIUM)
            d = Text(desc, font=FONT, font_size=19, color=MUTED, line_spacing=0.8)
            txt = VGroup(n, d).arrange(DOWN, aligned_edge=LEFT, buff=0.16)
            holder = Rectangle(width=2.4, height=1.5, stroke_opacity=0, fill_opacity=0)
            m.move_to(holder)
            txt.next_to(holder, RIGHT, buff=0.3).set_y(holder.get_y())
            grp = VGroup(holder, m, txt)
            card = panel(grp, pad=0.3, fill=SURFACE, stroke=BORDER)
            return card

        specs = [
            (pmat([[3, 1], [0, 2]]), "Quadratische Matrix",
             "gleich viele Zeilen\nwie Spalten (n×n)", PURPLE),
            (pmat([[0, 0], [0, 0]]), "Nullmatrix",
             "alle Einträge sind 0", DIM),
            (pmat([[1, 0], [0, 1]]), "Einheitsmatrix E",
             "1en auf der Diagonale,\nsonst 0 — das „Eins-Element“", GREEN),
            (pmat([[5, 0], [0, -2]]), "Diagonalmatrix",
             "nur auf der Hauptdiagonale\nstehen Zahlen", CYAN),
            (pmat([[2, 7], [0, 3]]), "Obere Dreiecksmatrix",
             "unterhalb der Diagonale\nnur Nullen", AMBER),
            (pmat([[4, 5], [5, 1]]), "Symmetrische Matrix",
             "spiegelbildlich zur\nHauptdiagonale", PINK),
        ]
        cards = VGroup(*[make(*s) for s in specs])
        for c in cards:
            c[0].stretch_to_fit_width(6.0)
            c[1].move_to(c[0]).align_to(c[0], LEFT).shift(RIGHT * 0.3)
        cards.arrange_in_grid(rows=3, cols=2, buff=(0.4, 0.35))
        place(cards, x=0, top=TOP_Y - 0.05, h=5.05, w=12.4)

        for c in cards:
            self.play(FadeIn(c, shift=UP * 0.2), run_time=0.55)
            self.wait(1.5)
        self.wait(3.0)

        # Einheitsmatrix hervorheben
        self.play(Circumscribe(cards[2], color=GREEN, buff=0.08), run_time=1.3)
        self.play(Indicate(cards[2][1], color=GREEN, scale_factor=1.1), run_time=0.9)
        hint = h3("Die Einheitsmatrix E spielt später die Rolle der Zahl 1.",
                  size=28, color=GREEN)
        place(hint, x=0, top=-3.32, w=12)
        self.play(FadeIn(hint, shift=UP * 0.2), run_time=0.9)
        self.wait(3.2)

        self.play(*[FadeOut(m) for m in self.mobjects if m is not self.mobjects[0]],
                  run_time=0.8)


class M4Transponiert(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        section_header(self, "Die transponierte Matrix", color=BLUE)

        intro = body("Zeilen und Spalten tauschen — das ist alles.", size=28)
        place(intro, x=0, top=TOP_Y - 0.1, w=11)
        self.play(FadeIn(intro), run_time=0.8)
        self.wait(1.6)

        vals = [[1, 2, 3], [4, 5, 6]]
        A = mmat(vals, size=40)
        A.move_to([-3.4, -0.3, 0])
        la = MathTex("A=", font_size=46, color=PURPLE).next_to(A, LEFT, buff=0.25)

        AT = mmat([[1, 4], [2, 5], [3, 6]], size=40)
        AT.move_to([3.6, -0.3, 0])
        lat = MathTex("A^{T}=", font_size=46, color=CYAN).next_to(AT, LEFT, buff=0.25)

        self.play(FadeIn(VGroup(la, A)), run_time=0.9)
        self.wait(1.2)

        arrow = Arrow([-1.0, -0.3, 0], [1.0, -0.3, 0], buff=0.1, color=DIM, stroke_width=4)
        self.play(GrowArrow(arrow), FadeIn(lat), FadeIn(AT.get_brackets()), run_time=0.8)

        # Zeilen wandern zu Spalten
        for i, col in enumerate([C_ROW, GREEN]):
            src = M_row = A.get_rows()[i]
            dst = AT.get_columns()[i]
            r1 = SurroundingRectangle(src, color=col, stroke_width=3, corner_radius=0.08,
                                      buff=0.13)
            self.play(Create(r1), run_time=0.5)
            self.play(*[TransformFromCopy(src[j], dst[j]) for j in range(3)], run_time=1.2)
            self.wait(0.7)
            self.play(FadeOut(r1), run_time=0.35)
        self.wait(1.4)

        cap = h3("Aus der i-ten Zeile wird die i-te Spalte.", size=29, color=FG)
        place(cap, x=0, top=-2.1, w=11)
        self.play(FadeIn(cap, shift=UP * 0.2), run_time=0.9)
        self.wait(2.4)

        fmt = MathTex(r"A \text{ ist } 2\times3 \;\Longrightarrow\; A^{T} \text{ ist } 3\times2",
                      font_size=36, color=MUTED)
        place(fmt, x=0, top=cap.get_bottom()[1] - 0.45, w=11)
        self.play(FadeIn(fmt), run_time=0.8)
        self.wait(2.8)

        self.play(FadeOut(VGroup(intro, cap, fmt, arrow, la, A, lat, AT)), run_time=0.8)

        # Regeln
        rules = VGroup(
            MathTex(r"(A^{T})^{T} = A", font_size=44),
            MathTex(r"(A+B)^{T} = A^{T}+B^{T}", font_size=44),
            MathTex(r"A \text{ symmetrisch} \iff A = A^{T}", font_size=44, color=PINK),
        ).arrange(DOWN, buff=0.6)
        place(rules, x=0, top=TOP_Y - 0.3, w=11)
        for r in rules:
            self.play(Write(r), run_time=1.1)
            self.wait(2.0)

        sym = mmat([[4, 5, 7], [5, 1, 0], [7, 0, 3]], size=34, h_buff=1.15, v_buff=0.8)
        place(sym, x=0, top=rules.get_bottom()[1] - 0.5, h=2.35)
        diag = Line(sym.get_corner(UL) + DR * 0.35, sym.get_corner(DR) + UL * 0.35,
                    color=PINK, stroke_width=3)
        self.play(FadeIn(sym), run_time=0.8)
        self.play(Create(diag), run_time=0.9)
        self.wait(3.4)

        self.play(*[FadeOut(m) for m in self.mobjects if m is not self.mobjects[0]],
                  run_time=0.8)
