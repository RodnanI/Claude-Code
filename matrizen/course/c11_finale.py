"""Kapitel 10 — Zusammenfassung und Abschluss."""

from theme import *

TAG = "11 · Zusammenfassung"


class K11Card(Scene):
    def construct(self):
        chapter_card(self, "11", "Alles auf einen Blick",
                     "Die wichtigsten Formeln und Ideen des Kurses", color=MUTED,
                     topics=["Formelsammlung", "Die roten Fäden"])


class Z1RoteFaeden(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        hdr = section_header(self, "Die vier roten Fäden", color=BLUE)

        items = [
            ("1", "Eine Matrix ist eine Maschine für Vektoren.",
             "A · v macht aus einem Vektor einen neuen Vektor — Zeile mal Spalte.", BLUE),
            ("2", "Die Spalten sind die Bilder der Einheitsvektoren.",
             "Damit kann man jede lineare Abbildung sofort aufschreiben.", PURPLE),
            ("3", "Das Produkt A·B heißt: erst B, dann A.",
             "Deshalb ist die Reihenfolge wichtig und A·B ≠ B·A.", CYAN),
            ("4", "det A = 0 heißt: Information geht verloren.",
             "Keine Inverse, kein eindeutiges LGS — alles hängt zusammen.", AMBER),
        ]
        rows = VGroup()
        for num, title, desc, col in items:
            n = Text(num, font=MONO, font_size=40, color=col, weight=BOLD)
            t = Text(title, font=FONT, font_size=26, color=FG, weight=MEDIUM)
            d = Text(desc, font=FONT, font_size=21, color=MUTED)
            txt = VGroup(t, d).arrange(DOWN, aligned_edge=LEFT, buff=0.18)
            n.next_to(txt, LEFT, buff=0.55).set_y(txt.get_y())
            rows.add(VGroup(n, txt))
        rows.arrange(DOWN, aligned_edge=LEFT, buff=0.62)
        place(rows, x=0, top=hdr.get_bottom()[1] - 0.6, w=12.4, h=5.2)

        for r in rows:
            self.play(FadeIn(r, shift=RIGHT * 0.25), run_time=0.8)
            self.wait(2.6)
        self.wait(4.0)
        self.play(*[FadeOut(m) for m in self.mobjects[1:]], run_time=0.9)


class Z2Formelsammlung(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        hdr = section_header(self, "Formelsammlung", color=BLUE)

        def block(title, formulas, col):
            t = Text(title, font=FONT, font_size=24, color=col, weight=SEMIBOLD)
            fs = VGroup(*[MathTex(f, font_size=30) for f in formulas])
            for f in fs:
                fit(f, w=5.5)
            fs.arrange(DOWN, aligned_edge=LEFT, buff=0.3)
            g = VGroup(t, fs).arrange(DOWN, aligned_edge=LEFT, buff=0.32)
            ln = Line(LEFT, RIGHT, color=col, stroke_width=2.5).set_width(0.9)
            ln.next_to(t, DOWN, buff=0.12).align_to(t, LEFT)
            return VGroup(g, ln)

        b1 = block("Grundrechnen", [
            r"(A\pm B)_{ij} = a_{ij}\pm b_{ij}",
            r"(k\,A)_{ij} = k\,a_{ij}",
            r"(A\cdot B)_{ij} = \textstyle\sum_k a_{ik}\,b_{kj}",
            r"(m\times n)\cdot(n\times p) = (m\times p)",
        ], BLUE)

        b2 = block("Transponieren & Inverse", [
            r"(A^{T})^{T} = A,\quad (A+B)^{T}=A^{T}+B^{T}",
            r"(A\cdot B)^{T} = B^{T}A^{T}",
            r"A\,A^{-1} = A^{-1}A = E",
            r"(A\cdot B)^{-1} = B^{-1}A^{-1}",
        ], CYAN)

        b3 = block("Determinante", [
            r"\det\begin{pmatrix}a&b\\c&d\end{pmatrix} = ad-bc",
            r"\det(A\cdot B) = \det A\cdot\det B",
            r"\det(A^{T}) = \det A,\;\; \det(kA)=k^{n}\det A",
            r"A^{-1}\text{ existiert} \iff \det A \neq 0",
        ], AMBER)

        b4 = block("Eigenwerte", [
            r"A\vec{v} = \lambda\vec{v},\quad \vec{v}\neq\vec{0}",
            r"\det(A-\lambda E) = 0",
            r"A = S\,D\,S^{-1}",
            r"A^{n} = S\,D^{n}\,S^{-1}",
        ], PINK)

        grid_ = VGroup(b1, b2, b3, b4)
        for b in grid_:
            fit(b, w=5.8)
        grid_.arrange_in_grid(rows=2, cols=2, buff=(1.0, 0.75),
                              col_alignments="ll", row_alignments="uu")
        place(grid_, x=0, top=hdr.get_bottom()[1] - 0.5, w=12.6, h=5.4)

        for b in grid_:
            self.play(FadeIn(b, shift=UP * 0.2), run_time=0.8)
            self.wait(2.4)
        self.wait(9.0)
        self.play(*[FadeOut(m) for m in self.mobjects[1:]], run_time=0.9)


class Z3Fahrplan(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        hdr = section_header(self, "Wie es weitergeht", color=BLUE)

        items = [
            "Vektorräume, Basis und Dimension — der abstrakte Überbau.",
            "Skalarprodukt, Orthogonalität und die QR-Zerlegung.",
            "Singulärwertzerlegung (SVD) — das Arbeitspferd der Datenanalyse.",
            "Lineare Optimierung und numerische Verfahren für riesige Systeme.",
        ]
        b = bullets(items, size=27, dot_color=BLUE, buff=0.5)
        place(b, x=0, top=hdr.get_bottom()[1] - 0.8, w=12)
        for r in b:
            self.play(FadeIn(r, shift=RIGHT * 0.25), run_time=0.7)
            self.wait(1.9)
        self.wait(3.0)

        tip = note_box(body("Der beste nächste Schritt ist aber immer derselbe:\n"
                            "Übungsaufgaben rechnen, bis die Rechenwege sitzen.",
                            size=25, color=FG), color=GREEN, label="Tipp")
        place(tip, x=0, top=b.get_bottom()[1] - 0.8, w=11)
        self.play(FadeIn(tip), run_time=0.9)
        self.wait(3.6)
        self.play(*[FadeOut(m) for m in self.mobjects[1:]], run_time=0.9)


class Z4Outro(Scene):
    def construct(self):
        ghost = grid(x_range=(-14, 14, 1), y_range=(-9, 9, 1))
        ghost.set_opacity(0.22)
        pl = grid(x_range=(-14, 14, 1), y_range=(-9, 9, 1))
        pl.set_opacity(0.55)
        self.play(FadeIn(ghost), FadeIn(pl), run_time=1.2)

        for M in ([[0.7, -0.7], [0.7, 0.7]], [[1, 0.5], [0, 1]], [[1.3, 0], [0, 0.77]]):
            a = np.array(M, dtype=float)
            self.play(ApplyMatrix(a, pl), run_time=2.0,
                      rate_func=rate_functions.ease_in_out_sine)
            self.play(ApplyMatrix(np.linalg.inv(a), pl), run_time=1.6,
                      rate_func=rate_functions.ease_in_out_sine)

        self.play(pl.animate.set_opacity(0.2), ghost.animate.set_opacity(0.1),
                  run_time=1.2)

        end = VGroup(
            h1("Das war der Kurs.", size=58),
            body("Danke fürs Durchhalten — jetzt bist du dran.", size=30, color=MUTED),
        ).arrange(DOWN, buff=0.55)
        end[0].set_color_by_gradient(BLUE, PURPLE, PINK)
        place(end, x=0, y=0.3, w=12)
        self.play(Write(end[0]), run_time=2.0)
        self.play(FadeIn(end[1], shift=UP * 0.2), run_time=1.0)
        self.wait(3.0)

        ln = Line(LEFT, RIGHT, color=BORDER, stroke_width=2).set_width(6)
        ln.next_to(end, DOWN, buff=0.7)
        cred = small("Erstellt mit Manim · Musik synthetisch erzeugt", size=22, color=DIM)
        cred.next_to(ln, DOWN, buff=0.45)
        self.play(GrowFromCenter(ln), FadeIn(cred), run_time=1.2)
        self.wait(4.0)
        self.play(FadeOut(VGroup(end, ln, cred)), FadeOut(pl), FadeOut(ghost),
                  run_time=2.0)
        self.wait(1.0)
