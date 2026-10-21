# ASCII Heroes

Thirteen living landing-page heroes rendered entirely in glyphs. Open `index.html`: it is one standalone file with every hero embedded, a live preview index and a full-screen viewer (arrow keys to browse, Esc for the index, Download to grab a single hero).

| # | Hero | Product | What drives it | Colour |
|---|------|---------|----------------|--------|
| 01 | Hammerhead | Sphyrna, AI research agent | Articulated spine kinematics, schooling, caustics, sonar on submit | mono |
| 02 | Event Horizon | Umbra, radio observatory | Schwarzschild photon orbits traced per glyph, Doppler beaming | mono |
| 03 | Murmuration | Murmur, collaboration tool | 3D topological boids folded into a twisting ribbon, falcon cursor | mono |
| 04 | Sumi | Sumi Studio | Stable fluids with MacCormack ink, buoyancy, vorticity confinement | vermillion seal |
| 05 | Pulsar | Pulsar 27 festival | Hidden-line ridgeline waterfall, optional Web Audio pulses | mono |
| 06 | Chladni | Resonant R-1 synth | Sand settling on plate-mode nodal lines, optional tone | mono |
| 07 | Hanami | Hanami journal | Recursive tree with wind sway, petals that gather on the ground | pink |
| 08 | Lampyris | Lampyris scheduling | Pulse-coupled oscillators that self-synchronize, live sync meter | chartreuse |
| 09 | Contour | Cairn alpine maps | Marching-squares isolines, hillshade, terrain sculpting, route | orange |
| 10 | Phosphor | Phosphor CLI | Z-buffered shaded torus knot, interactive demo terminal | amber |
| 11 | Hush | Hush focus inbox | Snow cellular automaton settling on the headline letterforms | mono |
| 12 | Morphogen | Morphogen biotech | Gray-Scott reaction-diffusion with morphing presets | mono |
| 13 | Counterpunch | Counterpunch foundry | Exact distance transforms, glyph morphing, live weight axis | mono |

Every hero has dark and light themes, works on phones, and pauses its heavy work when the tab is hidden.

## Files

- `index.html` the showcase, fully standalone
- `heroes/*.html` each hero as its own standalone file
- `src/core.js` the shared glyph engine (grid renderer, theme, pointer, loop, noise)
- `src/heroes/*.html`, `src/shell.html` editable sources
- `build.py` inlines the engine and regenerates `heroes/` and `index.html`: `python3 build.py`
