# Passacaglia, Chorale and Fugue in C minor

*on a ground of eight bars*, for solo piano. About 8 minutes 16 seconds.

| File | What it is |
| --- | --- |
| `passacaglia-chorale-fugue.mp3`, `.flac` | The recording: Salamander Grand Piano V3 through sfizz, synthetic concert hall |
| `passacaglia-chorale-fugue-score.pdf` | Engraved score, 10 pages, 152 bars |
| `passacaglia-chorale-fugue.ly` | LilyPond source of the score |
| `passacaglia-chorale-fugue-score.mid` | Exact, metronomic MIDI from LilyPond (one track per voice) |
| `passacaglia-chorale-fugue-performance.mid` | The humanised performance that was rendered |
| `compose.py`, `perform.py`, `master.py`, `build.sh` | The pipeline described in [`../HOW_IT_WAS_MADE.md`](../HOW_IT_WAS_MADE.md) |

## One ground, everything else grown from it

The ground (bass, 3/4):

```
| C  Eb | D  G | Ab F | B    | C  Eb | F  F# | G    | G    |
   i       V     VI iv  vii°7   i  i6   iv vii°7/V i6/4-V  V7
```

- Its **first half**, C Eb D G Ab F B C, rises a minor third, falls, leaps, and ends
  with the old "pathotype" gesture: flat six, four, the leading tone below, home.
- Its **second half** climbs C Eb F F# G to the dominant.
- The **fugue subject** is the first half in quarters and eighths, with a running
  tail that climbs the second half (Eb F F# G).
- The **chorale** reaches its climax over a rising chromatic bass (Gb G Ab), the
  same shape as the ground's F F# G.
- At the **fugue's climax** the subject sounds in octaves over its own augmentation
  in the bass. The augmentation is the ground.
- The **coda** plays the ground in C major under bells, then uses its first half,
  C E D G A F B C, as the final cadence (the F chord turns minor on the way).

## Structure

Timestamps come from the performance tempo map (`perform.py` prints them).

| Time | Bars | Section | Key, metre | What happens |
| --- | --- | --- | --- | --- |
| 0:00 | 1-4 | Introduzione, Maestoso | C minor, 4/4 | The ground's first half as tolling octaves and chords, fff |
| 0:24 | 5-8 | Allegro agitato | | 32nd-note torrents over five octaves on the ground's second half; hand-over-hand V7 cascade |
| 0:34 | 9-10 | Cadenza | | Diminished-seventh sweep from the bass, chromatic fall from G6 |
| 0:41 | 11-18 | Passacaglia: Tema | C minor, 3/4 | The ground alone, in octaves, pp |
| 1:04 | 19-26 | Var. 1 | | Sarabande chords on the second beat |
| 1:27 | 27-34 | Var. 2 | | A cantabile line over broken chords |
| 1:48 | 35-42 | Var. 3 | | Triplet waves |
| 2:09 | 43-50 | Var. 4 | | Running sixteenths over hammered octaves |
| 2:28 | 51-58 | Var. 5 | | The ground moves to the soprano; a falling bass sinks onto a dominant pedal |
| 2:48 | 59-66 | Var. 6 | C major | Maggiore: the ground in the major under celesta-like sextuplets |
| 3:13 | 67-74 | Var. 7 | C minor | Galloping chords, con fuoco |
| 3:31 | 75-82 | Var. 8 | | Tempest: tremolos above, rushing octave runs below |
| 3:48 | 83-89 | Var. 9 | | Grandioso; at bar 7 the ground breaks off onto a German sixth |
| 4:10 | 90 | Cadenza | | The German sixth respelled as the dominant seventh of D flat |
| 4:18 | 91-98 | Chorale | D flat major, 4/4 | Four-part chorale, Adagio religioso |
| 4:58 | 99-106 | Chorale, second strophe | | The tune in octaves over harp triplets, up to ff |
| 5:33 | 107-109 | Codetta | | D flat becomes the Neapolitan of C minor and falls onto its dominant |
| 5:51 | 110-127 | Fuga, Allegro energico | C minor, 4/4 | Exposition (alto; real answer in G minor in the soprano; bass), episodes, entries in E flat major (soprano), F minor (tenor, four voices) and G minor (bass) |
| 6:34 | 128-131 | Climax, Grandioso | | Subject over its augmentation, German sixth, V7 |
| 6:51 | 132-139 | Apoteosi | C major, 4/4 | The chorale, fff, over sweeping sextuplets |
| 7:27 | 140-152 | Coda | C major, 3/4 | The ground in the major under bells; its first half as the last cadence |

## Harmony and counterpoint worth listening for

- Ground harmonised as i, V, VI-iv, vii°7, i-i6, iv-vii°7/V, cadential 6/4, V7, then
  re-harmonised: over a falling bass with the ground on top (Var. 5), in the major
  with a borrowed A flat (Var. 6).
- **Enharmonic pivot** (bars 89-91): A flat, C, E flat, F sharp is a German sixth in
  C minor; respelled with G flat it is the dominant seventh of D flat, which is
  where the chorale lives.
- **Neapolitan return** (bars 107-109): the chorale's D flat major chord, heard over
  F, is the Neapolitan sixth of C minor, and resolves onto G7.
- **Fugue**: the countersubject moves in thirds and sixths against the answer, so it
  is invertible at the octave; it sits below the answer in bars 112-113, above the
  subject in bars 115-116, and below the E flat major entry in bars 119-120. The
  first episode walks the subject's head down by fifths in the bass (C Eb D G, F Ab
  G C, Bb D C F, Eb G F Bb). The second rebuilds the ground's rising bass
  (E flat, E, F, F sharp) and is interrupted by the F minor entry.
- **Minor plagal colour** at the end: the coda's A-minor-to-F sequence turns F into
  F minor before the dominant and the last C major chord.

## Checks run on this build

- LilyPond 2.24: no warnings; no system runs into the right margin.
- `perform.py`: 0 hand overlaps (same key or unintended crossing).
- Every fugue bar audited on an eighth-note grid: no parallel fifths or octaves
  between any pair of voices; remaining dissonances are chord sevenths, passing
  tones or passing six-fours.
- Master: -19.1 LUFS integrated, -1.0 dBTP true peak, about 18 dB between the
  quiet and loud 3-second windows (pp Tema near -37 dB RMS, fugue climax near -20).

## Rebuilding

Follow [`../HOW_IT_WAS_MADE.md`](../HOW_IT_WAS_MADE.md) for the environment, then:

```sh
SFZ="/abs/path/SalamanderGrandPiano/Salamander Grand Piano V3.sfz" \
SFIZZ=/abs/path/sfizz/build/library/bin/sfizz_render \
BUILD=/tmp/pcf-build ./build.sh
```

`BUILD` defaults to `./build/` (git-ignored). `SEED` (default 7) picks a different
take. What this build adds to the playbook's pipeline:

- `bar()` accepts a tuple of voices per hand. Voices are persistent across bars, so
  ties and suspensions cross barlines in the fugue.
- Every voice of every bar is length-checked in Python before LilyPond runs, with
  the exact bar, hand and voice in the error.
- Automatic line breaks are off; `brk()` starts a system, so each variation starts
  on a new line. Bar numbers are resynced after cadenzas, so the printed numbers
  match the ones `perform.py` reports.
- `perform.py` voicing modes: `rh`, `lh`, `tutti`, `line`, `bass` (the ground
  leads), `fugue` (equal voices). The `MODE` table maps this piece's section names.

## Credits

- Salamander Grand Piano V3 by Alexander Holm (CC BY 3.0), SFZ mapping by kinwie,
  from [sfzinstruments/SalamanderGrandPiano](https://github.com/sfzinstruments/SalamanderGrandPiano).
- [sfizz](https://github.com/sfztools/sfizz) (BSD 2-Clause).
- Engraved with [LilyPond](https://lilypond.org).
