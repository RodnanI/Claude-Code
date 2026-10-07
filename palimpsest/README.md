# Palimpsest

*An atlas of worlds that never were.*

Speak a word and a world is drawn from it, in iron-gall ink on old vellum: its coasts and rivers, the peoples who come to live there, their languages and their letters, and a thousand years of what they did to one another, written down by the scribes who lived through it.

A palimpsest is a manuscript page that was scraped clean and written over, where the old text still shows through. The map works the same way. Borders from earlier centuries stay on the sheet as faint dotted lines. A realm that has fallen leaves its name behind, scraped thin, for two hundred years. A town that was conquered and renamed keeps its old name, struck through, under the new one. And because names are stored as sounds rather than letters, the languages wear them down as the centuries pass: a town founded as Kelavarna is called Kelvarn four hundred years later without anyone deciding it should be.

The same word always gives the same world.

## Opening it

Open `palimpsest.html` in a browser. It is the whole atlas in one file, fonts and scripts included, so it can be copied anywhere on its own and works offline. `index.html` runs the same thing from the separate sources in `js/` and `fonts/`. It was built and tested in Chromium; any current browser should run it, and a machine with a GPU makes the years run smoother.

A link can carry a world and a year: `palimpsest.html#w=saltmarsh&y=640`.

After editing anything in `index.html`, `js/` or `fonts/`, rebuild the single file with `python3 build.py`. The build stops if anything would break the inlining or an em dash gets into the output.

## What you can do

- **Speak a word** in the field at the top, or press `?` to let the ink choose. The map draws itself stroke by stroke (click it to finish at once), then the years begin to pass.
- **The ribbon of years** at the bottom: press play, drag along it to scrub, hover it to read what happened near that year. Red bars are wars, black dots plagues, gold diamonds empires, crosses the falls of realms, the red triangle a fleet out of the sea, shaded stretches the years whose pages are lost.
- **The chronicle** on the right writes itself as time passes. Each entry has a line in the scribe's own script above it (hover it for the transliteration and gloss). The hand changes every few decades, with a new ink and letterform; when the scriptorium burns or falls to foreigners the book moves, or breaks off. Hover a name to ring it on the map; click it to open its history.
- **The map**: scroll or pinch to zoom, drag to move. Hover a town for its name in its own script, its meaning and its former name. Click a town for its whole biography: every name it has carried and why, every sound change that wore those names down, who held it, how big it grew, and every line in the chronicle that mentions it. Click a realm for its rulers, their epithets and how each one died, and its wars. While the years run, pestilence spreads across the sheet as dark stains through the towns it reaches, and when the people from the sea come, their red-sailed fleet lies off the coast where they landed.
- **Scrape**: shows every century on the sheet at once, the way a scraped manuscript shows its older writing under raking light. Every border the land has known appears as a dotted trace, every realm that ever fell keeps its name, and each town carries the whole stack of names it has had, struck through, under the current one.
- **Appendix**: each people's own name for itself, its alphabet or syllabary as a specimen table, its sounds, the dated sound changes its speech went through (with real examples from its place names), a lexicon, a proverb with an interlinear gloss, its gods and its music.
- **Listen**: generative music in the mode of whichever people holds the most land at that moment. When the land changes hands, the music changes with it. Wars, plagues, crownings and falls have their own sounds.
- **Save leaf**: downloads the map, as it stands in the current year, as a PNG.

On a tablet: tap a town or realm to open its history (the town's name in its own script shows above your finger for a moment), double-tap to zoom in (again at full zoom to fit the sheet), pinch to zoom and pan together, drag with one finger to move. The `‹` and `›` buttons beside the play button step a year; hold one to keep going. Tap or drag the ribbon to scrub, and the year's main event stays readable for a moment after you lift your finger. Tap a line of native script in the chronicle to read its transliteration. Standing up, the sheet sits above the chronicle and nothing scrolls; on its side, the header fits on one row. It can be added to the home screen and opens full screen.

Keys: `Space` play or pause (or finish the drawing), `Left` and `Right` step a year (`Shift` for 25), `Home` and `End`, `S` scrape, `A` the appendix, `M` the music, `Esc` to close.

## How it works

Everything is generated from the seed with a deterministic random generator (sfc32 seeded by cyrb128), forked into independent streams so each system gets its own.

**Land** (`js/terrain.js`). One of six archetypes (a continent, twin lands, an archipelago, a ring around an inland sea, a stretch of coast, a body with peninsulas) lays down blobs; domain-warped simplex noise and ridged mountain ranges along random curves shape them; tens of thousands of simulated raindrops carve valleys and drop silt at river mouths. Land heights are then remapped by rank, so lowlands are common and peaks rare whatever the shape. Wind blows moisture in off the sea and wrings it out against the mountains, which leaves rain shadows and deserts. Water is routed with a priority flood over the land plus a faint undulation, so streams wander and merge instead of running in parallel ruts; filled basins become lakes. Biomes follow from temperature, rain and height.

**Tongues** (`js/language.js`). Each people gets a phoneme inventory drawn from cross-linguistic frequencies, a syllable shape, consonant clusters, a vowel system, a word order, a habit for building compounds, and a spelling in Latin letters (restricted to what the IM Fell typefaces can draw). Every concept in a lexicon of about two hundred gets a root, so place names have real meanings ("white ford", "Osten's fort", "new Kelvar") and the gazetteer can show the etymology. Each tongue is scheduled three to five sound changes from a set of twenty-one (lenition, apocope, palatalization, umlaut, rhotacism, Grimm-like spirantization and others), each applied to every word at a particular year. Names are stored as sounds and evolve on display. When a people takes over a town, its name is either replaced or borrowed: the sounds are mapped to the nearest ones the new tongue has, and its phonotactics are repaired with epenthetic vowels.

**Letters** (`js/script.js`). Literate peoples invent a script: an alphabet, an abjad, an abugida with vowel marks, or a syllabary whose letters turn to show the vowel. Glyphs are grown from a small vocabulary of strokes on a lattice, so a script has a family face, and each new glyph is checked against the others for distinctness. They are written with a broad nib at an angle, a stylus, or a brush. Unlettered peoples may later borrow the letters of a neighbour.

**History** (`js/history.js`). Peoples arrive at good sites near enough to meet within a few generations. Towns grow toward a capacity set by their land, rivers and coasts, and send out daughter towns, sometimes onto old ruins. Chiefdoms become kingdoms, kingdoms become empires once they rule several peoples, rich cities throw out their lords. Rulers age and die (of fevers, falls from horses, poison, childbed, battle), heirs succeed or fail to, succession crises split realms, marriages join them. Neighbours go to war over borders, tribute, insults, faith or salt; battles take and sack and sometimes raze towns. Provinces far from the capital, or of another people, revolt. Plague walks the roads and sails between ports; famine, flood, fire, earthquake and great winters strike. Conquered towns are renamed or slowly assimilated. Two times in three, partway through, a fleet comes out of the open sea carrying a new people with a new language. Everything is recorded as plain events, about a thousand to two thousand per world.

**The chronicle** (`js/chronicle.js`). A scribe in the largest literate city keeps the book; hands change every few decades, and the book moves when its city falls or burns. The scribe records what was close and important, more about their own realm ("our king", "we were beaten, and ran"), and distant things late and as hearsay. Foundings are gathered into one line per generation, a war gets at most two battles. Omens are seen before disasters. Some quires are lost to mice and fire. A later reader argues in the margin, and a margin note records when people started saying a name differently. It opens with a creation myth built from the actual geography and ends when the ink runs out.

**The sheet** (`js/render.js`, `js/political.js`). Paper is generated: blotchy fibre, grain, foxing, a tide-line stain, sometimes a cup ring, browned edges, a ragged outline. The terrain is drawn as about ten thousand small replayable operations (coast segments, five ripple lines, lakes, tapering rivers, hachured mountains, hills, three kinds of trees, marsh, grass, desert stipple), on an opaque ink layer multiplied into the paper. Then a graticule frame with real degree bands, a compass rose naming the north in the first people's script, rhumb lines, a cartouche with the world's name in that script, a scale in the native unit of a day's walk, a sea serpent and a couple of ships. Each year, territory is grown out from every town by the cost of walking there; realms get watercolour bands along the inside of their borders, dash-dot frontiers, roads routed by A*, crossed swords for recent battles, and labels placed so they do not collide.

**Music** (`js/music.js`). Each people has a mode (some outside twelve-tone tuning), a tonic, a tempo, a metre, an instrument (Karplus-Strong plucked string, reed, bell, or flute) and a motif, all from its seed. Nothing is sampled.

## Files

```
palimpsest.html   everything below compiled into one standalone file
build.py          makes palimpsest.html
index.html        the page, its layout and styles
js/core.js        random numbers, noise, heap, contours, distance transform
js/terrain.js     land, climate, rivers, lakes, biomes, named features
js/language.js    phonology, roots, names, sound change, borrowing
js/script.js      procedural writing systems and pens
js/history.js     the simulation of a thousand years
js/chronicle.js   the scribes and their book
js/render.js      paper, ink terrain, frame, compass, cartouche, serpent
js/political.js   territories, borders, roads, towns, labels, ghosts
js/music.js       the music of the peoples
js/ui.js          the desk: drawing, playback, cards, appendix, timeline, touch
fonts/            IM Fell types by Igino Marini, SIL Open Font License (fonts/OFL.txt)
```

## Limits

Worlds are a fixed 320 by 224 cells. The chronicle is generated from templates, so with enough worlds its turns of phrase repeat. Map labels are placed greedily and crowd in dense country; zoom in for the small towns. The music is a sketch, not a composition.
