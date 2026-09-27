# Fantasia a tre, in F minor

*for piano, after Mozart, Chopin and Liszt*. About 6 minutes 30 seconds.

| File | What it is |
| --- | --- |
| `fantasia-a-tre.mp3`, `.flac` | The recording: Salamander Grand Piano V3 through sfizz, synthetic concert hall |
| `fantasia-a-tre-score.pdf` | Engraved score, 9 pages, 141 bars |
| `fantasia-a-tre.ly` | LilyPond source of the score |
| `fantasia-a-tre-score.mid` | Exact, metronomic MIDI from LilyPond (one track per voice) |
| `fantasia-a-tre-performance.mid` | The humanised performance that was rendered |
| `compose.py`, `perform.py`, `master.py`, `build.sh` | The pipeline described in [`../HOW_IT_WAS_MADE.md`](../HOW_IT_WAS_MADE.md) |
| `analyze.py` | Harmony and voice-leading audit (new with this piece, see below) |

## One motto, three composers

Everything grows from five notes: **5-1-3-b6-5**, C F A-flat D-flat C in F minor.
The rising sixth and the sigh of the flat sixth onto the fifth are in every section.

- **Introduzione** (Mozart's fantasias, Liszt's harmony). The motto in bare octaves, as
  Mozart opens K. 475. Its dominant resolves deceptively (V7 to VI), which lands a major
  third lower; that key turns minor and the motto starts again. Three statements go round
  the cycle of major thirds: F minor, C sharp minor (D flat enharmonically), A minor, and the
  last deceptive cadence lands on F. A Lisztian climax and cadenza, then a recitative.
- **Ballata** (Chopin). A 6/8 ballade theme whose head is the motto, F A-flat D-flat C.
  The middle part sings the motto in A-flat major. The theme returns in octaves at ff and
  its last cadence is deceptive, onto D flat.
- **Agitato** (Liszt). That D flat becomes the tonic of D flat major.
- **Minuetto** (Mozart). The motto in the major, A-flat D-flat F B-flat A-flat, as a
  minuet: plain, then ornamented over an Alberti bass with a cadential trill, then a
  *duetto* in thirds down the circle of fifths. D flat is the motto's own flat sixth.
- **Liszt's variation of the Minuetto**. The tune in the right thumb inside a filigree of
  sextuplets, the "three-hand" texture.
- **Tempesta** (Liszt). The motto hammered in octaves round the same cycle of major thirds,
  each statement answered by a falling "gypsy" scale; then the Minuetto's tune in F minor
  over thundering tremolos; a dominant pedal; a cascade; collapse.
- **Ripresa** (Chopin). The ballade theme, far away and ornamented, stopping on V7.
- **Apoteosi** (Liszt). The Minuetto in F major, grandioso. The second time, the cadence
  is broken by D flat (the motto's flat sixth again), which falls to C in the bass.
- **Coda**. A Chopin presto with the motto in the major on I, IV and V; a silence; the
  motto in the minor once more, as at the start; a plagal close (B-flat minor over F, to
  F major); two chords.

## Structure

Timestamps come from the performance tempo map (`perform.py` prints them).

| Time | Bars | Section | Key, metre | What happens |
| --- | --- | --- | --- | --- |
| 0:00 | 1-3 | Introduzione, Lento misterioso | F minor, 4/4 | The motto in bare octaves, pp; C7 resolves to D flat |
| 0:20 | 4-6 | | C sharp minor | D flat turns minor; the motto as a chorale, i VI iv i6/4 V7, deceptive onto A |
| 0:37 | 7-9 | | A minor | The motto in the bass under tremolos, V i Ger+6 i6/4 V7, deceptive onto F |
| 0:52 | 10-11 | | F minor | iv6, German sixth, i6/4, V7 in hammered chords, fff |
| 1:01 | 12-13 | Cadenza, recitativo | | V7 flat 9 poured down four octaves; a recitative dies on the dominant |
| 1:14 | 14-22 | Ballata, Andante con moto | F minor, 6/8 | The theme, mezza voce |
| 1:35 | 23-30 | | A flat major | The motto in the major; back through the German sixth; a fioritura |
| 1:56 | 31-38 | | F minor | The theme in octaves over wide arpeggios, up to ff; deceptive cadence onto D flat |
| 2:16 | 39-46 | Agitato, Più mosso | D flat major | Waves in both hands: I vi IV iv ii7 vii°7/ii I6/4 V7 |
| 2:35 | 47-55 | Minuetto | D flat major, 3/4 | The minuet, plain; modulates to A flat |
| 2:50 | 56-63 | | | Ornamented over an Alberti bass; trill cadence in D flat |
| 3:04 | 64-71 | Duetto | | Two voices in thirds down the circle of fifths to V7 |
| 3:20 | 72-81 | Liszt's variation | | The tune in the thumb, filigree above; plagal codetta |
| 3:43 | 82-89 | Tempesta, Allegro con fuoco | F minor, 4/4 | The motto in F minor, C sharp minor, A minor; octave scale; German sixth |
| 3:58 | 90-93 | | | The Minuetto in F minor, in octaves over tremolos |
| 4:06 | 94-97 | | | Dominant pedal: i6/4 against vii°7/V; the Ballata's head over the pedal |
| 4:14 | 98-101 | | | V7 flat 9 hammered, a cascade, tremolo dying to pp |
| 4:30 | 102-110 | Ripresa, Tempo I | F minor, 6/8 | The ballade theme, pp, ornamented; it stops on V7 |
| 4:54 | 111-119 | Apoteosi, Grandioso | F major, 3/4 | The Minuetto in F major, fff |
| 5:19 | 120-128 | | | Again over sweeping waves; D flat interrupts, falls to C; cadence |
| 5:51 | 129-137 | Coda, Presto con fuoco | F major, 6/8 | Waves over I IV V; the motto on I, IV and V; cadence; silence |
| 6:04 | 138-140 | Adagio | F minor, 4/4 | The motto as at the start; iv6/4 to I, F major |
| 6:25 | 141 | Allegro assai | F major | A sweep over six octaves and two chords |

## Harmony worth listening for

- **Deceptive cadences as modulation** (bars 3, 6, 9). V7 to VI moves the key down a major
  third each time, so the three statements of the motto close the cycle F, D flat, A, F.
  The voice leading is the textbook one: the leading tone rises, the seventh falls, the
  third of VI is doubled.
- **Common-tone pivots.** D flat major becomes C sharp minor by lowering one note (F to E);
  A major becomes A minor the same way.
- **German sixths** resolve through the cadential 6/4 (bars 8, 10-11, 28, 89), never straight
  to V, so there are no "Mozart fifths".
- **The flat sixth as a key.** The Ballata ends on D flat; the Agitato makes it a tonic; the
  Minuetto lives there. In the Apoteosi, D flat interrupts the cadence and falls to C in the
  bass, the motto's sigh as harmony.
- **Modal mixture** in the Agitato (G flat major to G flat minor) and in the last bars
  (B-flat minor over F before F major).
- **Mozart's cadential trill**, started on the upper note, with its turn (bar 62).

## The harmony audit (`analyze.py`)

Every bar in `compose.py` names its chords, one symbol per beat (`harm="Fm C7/E"`). The
audit reads the score MIDI and checks the music against them:

- every note is a chord tone or a classified non-chord tone (passing, neighbour,
  suspension, appoggiatura, escape tone, anticipation), and every appoggiatura or
  suspension resolves by step onto a chord tone;
- outer voices at every chord change, both the notes either side of the change and
  downbeat to downbeat: no parallel fifths or octaves; chord sevenths in an outer voice
  resolve down by step or stay as a common tone;
- inner voices, chord to chord: no parallel fifths;
- spacing: no muddy thirds or seconds low in the bass, no right-hand chord wider than a
  ninth or left-hand chord wider than a tenth.

On this build it reports 188 non-chord tones (104 passing, 44 neighbour, 22 appoggiatura,
8 anticipation, 6 suspension, 4 escape) and no problems. Unison passages (the motto in bare
octaves) are exempt from the parallel-octave test. It only prints hidden fifths and octaves
for information; the ones left are between figuration and a new phrase after a rest.

## Checks run on this build

- LilyPond 2.24: no warnings; no system runs into the right margin.
- `perform.py`: 0 hand overlaps (same key or unintended crossing).
- `analyze.py`: no problems (see above).
- Master: -18.6 LUFS integrated, -1.0 dBTP true peak, about 20 dB between the quiet and loud
  3-second windows (the opening and the closing Adagio near -38 dB RMS, the Tempesta and
  Coda near -19.5).

## Rebuilding

Follow [`../HOW_IT_WAS_MADE.md`](../HOW_IT_WAS_MADE.md) for the environment, then:

```sh
SFZ="/abs/path/SalamanderGrandPiano/Salamander Grand Piano V3.sfz" \
SFIZZ=/abs/path/sfizz/build/library/bin/sfizz_render \
BUILD=/tmp/fat-build ./build.sh
```

`BUILD` defaults to `./build/` (git-ignored). `SEED` (default 7) picks a different take.
What this build adds to the playbook's pipeline:

- `bar()` takes `harm=`, the chord per beat; `build.sh` runs `analyze.py` after engraving.
- `perform.py` voicing mode `thumb`: the right hand's second voice carries the tune (the
  Liszt variation). The `MODE` table maps this piece's section names.

## Credits

- Salamander Grand Piano V3 by Alexander Holm (CC BY 3.0), SFZ mapping by kinwie,
  from [sfzinstruments/SalamanderGrandPiano](https://github.com/sfzinstruments/SalamanderGrandPiano).
- [sfizz](https://github.com/sfztools/sfizz) (BSD 2-Clause).
- Engraved with [LilyPond](https://lilypond.org).
