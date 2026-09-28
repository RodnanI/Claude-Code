# FLY HIGH: Master Plan

Working title: **Fly High**. A voxel flight simulator on a single large island, shipped as one standalone HTML file.

This document is the source of truth. If code and this file disagree, one of them is a bug. It is written in plain sections, not numbered phases, because the foundation is one indivisible thing: the engine, the map and the module contracts have to be right together or none of it is worth building on.

---

## 1. Non-negotiables

- Output is a single standalone `dist/fly-high.html`. No network requests at runtime, no external assets, no CDN, no fonts. Everything is inlined by the build.
- Everything visible is voxels: terrain, buildings, roads, trees, vehicles, aircraft, cockpits. "Voxel" does not mean low detail. Detail comes from small voxels near the viewer, and the world is procedural so small voxels are affordable.
- Scales from potato to beyond ultra with the same content. Detail follows screen coverage, not a global toggle. Slow machines see the same island with chunkier voxels and a shorter horizon.
- Modular by file. One plane per file. One town per file. One city per file. The metropolis is many files. One scenery type per file. One vehicle per file. Adding content never means editing a central list; a build step discovers files by suffix.
- Deterministic world. Same seed gives the same island on every machine and in every worker.
- The foundation is judged on structure and correctness, not on how much content exists. Region files in this stage are functional and honest but not final art.

## 2. Status board

Built in the foundation stage:

- Build pipeline: registry discovery, esbuild bundle, worker inlining, single-file output, dev server.
- Core: math, seeded RNG, noise, events, perf counters.
- Voxel toolkit: palette, dense volumes, resolution-independent recipes, greedy mesher with ambient occlusion.
- WebGL2 renderer: camera-relative rendering, split-depth passes, sky, fog, water shading, cascaded shadows, instanced scenery, aircraft draw path.
- Smart LOD: screen-space-error quadtree, worker pool, streaming, eviction, adaptive governor.
- Whole island: terrain, coast, mountain, rivers, lake, highway network, all settlements as separate region files, three start areas.
- Scenery scatter with LOD models.
- Aircraft module contract, flight model, three reference aircraft with cockpits.
- Traffic network, signals, car-following simulation, instanced vehicles.
- Settings: schema, presets from Potato to Overkill, persistence, hardware probe, auto governor, full UI.
- Menus, HUD, debug overlay, map.
- Tests: unit, world validation, flight regression, build check, browser smoke.

Stubbed on purpose (contracts exist, content does not):

- Weapons: hardpoint specs exist on planes, firing and damage do not.
- Audio.
- AI aircraft, missions, weather beyond cloud cover, multiplayer.

Later, in rough dependency order rather than numbered stages:

- Deepen the metropolis district by district (hero towers, signage, rooftops, bridges).
- Real interiors for every aircraft, animated gauges made of voxels.
- Weapons, damage, ballistics, targets.
- More aircraft: airliner, transport, seaplane, aerobatic biplane, attack jet, business jet, glider.
- Audio, dynamic weather, night lighting pass, AI traffic in the air.

## 3. Coordinates, units, scales

- Units are meters, seconds, kilograms, radians internally. UI can show aviation units.
- World axes: **+X east, +Y up, +Z south**. Right-handed. Heading 0 is north (-Z), heading 90 is east.
- Aircraft body axes: +X forward, +Y up, +Z right wing. Positive roll is right wing down, positive pitch is nose up, positive yaw is nose left (right-hand rule about +Y).
- Sea level is Y = 0. World is a 65,536 m square centered on the origin. The island occupies roughly the middle 30 km by 24 km.
- The world is never stored. Height, surface, buildings and scatter are pure functions of position and seed, evaluated on demand in workers.
- Voxel sizes by content:

| Content | Voxel size | Notes |
|---|---|---|
| Terrain and structures near the camera | 0.25 to 4 m | Set by the quality tier, doubles per LOD level |
| Aircraft exterior | 0.10 to 0.20 m | Per aircraft, lower LODs re-rasterize coarser |
| Cockpit interiors | 0.03 to 0.06 m | Small volumes, so fine voxels are cheap |
| Vehicles | 0.25 m | Instanced, LOD by re-rasterizing |
| Trees and props | equals node cell size | Instanced, so LOD matches surrounding terrain |

## 4. Repository layout

```
sonnet 5.5 flight sim/
  PLAN.md  README.md  package.json
  build/            build.mjs  gen-registry.mjs  dev-server.mjs
  tools/            map-preview.mjs (top-down PNG of the island)  png.mjs
  src/
    index.html  styles/  main.js
    generated/      registry.js   (written by gen-registry, committed)
    core/           math rng noise util events perf
    settings/       schema presets store probe governor
    voxel/          palette volume recipe mesher model
    render/         gl program camera frustum renderer sky shadows shaders/
    lod/            lod-config quadtree node-manager
    workers/        pool.js world.worker.js build-node.js
    world/
      config.js  layout.js  index.js  spatial.js
      terrain/      island height surface hydrology
      roads/        paint network highways
      scatter/      scatter.js
      kits/         *.kit.js       building and prop generators
      scenery/      *.scenery.js   trees, rocks, props (instanced)
      regions/
        metropolis/meridian/*.region.js
        cities/*.region.js
        towns/*.region.js
        airfields/*.region.js
        features/*.region.js
    aircraft/
      base.js  flight/  builders/
      planes/       *.plane.js     one file per plane
    traffic/        network.js sim.js signals.js  vehicles/*.vehicle.js
    input/          keyboard gamepad mouse actions
    ui/             menu settings-panel hud loading overlay map dom
    game/           game.js camera-rig.js start-areas.js
  tests/            unit/ browser/
  dist/             fly-high.html
```

File suffixes drive discovery: `*.plane.js`, `*.region.js`, `*.scenery.js`, `*.vehicle.js`, `*.kit.js`. `gen-registry.mjs` scans for them and writes `src/generated/registry.js`. Drop a file in, rebuild, it exists.

## 5. Build and packaging

- `npm run gen` regenerates the registry.
- `npm run build` runs gen, bundles `src/main.js` and `src/workers/world.worker.js` with esbuild as IIFE bundles, minifies, then writes one HTML file: CSS in a style tag, the worker source in an inert `<script type="text/plain" id="fh-worker-src">`, the main bundle in a module-free script. Workers start from a Blob URL built from that text.
- `npm run dev` serves `src/` unbundled with native ES modules and module workers for fast iteration.
- `npm test` runs `node --test`. No test dependency.
- `npm run test:browser` drives headless Chromium (Playwright) against the built file. Optional, skipped if Playwright is absent.
- The build fails if the output contains an external URL fetch, if a banned character shows up in a source file, or if the output exceeds the size budget.

## 6. Rendering

WebGL2 only, written directly. No engine dependency, because the vertex format, the LOD and the culling are the product.

### 6.1 Vertex format (12 bytes)

`i16 x, y, z, face` followed by `u8 r, g, b, a`. Positions are integer cell coordinates local to the node. `face` is 0..5 for +X -X +Y -Y +Z -Z, so normals cost nothing. `a` holds 2 bits of ambient occlusion and 6 material flags: emissive, glossy, water, foliage, flat (no variation), tint (instance color applies).

Per-voxel color variation, voxel edge bevels and macro color drift are computed in the fragment shader from the voxel index. That is what lets the mesher merge giant flat quads while the surface still reads as individual voxels.

### 6.2 Camera-relative rendering

Every node origin is subtracted from the camera position in double precision on the CPU and uploaded as a float uniform. Nothing on the GPU ever sees a large world coordinate. Result: no jitter at 30 km from the origin.

### 6.3 Depth precision: split-depth passes

One 24-bit depth buffer cannot cover 0.25 m to 60 km. The frame is drawn as a far pass (about 1.2 km to the view distance), a depth clear, then a near pass (0.25 m to 1.5 km), then a cockpit pass with its own tight frustum. Nodes straddling the split are drawn in both. There is no logarithmic depth and no per-fragment depth writes, so early-z stays on.

### 6.4 Shading

- Sun: Lambert with cascaded shadow maps (tiers with shadows), hemisphere ambient, baked vertex AO.
- Fog: exponential with height falloff and forward scattering toward the sun. Fog end is tied to the view distance, so culled distance is never visible.
- Water is a terrain material, not a separate plane. Ocean columns merge into a few huge quads. The fragment shader adds animated wave normals, Fresnel against the analytic sky, and sun glint. Depth color is banded by materials.
- Sky: analytic gradient, sun disc and glow, stars, and cloud layers ray-plane sampled with fBm. Cheap tiers use one layer and few octaves.
- Emissive voxels (windows, lamps, runway lights) respond to a night factor with per-window variation.
- Time of day drives every color through keyframed palettes.

### 6.5 Draw budget

Terrain and structures share the node draw path: one or two draws per node. Scenery is instanced per node per model bucket. Vehicles are instanced per type. Aircraft are a handful of part draws. Nodes are frustum culled and drawn front to back.

## 7. Smart LOD and streaming

### 7.1 The node grid

The world is a quadtree of square nodes. Every node, at every level, is 64 by 64 cells.

```
cell(level)  = baseVoxel * 2^level
nodeSize     = 64 * cell(level)
```

With baseVoxel = 0.5 m: level 0 is a 32 m node of 0.5 m voxels, level 6 is a 2 km node of 32 m voxels, level 10 is the whole world in four nodes. `baseVoxel` is the main quality dial: it shifts the entire pyramid.

### 7.2 The only LOD rule

Split a node when its cell would cover more than `lodErrorPx` pixels on screen:

```
cellPixels = cell(level) * projectionScale / distanceToNodeBounds
split if cellPixels > lodErrorPx
```

Everything follows from this one rule: closer means smaller voxels, higher resolution scale means finer detail, wide FOV coarsens, and altitude coarsens the ground below you. No hand-tuned distance tables.

### 7.3 Node contents

A node is built entirely in a worker and returned as transferable buffers:

- Terrain: heightfield voxel columns, greedy-merged top faces, merged walls, and skirts to hide LOD cracks.
- Structures: recipes of every structure anchored in the node, rasterized at that node's cell size and greedy meshed in 3D. Structures too small to matter at that cell size are dropped. Coarse levels use conservative rasterization so skylines survive.
- Scenery: instance lists (position, yaw, scale, tint) per model bucket. Scatter density and model LOD follow the level; beyond a quality-set level the forest is carried by terrain color alone.
- Bounds: tight min/max, used for culling and distance.

### 7.4 Hole-free refinement

A node is only replaced by finer nodes when the finer nodes are ready. Missing data falls back to the nearest ready ancestor, and any drawn descendants covered by a drawn ancestor are dropped. The coarse chain is kept alive by touching ancestors every frame, so turning around quickly never shows holes.

### 7.5 Scheduling

- The main thread only selects, prioritizes, uploads and draws. All generation and meshing is in workers.
- Requests are prioritized by how far a node is above its error threshold, then by distance, with a fattened frustum so nodes just off screen are prefetched.
- GPU uploads are time-sliced per frame. Eviction is LRU under a per-tier GPU byte budget.
- If workers are unavailable the same code runs on the main thread in budgeted slices.

### 7.6 Adaptive governor

In Auto mode a frame-time governor nudges `lodErrorPx`, resolution scale and view distance to hold the target frame rate, with hysteresis so it does not oscillate. A hardware probe (GPU string, cores, memory, screen, touch) picks the starting tier.

## 8. Quality tiers and settings

| Setting | Potato | Low | Medium | High | Ultra | Overkill |
|---|---|---|---|---|---|---|
| Base voxel (m) | 4 | 2 | 1 | 0.5 | 0.5 | 0.25 |
| View distance (km) | 6 | 10 | 16 | 24 | 36 | 60 |
| LOD error (px) | 10 | 6 | 4 | 3 | 2 | 1.25 |
| Resolution scale | 0.6 | 0.75 | 0.9 | 1.0 | 1.0 | 1.25 |
| Shadow cascades | 0 | 0 | 1 | 2 | 3 | 4 |
| Shadow map size | - | - | 1024 | 2048 | 2048 | 4096 |
| MSAA | off | off | off | 2x | 4x | 8x |
| Water | flat | flat | simple | waves | waves | waves |
| Clouds | off | one layer | one layer | two layers | two layers | full |
| Scenery range (m) | off | 250 | 600 | 1200 | 2400 | 5000 |
| Traffic (vehicles) | 0 | 10 | 30 | 70 | 140 | 260 |
| Voxel edges | off | off | 0.35 | 0.6 | 1.0 | 1.0 |
| Workers | 1 | 2 | 3 | 4 | 6 | 8 |
| GPU budget (MB) | 96 | 192 | 384 | 768 | 1536 | 3072 |

Every value is an individual setting that can be overridden; the preset becomes "Custom" when they diverge. Settings live in `src/settings/schema.js` with a type, range, group, and an apply mode (`live`, `rebuild` to flush LOD nodes, or `reload` for context-level options such as MSAA). Persistence is localStorage behind try/catch, versioned, with JSON import and export. Additional settings: FOV, field-of-view lock in cockpit, frame cap, time of day and its speed, control sensitivity, inversion, units, HUD scale, debug overlay.

## 9. The island

A single island, roughly 30 by 24 km, built from land blobs, bays and coastal noise, so the coast is authored where it matters and organic elsewhere.

| Site | Kind | Approx. position (x east, z south) |
|---|---|---|
| Meridian | Metropolis | 4200, -5200 |
| Port Halden | Big city, harbor | 5800, 7600 |
| Ironford | Big city, industrial | -6400, -5600 |
| Dunmore | Town, fishing | -1500, -8600 |
| Pinecrest | Town, lakeside forest | -9800, -1200 |
| Saltmarsh | Town, beach | 11800, 6200 |
| Cutbank | Town, farmland | 1800, 600 |
| Meridian International | Start area: airport | 10200, -1800 |
| Fort Talon Air Base | Start area: military | -10800, 5200 |
| Hollerin' Hollow Strip | Start area: hillbilly runway | -800, 3400 |
| Mount Corvus | Mountain, peak about 1560 m | -5200, 2200 |

Positions are tuned against `tools/map-preview.mjs` output, and the master table is `src/world/layout.js`. Nothing else hard-codes a site position.

### 9.1 Terrain

Natural height is: island mask with domain warp, beach ramp, rolling hills, a ridged-noise mountain, and river and lake carving. Then region-declared modifiers are applied: circular and oriented-rectangle flatten zones with blend distance and optional planar tilt (runways, city pads, the bumpy hillbilly strip). Octaves finer than the requested cell size are skipped, which is both a speed win and an anti-aliasing measure.

Surface material is chosen in priority order: airfield paint, road paint, region lot paint, water, then biome (beach, grass variants, forest floor, farmland fields, rock by slope, snow by altitude and noise). At coarse cell sizes settlements paint an aggregate district tint so a metropolis still reads as a city from 20 km away.

Water is baked into the terrain function: ocean at Y = 0, rivers and lakes at their own levels, all emitted as water-material columns.

### 9.2 Roads

- Every region can emit road segments. Segments are painted into the surface function through a spatial grid, with lane markings and sidewalks at fine cell sizes.
- A highway generator connects settlements with A* on a coarse cost grid (slope and water penalties), smooths the paths, and emits them as road segments.
- Airfields paint runways, taxiways, aprons and numerals directly from geometry.

### 9.3 The three start areas

- **Meridian International Airport**: two parallel runways with markings and lights, taxiways, terminal with gates, control tower, hangars, cargo sheds, fuel farm, parking.
- **Fort Talon Air Base**: long runway on a flattened plateau, hardened aircraft shelters, hangars, tower, radar dome, barracks, fuel farm, perimeter fence, SAM sites.
- **Hollerin' Hollow Strip**: a short mowed strip on rolling ground with a deliberate bump, tire-lined edges, a patchwork tin barn hangar, a pallet control tower with a lawn chair, a jeans windsock, a trailer, a junk pile, drums, hay bales, a clothesline.

## 10. Region file contract

A region is one file exporting `defineRegion({...})`:

```js
export default defineRegion({
  id: 'town/dunmore',
  name: 'Dunmore',
  kind: 'town',                    // metropolis-district | city | town | airfield | feature
  bounds: [x0, z0, x1, z1],        // meters, world space
  maxHeight: 40,                   // tallest structure above ground, for culling
  terrain: (h) => ({ flatten: [ ... ], carve: [ ... ] }),
  layout: (ctx) => ({ structures, roads, props, lots }),   // lazy, deterministic
  paint: (x, z, ctx) => materialId | 0,                    // hot path, keep it cheap
  spawns: [ { id, name, x, z, heading } ],                 // airfields only
});
```

Rules: `layout` is pure and seeded through `ctx.rng(label)`. `paint` runs per column and may only do cheap rectangle and grid lookups. Structures are descriptors of a kit and its parameters, never voxel data. A region file never imports another region file.

Metropolis Meridian is one lattice of streets shared by many district files so roads connect across files: downtown, financial, midtown, old town, harbor, residential, industrial, landmarks, and a highways and bridges file. Cities and towns are one file each.

## 11. Architecture and kits

Kits (`*.kit.js`) turn parameters into recipes. A recipe is an ordered list of shape ops in meters that can be rasterized at any voxel size:

- Ops: box, ellipsoid, tapered cylinder, gable and hip roofs, wedge, loft along an axis, airfoil wing, noisy blob, facade pattern, stamp.
- Each op may carry `maxVoxel`; it is skipped when the voxel is larger. Fine details (mullions, balconies, antennas, AC units) therefore appear only when the voxels are small enough to carry them.
- Facade ops generate floors, window bays, spandrels and mullions from parameters, with per-window lit variation for night. A coarse blend material is used when the voxel is larger than a window.

Architectural principles that kits must follow:

- Proportion first: base, shaft, crown for towers; a real setback logic rather than stacked boxes.
- Material palettes per district so neighborhoods read differently from the air.
- Roofs are never flat by accident: mechanical penthouses, water tanks, antennas, helipads, gables, hips, chimneys.
- Seeds change massing, materials, and details, so no two blocks match.
- Everything grounds itself: foundations extend below the pad so terrain steps never show gaps.

## 12. Scenery

Scenery types are one file each and declare a recipe per variant plus biome rules (which biome, density, slope and altitude limits). The scatter system uses those rules; adding a new tree means adding a file. Instances carry position, yaw, scale and a tint so one model yields many looks. Model LOD is the node's cell size, so trees stay consistent with the terrain around them.

## 13. Roads and traffic

- Road segments become a directed lane graph (right-hand traffic).
- Signals: two-phase with all-red clearance at intersections with three or more legs. Unsignalized nodes use an occupancy lock.
- Vehicles follow the Intelligent Driver Model for car-following with lookahead across edges, stop lines at red, and random turns at nodes.
- Spawning and despawning happen around the player within a tier-set radius. Nothing is simulated far away.
- Vehicles are `*.vehicle.js` recipes rasterized at LOD voxel sizes and drawn instanced, with a paint tint per instance.

## 14. Aircraft

One file per plane, exporting `defineAircraft({...})`:

```js
export default defineAircraft({
  id, name, manufacturer, role, description,
  mass: { empty, fuel, maxTakeoff },
  inertia: [Ixx, Iyy, Izz],
  wing: { area, span, chord },
  aero: { CL0, CLa, CLmax, alphaStall, CD0, k, Cm0, Cma, Cmq, Clb, Clp, Cnb, Cnr, control: {...} },
  propulsion: { type, engines: [ ... ] },
  gear: { wheels: [ ... ] },
  hardpoints: [ ... ],
  cameras: { cockpit, chase },
  model: (b) => parts,             // exterior recipes as named parts with pivots
  interior: (b) => parts,          // optional, fine voxel size
  animations: [ { part, axis, channel, gain } ],
});
```

- Parts are recipes with pivots. Animation channels (`aileron`, `elevator`, `rudder`, `flap`, `gear`, `propAngle`, `throttle`, ...) drive part transforms.
- Model LODs come from re-rasterizing at coarser voxel sizes.
- Builder helpers cover lofted fuselages, airfoil wings, tail surfaces, gear legs, propellers, jet nozzles, canopies, seats, yokes and sticks, and panels.

### 14.1 Flight model

Six degrees of freedom, fixed step at 240 Hz with an accumulator. Quaternion orientation, body-frame inertia. Air density from ISA. Wind and gusts. Lift with a smooth stall model, induced and parasitic drag, sideslip force, control and damping moments. Propeller thrust from power and airspeed; jet thrust with density lapse and afterburner. Wheels are spring-damper contacts against the terrain function with rolling resistance, brakes, cornering friction and nose-wheel steering. Trim solvers exist so tests and airborne starts are stable.

### 14.2 Reference roster in this stage

- **Skylark SK-172**: light trainer. Docile, forgiving, short-field capable. Full interior.
- **Shrike F-12**: single-engine fighter with afterburner, high roll rate, bubble canopy, hardpoints defined.
- **Scrapper JR-1**: homebuilt bush plane for the hillbilly strip. Taildragger, patchwork skin, absurd short-field performance, open cockpit.

## 15. Input and controls

Keyboard, gamepad and mouse-flight through an action layer, so bindings are data. Controller dead zones and response curves are settings. Camera modes: chase, cockpit with head look, and an orbit camera. The map key opens the island map.

## 16. UI

The look is deliberately not the usual dark-glass-and-gradient game menu. It is an airfield operations board: warm charcoal, paper cream, signal orange, olive drab, hazard stripe dividers, cut corners, condensed uppercase type and monospace numerals. No gradients anywhere in the UI, no emoji, no icons pulled from a library.

Screens: loading, start-area and aircraft selection over a live flyover of the chosen site, settings (auto-generated from the schema), pause, HUD, map, debug overlay (frame time, draw calls, triangles, nodes, queue, memory).

## 17. Testing

- Unit: RNG and noise determinism, math, mesher correctness on known shapes, recipe rasterization, LOD math, settings schema and presets, persistence.
- World validation: every region loads and lays out, structures stay inside declared bounds, sites do not overlap, runways are flat within tolerance, all three start areas sit on land above sea level, roads connect, the mountain reaches its peak, the island is land at anchors and water beyond.
- Flight regression: each aircraft trims and holds level flight, stalls where it should, rolls in the right direction, takes off within a distance bound, and survives a landing without exploding.
- Traffic: safe gaps, no overlap, signals cycle.
- Build: output exists, is self-contained, and is under budget.
- Browser smoke: loads the built file, reaches ready state, renders each preset from each start area, and fails on console errors.

## 18. Performance policy

- Main thread work per frame is bounded and measured. Node builds never run on it unless workers are unavailable.
- Every allocation on the hot path is reused. Typed arrays are transferred, not copied.
- The renderer reports draw calls, triangles and GPU bytes so regressions are visible.
- A change that slows Potato to fix Ultra is rejected.

## 19. Hard truths and risks

- The engine is the easy half. A metropolis with real architectural quality is a huge content job, and it belongs to later work. This stage makes sure it can be done without touching the engine.
- Voxel LOD pops. Skirts hide cracks, but level changes at a distance still pop by up to one coarse cell. Hysteresis and fog reduce it; nothing removes it entirely.
- Pure JavaScript meshing is fast enough only because the world is streamed in small nodes in workers. Keep nodes small.
- Single-file distribution costs startup time. Bundle size is watched.
- Software WebGL in CI tells us the renderer works, not that it is fast. Real GPUs are still the only performance truth.
- Very old mobile GPUs may fail on WebGL2 features. Potato is a floor, not a promise for every device.
- Weapons and audio are not started. Do not assume they are close.
