# Fly High

A voxel flight simulator on one island: a metropolis, two cities, four towns, a mountain, three places to start (an international airport, a military air base and a hillbilly strip) and three aircraft that could not be more different. Everything you see is voxels, from the terrain to the needles in the cockpit gauges. The finished game is one HTML file with no network access.

`PLAN.md` explains the design and the reasons. This file is about working in the repository.

## Run it

```
npm install          # esbuild only
npm run build        # writes dist/fly-high.html, about 650 KB
```

Open `dist/fly-high.html` in a current Chrome, Edge or Firefox with WebGL 2. Nothing else is needed and nothing is fetched.

For development, `npm run dev` serves `src/` with native modules on http://localhost:5173. Two inspection pages live beside the game: `/?entry=test-scenes/aircraft.js&plane=shrike&view=cockpit` shows one aircraft on a runway, and `/?entry=test-scenes/viewer.js` is a free camera over the island.

## Flying

| Key | Action |
|---|---|
| W / S | Nose down / nose up |
| A / D | Roll left / right |
| Q / E | Rudder |
| Shift / Ctrl | Throttle up / down (a lever, it stays where you leave it) |
| 9 / 1 | Full throttle / idle |
| Space | Wheel brakes |
| F / V | Flaps extend / retract |
| G | Landing gear |
| B | Airbrake |
| X | Camera: chase, cockpit, orbit |
| Right mouse drag | Look around |
| M | Island map |
| H | Toggle HUD |
| R | Restart the flight |
| Esc or P | Pause |
| F3 | Performance overlay |
| F12 | Screenshot |

A gamepad works too (sticks, triggers for throttle, face buttons for brakes, gear and flaps). The full list is under Controls in the menu.

Settings, World, Challenge switches on the Skyline run: a ring beside the crown of each of the tallest towers in Meridian, flown in order, with a timer and a pointer to the next gate.

## Test it

```
npm test                 # 121 unit tests, about fifteen seconds, no dependencies
npm run test:browser     # builds, then drives headless Chromium through menu, takeoff, pause, settings, map and a crash
PRESET=potato npm run test:browser
```

The browser test needs Playwright to be installed globally or locally; it skips itself if it cannot find it. It uses software WebGL, so it proves the game runs and says nothing about speed.

Handy tools (the aircraft sheet renders `dist/test-aircraft.html`, so run `npm run build:all` after changing a plane):

```
node tools/flight-shot.mjs out/a.png ultra shrike airport-09R cockpit 10.5 1 600   # screenshot of a flight
node tools/aircraft-sheet.mjs skylark low                                          # front, rear, side, top and cockpit views
node tools/map-preview.mjs out/map.png 1024 17000                                  # top-down PNG of the island
node tools/kit-shot.mjs out/k.png '[["skyscraper",{"w":44,"d":44,"h":260,"seed":1}]]' el=12 dist=420   # kits on a flat pad (needs build:all)
node tools/ambient-shot.mjs out/s.png cargo-ship medium 14 260 14 40 0 0           # a ship, boat or airliner from a chosen offset
node tools/bench.mjs dist/fly-high.html high 4300 -7300 250 0 60                    # CPU frame cost, for A/B between two builds
node tools/hero-shot.mjs out/h.png high shrike 15.5 -8800 3400 900 75              # aircraft placed anywhere: preset plane hour x z agl heading
node tools/budget.mjs all high                                                     # triangles, draws and node build time over eight standard views, no GPU needed
node tools/tour.mjs out/tour high forest,farmland,cliffs 1280 720                  # named camera views of the landscape in one browser session (needs: node build/build.mjs --entry viewer)
OVR='{"exposureBias":0.4}' FRAMES=60 node tools/hero-shot.mjs ...                  # setting overrides, frames to let exposure and TAA settle
```

## Layout

```
build/        build.mjs (single-file bundler), gen-registry.mjs, dev-server.mjs
src/core/     math, rng, noise, events, perf
src/voxel/    palette, volumes, recipes (resolution independent shapes), greedy mesher
src/render/   WebGL2 renderer, atmosphere, clouds, post chain, shaders
src/lod/      screen-space-error quadtree, streaming, terrain mesher
src/workers/  node builder and worker pool
src/world/    the island: terrain, roads, scatter, kits, scenery, regions
src/aircraft/ contract, flight model, planes (one file each)
src/traffic/  road graph, simulation, vehicles (one file per family), ambient ships and airliner
src/game/     game loop, cameras, HUD, collision
src/input/    bindings and input
src/ui/       menu, hangar, settings, map
src/settings/ schema, presets, store, probe, governor
tests/        unit and browser tests
```

## Adding content

Every kind of content is one file found by its suffix. After adding a file run `npm run gen` (the build and the tests do it for you).

**An aircraft**: create `src/aircraft/planes/name.plane.js` that exports `defineAircraft({...})`. Copy `skylark.plane.js` as a starting point. The definition holds the numbers (mass, inertia, wing, aerodynamics, engine, gear), the exterior as named parts, an optional cockpit at much finer voxels, animations that bind parts to flight channels, and optional weapon stations and liveries. `defineAircraft` rejects impossible numbers, and `tests/unit/aircraft.test.mjs` and `tests/unit/flight.test.mjs` cover every registered aircraft automatically: parts must build at every LOD, dimensions must match the specification, and the plane must trim, stall, take off and land.

**A town or city**: create `src/world/regions/towns/name.region.js`. Most towns are a few lines around `settlement({...})` from `_shared/settlement.js`; add its site to `src/world/layout.js`. The world tests check that it lays out inside its bounds with known kits.

**An airfield**: a region with `spawns` and an `info` block. Its start areas appear in the hangar screen on their own.

**A building type or prop**: `src/world/kits/name.kit.js` exports `defineKit({ id, build(desc, recipe, rng, ctx) })`. Recipes are lists of shape operations in meters, so the same kit produces a 4 m voxel skyline and a 25 cm facade with window frames.

**A skyscraper or facade**: tower kits live in `skyline.kit.js` and build on the helpers in `_tower.js` (floor grid, setbacks, crowns). A wall material with a window pattern is a `FACADE_DEFS` entry in `src/voxel/palette.js`: bay width, floor height, window size, glass tint, lit share at night. The shader draws it, so the kit only places the wall. Keep floors at 3.6 m and bays at multiples of 1.2 m (a test checks).

**Ships, aircraft and birds that move by themselves**: `src/traffic/ambient/name.ambient.js` exports `defineAmbient({...})`: a model per variant and a path that is a pure function of a clock, so it costs nothing to store. See `ships.ambient.js` and the airport circuit in `aircraft.ambient.js`. Flocks of gulls, crows and geese (`bird.ambient.js`) are one mesh per flock, with the wing beat in the low bits of the variant.

**A tree, rock, animal or lamp**: `src/world/scenery/name.scenery.js` with `defineScenery`. Rules say where it grows. A model either has a `build` (one recipe per variant) or an `expand(emit, t)` that places parts: a tree is a trunk plus a few crowns from the shared `puff`, `puffb` and `cone` models, so a forest costs a handful of draws (see `src/world/scatter/trees.js`). Animals (`cow`, `sheep`, `horse`, `deer`) and small ground cover (`flowers`, `reeds`, `lily`, `log`, `boulder`) follow the same rules, and `rules.noShadow` and `rules.maxDist` keep small things out of the shadow pass and away from far batches. The layers that place them (canopy trees, understory, flowers, hedgerows, herds, reeds, driftwood) are in `src/world/scatter/scatter.js`.

**A vehicle**: `src/traffic/vehicles/name.vehicle.js` exports `defineVehicle({...})` or an array of them. The traffic system picks it up and uses it on the road kinds it lists.

## Conventions

- Units are meters, seconds, kilograms and radians. World axes are +X east, +Y up, +Z south. Aircraft body axes are +X forward, +Y up, +Z right, with the origin at the center of gravity.
- The world is pure functions of position and seed. Anything that runs in a worker must not touch the DOM, and anything random must go through the seeded RNG.
- No em dashes in any file (a test checks), no gradients in the UI, and no framework.
- Do not edit `src/generated/registry.js` by hand.
