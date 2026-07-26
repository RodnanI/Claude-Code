"""Kapitel 1 — Rückblick: Vektoren, Gleichungssysteme, Abbildungen."""

from theme import *

TAG = "1 · Rückblick"


class K1Card(Scene):
    def construct(self):
        chapter_card(
            self, "01", "Rückblick",
            "Drei Dinge aus dem Abitur, auf denen alles aufbaut",
            color=AMBER,
            topics=["Vektoren", "Lineare Gleichungssysteme", "Abbildungen"],
        )


def _plane(xr, yr, w=6.0, h=5.1):
    pl = grid(x_range=xr, y_range=yr, width=w, height=h)
    pl.move_to([COL_L, -0.5, 0])
    return pl


class R1Vektoren(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        section_header(self, "Rückblick 1 — Der Vektor", color=AMBER)

        # ---------------- Board A: Was ist ein Vektor -------------------
        pl = _plane((-1, 6, 1), (-1, 5, 1))
        self.play(FadeIn(pl), run_time=0.9)

        v = vec_arrow(pl, (4, 3), color=CYAN)
        vlab = MathTex(r"\vec{v}", font_size=38, color=CYAN)
        vlab.next_to(pl.c2p(4, 3), UR, buff=0.1)
        self.play(GrowArrow(v), FadeIn(vlab), run_time=1.2)

        blockA = VGroup(
            h3("Ein Vektor ist eine\nVerschiebung.", size=30, color=FG),
            MathTex(r"\vec{v}=" + cvec([4, 3]), font_size=54, color=CYAN),
            body("4 Einheiten nach rechts,\n3 Einheiten nach oben.", size=25),
        ).arrange(DOWN, buff=0.55)
        place(blockA, x=COL_R, top=TOP_Y - 0.2, w=COL_W)

        self.play(FadeIn(blockA[0], shift=UP * 0.2), run_time=0.9)
        self.play(Write(blockA[1]), run_time=1.1)
        self.play(FadeIn(blockA[2]), run_time=0.8)

        hstep = DashedLine(pl.c2p(0, 0), pl.c2p(4, 0), color=AMBER, stroke_width=4)
        vstep = DashedLine(pl.c2p(4, 0), pl.c2p(4, 3), color=AMBER, stroke_width=4)
        n4 = MathTex("4", font_size=30, color=AMBER).next_to(hstep, DOWN, buff=0.12)
        n3 = MathTex("3", font_size=30, color=AMBER).next_to(vstep, RIGHT, buff=0.12)
        self.play(Create(hstep), FadeIn(n4), run_time=0.8)
        self.play(Create(vstep), FadeIn(n3), run_time=0.8)
        self.wait(2.6)
        self.play(FadeOut(VGroup(hstep, vstep, n4, n3, blockA)), run_time=0.7)

        # ---------------- Board B: Addition -----------------------------
        w_ = vec_arrow(pl, (1, 2), color=PINK)
        wlab = MathTex(r"\vec{w}", font_size=38, color=PINK)
        wlab.next_to(pl.c2p(1, 2), UL, buff=0.08)
        self.play(GrowArrow(w_), FadeIn(wlab), run_time=0.9)

        tB = h3("Addition:\nPfeile aneinanderhängen", size=29, color=FG)
        cB = MathTex(cvec([4, 3]) + "+" + cvec([1, 2]) + "="
                     + cvec([r"4+1", r"3+2"]) + "=" + cvec([5, 5]), font_size=40)
        cB[0][-4:].set_color(GREEN)
        blockB = VGroup(tB, cB).arrange(DOWN, buff=0.6)
        place(blockB, x=COL_R, top=TOP_Y - 0.2, w=COL_W)

        self.play(FadeIn(tB, shift=UP * 0.2), run_time=0.8)
        wshift = Arrow(pl.c2p(4, 3), pl.c2p(5, 5), buff=0, color=PINK,
                       stroke_width=6, tip_length=0.2)
        self.play(TransformFromCopy(w_, wshift), run_time=1.3)
        summe = vec_arrow(pl, (5, 5), color=GREEN, width=7)
        slab = MathTex(r"\vec{v}+\vec{w}", font_size=34, color=GREEN)
        slab.next_to(pl.c2p(5, 5), UR, buff=0.05)
        self.play(GrowArrow(summe), FadeIn(slab), run_time=1.2)
        self.play(Write(cB), run_time=1.6)
        self.wait(2.4)

        nb = note_box(body("Vektoren werden\nkomponentenweise addiert.", size=24, color=FG),
                      color=AMBER, label="Merke")
        place(nb, x=COL_R, top=blockB.get_bottom()[1] - 0.75, w=COL_W)
        self.play(FadeIn(nb), run_time=0.8)
        self.wait(2.6)

        self.play(FadeOut(VGroup(blockB, nb, wshift, summe, slab, w_, wlab, v, vlab, pl)),
                  run_time=0.8)

        # ---------------- Board C: Skalarmultiplikation -----------------
        pl2 = _plane((-3, 7, 1), (-3, 6, 1))
        v1 = vec_arrow(pl2, (3, 2), color=CYAN, width=6)
        l1 = MathTex(r"\vec{v}", font_size=32, color=CYAN).next_to(pl2.c2p(3, 2), DR, buff=0.06)
        self.play(FadeIn(pl2), run_time=0.7)
        self.play(GrowArrow(v1), FadeIn(l1), run_time=0.8)

        tC = h3("Vielfaches: Länge ändern,\nRichtung behalten", size=29, color=FG)
        cC1 = MathTex(r"2\cdot" + cvec([3, 2]) + "=" + cvec([6, 4]), font_size=42,
                      color=PURPLE)
        cC2 = MathTex(r"-1\cdot" + cvec([3, 2]) + "=" + cvec([-3, -2]), font_size=42,
                      color=RED)
        blockC = VGroup(tC, cC1, cC2).arrange(DOWN, buff=0.55)
        place(blockC, x=COL_R, top=TOP_Y - 0.2, w=COL_W)

        self.play(FadeIn(tC, shift=UP * 0.2), run_time=0.8)
        v2 = vec_arrow(pl2, (6, 4), color=PURPLE, width=7)
        l2 = MathTex(r"2\vec{v}", font_size=32, color=PURPLE).next_to(pl2.c2p(6, 4), UR, buff=0.06)
        self.play(GrowArrow(v2), Write(cC1), run_time=1.5)
        self.play(FadeIn(l2), run_time=0.4)
        self.wait(2.2)

        v3 = vec_arrow(pl2, (-3, -2), color=RED, width=6)
        l3 = MathTex(r"-\vec{v}", font_size=32, color=RED).next_to(pl2.c2p(-3, -2), DL, buff=0.06)
        self.play(GrowArrow(v3), Write(cC2), run_time=1.4)
        self.play(FadeIn(l3), run_time=0.4)
        self.wait(2.6)

        self.play(FadeOut(VGroup(blockC, v1, v2, v3, l1, l2, l3, pl2)), run_time=0.8)

        # ---------------- Board D: Einheitsvektoren ---------------------
        pl3 = _plane((-1, 6, 1), (-1, 5, 1))
        self.play(FadeIn(pl3), run_time=0.7)

        e1 = vec_arrow(pl3, (1, 0), color=AMBER, width=8, tip_len=0.18)
        e2 = vec_arrow(pl3, (0, 1), color=GREEN, width=8, tip_len=0.18)
        e1l = MathTex(r"\vec{e}_1", font_size=30, color=AMBER).next_to(e1, DOWN, buff=0.1)
        e2l = MathTex(r"\vec{e}_2", font_size=30, color=GREEN).next_to(e2, LEFT, buff=0.1)

        tD = h3("Die zwei Einheitsvektoren", size=29, color=FG)
        cD = MathTex(r"\vec{e}_1=" + cvec([1, 0]) + r",\quad \vec{e}_2=" + cvec([0, 1]),
                     font_size=40)
        cD[0][:3].set_color(AMBER)
        cD[0][8:11].set_color(GREEN)
        blockD = VGroup(tD, cD).arrange(DOWN, buff=0.5)
        place(blockD, x=COL_R, top=TOP_Y - 0.2, w=COL_W)

        self.play(FadeIn(tD, shift=UP * 0.2), run_time=0.7)
        self.play(GrowArrow(e1), FadeIn(e1l), run_time=0.6)
        self.play(GrowArrow(e2), FadeIn(e2l), run_time=0.6)
        self.play(Write(cD), run_time=1.2)
        self.wait(1.8)

        walk1 = VGroup(*[Arrow(pl3.c2p(i, 0), pl3.c2p(i + 1, 0), buff=0, color=AMBER,
                               stroke_width=7, tip_length=0.16) for i in range(4)])
        walk2 = VGroup(*[Arrow(pl3.c2p(4, j), pl3.c2p(4, j + 1), buff=0, color=GREEN,
                               stroke_width=7, tip_length=0.16) for j in range(3)])
        self.play(LaggedStart(*[GrowArrow(a) for a in walk1], lag_ratio=0.3), run_time=1.3)
        self.play(LaggedStart(*[GrowArrow(a) for a in walk2], lag_ratio=0.3), run_time=1.1)
        vv = vec_arrow(pl3, (4, 3), color=CYAN, width=7)
        self.play(GrowArrow(vv), run_time=0.9)

        key = MathTex(r"\vec{v}=" + cvec([4, 3]) + r"=4\,\vec{e}_1+3\,\vec{e}_2", font_size=40)
        place(key, x=COL_R, top=blockD.get_bottom()[1] - 0.7, w=COL_W)
        self.play(Write(key), run_time=1.6)
        self.wait(1.6)

        nb2 = note_box(
            body("Jeder Vektor ist eine Kombination\nvon e₁ und e₂ — daran hängt\nspäter die ganze Matrix-Idee.",
                 size=22, color=FG),
            color=BLUE, label="Wichtig für Kapitel 4")
        place(nb2, x=COL_R, top=key.get_bottom()[1] - 0.55, w=COL_W)
        self.play(FadeIn(nb2), run_time=0.9)
        self.wait(4.0)

        self.play(*[FadeOut(m) for m in self.mobjects], run_time=0.9)


class R2LGS(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        section_header(self, "Rückblick 2 — Lineare Gleichungssysteme", color=AMBER)

        sys_ = MathTex(r"\begin{aligned} 2x + y &= 8\\ x - y &= 1 \end{aligned}",
                       font_size=52)
        place(sys_, x=COL_L, y=0.9)
        self.play(Write(sys_), run_time=1.4)
        self.wait(1.4)

        expl = body("Gesucht: die Zahlen x und y,\ndie beide Gleichungen erfüllen.", size=26)
        place(expl, x=COL_L, top=sys_.get_bottom()[1] - 0.8, w=COL_W)
        self.play(FadeIn(expl, shift=UP * 0.2), run_time=0.9)
        self.wait(2.0)

        pl = grid(x_range=(-1, 6, 1), y_range=(-2, 6, 1), width=4.7, height=4.7)
        pl.move_to([COL_R, -0.95, 0])
        g1 = pl.plot(lambda x: 8 - 2 * x, x_range=[1, 5], color=BLUE, stroke_width=5)
        g2 = pl.plot(lambda x: x - 1, x_range=[-1, 6], color=PINK, stroke_width=5)
        l1 = MathTex("2x+y=8", font_size=24, color=BLUE).next_to(g1.get_start(), UR, buff=0.05)
        l2 = MathTex("x-y=1", font_size=24, color=PINK).next_to(g2.get_end(), UL, buff=0.05)

        self.play(FadeIn(pl), run_time=0.8)
        self.play(Create(g1), FadeIn(l1), run_time=1.1)
        self.play(Create(g2), FadeIn(l2), run_time=1.1)

        d = Dot(pl.c2p(3, 2), color=GREEN, radius=0.09)
        dl = MathTex(r"(3\,|\,2)", font_size=28, color=GREEN).next_to(d, DR, buff=0.12)
        self.play(FadeIn(d, scale=2), Flash(d, color=GREEN, line_length=0.22), run_time=1.0)
        self.play(FadeIn(dl), run_time=0.6)
        geo = body("Zwei Geraden — die Lösung\nist ihr Schnittpunkt.", size=23)
        place(geo, x=COL_R, top=TOP_Y + 0.1, w=COL_W)
        self.play(FadeIn(geo), run_time=0.8)
        self.wait(3.2)

        self.play(FadeOut(VGroup(pl, g1, g2, l1, l2, d, dl, geo, expl)), run_time=0.7)
        self.play(sys_.animate.move_to([0, 1.9, 0]).scale(0.9), run_time=0.9)

        steps = [
            (r"(1)+(2):\quad 3x = 9", "Beide Gleichungen addieren — y fällt weg."),
            (r"x = 3", "Durch 3 teilen."),
            (r"3 - y = 1 \;\Rightarrow\; y = 2", "x in Gleichung (2) einsetzen."),
        ]
        prev = sys_
        shown = VGroup()
        for tex, why in steps:
            m = MathTex(tex, font_size=42, color=FG)
            m.next_to(prev, DOWN, buff=0.5).set_x(-1.2)
            note = small(why, size=21, color=DIM)
            note.next_to(m, RIGHT, buff=0.6).set_y(m.get_y())
            self.play(FadeIn(m, shift=UP * 0.15), FadeIn(note), run_time=0.9)
            self.wait(2.0)
            shown.add(m, note)
            prev = m

        res = MathTex(r"L=\{(3\,|\,2)\}", font_size=48, color=GREEN)
        res.next_to(prev, DOWN, buff=0.55).set_x(-1.2)
        self.play(Write(res), run_time=1.0)
        self.play(Circumscribe(res, color=GREEN, buff=0.16), run_time=1.2)
        self.wait(2.2)

        self.play(FadeOut(VGroup(sys_, shown, res)), run_time=0.7)

        out = VGroup(
            h3("Genau dieses Verfahren — das Gauß-Verfahren —", size=29, color=MUTED),
            h2("schreiben wir später einfach als Matrix.", size=34, color=FG),
        ).arrange(DOWN, buff=0.42).move_to(UP * 0.9)
        eq = MathTex(r"\begin{pmatrix}2&1\\1&-1\end{pmatrix}\begin{pmatrix}x\\y\end{pmatrix}"
                     r"=\begin{pmatrix}8\\1\end{pmatrix}", font_size=56, color=BLUE)
        eq.next_to(out, DOWN, buff=0.85)
        self.play(FadeIn(out[0]), run_time=0.8)
        self.play(FadeIn(out[1], shift=UP * 0.2), run_time=0.8)
        self.play(Write(eq), run_time=1.6)
        self.wait(3.4)
        self.play(*[FadeOut(m) for m in self.mobjects], run_time=0.9)


class R3Abbildungen(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        section_header(self, "Rückblick 3 — Abbildungen", color=AMBER)

        box = RoundedRectangle(width=2.9, height=1.7, corner_radius=0.2,
                               stroke_color=BORDER, stroke_width=2.5,
                               fill_color=SURFACE, fill_opacity=1)
        fl = MathTex("f(x)=2x+1", font_size=34, color=FG).move_to(box)
        machine = VGroup(box, fl).shift(UP * 1.0)

        inp = MathTex("3", font_size=48, color=CYAN).next_to(box, LEFT, buff=1.6)
        outp = MathTex("7", font_size=48, color=GREEN).next_to(box, RIGHT, buff=1.6)
        a1 = Arrow(inp.get_right(), box.get_left(), buff=0.25, color=DIM, stroke_width=4)
        a2 = Arrow(box.get_right(), outp.get_left(), buff=0.25, color=DIM, stroke_width=4)

        cap = body("Das kennst du: eine Zahl rein, eine Zahl raus.", size=27)
        cap.next_to(machine, DOWN, buff=1.1)

        self.play(FadeIn(machine), run_time=0.9)
        self.play(FadeIn(inp), GrowArrow(a1), run_time=0.7)
        self.play(GrowArrow(a2), FadeIn(outp, scale=1.3), run_time=0.7)
        self.play(FadeIn(cap), run_time=0.7)
        self.wait(2.6)

        fl2 = MathTex(r"f\!\left(" + cvec(["x", "y"]) + r"\right)=" + cvec(["2x+y", "x+3y"]),
                      font_size=30, color=FG)
        box2 = RoundedRectangle(width=4.4, height=2.0, corner_radius=0.2,
                                stroke_color=BLUE, stroke_width=2.5,
                                fill_color=SURFACE, fill_opacity=1)
        fl2.move_to(box2)
        machine2 = VGroup(box2, fl2).move_to(machine)

        inp2 = MathTex(cvec([1, 2]), font_size=42, color=CYAN).next_to(box2, LEFT, buff=1.4)
        outp2 = MathTex(cvec([4, 7]), font_size=42, color=GREEN).next_to(box2, RIGHT, buff=1.4)
        b1 = Arrow(inp2.get_right(), box2.get_left(), buff=0.25, color=DIM, stroke_width=4)
        b2 = Arrow(box2.get_right(), outp2.get_left(), buff=0.25, color=DIM, stroke_width=4)

        cap2 = h3("Jetzt: ein Vektor rein — ein Vektor raus.", size=30, color=FG)
        cap2.move_to(cap)

        self.play(
            FadeTransform(machine, machine2),
            FadeTransform(VGroup(inp, a1), VGroup(inp2, b1)),
            FadeTransform(VGroup(a2, outp), VGroup(b2, outp2)),
            FadeTransform(cap, cap2),
            run_time=1.6,
        )
        self.wait(2.6)

        detail = MathTex(r"2\cdot 1+1\cdot 2=4,\qquad 1\cdot 1+3\cdot 2=7",
                         font_size=32, color=MUTED)
        detail.next_to(cap2, DOWN, buff=0.55)
        self.play(FadeIn(detail), run_time=0.9)
        self.wait(3.0)
        self.play(FadeOut(detail), run_time=0.5)

        self.play(
            FadeOut(VGroup(inp2, b1, b2, outp2, cap2)),
            machine2.animate.scale(0.8).move_to([0, 2.05, 0]),
            run_time=1.0,
        )

        lin_title = h3("Solche Abbildungen heißen linear, wenn gilt:", size=29, color=FG)
        lin_title.next_to(machine2, DOWN, buff=0.6)
        r1 = MathTex(r"f(\vec{v}+\vec{w}) = f(\vec{v}) + f(\vec{w})", font_size=44, color=BLUE)
        r2 = MathTex(r"f(k\cdot\vec{v}) = k\cdot f(\vec{v})", font_size=44, color=PURPLE)
        rules = VGroup(r1, r2).arrange(DOWN, buff=0.45)
        rules.next_to(lin_title, DOWN, buff=0.55)

        self.play(FadeIn(lin_title, shift=UP * 0.2), run_time=0.8)
        self.play(Write(r1), run_time=1.2)
        self.wait(1.8)
        self.play(Write(r2), run_time=1.2)
        self.wait(2.2)

        punch = h2("Und jede lineare Abbildung\nlässt sich als Matrix schreiben.", size=34,
                   color=CYAN)
        punch.next_to(rules, DOWN, buff=0.7)
        self.play(FadeIn(punch, shift=UP * 0.25), run_time=1.1)
        self.wait(3.4)
        self.play(*[FadeOut(m) for m in self.mobjects], run_time=0.9)


class R4Zusammenfassung(Scene):
    def construct(self):
        self.add(chapter_tag(TAG))
        hdr = section_header(self, "Rückblick — kurz gebündelt", color=AMBER)

        items = [
            (r"\vec{v}=" + cvec([4, 3]), "Vektor = Verschiebung, komponentenweise rechnen", CYAN),
            (r"\vec{v}=4\vec{e}_1+3\vec{e}_2", "Jeder Vektor aus Einheitsvektoren zusammengesetzt", AMBER),
            (r"\begin{aligned}2x+y&=8\\x-y&=1\end{aligned}", "LGS = Schnitt von Geraden, lösbar mit Gauß", BLUE),
            (r"f(k\vec{v})=k\,f(\vec{v})", "Lineare Abbildung: Vektor rein, Vektor raus", PURPLE),
        ]

        rows = VGroup()
        for tex, txt, col in items:
            m = MathTex(tex, font_size=34, color=col)
            fit(m, w=3.0, h=1.0)
            t = Text(txt, font=FONT, font_size=24, color=MUTED)
            holder = Rectangle(width=3.3, height=1.2, stroke_opacity=0, fill_opacity=0)
            m.move_to(holder)
            t.next_to(holder, RIGHT, buff=0.5).set_y(holder.get_y())
            rows.add(VGroup(holder, m, t))
        rows.arrange(DOWN, aligned_edge=LEFT, buff=0.4)
        place(rows, x=0, top=hdr.get_bottom()[1] - 0.6, w=12.5, h=5.0)

        self.play(LaggedStart(*[FadeIn(r, shift=RIGHT * 0.3) for r in rows],
                              lag_ratio=0.3), run_time=2.6)
        self.wait(5.5)
        self.play(*[FadeOut(m) for m in self.mobjects], run_time=0.9)
