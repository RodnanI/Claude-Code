# How this piece was made (a playbook for an AI agent)

Give this file to an AI agent that has shell access and a checkout of this repo.
It explains how *Fantaisie-Ballade in D minor* went from nothing to a recording
and an engraved score. With it, the agent can:

- rebuild the existing piece exactly, or
- compose a new piece with the same pipeline.

Everything lives in `fantaisie-ballade/`. Nothing outside that folder is used.

---

## 1. What the pipeline produces

```
compose.py ──> fantaisie_ballade.ly ──LilyPond──> score PDF + score MIDI (exact, metronomic)
          └──> score_meta.json (dynamics, pedal, tempo, rubato, voicing plan)
                                                   │
perform.py  <──────────────────────────────────────┘  => performance.mid (humanised)
sfizz_render + Salamander Grand Piano V3 SFZ         => dry.wav (48 kHz)
master.py  (hall reverb, EQ, leveler, limiter)       => master.wav
ffmpeg                                               => .mp3 (320k) + .flac
```

`build.sh` runs every step and copies the deliverables into the folder:

- `fantaisie-ballade.mp3` and `fantaisie-ballade.flac`
- `fantaisie-ballade-score.pdf`
- `fantaisie-ballade.ly`
- `fantaisie-ballade-score.mid` and `fantaisie-ballade-performance.mid`

A full build takes about 75 seconds on 4 cores.

## 2. Environment setup (tested on Ubuntu 24.04, Python 3.11)

```sh
sudo apt-get install -y lilypond ffmpeg cmake g++ ghostscript   # LilyPond 2.24.x
pip install mido numpy scipy soundfile pyloudnorm pillow         # pillow/ghostscript only for looking at pages

# Piano samples (1.4 GB, FLAC, 16 velocity layers, CC BY 3.0) and the sampler
git clone --depth 1 https://github.com/sfzinstruments/SalamanderGrandPiano
git clone --depth 1 --recursive --shallow-submodules https://github.com/sfztools/sfizz
cmake -S sfizz -B sfizz/build -DCMAKE_BUILD_TYPE=Release \
      -DSFIZZ_JACK=OFF -DSFIZZ_RENDER=ON -DSFIZZ_SHARED=OFF -DENABLE_LTO=OFF
cmake --build sfizz/build --target sfizz_render -j4    # a few minutes
```

Clone the samples and sfizz somewhere scratch, not into the repo. They are
large and have their own licenses. `sfizz` has no apt package on Ubuntu 24.04,
so it must be built. The binary ends up in `sfizz/build/library/bin/sfizz_render`.

Rebuild everything:

```sh
cd fantaisie-ballade
SFZ="/abs/path/SalamanderGrandPiano/Salamander Grand Piano V3.sfz" \
SFIZZ=/abs/path/sfizz/build/library/bin/sfizz_render \
BUILD=/tmp/fb-build ./build.sh
```

`BUILD` defaults to `fantaisie-ballade/build/`, which is git-ignored.

## 3. The files and what each one owns

| File | Role |
| --- | --- |
| `compose.py` | **The composition.** Every bar written out, plus the dynamics, pedal and tempo plan. The only file to edit to change the music. |
| `perform.py` | Performance model: score MIDI + meta JSON to a humanised MIDI. Also runs the hand-collision check. |
| `master.py` | Synthetic concert-hall impulse response, EQ, leveler, limiter, -1 dBTP normalisation. |
| `build.sh` | Runs the chain and copies the deliverables. |
| `README.md` | Listener-facing notes: structure, timestamps, credits. |

## 4. How `compose.py` works

### 4.1 Notation conventions

- LilyPond **absolute** pitch: `c'` = middle C (C4), `a'` = A440, `c` = C3,
  `c,` = C2, `a,,,` = A0 (the lowest key).
- Dutch note names: `cis` = C sharp, `bes` = B flat, `es` = E flat, `as` = A flat.
- A duration carries forward until it changes (`a'16 b' c''` gives three 16ths).
- `q` repeats the previous chord (it repeats the last *chord*, not the last note).
- Write every bar so it sums exactly to the bar length. LilyPond bar checks
  (the `|` the script adds after every bar) catch mistakes.

### 4.2 The two calls that build the piece

```python
section(name, mel="rh", rub=0.03, phr=4, leg=1.0)
```

This sets defaults for the bars that follow:

- `mel`: which hand carries the tune (`"rh"` or `"lh"`). Used for voicing.
- `rub`: phrase-rubato depth, for example 0.05 = up to about 5% push and pull.
- `phr`: phrase length in bars for the rubato arch.
- `leg`: 1.0 means legato. Below 1.0, notes are shortened (0.9 gives the
  Mozart section its classical, detached touch).

```python
bar(rh, lh, dyn=None, ped=None, glob="", rpre="", lpre="",
    length=None, tempo=None, ferm=(), roll=False)
```

| Argument | Meaning |
| --- | --- |
| `rh`, `lh` | LilyPond music for each hand for this one bar. |
| `glob` | Commands for both staves at the bar start: `\time 6/8`, `\key d \major`, `\partial 8`. `\time` also updates the bar length the script expects. |
| `rpre` / `lpre` | Right-hand-only or left-hand-only commands: `\tempo "Grave" 4 = 44`, `\break`, `\clef treble`. |
| `dyn` | Spacer string for the dynamics line between the staves, e.g. `r"s4.\pp\< s4 s8\f"`. It must sum to the bar length (the script asserts this). Supported marks: `ppp` to `fff`, `\<`, `\>`, `\!`, `sfz`, `sf`, `fz`, `sffz`. |
| `ped` | Pedal spec as tokens `dur:action`, where `c` = press or change and `u` = lift. Example: `"4.:c 4.:c"` changes the pedal on each dotted-quarter beat. `"4:c 4:u"` gives a short pedal on beat one. The script tracks pedal state and emits correct `\sustainOn` / `\sustainOff`. Must also sum to the bar length. |
| `length` | Only for partial bars (`Fr(1, 2)` for an eighth-note pickup) and cadenzas (`Fr(15, 2)`). |
| `tempo` | Quarter-note BPM, either a number or breakpoints within the bar `[(offset_q, bpm), ...]`. Between breakpoints the tempo is linear, and it holds after the last one. Two breakpoints at the same offset make a jump. Leaving it out keeps the previous bar's final tempo. Note that 6/8 at dotted quarter = 50 means 75 here. |
| `ferm` | Fermatas as `[(offset_q, extra_seconds)]`. Time is inserted after that onset, so the note sounding there is held longer. |
| `roll` | Arpeggiate every chord in the bar, left hand first (used on the big final chords). |

### 4.3 Helpers

| Helper | What it does |
| --- | --- |
| `xs("d, a, d f a d' ...")` | One line that hops between staves automatically: middle C and above goes to the upper staff. Used for the four-octave intro arpeggios. |
| `wave(a, b, c, d)` | Six sixteenths, `a b c d c b`. The storm and Presto figuration. |
| `trem(low, "<dyad>")` | Six sixteenths alternating a note and a dyad, a tremolo texture. |
| `trill(layout, perform)` | Prints `\trill` in the PDF but plays written-out notes in the MIDI, via `\tag #'layout` and `\tag #'midi`. Write the trill in **32nds**: 64ths sounded unrealistically fast. |
| `it("text")` | Italic markup for expression words. |

### 4.4 Output

`python3 compose.py OUTDIR` writes:

- `fantaisie_ballade.ly` with two `\score` blocks: one engraved, and one MIDI
  score with a MIDI track per hand (`rh:rh`, `lh:lh`). The MIDI track split
  comes from moving `Staff_performer` into the Voice context.
- `score_meta.json`: bar starts and lengths, tempo breakpoints, fermatas,
  section, voicing mode, rubato, legato, roll flags, dynamic events and
  pedal events, all in quarter-note time.

## 5. How the music was composed (method to reuse)

1. **Plan the form and the timing first.** Pick sections, keys, meters and
   tempi, and estimate the seconds for each section (bars × beats ÷ BPM).
   This piece was planned as follows:

   | Section | Key and meter | Composer style |
   | --- | --- | --- |
   | Grave motto | D minor, 4/4 | |
   | Arpeggios over a lament bass | D minor, 4/4 | Mozart K. 397 |
   | Cadenza | | |
   | Ballade theme | D minor, 6/8 | Chopin |
   | Sotto voce episode | B-flat major | |
   | Variation | D minor | |
   | Allegretto | F major, 2/4 | Mozart |
   | Minore | D minor, 2/4 | |
   | Storm | D minor, 6/8 | Liszt |
   | Apotheosis | D major | |
   | Memory of the Allegretto | D major, 2/4 | |
   | Presto | D major, 6/8 | |
   | Motto in major | D major, 4/4 | |

   The first draft ran 4:30. Adding the B-flat episode, varying the storm
   texture and lengthening the Presto brought it to 5:00.
2. **One motif unifies everything.** A-F-E-D is a rising minor sixth that
   falls by step to the tonic. It was transposed (C-A-G-F in F major),
   moved into the bass, put in the major, and sequenced by minor thirds.
3. **Harmony before notes.** For every bar, decide the chord for each beat
   (roman numerals) and the bass line, then write the melody against it,
   checking every note: chord tone, passing tone, suspension or appoggiatura.
   These devices did the heavy lifting:
   - lament bass (i V6 i4/2 IV6 Ger+6 V)
   - Neapolitan sixth before V7
   - deceptive cadence to VI
   - E-flat as a pivot (IV of B-flat = bII of D minor)
   - minor-third cycle (Dm, C7, Fm, E-flat 7, G#m, F#7, Bm, A7)
   - alternating 6/4 and diminished sevenths over a dominant pedal
   - modal-mixture iv and flat VI in the major apotheosis
4. **Voice-leading and playability rules applied while writing:**
   - Resolve 7ths down and leading tones up.
   - A cadential 6/4 resolves 6 to 5 and 4 to 3. The Neapolitan's flat 2
     falls to the leading tone.
   - Keep low thirds out of the bass below about C3. Use root, fifth and
     octave down there, and put the tenth higher.
   - Right-hand chords stay within an octave. Left-hand spans stay within a
     tenth unless rolled.
   - The hands must not strike the same key or cross unintentionally.
     `perform.py` prints `hands overlap: bar N beat X` for every violation.
     Fix these until it reports 0.
   - Vary texture every 4-8 bars (octaves, arpeggios, broken chords, Alberti,
     waves, tremolos, repeated chords, runs) so it never feels formulaic.
5. **Write dynamics, pedal and tempo alongside the notes**, in the same
   `bar()` call. Every section ends with a written-in ritardando or fermata
   where a pianist would breathe.

## 6. How the performance is humanised (`perform.py`)

Inputs are the LilyPond MIDI (exact score time, accents as velocity 110
instead of 90) and `score_meta.json`. It produces a single-track MIDI at 120
BPM with 960 ticks per quarter, so 1 second = 1920 ticks, after a 0.5 s
lead-in.

**Tempo:**
- per-bar breakpoints
- a phrase arch on top: `1 + rub·0.7·sin(πx) − rub·1.6·tail²` over each
  `phr`-bar phrase
- fermatas inserted as extra seconds

**Dynamics:**
- marks become levels 1-8
- hairpins glide to the mark that ends them
- level to velocity: `[30, 38, 47, 57, 67, 79, 92, 104]`
- `sfz`, `sf`, `fz` add +16 to +26
- LilyPond accents add +12

**Voicing:**
- The melody's top note gets +10 and its lower octave +4. Inner chord
  tones get -3.
- In the accompaniment, left-hand bass on the beat gets -3, off the beat -9,
  and other accompaniment notes -10 to -12.
- Downbeats get +4 and other beats +2.
- Melodic contour adds ±0.35 velocity per semitone relative to the local
  average.
- Gaussian jitter of ±2.

**Voicing modes** come from the section's `mel`. The dictionary
`MODE = {"motto": "tutti", "arpeggios": "line"}` overrides specific section
**names**. If you rename sections, update `MODE`.

**Timing:**
- 4 ms onset jitter
- melody leads the accompaniment by 14 ms in slow sections
- chords spread by 0 to 8 ms
- chords spanning more than 14 semitones roll at 18 ms per note, and `roll`
  bars at 45 ms per note, left hand first
- legato notes overlap by 20 ms
- the next strike of the same key is never cut off

**Pedal:**
- a lift lands 20 ms after the change point and the re-press 110 ms after
  (legato pedalling), which avoids both blur and gaps
- release at the end of the piece

**Sampler setup:** CC72 = 40 at the start. This shortens the Salamander
damper release to about 0.6 s. The default of about 1 s sounds smeared.

`perform.py score.midi score_meta.json out.mid [seed]`: the seed changes the
random deviations, so a new seed gives a new take.

## 7. Rendering and mastering

- `sfizz_render --sfz <sfz> --midi performance.mid --wav dry.wav -s 48000 -q 3 -p 256`
  Keep polyphony at 256: the default of 64 drops notes under pedal. The
  SFZ's defaults for string resonance, hammer noise and pedal noise (all at
  0.5) are left on for realism.
- `master.py`:
  - 28 Hz high-pass, and a -1.5 dB high shelf at 7 kHz, which moves the
    close-miked samples slightly back
  - synthetic stereo hall: 10 early reflections, then noise with a
    frequency-dependent RT60 of 2.5 s at 20 Hz, 1.9 s at 1 kHz and 0.85 s
    at 10 kHz, with an 18 ms pre-delay, mixed at -8.5 dB wet
  - slow leveler (1.5:1 above -30 dB RMS, 80 ms attack, 0.8 s release)
  - 2 dB look-ahead limiter on the transients, then true-peak normalisation
    to -1 dBTP
  - target about -19 LUFS integrated with about 19 dB of dynamic range
- ffmpeg encodes the MP3 (320k, 48 kHz) and the FLAC (16-bit, 44.1 kHz,
  about 14 MB).

## 8. Verification checklist (do all of these before delivering)

1. `lilypond fantaisie_ballade.ly 2>&1 | grep -i -A3 "warning\|error"` prints
   **nothing**. Barcheck failures point at the bar with a bad duration.
2. `perform.py` reports `hand overlap checks: 0`.
3. Look at every page: `gs -q -dNOPAUSE -dBATCH -sDEVICE=png16m -r85 -sOutputFile=p%02d.png score.pdf`,
   then open the PNGs. Check cross-staff beams, 8va lines, clef changes,
   cramped final systems (add `\break`) and pedal marks.
4. Audio sanity:
   - the rendered length matches `perform.py`'s printed length
   - no NaN
   - peak at -1 dBFS
   - RMS per 5 s window shows the planned dynamic arc (for example -35 dB
     in the pp sections and -18 dB in the climaxes)
5. Spot-check timing: print a few note onsets and velocities from
   `performance.mid`. For example, the ballade eighths should be about 0.4 s
   apart, with the melody around velocity 55-63 over an accompaniment
   around 27-50.

## 9. Pitfalls already hit (do not repeat them)

- Patching `compose.py` from Python with `'''`-quoted strings breaks, because
  LilyPond octave marks (`''`) end the string. Use the file-edit tool, or a
  patch script written to a file with a quoted heredoc (`<<'EOF'`).
- A 6/8 bar written as `r2 chord4 r8` is 7 eighths. Always count, and trust
  the assertions and bar checks.
- `\partial` works mid-piece in LilyPond 2.24 (after a `\time` or at a new
  section). Cadenzas use `\cadenzaOn ... \cadenzaOff \bar "||"` with the other
  hand given one scaled note (`1*15/8`) of the same total length.
- A crescendo started while another is still running triggers LilyPond
  warnings. End the first one with a mark or `\!` before starting the next.
- `\ottava` only changes what is displayed. Pitches stay written at sounding
  pitch, so the MIDI is always correct.
- Keep `perform.py`'s duration display as minutes with `int(length // 60)`.
  A `:.0f` format rounds 4.5 minutes up to "5".

## 10. Making a new piece with this pipeline

1. Copy the folder to a new name. Rename the output stems in `build.sh`
   (`NAME=`) and the header in `compose.py` (title, subtitle, composer,
   dedication).
2. Replace the body of `compose.py` between the helpers and the
   `# ---- output` block with new `section()` and `bar()` calls. Keep the
   helpers.
3. If you introduce section names that should be `tutti` (both hands equal)
   or `line` (a single arpeggio line), add them to `MODE` in `perform.py`.
4. Run `build.sh`, then work through the checklist in section 8 until it is
   clean.
5. Update `README.md`:
   - the structure table, with timestamps from the tempo curve
     (`perform.tempo_curve`)
   - the Salamander credit: CC BY 3.0 requires attribution to Alexander Holm
6. Commit the folder (sources plus the MP3, FLAC, PDF, `.ly` and both MIDIs,
   but not `build/`) and push.

## 11. Credits

- Salamander Grand Piano V3 by Alexander Holm (CC BY 3.0), with the SFZ
  mapping by kinwie, from
  [sfzinstruments/SalamanderGrandPiano](https://github.com/sfzinstruments/SalamanderGrandPiano).
- [sfizz](https://github.com/sfztools/sfizz) (BSD 2-Clause).
- [LilyPond](https://lilypond.org).
