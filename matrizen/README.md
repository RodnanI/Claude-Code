# Matrizen — ein vollständiger Videokurs (Manim, Deutsch)

Ein durchgehend animierter Mathematik-Kurs über Matrizen, gebaut mit
[Manim Community](https://www.manim.community/). Sprache: **Deutsch**,
Darstellung: **Dark Mode**, Ton: **nur Hintergrundmusik, keine Sprache**.

Das Niveau setzt an, wo das bayerische Abitur aufhört: Vektoren, lineare
Gleichungssysteme und der Begriff der Abbildung werden kurz aufgefrischt,
danach wird das Thema Matrizen von Grund auf und vollständig entwickelt —
bis zu Eigenwerten, Diagonalisierung und Anwendungen.

---

## Inhalt

| Kapitel | Thema | Kernidee |
|---|---|---|
| 0 | Intro & Fahrplan | Warum Matrizen überhaupt |
| 1 | Rückblick | Vektoren, LGS, lineare Abbildungen |
| 2 | Was ist eine Matrix? | Notation, Format m×n, Sonderfälle, Transponierte |
| 3 | Rechnen mit Matrizen | Addition, Vielfache, Matrix·Vektor, Falk-Schema |
| 4 | Lineare Abbildungen | Spaltentrick, Drehung, Spiegelung, Scherung, Verkettung |
| 5 | Determinante | Flächenfaktor, ad−bc, Orientierung, Sarrus |
| 6 | Inverse Matrix | Idee, 2×2-Formel, Gauß-Jordan, LGS lösen |
| 7 | Gleichungssysteme | A·x = b, Gauß-Algorithmus, Rang, Lösungsmengen (3D) |
| 8 | Eigenwerte & Eigenvektoren | charakteristisches Polynom, Eigenraum, Diagonalisierung |
| 9 | Anwendungen | Markow-Ketten, Materialverflechtung, Fibonacci, 3D-Grafik |
| 10 | Übungsaufgaben | sechs Aufgaben mit vollem Lösungsweg und Pausen-Balken |
| 11 | Zusammenfassung | rote Fäden, Formelsammlung, Ausblick |

Insgesamt 78 Szenen, rund 45 Minuten Laufzeit.

---

## Aufbau des Projekts

```
matrizen/
├── course/                 # der eigentliche Kurs, eine Datei pro Kapitel
│   ├── theme.py            # Design-System: Farben, Typografie, Layout-Helfer
│   ├── c00_intro.py        # Kapitel 0 …
│   ├── …
│   └── c11_finale.py       # … bis Kapitel 11
├── build/
│   ├── scenes.txt          # Reihenfolge aller Szenen im fertigen Video
│   ├── render.sh           # rendern, zusammensetzen, vertonen
│   ├── music.py            # synthetische Hintergrundmusik (NumPy)
│   └── sheet.sh            # Kontaktbogen zum schnellen Sichten einer Szene
└── out/                    # Ergebnisse (nicht im Repo)
```

### `theme.py`

Alle Szenen teilen sich ein Design-System, damit der Kurs wie aus einem Guss
wirkt:

* **Farben mit fester Bedeutung** — Zeilen sind immer bernstein, Spalten blau,
  Ergebnisse grün, Warnungen rot, Matrizen violett.
* **Typografie** — *Inter* für Fließtext, *JetBrains Mono* für Zahlen in
  Tabellen, *Latin Modern* (LaTeX) für Formeln.
* **Layout-Helfer** — `place()`, `fit()`, feste Spalten (`COL_L`, `COL_R`)
  und Bausteine wie `note_box()`, `panel()`, `badge()`, `chapter_card()`.

---

## Selbst rendern

Voraussetzungen: Python 3.11, Manim Community 0.20, LaTeX (`texlive-latex-extra`,
`dvisvgm`), FFmpeg, die Schriften *Inter* und *JetBrains Mono*.

```bash
# Vorschau (854×480, 15 fps) — schnell
./build/render.sh -q l

# Endfassung (1920×1080, 30 fps) mit Musik
./build/render.sh -q h -j 4

# nur neu zusammensetzen und vertonen
./build/render.sh --no-render
```

Das Skript rendert jede Szene einzeln (bereits vorhandene Dateien werden
übersprungen), fügt sie in der Reihenfolge aus `build/scenes.txt` zusammen und
mischt die Musik darunter. Ergebnis: `out/matrizen_kurs_1080p30.mp4`.

Eine einzelne Szene rendern:

```bash
cd course
manim -qh --disable_caching c04_abbildungen.py L2Spaltentrick
```

Eine gerenderte Szene schnell sichten (Kontaktbogen aus n Einzelbildern):

```bash
./build/sheet.sh course/media/videos/c04_abbildungen/1080p30/L2Spaltentrick.mp4 /tmp/blatt.png 3 9
```

---

## Die Musik

`build/music.py` erzeugt die Hintergrundmusik komplett synthetisch mit NumPy —
keine Samples, keine externen Dateien, keine Lizenzfragen.

* 68 BPM, a-Moll, Akkordfolge Am9 – Fmaj7 – Cmaj7 – G6 über acht Takte
* additiv synthetisierte Flächen mit leichter Verstimmung, ein weiches
  Rhodes-artiges Arpeggio, Sub-Bass, sehr dezente Rhythmusandeutung
* Faltungshall über eine exponentiell abklingende Rausch-Impulsantwort,
  Stereobreite nur im Hallanteil (kein Kammfilter im Direktsignal)
* Anfang und Ende sind ineinandergeblendet, die Datei läuft also nahtlos
  in der Schleife
* im fertigen Video auf ca. −16 dB gemischt, mit Ein- und Ausblendung

```bash
/opt/manimenv/bin/python build/music.py out/musik.wav 12   # 12 Minuten
```

---

## Didaktische Leitlinien

* **Nichts vom Himmel fallen lassen.** Die Drehmatrix wird hergeleitet, das
  Matrixprodukt wird aus der Verkettung von Abbildungen begründet, die
  charakteristische Gleichung Schritt für Schritt entwickelt.
* **Jede Rechnung vollständig.** Kein „man sieht leicht“ — jeder Zwischenschritt
  steht auf dem Bildschirm, inklusive Probe.
* **Ein roter Faden.** Der Spaltentrick aus Kapitel 4 trägt durch Determinante,
  Inverse und Eigenwerte hindurch.
* **Lesetempo statt Sprechtempo.** Weil es keine Tonspur mit Sprache gibt, sind
  die Standzeiten großzügig bemessen; die Übungsaufgaben haben einen sichtbaren
  Pausenbalken.
