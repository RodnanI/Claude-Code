# FLY HIGH: Master Plan

Working title: **Fly High**. A voxel flight simulator on a single large island, shipped as one standalone HTML file.

This document is the source of truth. If code and this file disagree, one of them is a bug. It is written in plain sections, not numbered phases, because the foundation is one indivisible thing: the engine, the map and the module contracts have to be right together or none of it is worth building on.

---

## 1. Non-negotiables

- Output is a single standalone `dist/fly-high.html`. No network requests at runtime, no external assets, no CDN, no fonts. Everything is inlined by the build.
- Everything visible is voxels: terrain, buildings, roads, trees, vehicles, aircraft, cockpits. "Voxel" does not mean low detail. Detail comes from small voxels near the viewer, and the world is procedural so small voxels are affordable.
- Scales from potato to beyond ultra with the same content. Detail follows screen coverage, not a global toggle. Slow machines see the same island with chunkier voxels and a shorter horizon.
- Modular by file. One plane per file. One town per file. One city per file. The metropolis is many files. One scenery type per file. Vehicle families one file each. Adding content never means editing a central list; a build step discovers files by suffix.
- Deterministic world. Same seed gives the same island on every machine and in every worker.
- The foundation is judged on structure and correctness, not on how much content exists. Region files in this stage are functional and honest but not final art.

## 2. Status board

Built and exercised in the foundation stage. "Exercised" means run end to end in headless Chromium with software WebGL and covered by tests, not measured on a real GPU.

- Build pipeline: registry discovery, esbuild bundle, worker inlining, single-file output of about 650 KB, dev server with native modules.
- Core: math, seeded RNG, noise, events, perf counters.
- Voxel toolkit: palette of 255 materials with PBR properties (24 of them procedural facade types), dense volumes, resolution-independent recipes (box, ellipsoid, cylinder, roofs, wedge, loft, airfoil, blob, facade, function, paint), greedy mesher with ambient occlusion.
- WebGL2 renderer with an HDR pipeline: camera-relative rendering, split-depth passes, single-scattering atmosphere with a sky-view LUT and aerial perspective, volumetric clouds with cloud shadows, cascaded shadows, planar water reflections, SSAO, temporal anti-aliasing, bloom, GPU auto exposure, a 3D LUT color grade (six looks), lens effects, motion blur, light shafts. A direct forward path with no post at all serves the Potato tier.
- Smart LOD: screen-space-error quadtree, worker pool with Blob workers in the single file, streaming, LRU eviction, skirts, adaptive governor.
- Whole island: terrain, coast, Mount Corvus and two more massifs (Kestrel Ridge, The Harrow), ridges, mesas, headlands and sea stacks, rivers, lakes, a highway network, 25 region files (metropolis in nine, two cities, four towns, three airfields, three features, four farmstead sets), 50 building and prop kits, 32 scenery types, about 6,700 structures plus the farmsteads. Meridian has a real skyline: 197 structures over 100 m and a 640 m supertall, in nine tower families (slab, art deco spire, round, twin, staggered, tapered, supertall and the classic glass box), plus hotels, lofts, garages, schools, a hospital, museums, a rail station, a mall and a power plant.
- Aircraft: module contract, 240 Hz flight model with trim solver and autopilot, and a roster of fourteen aircraft in three groups (military, private, hillbilly), each with a detailed exterior, cut-out control surfaces that move, a finished interior with working gauges and controls, a far and a close chase view and a cockpit view, liveries and, on the armed ones, weapon stations whose stores are drawn on the airframe (see 14.2 and 14.4).
- Weapons and destruction: guns, rockets, guided missiles and bombs with a nose-ray designation for ground attack, a bomb impact predictor on the HUD, cluster bombs and bay doors; every blast carves a crater, collapses or bites the buildings it touches and fells the trees in range, and the same list of blasts is mirrored into the workers so the island rebuilds identically everywhere (see 14.5 and 14.6). Fire, smoke, dust, debris and tracers are instanced voxel particles (14.7).
- Procedural facades: windows, brick courses, siding and ribs are drawn in the fragment shader in world space on a 3.6 m floor and 1.2 m bay grid, so a tower shows readable windows from 30 km to arm's length with no extra geometry. Every structure also picks one of four color banks per material, so the same facade comes in several colors.
- Landscape look (see 6.4 and 12): the ground is shaded from a smooth height-field normal per terrain node, so slopes read as rolling hills instead of stairs; tree crowns are voxel balls the shader rounds and lights as spheres; forest beyond the tree levels is a procedural canopy texture; the ground carries color patches, wind waves and grass streaks in the shader; farmland, hedgerows, herds, flowers, reeds, driftwood and boulders fill the countryside. Measured on `tools/budget.mjs all high` (eight standard views): about half the scenery triangles of the version before (4.0M against 7.9M), terrain triangles unchanged (10.4M), 15 M triangles in total against 18.9 M, node build time down by 15 to 20 percent (37 s against 43 s), and 9 percent more draw calls (8,900 against 8,200) because a forest is now several shared parts instead of one model per tree.
- Ambient life: container ships, tankers, ferries, tugs and sailing yachts on closed sea lanes, a twin-jet airliner flying a 15 minute airport circuit (approach, landing roll, taxi, dwell, taxi, takeoff, climb), helicopters circling Meridian, Port Halden and Ironford, an advertising airship whose flank panel glows at night, and flocks of gulls, crows and geese (one mesh per flock, wings beating, every loop kept above the ground and the rooftops under it). All of it is a pure function of a clock, so nothing is stored and nothing drifts, and every orbit is checked by a test against the structures under its path.
- Traffic: road graph split at every crossing, signals with visible masts whose lit lamp follows the phase the cars obey, IDM car following, nine vehicle types, spawn and cull around the camera.
- Game: chase, cockpit and orbit cameras, keyboard, mouse and gamepad, HUD (instrument strip and a full fighter HUD), structure collision that follows the real shape of each building (a setback, a tapering crown or the gap between twin towers is free air), crash and restart flow, and an optional challenge (Settings, World): the Skyline run, eight rings beside the crowns of Meridian's tallest towers, chosen from the generated city, with a timer, a pointer to the next gate and a best time kept in the browser.
- Airfields: the three start areas are built with one painter (`_shared/airfield.js`): runway numbers, threshold bars, touchdown zone and aiming point marks, displaced thresholds with arrows, blast pads, edge lines, rubber, patches and tire marks, taxiways with rounded fillets and centerline lights, aprons with slab joints and oil, stands with lead-in lines, hold lines, parking lots and lettering from a 5x7 bitmap font, all drawn only at voxel sizes that can carry them. Structures come from four kit files (terminal with piers and jet bridges, tower, hangars, cargo sheds, fuel farm, fire station, garage, hardened shelters, barn, silos, windmill, still) and props from three scenery files (parked aircraft with tinted liveries, approach lights, PAPI, signs, floodlights, ground support vehicles). `tools/plan.mjs`, `tools/iso.mjs` and the airfield views of `tools/tour.mjs` are how they are inspected, `tools/budget.mjs airfields` how they are costed.
- Takeoff and selector: the hangar is aircraft cards (bars computed from the flight model, a blueprint rasterized from the real model), an airfield chart with clickable starts, a briefing that runs the automatic takeoff against the flight model for the chosen wind, and conditions; in flight there is a takeoff intro camera, runway guidance on the HUD and an optional automatic takeoff (see 14.3).
- UI: loading, menu over a live island flyover, hangar with a 3D aircraft showcase you can orbit, settings generated from the schema, pause, controls, island map, performance overlay.
- Tests: 250 unit tests through `npm test` and a browser smoke test through `npm run test:browser`.

Stubbed on purpose (contracts exist, content does not):

- Audio.
- AI aircraft, missions, dynamic weather beyond cloud cover and wind, multiplayer.

Later, in rough dependency order rather than numbered stages:

- Deepen the metropolis further (bridges, elevated rail, helicopters, interiors behind the glass).
- Targets that shoot back, missions and scoring.
- More aircraft: airliner, transport, seaplane, glider, a helicopter (the flight model has one thrust unit and one wing, so rotors need new code).
- Audio, dynamic weather, AI traffic in the air.

## 3. Coordinates, units, scales

- Units are meters, seconds, kilograms, radians internally. UI can show aviation units.
- World axes: **+X east, +Y up, +Z south**. Right-handed. Heading 0 is north (-Z), heading 90 is east.
- Aircraft body axes: +X forward, +Y up, +Z right wing. Positive roll is right wing down, positive pitch is nose up, positive yaw is nose left (right-hand rule about +Y). The body origin is the center of gravity.
- Sea level is Y = 0. World is a 65,536 m square centered on the origin. The island occupies roughly the middle 30 km by 24 km.
- The world is never stored. Height, surface, buildings and scatter are pure functions of position and seed, evaluated on demand in workers.
- Voxel sizes by content:

| Content | Voxel size | Notes |
|---|---|---|
| Terrain and structures near the camera | 0.25 to 4 m | Set by the quality tier, doubles per LOD level |
| Aircraft exterior | 0.06 to 1 m | 0.0625 m up close, each LOD level doubles it, coarse levels use conservative rasterization |
| Cockpit interiors | 0.004 to 0.03 m | Per part: cabins 2 to 3 cm, panels 6 to 8 mm, needles and attitude balls 4 mm |
| Vehicles | 0.1 to 0.8 m | Chosen by distance, re-rasterized per level |
| Trees | node cell size | Instanced, so LOD matches the terrain around them |
| Cars, lamps, runway lights | a quarter of the node cell, at least 12.5 cm | Small props get finer voxels than the ground under them |

## 4. Repository layout

```
sonnet 5.5 flight sim/
  PLAN.md  README.md  package.json
  build/            build.mjs  gen-registry.mjs  dev-server.mjs
  tools/            map-preview.mjs  png.mjs  shot.mjs  flight-shot.mjs  aircraft-sheet.mjs
  src/
    index.html  main.js  styles/ (main.css ui.css)
    generated/      registry.js   (written by gen-registry, committed)
    core/           math rng noise util events perf
    settings/       schema presets store probe governor
    voxel/          palette volume recipe mesher
    render/         gl camera renderer sky atmosphere post grade shadows models cloudnoise shaders/
    lod/            lod-config node-manager terrain-mesher
    workers/        pool.js world.worker.js build-node.js
    world/
      config.js  layout.js  index.js  spatial.js  region.js
      terrain/      island terrain hydrology surface
      roads/        network highways
      scatter/      biomes scatter
      kits/         *.kit.js       building and prop generators
      scenery/      *.scenery.js   trees, rocks, props (instanced)
      regions/
        _shared/    lattice zoning settlement airfield
        metropolis/meridian/*.region.js
        cities/*.region.js  towns/*.region.js  airfields/*.region.js  features/*.region.js
    aircraft/
      base.js  model-kit.js  instance.js
      flight/       model.js atmosphere.js trim.js autopilot.js
      builders/     parts.js
      planes/       *.plane.js     one file per plane
    traffic/        road-graph.js traffic.js vehicle-def.js  vehicles/*.vehicle.js
    input/          bindings.js input.js
    game/           game.js camera-rig.js hud.js collision.js ground.js aircraft-entity.js
    ui/             app.js settings-panel.js map.js dom.js
    test-scenes/    viewer.js aircraft.js      (inspection pages, not part of the game)
  tests/            unit/*.test.mjs  browser/(harness.mjs smoke.mjs)  run-unit.mjs
  dist/             fly-high.html
```

File suffixes drive discovery: `*.plane.js`, `*.region.js`, `*.scenery.js`, `*.vehicle.js`, `*.kit.js`. `gen-registry.mjs` scans for them and writes `src/generated/registry.js`. A file may default-export one definition or an array. Drop a file in, rebuild, it exists.

## 5. Build and packaging

- `npm run gen` regenerates the registry.
- `npm run build` runs gen, bundles `src/main.js` and `src/workers/world.worker.js` with esbuild as IIFE bundles, minifies, then writes one HTML file: CSS in a style tag, the worker source in an inert `<script type="text/plain" id="fh-worker-src">`, the main bundle in a module-free script. Workers start from a Blob URL built from that text. `--entry viewer` or `--entry aircraft` builds the inspection pages instead.
- `npm run dev` serves `src/` unbundled with native ES modules and module workers for fast iteration (`/?entry=test-scenes/aircraft.js&plane=shrike` opens the aircraft inspector).
- `npm test` regenerates the registry and runs every `tests/unit/*.test.mjs` with `node --test`. No test dependency.
- `npm run test:browser` builds and drives headless Chromium (Playwright) against the built file. It skips itself when Playwright is absent. `PRESET=potato` picks the quality tier.
- The unit suite builds the game and fails if the output references the network, loads modules dynamically, exceeds 3 MB, or if any source file contains an em dash.

## 6. Rendering

WebGL2 only, written directly. No engine dependency, because the vertex format, the LOD and the culling are the product.

### 6.1 Vertex format (8 bytes)

`i16 x, y, z, w` where `w` packs the face (3 bits, 0..5 for +X -X +Y -Y +Z -Z, so normals cost nothing), two ambient occlusion bits, an 8 bit material id, a soft flag (bit 13: the face belongs to smooth ground or a rounded crown) and a two bit color bank (bits 14 and 15). Positions are integer cell coordinates local to the node. Every other material property comes from a 256 by 9 palette texture: albedo and roughness, emissive color and intensity, metallic, variation, translucency and flags (emissive, glossy, water, foliage, flat, tint), three rows of surface pattern parameters and three rows of alternate albedo (the color banks). Scenery instances are 24 bytes (position, yaw, scale, tint and a bank byte in the alpha channel).

Per-voxel color variation, voxel edge bevels, sub-voxel grain and macro color drift are computed in the fragment shader from the voxel index. That is what lets the mesher merge giant flat quads while the surface still reads as individual voxels.

### 6.2 Camera-relative rendering

Every node origin is subtracted from the camera position in double precision on the CPU and uploaded as a float uniform. Nothing on the GPU ever sees a large world coordinate. Result: no jitter at 30 km from the origin.

### 6.3 Depth precision: split-depth passes

One 24-bit depth buffer cannot cover 0.3 m to 60 km. The frame is drawn as a far pass (about 1.3 km to the far plane), a depth clear, then a near pass (0.3 m to 1.7 km), then a cockpit pass with its own tight frustum (3 cm to 60 m). Nodes straddling the split are drawn in both. There is no logarithmic depth and no per-fragment depth writes, so early-z stays on.

### 6.4 Shading and the HDR chain

- Surfaces: GGX specular with roughness and metallic from the palette, wrap diffuse, cascaded shadow maps, hemisphere ambient, baked vertex AO, screen-space AO on higher tiers.
- Atmosphere: single scattering with a crude isotropic fill for multiple scattering, integrated analytically per segment with quadratic step spacing (horizon rays run hundreds of kilometers, and uniform steps starved the blue channel). The same function runs on the CPU for sun, ambient and haze colors and on the GPU into a sky-view LUT. A daytime horizon tint restores the pale blue the fill leaves greenish. Aerial perspective applies per-channel haze so distance reads blue and warm at sunset, and below the horizon the sky continues the terrain fog color so there is no seam at the view distance.
- Night: dim blue moonlight, a deep blue airglow floor in the sky LUT, and a scotopic shift in the composite (dim pixels lose saturation and lean blue, bright lights keep their color). The auto exposure ceiling is high enough to lift the scene without turning it into day.
- Exposure: center-weighted log-average metering of the smallest level of the downsample chain, which therefore always runs, even with bloom off. The metering key is 0.36 and `exposureBias` is in stops around it.
- Clouds: raymarched in half resolution from a 3D Perlin-Worley volume, with shadows cast on the terrain. Cheaper tiers use sky layers.
- Water is a terrain material, not a separate plane. Ocean columns merge into a few huge quads. The shader adds wave normals, Fresnel, sun glint and, on Ultra, real planar reflections from a mirrored geometry pass.
- Post: temporal anti-aliasing with camera reprojection (FXAA as a fallback), dual-filter bloom, auto exposure without CPU readback, filmic tone mapping with a log-encoded 48^3 LUT for cinematic grading, chromatic aberration, sharpening, lens flare, light shafts, motion blur, film grain, vignette.
- Facade shading: a facade material carries its pattern in three extra palette rows (bay width, floor height, window size, sill, frame tone, spandrel tone, lit share, glass tint). The fragment shader turns that into window panes with per-pane tint, frames, spandrels, reflective glass (higher specular, a brighter sky reflection) and, at night, lit panes: a share of the windows glows, some floors are busier than others, a few change state every minute, and the lit share fades in gradually through dusk. Beyond a few hundred meters the grid collapses to its average coverage so windows never shimmer. Brick courses, clapboard siding and vertical ribs use the same route. Tower roofs carry aviation beacons that flash in step.
- Smooth ground: every terrain node ships a 64 by 64 texture of Sobel normals and cavity occlusion computed from its height field. The shader lights soft ground faces with that normal and darkens the risers by the size of the step, so the voxel stairs disappear under lighting while the geometry stays greedy-merged. Walls up to three cells tall take the surface material; taller cliffs stay rock below a soft cap. The alpha channel of the same texture is the depth of the water over each column (square-root coded over 100 m), which the sea shader turns into a smooth turquoise-to-deep-blue gradient in place of the six depth bands, plus animated surf where the water is thin.
- Sea: small ripples fade out as one pixel grows larger than their wavelength (no moire arcs or glitter at a distance), and shore foam is limited to the shallows.
- Rounded foliage: crowns are voxel balls whose vertices the shader pulls toward a sphere (pull 0.62 for leaves, 0.3 for other soft models), with spherical normals, underside occlusion and a leaf grain. Voxel edge darkening is halved on foliage.
- Canopy: beyond the levels where real trees exist (`TREE_MAX_LEVEL`) forest ground is textured with a tileable, mipmapped texture of tree crowns (`canopy-tex.js`, sampled with explicit gradients), lit and shadowed like the crowns it stands for, so forest reads as forest from 20 km with no instances at all.
- Ground character: macro color drift, quilted field patches, wind waves that travel across meadows and grass streaks, all in the fragment shader from world position, and terrain color banks (two bits of the vertex, only for cells up to 2 m so greedy merging survives).
- Emissive voxels (lamps, runway lights, nav lights, neon) glow through bloom.
- Night city glow at a distance: fine detail has real lamp props, and coarse road cells on avenues, streets and highways paint pools of `ASPHALT_LIT` (warm emissive color, night only) every few dozen meters, so a lit street grid reads from kilometers away.

### 6.5 Draw budget

Terrain and structures share the node draw path: one or two draws per node. Scenery is instanced per node per model bucket, and beyond the finest ring the model variants collapse to one so a forest is a handful of draws, not dozens. A tree is not a model of its own: it is a trunk and a few crowns from the shared `puff`, `puffb` and `cone` models, so every species of a node shares the same few buckets. Small ground cover carries `maxDist` and `noShadow` so it costs nothing far away and nothing in the shadow pass. Shadow cascades cull nodes and instance batches against the light-space box of each cascade, and the shadow filter takes four spread taps first and the remaining eight only inside a penumbra. Vehicles and aircraft parts are individual model draws through the same shader with a rotation matrix and a tint.

## 7. Smart LOD and streaming

### 7.1 The node grid

The world is a quadtree of square nodes. Every node, at every level, is 64 by 64 cells.

```
cell(level)  = baseVoxel * 2^level
nodeSize     = 64 * cell(level)
```

With baseVoxel = 0.5 m: level 0 is a 32 m node of 0.5 m voxels, level 6 is a 2 km node of 32 m voxels. `baseVoxel` is the main quality dial: it shifts the entire pyramid.

### 7.2 The only LOD rule

Split a node when its cell would cover more than `lodErrorPx` pixels on screen:

```
cellPixels = cell(level) * projectionScale / distanceToNodeBounds
split if cellPixels > lodErrorPx
```

Everything follows from this one rule: closer means smaller voxels, higher resolution scale means finer detail, wide FOV coarsens, and altitude coarsens the ground below you. No hand-tuned distance tables. Aircraft and vehicle models use the same idea per model: the coarsest voxel that stays under about 1.6 pixels.

### 7.3 Node contents

A node is built entirely in a worker and returned as transferable buffers:

- Terrain: heightfield voxel columns, greedy-merged top faces, merged walls, and skirts to hide LOD cracks.
- Structures: recipes of every structure anchored in the node, rasterized at that node's cell size and greedy meshed in 3D. Coarse levels use conservative rasterization so skylines survive. Structures and props that would sit on an inter-city road are dropped by the world, identically in every thread.
- Scenery: instance lists (position, yaw, scale, tint) per model bucket. Scatter density follows the level; beyond a quality-set level the forest is carried by terrain color alone.
- Bounds: tight min/max, used for culling and distance.

### 7.4 Hole-free refinement

A node is only replaced by finer nodes when the finer nodes are ready. Missing data falls back to the nearest ready ancestor, and any drawn descendants covered by a drawn ancestor are dropped. The coarse chain is kept alive by touching ancestors every frame, so turning around quickly never shows holes.

### 7.5 Scheduling

- The main thread only selects, prioritizes, uploads and draws. All generation and meshing is in workers.
- Requests are prioritized by how far a node is above its error threshold, then by distance, with a fattened frustum so nodes just off screen are prefetched.
- GPU uploads are time-sliced per frame. Eviction is LRU under a per-tier GPU byte budget.
- If workers are unavailable the same code runs on the main thread in budgeted slices.

### 7.6 Adaptive governor

In Auto mode a frame-time governor nudges resolution scale, `lodErrorPx`, view distance and shadow cascades to hold the target frame rate, with hysteresis so it does not oscillate. It never changes voxel size or worker count, because those flush the world. A hardware probe (GPU string, cores, memory, screen, touch) picks the starting tier and is deliberately conservative.

## 8. Quality tiers and settings

| Setting | Potato | Low | Medium | High | Ultra | Overkill |
|---|---|---|---|---|---|---|
| Base voxel (m) | 4 | 2 | 1 | 0.5 | 0.5 | 0.25 |
| View distance (km) | 6 | 10 | 16 | 24 | 36 | 60 |
| LOD error (px) | 10 | 6 | 4 | 3 | 2 | 1.25 |
| Resolution scale | 0.6 | 0.75 | 0.9 | 1 | 1 | 1.25 |
| HDR post pipeline | off | on | on | on | on | on |
| Anti-aliasing | off | FXAA | TAA | TAA | TAA | TAA |
| Shadow cascades | off | off | 1 | 2 | 3 | 4 |
| Shadow map size | - | - | 1024 | 2048 | 2048 | 4096 |
| Bloom / SSAO | - / - | - / - | bloom / - | bloom / ssao | bloom / ssao | bloom / ssao |
| Planar reflections | off | off | off | off | on | on |
| Water | flat | flat | simple waves | full waves | full waves | full waves |
| Clouds | off | sky layers | sky layers | volumetric | volumetric | volumetric high |
| Scenery range (m) | off | 250 | 600 | 1200 | 2400 | 5000 |
| Traffic (vehicles) | off | 10 | 30 | 70 | 140 | 260 |
| Voxel edges | off | off | 0.35 | 0.6 | 1 | 1 |
| Workers | 1 | 2 | 3 | 4 | 6 | 8 |
| GPU budget (MB) | 96 | 192 | 384 | 768 | 1536 | 3072 |

Every value is an individual setting that can be overridden; the preset becomes "Custom" when they diverge. Settings live in `src/settings/schema.js` with a type, range, group, and an apply mode (`live`, `rebuild` to flush LOD nodes, or `reload`). Persistence is localStorage behind try/catch, versioned, with JSON import and export. There are also cinematic controls (grade, exposure, bloom, grain, vignette, lens fringing, flare, sharpening), world controls (time of day and speed, cloud cover, wind, turbulence), control settings (FOV, mouse flight, pitch inversion, response, dead zone) and interface settings (units, HUD scale, performance overlay).

## 9. The island

A single island, roughly 30 by 24 km, built from land blobs, bays and coastal noise, so the coast is authored where it matters and organic elsewhere.

| Site | Kind | Position (x east, z south) |
|---|---|---|
| Meridian | Metropolis | 4300, -8000 |
| Port Halden | Big city, harbor | 5600, 9300 |
| Ironford | Big city, industrial | -6400, -5600 |
| Dunmore | Town, fishing | -1900, -9100 |
| Pinecrest | Town, lakeside forest | -9800, -1200 |
| Saltmarsh | Town, beach | 13400, 5000 |
| Cutbank | Town, farmland | 1800, 600 |
| Meridian International | Start area: airport | 10200, -1800 |
| Fort Talon Air Base | Start area: military | -10800, 5200 |
| Hollerin' Hollow Strip | Start area: hillbilly runway | -800, 3400 |
| Mount Corvus | Mountain, peak about 1560 m | -5200, 2200 |

Positions are tuned against `tools/map-preview.mjs` output, and the master table is `src/world/layout.js`. Nothing else hard-codes a site position.

### 9.1 Terrain

Natural height is: island mask with domain warp, beach ramp, rolling hills, ridged spines, stepped mesas, headlands and sea stacks along the coast, a ridged-noise mountain and two more massifs (`MASSIFS` in `layout.js`), and river and lake carving (`LAKES`, `RIVERS`). Sea stacks rise from the sea floor itself, so there is no shelf or underwater cliff around their feet. Rock faces are banded by height and broken by patches, but only as far as the cell size can resolve them (coarser cells would alias the strata into camouflage), and the rock kinds differ by tens of percent, not by half. A softplus valley-floor clamp keeps new relief from leaving accidental sea-level ponds inland. A lake away from any settlement fills its basin only up to its lowest bank (no dams on the far shore), and the ground climbs from its water at a walking slope instead of standing round it as a cliff. The slow fields (warp, mask, ridges, mesas) are cached on a 32 m lattice (`macro.js`) for node columns only; `heightAt` stays exact, and callers that sample sparsely turn the cache off. Then region-declared modifiers are applied: circular and oriented-rectangle flatten zones with blend distance and optional planar tilt (runways, city pads, the sloping hillbilly strip). Octaves finer than the requested cell size are skipped, which is both a speed win and an anti-aliasing measure.

Surface material is chosen in priority order: airfield paint, road paint, region lot paint, water, then biome (beach, grass variants, forest floor, farmland fields, rock by slope, snow by altitude and noise). At coarse cell sizes settlements paint an aggregate district tint so a metropolis still reads as a city from 20 km away.

Water is baked into the terrain function: ocean at Y = 0, rivers and lakes at their own levels, all emitted as water-material columns. For physics, the water surface counts as ground and landing on it with a land plane is a crash.

### 9.2 Roads

- Every region can emit road segments. Segments are painted into the surface function through a spatial grid, with lane markings and sidewalks at fine cell sizes.
- A highway generator connects settlements with A* on a coarse cost grid (slope and water penalties), smooths the paths, and emits them as road segments.
- Airfields paint runways, taxiways, aprons and numerals directly from geometry.

### 9.3 The three start areas

- **Meridian International Airport**: two parallel asphalt runways (09R/27L 3,400 m, 09L/27R 2,600 m with a displaced 27R threshold), full markings, approach lighting and PAPI, blue taxiway edge lights and green centerlights, named taxiways with sign panels, a terminal with two piers and twelve jet bridges under a glass roof, tower, hangars, a cargo apron with heavy freighters, fuel farm, fire station, parking garage and lots with thousands of cars, and airliners with ground crews at the gates. Perfectly flat.
- **Fort Talon Air Base**: a 3,300 m concrete runway with arrestor cable marks on a flattened plateau, hardened aircraft shelters with taxi stubs, hangars, tower, radar dome, barracks, motor pool, fuel farm, fire station, olive vehicles and parked Shrikes on the flight line, an alert pad and a perimeter fence.
- **Hollerin' Hollow Strip**: a 520 m mowed strip on rolling ground that climbs about 1.4 percent with a deliberate hump, worn wheel tracks and lime-painted numbers, a farm beside it (patchwork tin hangar with an airplane in front, pallet control tower, barn, silos, windmill, water tank, a school bus somebody lives in, trailers, a still, a bonfire, a wreck under a chain hoist, junk, hay, split-rail fence) standing in a clearing the natural forest keeps out of.

Every runway start knows its runway: `world.spawns()` adds `rwy` (both end names, length, width, surface, heading) and `roll`, the pavement ahead of the start, for any spawn that names a `runway`.

Each airfield region carries an `info` block (label and blurb) that the hangar screen shows, so a new start area brings its own description.

Scenery never grows within 26 m of a start position, so the first frame is not a tree filling the screen.

Paved airfields paint their whole footprint as mown grass in wide stripes (`Airfield.fieldLot`, an ordinary lot that ranks below roads and pavement). Without it the natural biome put woodland between the two runways of Meridian. A test samples the ground beside both runways and fails on any forest floor.

## 10. Region file contract

A region is one file exporting `defineRegion({...})`:

```js
export default defineRegion({
  id: 'town/dunmore',
  name: 'Dunmore',
  kind: 'town',                    // metropolis district | city | town | airfield | feature
  bounds: [x0, z0, x1, z1],        // meters, world space
  maxHeight: 40,                   // tallest structure above ground, for culling
  terrain: () => ({ flatten: [ ... ] }),
  layout: (ctx) => ({ structures, roads, props, lots }),   // lazy, deterministic
  paint: (x, z, cell, h, world) => materialId | 0,         // hot path, keep it cheap
  spawns: [ { id, name, x, z, heading, kind, group, runway } ],  // airfields only; kind: runway, hold, apron, hangar, gate
  info: { order, label, blurb, features },                 // airfields: shown in the hangar
  runways: [ ... ], chart: () => ({ ... }),                // airfields: runway list and chart data (Airfield.runwayList, Airfield.chart)
  clearings: [ { x, z, r } ],                              // circles where the natural scatter grows nothing (a farmyard in a forest)
});
```

Rules: `layout` is pure and seeded through `ctx.rng(label)`. `paint` runs per column and may only do cheap rectangle and grid lookups. Structures are descriptors of a kit and its parameters, never voxel data. A region file never imports another region file. Towns and cities are usually built with `settlement({...})` from `_shared/settlement.js`, which takes a compact config and an `extras` hook for landmarks.

Metropolis Meridian is one lattice of streets shared by many district files so roads connect across files: downtown, financial, midtown, old town, harbor, residential, industrial, landmarks and the ground plane. Cities and towns are one file each.

## 11. Architecture and kits

Kits (`*.kit.js`) turn parameters into recipes. A recipe is an ordered list of shape ops in meters that can be rasterized at any voxel size:

- Ops: box, carve, ellipsoid, tapered cylinder, gable and hip roofs, wedge, loft along an axis, airfoil wing, noisy blob, facade pattern, arbitrary function, paint (recolors only voxels that already exist), stamp.
- Each op may carry `md` (skipped when the voxel is larger) or `mn`. Fine details (mullions, balconies, antennas, AC units) therefore appear only when the voxels are small enough to carry them. Ops flagged `thin` stay one voxel thick at any resolution, which is how a 1 cm fin survives a 6 cm voxel.
- Walls of buildings use a facade material (`FAC_*`), and the shader draws the windows (section 6.4). Kits therefore only place walls, cores and setbacks on the floor grid; they no longer carve windows, which is why a 640 m tower rasterizes in the same time as a 60 m one. Every floor is 3.6 m (7.2 m for a double-height loft), every bay a multiple of 1.2 m, and the base of a structure is snapped to a multiple of 3.6 m (`snapY`), so the painted window rows meet the floors and the pad.

Architectural principles that kits must follow:

- Proportion first: base, shaft, crown for towers; a real setback logic rather than stacked boxes.
- Material palettes per district so neighborhoods read differently from the air.
- Roofs are never flat by accident: mechanical penthouses, water tanks, antennas, helipads, gables, hips, chimneys.
- Seeds change massing, materials, and details, so no two blocks match.
- Everything grounds itself: foundations extend below the pad so terrain steps never show gaps.

City layout has three layers. `_shared/urban.js` splits a block into lots by recursive subdivision with a frontage side, so buildings face the street they belong to and corner lots get the tall or wide building. `_shared/zoning.js` chooses what stands on a lot from the district style (height field, density, material banks, storefront and awning rules) and adds the plazas, parks with ball fields, fountains, statues, bus stops, benches and billboards. Hero blocks in `landmarks.region.js` place the named skyscrapers, the stadium, the station and the civic buildings by hand so the skyline has a recognizable silhouette.

## 12. Scenery

Scenery types are one file each and declare a recipe per variant (`build`) or a composition (`expand`), plus biome rules (which biome, density, slope and altitude limits, `fine` for small props that deserve finer voxels than the terrain, `noShadow` and `maxDist` for small things). Instances carry position, yaw, scale, a tint and a color bank so one model yields many looks (autumn, gold and deep oaks, blue and olive spruce, birch, dark and gray trunks).

The scatter system (`src/world/scatter/scatter.js`) is a set of layers, each a pure function of position and seed: canopy trees with species mixed by biome and altitude, understory bushes, flowers in drifts, hedgerows along field edges, herds of cows, sheep and horses on pastures and deer at the forest edge, reeds and lilies in shallows, driftwood on beaches, and the older rock, shrub and palm layers. Tree spacing grows with the level of detail, `LEVEL_CROWN` makes far trees bigger and simpler, and trees stop at `TREE_MAX_LEVEL`. Farmsteads are region files (`farmsteads.region.js`): a house, a barn and sheds at field corners of the farmland grid.

## 13. Roads and traffic

- Road segments are split wherever they cross or meet and become a directed lane graph (right-hand traffic), about 3,200 nodes and 11,900 edges on this island. The graph is one connected network covering more than 90 percent of the nodes.
- Signals: two phases with 8 s of green, 2.5 s of amber and a 1.5 s all-red gap at every node with three or more legs on a street or bigger. Cars stop for red, stop for amber when they still can, and about 2 percent of crossings still happen at speed on red (the tests allow 5).
- Vehicles follow the Intelligent Driver Model with lookahead across edges, stop lines at red, corner speed limits and random turns at nodes.
- Spawning and despawning happen around the camera between 140 and 700 m; nothing is simulated far away. The cost is proportional to the setting, not to the island.
- Vehicles are `*.vehicle.js` recipes, one file per family, rasterized at LOD voxel sizes with a paint tint per instance. There are nine: sedan, hatchback, SUV, van, pickup, taxi, city bus, box truck, tractor trailer.

## 14. Aircraft

One file per plane, exporting `defineAircraft({...})`. The contract as built:

```js
export default defineAircraft({
  id, name, manufacturer, role, description, tags, order,
  voxel, interiorVoxel, lodLevels,
  mass: { empty, fuel, payload },
  inertia: [roll, yaw, pitch],
  wing: { area, span, chord, y },
  aero: { CL0, CLa, CLmax, alphaStall, CD0, k, Cm0, Cma, Cmq, Clb, Clp, Cnb, Cnr, ...,
          machDrag, spin, stallPitchDown, control: { elevator, aileron, rudder, schedule } },
  propulsion: { type: 'prop' | 'jet', power | thrust, afterburner, ... },
  gear: { retractable, wheels: [ { pos, radius, k, c, steer, brake, castor, travel } ] },
  skids: [ { p, kind } ],          // structural contact points: tail, belly, tip, nose
  limits: { vne, maxG, minG, flapSpeed, gearSpeed, gLimiter, crashVs },
  cameras: { cockpit: [x, y, z], chase: { distance, height } },
  stations: [ { id, pos, kind } ], weapons: [ { id, name, type, stations, ... } ],
  liveries: [ { id, name, remap } ], hud: 'none' | 'fighter',
  animations: [ { part, type: 'rotate' | 'translate', axis, channel, gain, offset } ],
  model(kit) { ... },              // exterior parts
  interior(kit) { ... },           // interior parts, may use much finer voxels
});
```

`defineAircraft` validates the numbers (positive mass, static pitch stability, stall angle consistent with the lift curve, station references, three or more wheels) and freezes the result.

- Parts are recipes with pivots. `kit.part(name, { pivot, local, voxel, hideInCockpit, visibleWhen })` returns a recipe; `local` parts are authored around their pivot (needles, propellers, wheels), the rest in body coordinates and anchored on the pivot when built. Animation channels (`aileron`, `elevator`, `rudder`, `flap`, `gear`, `gearOut`, `airbrake`, `propAngle`, `wheelAngle`, `comp0..n` for gear compression, `throttle`, `iasKnots`, `altFeet`, `vsFpm`, `rpm`, `rollGauge`, `pitchGauge`, `steer`, `store_<station>`) come from the flight model each frame.
- Model LODs come from re-rasterizing every part at doubled voxel sizes; liveries are material remaps applied before meshing.
- Builder helpers cover struts, wheels, rings, gauges, needles, wing pairs, fins, propellers and `clipToHull`, which trims interior geometry to the airframe skin.

### 14.1 Flight model

Six degrees of freedom, fixed step at 240 Hz with an accumulator and render interpolation. Quaternion orientation, body-frame inertia. International Standard Atmosphere. Steady wind plus smooth gusts. Lift with a soft stall that falls to about three quarters of maximum lift and relaxes onto a flat-plate curve, ground effect on induced drag, Mach drag rise, sideslip force, control and damping moments, buffet, propwash on controls, engine torque and P-factor at low speed. Propeller thrust from power and airspeed; jet thrust with density lapse and afterburner. Wheels and structural skids are spring-damper contacts against the terrain function with rolling resistance, brakes with differential steering, cornering friction, nose and tail wheel steering, and surface types from the material name. A fly-by-wire pitch law (angle of attack command with load and alpha limits and a rate-limited command) protects the fighter. Structural failure at overspeed and over-G, hard landing and water crash detection.

`solveTrim` finds angle of attack, elevator and throttle for level flight, and `startAirborne` places a model in that trim, so airborne starts and tests are stable. `Autopilot` holds altitude, heading and speed through the normal inputs.

### 14.3 Takeoff

`src/aircraft/flight/takeoff.js` holds everything about a takeoff that does not care where it runs. `takeoffSpeeds` gives the stall speed at takeoff flaps, the rotation speed (1.12 times it) and the climb-out speed. `TakeoffPilot` is one controller for the whole takeoff, working through the ordinary input channels: hold on the brakes, full power, centerline by heading on the wheels and by ground track in the air (which puts the nose into a crosswind by itself), rotation at a fixed rate to ten degrees, gear up at a positive rate, flaps up above a speed, climb speed by pitch, and a handover once established. It runs the same phase machine (hold, roll, rotate, climb, done, abort) whether it flies or only watches, and produces the cue and callouts for the HUD. `simulateTakeoff` runs it against the real flight model on flat ground with wind, slope, elevation, surface, fuel and payload, in about 10 to 80 ms, and reports lift-off and 50 ft distances. The hangar briefing, the assist's own go or no-go decision and the tests all use it, so the numbers agree with what the automatic takeoff delivers.

`src/game/takeoff-assist.js` finds the runway an aircraft is lined up on (from the region runway lists, either direction), runs the pilot in guidance or automatic mode, scans the terrain ahead once the aircraft is climbing and turns away from rising ground, refuses an automatic takeoff when the simulated 50 ft distance with a 15 percent margin does not fit the runway left, aborts on the roll if the runway will not stop it, and gives the controls back on any real input. `Game` applies its commands after copying the player's input, moves the throttle lever with it, and trims for the handover. The mode is the `takeoffAssist` setting (off, runway guidance, automatic) and the T key cycles it.

The camera rig plays a takeoff intro from a runway start: a low camera ahead and to the left of the nose swings along the side to the chase position in 4.6 s and gives way at once to any input.

### 14.2 The roster

Fourteen aircraft in three groups. The hangar lists them in this order and can filter by group. Each has two third person views (a far chase and a close one), a cockpit view with a finished interior, a livery set and numbers worked out by `tools/flight-lab.mjs` against the real flight model.

Private:

- **Skylark SK-172**: four-seat high-wing trainer. Forgiving, about 44 knot stall, full interior with a working panel, attitude ball, yoke, pedals and throttle.
- **Hornet S-2**: aerobatic biplane. Four ailerons, symmetric wings, 560 degrees a second at full stick, sunburst paint made of angular paint ops, skeleton canopy, open cockpit.
- **Vantage VJ-1**: personal jet with an engine on the spine and a V-tail whose ruddervators mix pitch and yaw. Real window openings, a four-seat cabin and a flight deck with a wide glass panel and sidesticks.
- **Aerolux AL-9**: twin-engine business jet. A hollow hull with oval windows cut through the skin, a full cabin (club chairs, tables, a divan, a galley), a cockpit with three screens and an open door back into the cabin.

Military:

- **Shrike F-9**: light fighter with afterburner, fly-by-wire, 9 G, retractable gear, airbrake, bubble canopy, wingtip missiles, rocket pods and bombs.
- **Tempest P-48**: piston fighter. Radial cowl with cylinder heads, a four-blade prop, six .50 caliber guns, rockets, bombs, strong torque.
- **Hammerhead A-12**: twin-engine attack jet with a seven-barrel cannon in the nose that spins up, shark mouth, ten stations carrying rocket pods, air-to-ground and air-to-air missiles and two kinds of bomb.
- **Kestrel X-7**: canard delta with fly-by-wire and a long afterburner flame, a deep cockpit and five weapon systems.
- **Specter FW-3**: flying-wing stealth bomber with a sawtooth trailing edge, drag rudders at the tips and two weapon bays whose doors open on the airbrake channel; the bays carry a heavy bomb, cruise missiles and cluster bombs.

Hillbilly:

- **Scrapper B-1**: homebuilt taildragger for the hillbilly strip. Patchwork cloth generated with paint ops, tundra tires, converted car engine, adverse yaw and a real spin tendency. A potato cannon and bottle rockets.
- **Thunderbox TB-1**: an outhouse with a drone jet engine strapped to the roof, plywood wings, a barn-door tail, a plunger for a stick and a pull chain for a throttle. Crescent moons are real windows. Potato cannon, bottle rockets, propane tanks.
- **Doublewide DW-2**: a mobile home with a billboard wing and four car engines. The pilot drives from a recliner; behind him the living room, kitchen and bedroom are all modeled. Potato cannons, moonshine jugs and propane tanks.
- **Barnburner BB-1**: a red barn with an afterburning grain silo on the roof, a hayloft, stalls and a lantern inside, a tractor seat at the Dutch door. Plunger rockets, bottle rockets, propane tanks.
- **Hauler RH-1**: a school bus with a radial engine where the hood was, a wing on the roof and a stop sign that deploys with the airbrake. Rows of green seats behind the driver. A potato cannon, moonshine jugs and propane tanks.

### 14.4 Building a plane

Planes are authored in `src/aircraft/planes/`. The helpers in `src/aircraft/builders/` carry the detail work so a plane file reads like a description:

- `parts.js`: struts, wheels, rings, gauges, needles, wing pairs and `clipToHull`, which trims interior geometry to the airframe skin.
- `detail.js`: stenciled lettering and decals, camouflage patterns, panel seams, rivets, navigation lights, a posed pilot figure with harness and oxygen hose, engine inlets with recessed fan blades, nozzles with petals, propellers with twisted paddle blades, landing gear legs, stores on pylons and rocket pods.
- `surfaces.js`: control surfaces that really move. An aileron, flap, elevator or rudder is cut out of the airframe along its hinge and rebuilt as its own part with the same section; the cut and the part share one membership test, so at rest the two are one smooth skin and in motion there is a real gap behind the edge. At coarse voxel sizes the test widens by half a cell so thin surfaces never vanish.
- `hull.js`: hollow fuselages. One station list gives the outer loft, the cavity, a one-cell glass skin and a squarish room carved inside it; windows and windshields are real openings at the finest voxel size and dark paint on the solid hull at the coarse ones (ops carry `md` and `mn` limits on the cell size), and a `glass` part marked `hideInCockpit` fills the openings from outside.

The loop for one plane: write the file, run `node build/gen-registry.mjs`, run `node tools/flight-lab.mjs <id>` and tune until the envelope is sane, run `npm run build:all`, then `VIEWS=front34,rear34,side,cockpit,cabin node tools/aircraft-sheet.mjs <id> low` and read the images. The sheet tool can also look around inside a cockpit (`cockpitL`, `cockpitBack`, `cockpitUp`) and put the eye anywhere (`cabin` views).

### 14.5 Weapons

`src/aircraft/munitions.js` lists everything that can be thrown, with the numbers that fly it and the voxel model that hangs on the wing: guns (30 and 20 mm, .50 caliber, a potato), rockets (70 and 127 mm, bottle rockets, plunger rockets), guided missiles (air to ground, air to air, a standoff missile) and bombs (two sizes of general purpose bomb, a cluster canister, a moonshine jug, a propane tank, a lawn dart). An aircraft names a munition in its `weapons` list and may override any number; the stations decide which store parts are drawn, and the mass of what has gone leaves the aircraft one store at a time.

`src/game/weapons.js` is the system. Guns throw bullets that carry the aircraft's velocity; rockets burn and fly on; guided missiles fly to the spot the nose pointed at over the ground when they left; bombs fall, with a predicted impact point drawn on the HUD. Every projectile is stepped in small slices and tested along its path against the terrain and the standing structures, and the first thing it meets is where it goes off. J (or the left mouse button) fires, K cycles the weapon. Bay doors, gun spin-up and muzzle flashes are animation channels (`bay`, `gunSpin`, `muzzle`) so a plane's parts can follow them.

### 14.6 Destruction

`src/world/damage.js` keeps the scars of the flight: every explosion is one entry `{ x, y, z, r, seed }` in a list that is mirrored into every worker. Everything the world draws or collides with is still a pure function of position, now of position and that list, so a node built after a blast, or rebuilt because of one, carves the same crater, bites the same chunk out of the same building and leaves the same trees standing or not, on the main thread and in the workers. The crater is a bowl of 0.72 of the radius with a raised rim; buildings lose everything inside 1.1 of it, and pieces left without support (found by flood fill) fall away; trees and props inside the radius are removed. Ground height and the collision queries follow the list, so a crater really is a hole to fly into.

### 14.7 Effects

`src/game/effects.js` draws fire, smoke, dust, debris and tracers as instanced voxels from one pool of particles: fire is a white to red ramp of emissive cubes that bloom in daylight, smoke is a rounded puff tinted any gray, debris is small tinted cubes under gravity. The particle budget is a quality setting.

## 15. Input and controls

Keyboard, gamepad and mouse flight through an action layer, so bindings are data (`src/input/bindings.js`). Digital keys ramp toward full deflection so keyboard flying feels analog; the throttle is a lever that stays where it was left. Free look with the right mouse button. Camera modes, cycled with X: a far chase (follows the flight path with a lagging heading and stays out of the ground), a close chase tucked in behind the tail so the airplane fills the frame, the cockpit (head motion from load factor, buffet shake; N looks back) and orbit. J or the left mouse button fires and K cycles the weapon; B is the airbrake (on the Hauler it also swings out the stop sign). The map key opens the island map. Rebinding in the UI is not built; the controls screen lists the bindings.

## 16. UI

The look is deliberately not the usual dark-glass-and-gradient game menu. It is an airfield operations board: warm charcoal, paper cream, signal orange, olive drab, hazard stripe dividers, condensed uppercase type and monospace numerals. No gradients, no emoji, no icon library.

Screens: loading, main menu over a live flyover of the island, hangar (category chips for military, private and hillbilly aircraft above the aircraft cards, with the weapon systems listed on the selected card; aircraft cards with bars for speed, climb, roll, short field and handling worked out from the flight model and a top and side blueprint rasterized from the real model at one scale for all aircraft; an Airfield tab with a north-up chart of the airfield and its starts grouped by runway, ramp, gate and hangar; a Briefing tab with runway data, wind components, a runway-needed bar and reference speeds; a Conditions tab with time of day, wind presets relative to the runway, cloud, airborne start and challenge; the chosen aircraft stands on the chosen start between the panels and can be orbited, zoomed and set to front, side, rear and top views; keyboard navigation and a remembered selection), settings (generated from the schema, tabs by group), pause, controls, island map (hill-shaded terrain, highways, sites, your aircraft), crash screen, HUD and a performance overlay on F3.

## 17. Testing

`npm test` runs 250 tests in about twenty seconds:

- Core: RNG and noise determinism, quaternion and matrix identities, attitude round trips.
- Voxel: palette invariants, mesher face counts and culling, vertex layout, recipe rasterization counts, lattice alignment, rotation and yaw, detail gating, thin ops, paint, loft membership, material remaps.
- World: lit streets glow only on coarse avenues, streets and highways; every region lays out with known kits and inside its bounds, deterministic terrain, a mountain of the right height, all three start areas on land with flat runways (the strip smooth but sloping), a connected road graph, no building on a highway, LOD configuration, deterministic node builds.
- Settings and input: presets, schema coverage, sanitizing, persistence and corrupt storage, governor behavior, hardware probe, key ramps, throttle lever, edge presses.
- Aircraft: every part builds at every LOD, dimensions match the specification, the exterior extent agrees with the wing span, liveries resolve, every weapon names real stations and a known munition and every station has a store part, validation rejects broken specs.
- Every aircraft: trims at a cruise speed, holds it hands off for thirty seconds, takes off on a runway and lands softly, and the roster has enough military, private and hillbilly aircraft and enough armed ones.
- Weapons and damage: loadouts and cycling, gun streams and rockets landing where the nose pointed, guided missiles flying to the designated ground point, bomb impact prediction, cluster bombs, stores leaving the airframe and its mass, craters, collapsed buildings, felled trees, blast list mirroring and deterministic node rebuilds.
- Flight regression: trimmed hands-off flight, control signs, stall speed and recovery, takeoff roll bounds, rest attitudes, soft and hard landings, fly-by-wire limits, structural failure, determinism, trim saturation.
- Traffic: vehicle modules, no NaN or overlap, culling and respawn, signal phases, red light compliance, signal masts follow the phase and vanish with traffic off.
- Render: the atmosphere gives a blue noon sky with a pale horizon and an orange sunset side, never negative or non-finite, black at night; sun transmittance reddens and dims monotonically; moonlight is a sliver of daylight; the cinematic grade keeps blacks dark.
- Landscape: ground normals on a ramp, a plane and a pit; land nodes carry a normal texture and ocean tiles do not; the canopy texture is deterministic and covers its tile; tree parts by level of detail; forests are shared parts up to the tree levels and nothing beyond; flowers, herds, reeds and driftwood appear where they belong; massif heights, lakes and no inland ponds; the cached macro fields agree with the exact ones and never change the world between threads; farmsteads sit on farmland with a house and a barn; bird flocks clear the ground and the rooftops and cycle their wing beat.
- Takeoff: reference speed ordering, wind components, runway frames, the automatic takeoff on pavement and grass for every aircraft (airborne, on the line, in the expected distance range), the effect of wind, slope, altitude and crosswind on the run, refusal and abort on a short runway, phase tracking in guidance mode, verdict grading, card bars and silhouettes.
- Assist and hangar: runway data on every start, runway lookup in both directions, automatic takeoffs from every long runway with all aircraft (gear, flaps, handover trim, callouts), crosswind and headwind, the farm strip (the bush plane flies out, the jet and the trainer are refused), takeover by the player, briefing against the real takeoff, chart data and drawing for all three airfields, marker picking, the setting and its key, and the farm clearing (no natural trees inside it, woods around it).
- Build: registry covers every content file, the output is one self-contained file under budget, no em dashes anywhere.

`npm run test:browser` boots the built file in headless Chromium and walks menu, hangar (tabs, chart, briefing, keyboard), takeoff (intro camera, runway guidance), throttle, pause, settings, map, F3 overlay, a forced crash and a restart, failing on any console error.

## 18. Performance policy

- Main thread work per frame is bounded and measured. Node builds never run on it unless workers are unavailable.
- Every allocation on the hot path is reused. Typed arrays are transferred, not copied.
- The renderer reports draw calls, triangles and GPU bytes so regressions are visible (F3).
- A change that slows Potato to fix Ultra is rejected.
- `node tools/budget.mjs all high` is the fair A/B for geometry: it selects the nodes the game would select, builds them in-process and totals triangles, draws and build time over eight views. Compare before and after; a rise in terrain triangles is a red flag (color banks broke greedy merging once, so they are limited to fine cells).

## 19. Hard truths and risks

- Nothing here has been measured on a real GPU. Everything ran on software WebGL in a headless browser, which proves the pipeline works and says nothing about frame rate. The Potato path and the HDR path both render; whether they hold 60 fps on the target hardware is unknown until someone tries.
- The engine is the easy half. A metropolis with real architectural quality is a huge content job, and it belongs to later work. This stage makes sure it can be done without touching the engine.
- Voxel LOD pops. Skirts hide cracks, but level changes at a distance still pop by up to one coarse cell. Hysteresis and fog reduce it; nothing removes it entirely.
- Signal masts are drawn as individual model entries (up to 64 within 300 m), one per approach direction. In a dense downtown at low altitude the frame reaches about two thousand draw calls at Medium, mostly terrain nodes and scenery buckets, which is fine for a desktop GPU and something to merge later.
- Collision with buildings uses oriented boxes around each structure and the aircraft's extreme points. It is honest at flying speed and wrong for a wing slipping between two towers.
- The flight model is a tuned engineering approximation, not a certified one. Each aircraft has numbers checked against its design (stall speed, climb, takeoff roll, roll rate, G limit), but nothing was compared against a real airframe.
- Pure JavaScript meshing is fast enough only because the world is streamed in small nodes in workers. Keep nodes small.
- Single-file distribution costs startup time. The file is 510 KB, but the first terrain ring still has to be generated.
- Very old mobile GPUs may fail on WebGL2 features. Potato is a floor, not a promise for every device.
- Audio is not started. Do not assume it is close.
- Weapon effects are tuned by eye on software WebGL. Blast radii, crater sizes and the particle budget have not been balanced on a real GPU, and a very long fight against dense city blocks will cost node rebuild time in the workers.
- Cabins and cockpits are cut out of the hull at the finest voxel size only. Far away the windows are dark paint on a solid hull, which is the right trade, but it means the interior is never visible from outside.
