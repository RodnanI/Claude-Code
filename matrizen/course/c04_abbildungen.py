"""Kapitel 4 — Matrizen als lineare Abbildungen."""

from theme import *

TAG = "4 · Lineare Abbildungen"


def full_grid(faint=False):
    g = grid(x_range=(-14, 14, 1), y_range=(-9, 9, 1))
    if faint:
        g.set_opacity(0.28)
        for sub in g.get_axes():
            sub.set_opacity(0.35)
    return g


def matrix_badge(M, label="A", color=PURPLE, size=42):
    tex = MathTex(label + "=" + pmat(M), font_size=size, color=color)
    p = panel(tex, pad=0.36, fill=SURFACE, opacity=0.92)
    p.to_corner(UL, buff=0.45)
    return p


def caption(text, color=MUTED, size=26):
    t = body(text, size=size, color=color)
    p = panel(t, pad=0.3, fill=SURFACE, opacity=0.9)
    p.to_edge(DOWN, buff=0.45)
    return p


class K4Card(Scene):
    def construct(self):
        chapter_card(self, "04", "Matrizen als\nlineare Abbildungen",
                     "Hier wird aus dem Zahlenschema Geometrie", color=PURPLE,
                     topics=["Der Spaltentrick", "Drehung", "Spiegelung",
                             "Scherung", "Verkettung"])


class L1Idee(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))

        intro = VGroup(
            h2("Bisher war eine Matrix nur ein Zahlenschema.", size=34, color=MUTED),
            h1("Jetzt wird sie zu einer Bewegung des Raums.", size=42, color=FG),
        ).arrange(DOWN, buff=0.5)
        intro[1].set_color_by_gradient(PURPLE, PINK)
        place(intro, x=0, y=0, w=12)
        self.play(FadeIn(intro[0]), run_time=0.9)
        self.play(Write(intro[1]), run_time=2.0)
        self.wait(2.6)
        self.play(FadeOut(intro), run_time=0.8)

        ghost = full_grid(faint=True)
        pl = full_grid()
        self.play(FadeIn(ghost), FadeIn(pl), run_time=1.0)

        M = [[2, -1], [1, 1]]
        v = vec_arrow(pl, (1, 1), color=CYAN, width=7)
        vl = MathTex(r"\vec{v}", font_size=36, color=CYAN).next_to(v.get_end(), UR, buff=0.1)
        self.play(GrowArrow(v), FadeIn(vl), run_time=0.9)

        badge_ = matrix_badge(M)
        self.play(FadeIn(badge_), run_time=0.7)
        cap = caption("Die Matrix verschiebt jeden Punkt der Ebene — auch das ganze Gitter.")
        self.play(FadeIn(cap), run_time=0.7)
        self.wait(1.6)

        arr = np.array(M, dtype=float)
        self.play(FadeOut(vl), run_time=0.3)
        self.play(
            ApplyMatrix(arr, pl), ApplyMatrix(arr, v),
            run_time=3.0, rate_func=rate_functions.ease_in_out_sine,
        )
        vl2 = MathTex(r"A\vec{v}", font_size=36, color=CYAN)
        vl2.next_to(v.get_end(), UR, buff=0.1)
        self.play(FadeIn(vl2), run_time=0.5)
        self.wait(2.4)

        cap2 = caption("Aus  v = (1|1)  wird  A·v = (1|2).", color=FG)
        self.play(FadeTransform(cap, cap2), run_time=0.8)
        self.wait(2.6)

        rechnung = MathTex(pmat(M) + cvec([1, 1]) + "=" + cvec([r"2-1", r"1+1"])
                           + "=" + cvec([1, 2]), font_size=40)
        rp = panel(rechnung, pad=0.35, fill=SURFACE, opacity=0.94)
        rp.to_corner(UR, buff=0.45)
        self.play(FadeIn(rp), run_time=0.9)
        self.wait(3.4)

        self.play(FadeOut(VGroup(rp, cap2, badge_, vl2, v)), run_time=0.7)
        self.play(ApplyMatrix(np.linalg.inv(arr), pl), run_time=1.6)

        cap3 = caption("Wichtig: Geraden bleiben Geraden, der Ursprung bleibt fest.",
                       color=FG, size=28)
        self.play(FadeIn(cap3), run_time=0.8)
        self.wait(1.2)

        # Zeigen: Gitterlinien bleiben parallel und gleichmäßig
        for Mx in ([[1, 1.4], [0, 1]], [[0.5, 0], [0, 1.6]]):
            a = np.array(Mx, dtype=float)
            self.play(ApplyMatrix(a, pl), run_time=1.8,
                      rate_func=rate_functions.ease_in_out_sine)
            self.wait(0.8)
            self.play(ApplyMatrix(np.linalg.inv(a), pl), run_time=1.4)
        self.wait(1.2)
        self.play(FadeOut(VGroup(pl, ghost, cap3)), run_time=0.9)


class L2Spaltentrick(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        hdr = section_header(self, "Der Spaltentrick", color=PURPLE)

        q = h3("Was passiert eigentlich mit den Einheitsvektoren?", size=31, color=FG)
        place(q, x=0, top=TOP_Y - 0.1, w=11.5)
        self.play(FadeIn(q, shift=UP * 0.2), run_time=0.9)
        self.wait(1.8)

        c1 = MathTex(pmat([["a", "b"], ["c", "d"]]), cvec([1, 0]), "=",
                     cvec([r"a\cdot 1 + b\cdot 0", r"c\cdot 1 + d\cdot 0"]), "=",
                     cvec(["a", "c"]), font_size=42)
        c1[1].set_color(AMBER)
        c1[5].set_color(AMBER)
        place(c1, x=0, y=0.85, w=12)
        self.play(Write(c1), run_time=2.2)
        self.wait(2.4)
        self.play(Circumscribe(c1[5], color=AMBER, buff=0.15), run_time=1.1)

        c2 = MathTex(pmat([["a", "b"], ["c", "d"]]), cvec([0, 1]), "=",
                     cvec([r"a\cdot 0 + b\cdot 1", r"c\cdot 0 + d\cdot 1"]), "=",
                     cvec(["b", "d"]), font_size=42)
        c2[1].set_color(GREEN)
        c2[5].set_color(GREEN)
        place(c2, x=0, y=-0.85, w=12)
        self.play(Write(c2), run_time=2.2)
        self.wait(2.0)
        self.play(Circumscribe(c2[5], color=GREEN, buff=0.15), run_time=1.1)
        self.wait(1.4)

        self.play(FadeOut(VGroup(q, c1, c2)), run_time=0.7)

        key = VGroup(
            h1("Die Spalten einer Matrix sind genau die\nBilder der Einheitsvektoren.",
               size=40, color=FG),
            MathTex(r"A=\Big(\;A\vec{e}_1\;\Big|\;A\vec{e}_2\;\Big)", font_size=52,
                    color=PURPLE),
        ).arrange(DOWN, buff=0.8)
        place(key, x=0, y=0.3, w=12)
        self.play(Write(key[0]), run_time=2.2)
        self.wait(1.2)
        self.play(FadeIn(key[1], shift=UP * 0.2), run_time=1.0)
        self.wait(3.4)
        self.play(FadeOut(key), FadeOut(hdr), run_time=0.7)

        # Anschaulich am Gitter
        ghost = full_grid(faint=True)
        pl = full_grid()
        self.play(FadeIn(ghost), FadeIn(pl), run_time=0.8)

        M = [[2, -1], [1, 1]]
        e1 = vec_arrow(pl, (1, 0), color=AMBER, width=9, tip_len=0.26)
        e2 = vec_arrow(pl, (0, 1), color=GREEN, width=9, tip_len=0.26)
        l1 = MathTex(r"\vec{e}_1", font_size=34, color=AMBER).next_to(e1, DOWN, buff=0.15)
        l2 = MathTex(r"\vec{e}_2", font_size=34, color=GREEN).next_to(e2, LEFT, buff=0.15)
        self.play(GrowArrow(e1), GrowArrow(e2), FadeIn(l1), FadeIn(l2), run_time=1.0)

        bd = matrix_badge(M)
        self.play(FadeIn(bd), run_time=0.6)
        cap = caption("Beobachte, wo die beiden Pfeile landen.")
        self.play(FadeIn(cap), run_time=0.6)
        self.wait(1.6)

        arr = np.array(M, dtype=float)
        self.play(FadeOut(l1), FadeOut(l2), run_time=0.4)
        self.play(ApplyMatrix(arr, pl), ApplyMatrix(arr, e1), ApplyMatrix(arr, e2),
                  run_time=2.6, rate_func=rate_functions.ease_in_out_sine)

        n1 = MathTex(cvec([2, 1]), font_size=34, color=AMBER).next_to(e1.get_end(), DR, buff=0.12)
        n2 = MathTex(cvec([-1, 1]), font_size=34, color=GREEN).next_to(e2.get_end(), UL, buff=0.12)
        self.play(FadeIn(n1), FadeIn(n2), run_time=0.9)
        self.wait(1.8)

        # Spalten in der Matrix markieren
        tex = bd[1]
        cap2 = caption("Genau das sind die beiden Spalten der Matrix!", color=FG, size=28)
        self.play(FadeTransform(cap, cap2), run_time=0.8)
        self.play(Indicate(tex, color=AMBER, scale_factor=1.15), run_time=1.2)
        self.wait(3.2)

        self.play(FadeOut(VGroup(pl, ghost, e1, e2, n1, n2, bd, cap2)), run_time=0.9)


class L3Katalog(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))

        title = h2("Der Baukasten der linearen Abbildungen", size=38, color=FG)
        place(title, x=0, y=0.4)
        sub = body("Fünf Typen, die du wiedererkennen solltest.", size=27)
        place(sub, x=0, y=-0.4)
        self.play(FadeIn(title), FadeIn(sub), run_time=1.0)
        self.wait(2.2)
        self.play(FadeOut(VGroup(title, sub)), run_time=0.7)

        ghost = full_grid(faint=True)
        pl = full_grid()
        house_pts = [(-1, -1), (1, -1), (1, 1), (0, 1.8), (-1, 1), (-1, -1),
                     (1, 1), (-1, 1), (1, -1)]
        house = VMobject(stroke_color=CYAN, stroke_width=6)
        house.set_points_as_corners([pl.c2p(*p) for p in house_pts])
        self.play(FadeIn(ghost), FadeIn(pl), Create(house), run_time=1.4)

        items = [
            ([[1.6, 0], [0, 1.6]], "Zentrische Streckung",
             "Alles wird um den Faktor 1,6 größer.", AMBER),
            ([[1.8, 0], [0, 0.6]], "Streckung in eine Richtung",
             "In x-Richtung gedehnt, in y-Richtung gestaucht.", AMBER),
            ([[0, -1], [1, 0]], "Drehung um 90°", "Gegen den Uhrzeigersinn um den Ursprung.", BLUE),
            ([[1, 0], [0, -1]], "Spiegelung an der x-Achse", "Das Vorzeichen von y kippt.", PINK),
            ([[1, 1.2], [0, 1]], "Scherung", "Waagrechte Linien bleiben, senkrechte kippen.", PURPLE),
            ([[1, 0], [0, 0]], "Projektion auf die x-Achse",
             "Alles wird platt gedrückt — das lässt sich nicht rückgängig machen!", RED),
        ]

        cur_badge = None
        cur_cap = None
        for M, name, desc, col in items:
            bd = matrix_badge(M, label="A", color=col)
            nm = VGroup(h3(name, size=30, color=col), body(desc, size=23))
            nm.arrange(DOWN, buff=0.22)
            cp = panel(nm, pad=0.32, fill=SURFACE, opacity=0.92)
            cp.to_edge(DOWN, buff=0.45)

            if cur_badge is None:
                self.play(FadeIn(bd), FadeIn(cp), run_time=0.7)
            else:
                self.play(FadeTransform(cur_badge, bd), FadeTransform(cur_cap, cp),
                          run_time=0.7)
            cur_badge, cur_cap = bd, cp

            a = np.array(M, dtype=float)
            self.wait(0.8)
            self.play(ApplyMatrix(a, pl), ApplyMatrix(a, house), run_time=2.2,
                      rate_func=rate_functions.ease_in_out_sine)
            self.wait(2.0)
            if abs(np.linalg.det(a)) > 1e-9:
                self.play(ApplyMatrix(np.linalg.inv(a), pl),
                          ApplyMatrix(np.linalg.inv(a), house), run_time=1.4)
            else:
                # Projektion lässt sich nicht umkehren -> neu zeichnen
                warn = h3("Nicht umkehrbar — die Information ist weg.", size=28, color=RED)
                wp = panel(warn, pad=0.3, fill=SURFACE, opacity=0.95)
                wp.move_to([0, 1.6, 0])
                self.play(FadeIn(wp), run_time=0.8)
                self.wait(2.6)
                new_pl = full_grid()
                new_house = VMobject(stroke_color=CYAN, stroke_width=6)
                new_house.set_points_as_corners([new_pl.c2p(*p) for p in house_pts])
                self.play(FadeOut(wp), FadeOut(pl), FadeOut(house), run_time=0.6)
                self.play(FadeIn(new_pl), Create(new_house), run_time=1.0)
                pl, house = new_pl, new_house
            self.wait(0.5)

        self.play(FadeOut(VGroup(pl, ghost, house, cur_badge, cur_cap)), run_time=0.9)


class L4Drehmatrix(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        section_header(self, "Die Drehmatrix — selbst hergeleitet", color=PURPLE)

        step = body("Wir drehen nur die beiden Einheitsvektoren um den Winkel α.\n"
                    "Nach dem Spaltentrick ist die Matrix damit fertig.", size=26)
        place(step, x=0, top=TOP_Y - 0.1, w=11.5)
        self.play(FadeIn(step), run_time=1.0)
        self.wait(2.6)

        pl = grid(x_range=(-1.6, 1.6, 1), y_range=(-1.2, 1.4, 1), width=4.6, height=3.75)
        pl.move_to([COL_L, -0.75, 0])
        circ = Circle(radius=(pl.c2p(1, 0)[0] - pl.c2p(0, 0)[0]), color=BORDER,
                      stroke_width=2).move_to(pl.c2p(0, 0))
        self.play(FadeIn(pl), Create(circ), run_time=1.0)

        ang = 50 * DEGREES
        e1 = vec_arrow(pl, (1, 0), color=DIM, width=5, tip_len=0.18)
        e2 = vec_arrow(pl, (0, 1), color=DIM, width=5, tip_len=0.18)
        self.play(GrowArrow(e1), GrowArrow(e2), run_time=0.7)

        f1 = vec_arrow(pl, (np.cos(ang), np.sin(ang)), color=AMBER, width=7, tip_len=0.2)
        f2 = vec_arrow(pl, (-np.sin(ang), np.cos(ang)), color=GREEN, width=7, tip_len=0.2)
        arc = Arc(radius=0.7, start_angle=0, angle=ang, color=AMBER, stroke_width=3)
        arc.move_arc_center_to(pl.c2p(0, 0))
        al = MathTex(r"\alpha", font_size=30, color=AMBER).move_to(pl.c2p(0, 0) + RIGHT * 0.95 + UP * 0.32)

        self.play(TransformFromCopy(e1, f1), Create(arc), FadeIn(al), run_time=1.4)
        r1 = MathTex(r"A\vec{e}_1=" + cvec([r"\cos\alpha", r"\sin\alpha"]), font_size=40,
                     color=AMBER)
        place(r1, x=COL_R, top=TOP_Y - 1.4, w=COL_W)
        self.play(Write(r1), run_time=1.4)
        self.wait(2.2)

        self.play(TransformFromCopy(e2, f2), run_time=1.2)
        r2 = MathTex(r"A\vec{e}_2=" + cvec([r"-\sin\alpha", r"\cos\alpha"]), font_size=40,
                     color=GREEN)
        place(r2, x=COL_R, top=r1.get_bottom()[1] - 0.55, w=COL_W)
        self.play(Write(r2), run_time=1.4)
        self.wait(2.4)

        res = MathTex(r"D_\alpha=" + pmat([[r"\cos\alpha", r"-\sin\alpha"],
                                           [r"\sin\alpha", r"\cos\alpha"]]),
                      font_size=44, color=PURPLE)
        place(res, x=COL_R, top=r2.get_bottom()[1] - 0.7, w=COL_W)
        self.play(Write(res), run_time=1.8)
        self.play(Circumscribe(res, color=PURPLE, buff=0.16), run_time=1.2)
        self.wait(3.2)

        self.play(FadeOut(VGroup(step, r1, r2, pl, circ, e1, e2, f1, f2, arc, al)),
                  run_time=0.8)
        self.play(res.animate.scale(0.9).move_to([0, 2.02, 0]), run_time=0.9)

        # Beispiel 90 Grad
        ex = MathTex(r"\alpha=90^\circ:\quad D_{90}=" + pmat([[r"\cos 90^\circ", r"-\sin 90^\circ"],
                                                              [r"\sin 90^\circ", r"\cos 90^\circ"]])
                     + "=" + pmat([[0, -1], [1, 0]]), font_size=40)
        place(ex, x=0, y=0.62, w=12)
        self.play(Write(ex), run_time=2.2)
        self.wait(2.6)

        ex2 = MathTex(r"\alpha=180^\circ:\quad D_{180}=" + pmat([[-1, 0], [0, -1]])
                      + r"\qquad \alpha=360^\circ:\quad D_{360}=" + pmat([[1, 0], [0, 1]]) + "=E",
                      font_size=36)
        place(ex2, x=0, y=-0.78, w=12.4)
        self.play(Write(ex2), run_time=2.0)
        self.wait(3.0)

        nb = note_box(body("Zwei Drehungen nacheinander ergeben wieder eine Drehung —\n"
                           "die beiden Winkel addieren sich dabei einfach.",
                           size=23, color=FG), color=PURPLE, label="Schön daran")
        place(nb, x=0, top=-1.65, w=11)
        self.play(FadeIn(nb), run_time=0.9)
        self.wait(3.6)
        self.play(*[FadeOut(m) for m in self.mobjects[1:]], run_time=0.8)


class L5Drehung(Scene):
    """Sanft laufende Drehung als Anschauung."""

    def construct(self):
        self.add(chapter_tag(TAG))
        ghost = full_grid(faint=True)
        pl = full_grid()
        house_pts = [(-1, -1), (1, -1), (1, 1), (0, 1.8), (-1, 1), (-1, -1)]
        house = VMobject(stroke_color=CYAN, stroke_width=6)
        house.set_points_as_corners([pl.c2p(*p) for p in house_pts])
        self.play(FadeIn(ghost), FadeIn(pl), Create(house), run_time=1.2)

        t = ValueTracker(0.0)

        def dm():
            a = t.get_value()
            return MathTex(
                r"D_\alpha=" + pmat([[r"\cos\alpha", r"-\sin\alpha"],
                                     [r"\sin\alpha", r"\cos\alpha"]])
                + r"\;=\;" + pmat([[f"{np.cos(a):.2f}", f"{-np.sin(a):.2f}"],
                                   [f"{np.sin(a):.2f}", f"{np.cos(a):.2f}"]]),
                font_size=36, color=PURPLE)

        lbl = always_redraw(lambda: panel(dm(), pad=0.32, fill=SURFACE,
                                          opacity=0.93).to_corner(UL, buff=0.45))
        angle_lbl = always_redraw(lambda: panel(
            MathTex(r"\alpha=" + f"{np.degrees(t.get_value()):.0f}" + r"^\circ",
                    font_size=38, color=AMBER),
            pad=0.28, fill=SURFACE, opacity=0.93).to_corner(UR, buff=0.45))

        self.add(lbl, angle_lbl)
        self.wait(1.0)

        base_pl = pl.copy()
        base_house = house.copy()

        def upd(mob_pair):
            pass

        pl.add_updater(lambda m: m.become(
            base_pl.copy().apply_matrix(rot(t.get_value()))))
        house.add_updater(lambda m: m.become(
            base_house.copy().apply_matrix(rot(t.get_value()))))

        self.play(t.animate.set_value(TAU), run_time=12.0, rate_func=linear)
        pl.clear_updaters()
        house.clear_updaters()
        self.wait(1.0)
        self.play(FadeOut(VGroup(pl, ghost, house)), FadeOut(lbl), FadeOut(angle_lbl),
                  run_time=1.0)


def rot(a):
    return np.array([[np.cos(a), -np.sin(a), 0],
                     [np.sin(a), np.cos(a), 0],
                     [0, 0, 1]])


class L6Verkettung(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        hdr = section_header(self, "Warum das Matrixprodukt so definiert ist", color=PURPLE)

        txt = body("Zwei Abbildungen nacheinander ausführen — das ist das Produkt.",
                   size=27)
        place(txt, x=0, top=TOP_Y - 0.1, w=11.5)
        self.play(FadeIn(txt), run_time=0.9)
        self.wait(2.0)

        chain = MathTex(r"A\cdot(B\cdot\vec{v}) \;=\; (A\cdot B)\cdot\vec{v}",
                        font_size=52)
        place(chain, x=0, y=0.9)
        self.play(Write(chain), run_time=1.8)
        self.wait(2.2)

        warn = note_box(
            body("Lies A·B von rechts nach links:\nzuerst wirkt B, danach A.",
                 size=25, color=FG), color=RED, label="Reihenfolge!")
        place(warn, x=0, top=-0.4, w=9)
        self.play(FadeIn(warn), run_time=0.9)
        self.wait(3.4)
        self.play(FadeOut(VGroup(txt, chain, warn, hdr)), run_time=0.7)

        # Praktische Demonstration
        B = [[1, 1], [0, 1]]      # Scherung
        A = [[0, -1], [1, 0]]     # Drehung 90
        AB = (np.array(A) @ np.array(B)).tolist()

        ghost = full_grid(faint=True)
        pl = full_grid()
        house_pts = [(-1, -1), (1, -1), (1, 1), (0, 1.8), (-1, 1), (-1, -1)]
        house = VMobject(stroke_color=CYAN, stroke_width=6)
        house.set_points_as_corners([pl.c2p(*p) for p in house_pts])
        self.play(FadeIn(ghost), FadeIn(pl), Create(house), run_time=1.2)

        b1 = matrix_badge(B, label="B", color=CYAN)
        cp = caption("Schritt 1: erst B — die Scherung.", color=FG, size=27)
        self.play(FadeIn(b1), FadeIn(cp), run_time=0.7)
        self.wait(1.2)
        self.play(ApplyMatrix(np.array(B, dtype=float), pl),
                  ApplyMatrix(np.array(B, dtype=float), house), run_time=2.2,
                  rate_func=rate_functions.ease_in_out_sine)
        self.wait(1.4)

        b2 = matrix_badge(A, label="A", color=AMBER)
        b2.next_to(b1, DOWN, buff=0.3).align_to(b1, LEFT)
        cp2 = caption("Schritt 2: dann A — die Drehung um 90°.", color=FG, size=27)
        self.play(FadeIn(b2), FadeTransform(cp, cp2), run_time=0.7)
        self.wait(1.0)
        self.play(ApplyMatrix(np.array(A, dtype=float), pl),
                  ApplyMatrix(np.array(A, dtype=float), house), run_time=2.2,
                  rate_func=rate_functions.ease_in_out_sine)
        self.wait(2.0)

        cp3 = caption("Jetzt dasselbe in einem Schritt — mit dem Produkt A·B.",
                      color=FG, size=27)
        self.play(FadeTransform(cp2, cp3), run_time=0.8)
        self.wait(1.4)

        # zurücksetzen
        self.play(FadeOut(pl), FadeOut(house), FadeOut(b1), FadeOut(b2), run_time=0.6)
        pl2 = full_grid()
        house2 = VMobject(stroke_color=CYAN, stroke_width=6)
        house2.set_points_as_corners([pl2.c2p(*p) for p in house_pts])
        self.play(FadeIn(pl2), Create(house2), run_time=0.9)

        prod = MathTex(r"A\cdot B=" + pmat(A) + pmat(B) + "=" + pmat(AB),
                       font_size=36, color=GREEN)
        pp = panel(prod, pad=0.32, fill=SURFACE, opacity=0.94).to_corner(UL, buff=0.45)
        self.play(FadeIn(pp), run_time=0.8)
        self.wait(1.6)
        self.play(ApplyMatrix(np.array(AB, dtype=float), pl2),
                  ApplyMatrix(np.array(AB, dtype=float), house2), run_time=2.4,
                  rate_func=rate_functions.ease_in_out_sine)
        self.wait(1.4)

        cp4 = caption("Gleiches Ergebnis — genau deshalb multipliziert man Zeile mal Spalte.",
                      color=GREEN, size=27)
        self.play(FadeTransform(cp3, cp4), run_time=0.9)
        self.wait(3.6)

        self.play(FadeOut(VGroup(pl2, ghost, house2, pp, cp4)), run_time=0.9)


class L7BAvsAB(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        section_header(self, "Und jetzt die andere Reihenfolge", color=PURPLE)

        B = [[1, 1], [0, 1]]
        A = [[0, -1], [1, 0]]
        AB = (np.array(A) @ np.array(B)).tolist()
        BA = (np.array(B) @ np.array(A)).tolist()

        left = MathTex(r"A\cdot B=" + pmat(AB), font_size=44, color=GREEN)
        right = MathTex(r"B\cdot A=" + pmat(BA), font_size=44, color=AMBER)
        VGroup(left, right).arrange(RIGHT, buff=1.6)
        place(VGroup(left, right), x=0, y=2.1, w=11)
        self.play(FadeIn(left), FadeIn(right), run_time=1.0)
        self.wait(1.8)

        pl_l = grid(x_range=(-3.5, 3.5, 1), y_range=(-2.4, 2.4, 1), width=5.4, height=3.7)
        pl_l.move_to([-3.5, -1.0, 0])
        pl_r = grid(x_range=(-3.5, 3.5, 1), y_range=(-2.4, 2.4, 1), width=5.4, height=3.7)
        pl_r.move_to([3.5, -1.0, 0])

        def mk_house(pl_):
            pts = [(-0.8, -0.8), (0.8, -0.8), (0.8, 0.8), (0, 1.5), (-0.8, 0.8), (-0.8, -0.8)]
            h = VMobject(stroke_color=CYAN, stroke_width=5)
            h.set_points_as_corners([pl_.c2p(*p) for p in pts])
            return h

        hl, hr = mk_house(pl_l), mk_house(pl_r)
        self.play(FadeIn(pl_l), FadeIn(pl_r), Create(hl), Create(hr), run_time=1.2)
        self.wait(1.0)

        # ApplyMatrix wirkt um ORIGIN -> vorher zentrieren
        def apply_about(m, mob, plane):
            return ApplyMatrix(np.array(m, dtype=float), mob,
                               about_point=plane.c2p(0, 0))

        self.play(apply_about(AB, hl, pl_l), apply_about(BA, hr, pl_r),
                  run_time=2.4, rate_func=rate_functions.ease_in_out_sine)
        self.wait(1.4)

        cap = h3("Zwei verschiedene Figuren — also ist A·B ≠ B·A.", size=30, color=RED)
        place(cap, x=0, top=-3.0, w=12)
        self.play(FadeIn(cap, shift=UP * 0.2), run_time=0.9)
        self.wait(3.6)
        self.play(*[FadeOut(m) for m in self.mobjects[1:]], run_time=0.9)
