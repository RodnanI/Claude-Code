# ASCII Heroes, Vol. 2

Sixteen living landing-page heroes drawn entirely with text characters. Open `index.html`: one standalone file with every hero, a glyph-wipe viewer and an index.

- Arrow keys or the bottom bar to browse, `I` for the index, `T` to switch theme, `D` (or **Get HTML**) to download the hero on screen as its own standalone file.
- Every hero has a dark and a light theme (the toggle lives in each hero's nav), a phone layout, and reacts to the pointer or touch.
- Twelve heroes are pure black and white. Four use exactly one accent colour.

| # | Hero | Page | What drives it | Colour |
|---|------|------|----------------|--------|
| 01 | Mobula | AI research assistant | Manta rays seen from below, span-wise wing flex, banked turns, filter feeding on plankton, prompt pill | mono |
| 02 | Couchette | Night train booking | Working split-flap wall, tiles only advance around their drum, form rewrites the board, optional clatter | amber |
| 03 | Mycel | Edge network for developers | Physarum slime mold agents link the regions; vein glyphs follow travel direction; cursor is daylight | mono |
| 04 | Tancho | Tea house | Wave-equation pond, koi on articulated spines refracted by ripples, tap to feed | red |
| 05 | Vey | Watchmaker | Lever escapement, breathing hairspring, ticking train, loupe that re-renders at 2.4x | mono |
| 06 | Quincunx | Forecasting software | Galton board with live P10/P50/P90 read from the stacks, tilt to skew | blue |
| 07 | Fresnel | Encrypted backup | Storm, sea and headland from noise, volumetric lighthouse beam that finds the cursor | mono |
| 08 | Last Set | Jazz bar | Rain on glass: drops bead, slide, merge and refract a bokeh street, drag to wipe the fog | pink |
| 09 | Babel | Archive and search | Random letters that a lantern resolves into public-domain sentences, search shelves yours | mono |
| 10 | Intaglio | Private bank | Guilloche rosettes generated from the name you type, micro-lettering, engraved frame | green |
| 11 | Orsola | Fashion house | Verlet silk banner in gusting wind, silk specular, occludes the giant headline behind it | mono |
| 12 | Hava | Balloon flights | Parallax fairy chimneys, a fleet of striped balloons whose burners fire to climb | orange |
| 13 | Static | Home battery | Plasma globe, fractal filaments that converge on your finger | mono |
| 14 | Phyllo | Seed bank | Vogel phyllotaxis at the golden angle, drag to detune it into spokes | mono |
| 15 | Halde | Architecture studio | Ray-cast brutalist massing with sun shadows and poche hatching; night lights the windows | mono |
| 16 | Pyra | Art biennale | Fireworks over a mirrored harbour at night, black smoke daytime fireworks in light mode | mono |

## Files

- `index.html` the showcase, fully standalone (built, do not edit by hand)
- `src/lib.js` the shared glyph engine: grid renderer with glyph atlases, raster sampling, edge glyphs, UI masks, noise, pointer, theme, scoped teardown
- `src/heroes/*.js` one file per hero (markup, styles, simulation)
- `src/shell.*` the viewer
- `build.mjs` inlines everything into `index.html`: `node build.mjs`

Fonts load from Google Fonts and fall back to system faces offline.
