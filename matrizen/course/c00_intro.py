"""Kapitel 0 — Intro, Motivation, Kursüberblick."""

from theme import *


class ColdOpen(Scene):
    """Stiller Einstieg: eine Matrix verbiegt den Raum."""

    def construct(self):
        pl = grid(x_range=(-12, 12, 1), y_range=(-8, 8, 1))
        pl.set_opacity(0.0)

        # Haus vom Nikolaus als Testfigur
        pts = [(-1, -1), (1, -1), (1, 1), (-1, 1), (-1, -1),
               (1, 1), (1, -1), (-1, 1), (0, 2), (1, 1)]
        house = VMobject(stroke_color=CYAN, stroke_width=6)
        house.set_points_as_corners([pl.c2p(*p) for p in pts])

        self.play(pl.animate.set_opacity(1.0), run_time=1.4)
        self.play(Create(house), run_time=1.6)
        self.wait(0.6)

        mats = [
            ([[1, 0.9], [0, 1]], "Scherung"),
            ([[0.6, -0.8], [0.8, 0.6]], "Drehung"),
            ([[-1, 0], [0, 1]], "Spiegelung"),
            ([[1.5, 0], [0, 0.55]], "Streckung"),
        ]

        label = VGroup()
        for m, name in mats:
            tex = MathTex(pmat(m), font_size=44, color=PURPLE)
            cap = Text(name, font=FONT, font_size=26, color=MUTED)
            new = VGroup(tex, cap).arrange(DOWN, buff=0.3)
            new = panel(new, pad=0.4, fill=SURFACE, opacity=0.85)
            new.to_corner(UR, buff=0.6)

            if len(label) == 0:
                self.play(FadeIn(new), run_time=0.5)
            else:
                self.play(FadeTransform(label, new), run_time=0.5)
            label = new

            arr = np.array(m)
            self.play(
                ApplyMatrix(arr, pl),
                ApplyMatrix(arr, house),
                run_time=2.0, rate_func=rate_functions.ease_in_out_sine,
            )
            self.wait(0.5)
            inv = np.linalg.inv(arr)
            self.play(
                ApplyMatrix(inv, pl),
                ApplyMatrix(inv, house),
                run_time=1.2, rate_func=rate_functions.ease_in_out_sine,
            )

        self.play(FadeOut(label), run_time=0.5)
        self.play(FadeOut(pl), FadeOut(house), run_time=1.2)
        self.wait(0.3)


class Titel(Scene):
    def construct(self):
        tag = badge("VOLLSTÄNDIGER KURS", color=BLUE, size=24)
        ttl = Text("MATRIZEN", font=FONT, font_size=112, weight=BOLD, color=FG)
        ttl.set_color_by_gradient(BLUE, PURPLE, PINK)
        sub = body("Von den Grundlagen bis zu Eigenwerten", size=32, color=MUTED)
        line = Line(LEFT, RIGHT, color=BORDER, stroke_width=2).set_width(7)

        grp = VGroup(tag, ttl, line, sub).arrange(DOWN, buff=0.5).move_to(ORIGIN)

        self.play(FadeIn(tag, shift=DOWN * 0.2), run_time=0.8)
        self.play(Write(ttl), run_time=2.0)
        self.play(GrowFromCenter(line), FadeIn(sub, shift=UP * 0.2), run_time=1.0)
        self.wait(2.0)

        note = small("Ein Kurs zum Mitrechnen · in eigenem Tempo · Pause-Taste ist erlaubt",
                     size=24, color=DIM)
        note.next_to(grp, DOWN, buff=0.9)
        self.play(FadeIn(note), run_time=0.9)
        self.wait(2.2)
        self.play(FadeOut(VGroup(grp, note), shift=UP * 0.4), run_time=1.0)


class WarumMatrizen(Scene):
    def construct(self):
        tag = chapter_tag("0 · Einführung")
        self.add(tag)

        hdr = section_header(self, "Warum überhaupt Matrizen?", color=BLUE)

        q = h3("Eine Matrix ist erst mal nur ein Zahlenschema:", size=30, color=MUTED)
        q.next_to(hdr, DOWN, buff=0.75)
        A = MathTex(pmat([[2, 1, 0], [-1, 3, 4]]), font_size=64, color=PURPLE)
        A.next_to(q, DOWN, buff=0.5)
        self.play(FadeIn(q, shift=UP * 0.2), run_time=0.8)
        self.play(Write(A), run_time=1.4)
        self.wait(1.8)

        q2 = h3("Aber sie beschreibt ganze Prozesse auf einen Schlag.",
                size=30, color=FG)
        q2.next_to(A, DOWN, buff=0.7)
        self.play(FadeIn(q2, shift=UP * 0.2), run_time=0.9)
        self.wait(2.2)

        self.play(FadeOut(VGroup(q, A, q2)), run_time=0.7)

        # Vier Anwendungsfelder als Karten
        felder = [
            ("Gleichungssysteme", "Drei Gleichungen, drei Unbekannte —\nin einer Zeile: A · x = b", BLUE),
            ("Geometrie", "Drehen, Spiegeln, Skalieren:\njede lineare Abbildung ist eine Matrix", PURPLE),
            ("Prozesse & Prognosen", "Wie entwickelt sich eine Population,\nein Wetter, ein Markt?", GREEN),
            ("Technik & Daten", "3D-Grafik, Bildbearbeitung,\nneuronale Netze, Statistik", AMBER),
        ]

        cards = VGroup()
        for name, desc, col in felder:
            t1 = Text(name, font=FONT, font_size=27, color=col, weight=SEMIBOLD)
            t2 = Text(desc, font=FONT, font_size=21, color=MUTED,
                      line_spacing=0.85)
            inner = VGroup(t1, t2).arrange(DOWN, aligned_edge=LEFT, buff=0.26)
            card = panel(inner, pad=0.42, fill=SURFACE, stroke=BORDER)
            card[0].stretch_to_fit_width(5.6)
            card[0].stretch_to_fit_height(2.05)
            inner.move_to(card[0]).align_to(card[0], LEFT).shift(RIGHT * 0.42)
            cards.add(card)

        cards.arrange_in_grid(rows=2, cols=2, buff=(0.55, 0.5))
        cards.next_to(hdr, DOWN, buff=0.75)

        self.play(LaggedStart(*[FadeIn(c, shift=UP * 0.25) for c in cards],
                              lag_ratio=0.25), run_time=2.2)
        self.wait(4.0)

        self.play(FadeOut(cards), FadeOut(hdr), run_time=0.8)

        kern = VGroup(
            h2("Die Kernidee des ganzen Kurses:", size=34, color=MUTED),
            h1("Eine Matrix ist eine Maschine,\ndie Vektoren in Vektoren verwandelt.",
               size=42, color=FG),
        ).arrange(DOWN, buff=0.6).move_to(ORIGIN)
        kern[1].set_color_by_gradient(BLUE, CYAN)
        self.play(FadeIn(kern[0], shift=UP * 0.2), run_time=0.8)
        self.play(Write(kern[1]), run_time=2.2)
        self.wait(3.0)
        self.play(FadeOut(kern), FadeOut(tag), run_time=0.8)


class Kursplan(Scene):
    def construct(self):
        tag = chapter_tag("0 · Einführung")
        self.add(tag)
        hdr = section_header(self, "Der Fahrplan", color=BLUE)

        kapitel = [
            ("01", "Rückblick", "Vektoren, LGS, Abbildungen", AMBER),
            ("02", "Was ist eine Matrix?", "Notation, Typen, Transponierte", BLUE),
            ("03", "Rechnen mit Matrizen", "Addition, Produkt, Falk-Schema", BLUE),
            ("04", "Lineare Abbildungen", "Drehung, Spiegelung, Verkettung", PURPLE),
            ("05", "Determinante", "Fläche, Volumen, Sarrus", CYAN),
            ("06", "Inverse Matrix", "Umkehren, Gauß-Jordan", CYAN),
            ("07", "Gleichungssysteme", "Gauß, Rang, Lösungsmengen", GREEN),
            ("08", "Eigenwerte & Eigenvektoren", "Die besonderen Richtungen", PINK),
            ("09", "Anwendungen", "Markow-Ketten, Verflechtung, 3D", AMBER),
            ("10", "Übungsaufgaben", "Sechs Aufgaben mit vollem Lösungsweg", GREEN),
            ("11", "Zusammenfassung", "Alle Formeln auf einen Blick", MUTED),
        ]

        rows = VGroup()
        for num, name, desc, col in kapitel:
            n = Text(num, font=MONO, font_size=26, color=col, weight=BOLD)
            nm = Text(name, font=FONT, font_size=26, color=FG, weight=MEDIUM)
            ds = Text(desc, font=FONT, font_size=20, color=DIM)
            row = VGroup(n, nm, ds)
            rows.add(row)

        # Spalten sauber ausrichten
        wn = max(r[1].width for r in rows)
        for r in rows:
            r[1].next_to(r[0], RIGHT, buff=0.42)
            r[2].next_to(r[0], RIGHT, buff=0.42 + wn + 0.5)
            r[1].set_y(r[0].get_y())
            r[2].set_y(r[0].get_y())
        rows.arrange(DOWN, aligned_edge=LEFT, buff=0.33)
        rows.scale_to_fit_height(5.4)
        rows.next_to(hdr, DOWN, buff=0.55)

        self.play(LaggedStart(*[FadeIn(r, shift=RIGHT * 0.3) for r in rows],
                              lag_ratio=0.16), run_time=3.6)
        self.wait(5.0)

        self.play(FadeOut(rows), run_time=0.7)

        tipps = VGroup(
            h2("So holst du das Meiste raus", size=34, color=FG),
            bullets([
                "Stift und Papier bereitlegen — jedes Beispiel selbst nachrechnen.",
                "Bei Rechenschritten pausieren und erst selbst probieren.",
                "Kapitel 4 ist das Herzstück: dort wird alles anschaulich.",
                "Kein Vorwissen über Matrizen nötig — nur Abitur-Mathematik.",
            ], size=26, dot_color=BLUE, buff=0.45),
        ).arrange(DOWN, buff=0.7)
        tipps.next_to(hdr, DOWN, buff=0.9)

        self.play(FadeIn(tipps[0], shift=UP * 0.2), run_time=0.8)
        self.play(LaggedStart(*[FadeIn(b, shift=RIGHT * 0.25) for b in tipps[1]],
                              lag_ratio=0.3), run_time=2.4)
        self.wait(5.0)
        self.play(FadeOut(tipps), FadeOut(hdr), FadeOut(tag), run_time=0.8)
