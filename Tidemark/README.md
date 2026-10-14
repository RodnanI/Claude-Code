# Tidemark

A miniature isometric harbour town that has to work. Open `TIDEMARK.html` in a current browser (desktop or phone). It is a single standalone file with no dependencies; the Google Fonts link is optional and falls back to system fonts offline.

The title screen runs the finished town underneath the menu. Pick a campaign chapter, free play, a seeded sandbox, the diagnostic scenario or the bridge stress test. "Just watch" (or `H` in game) hides the interface and lets the camera drift between landmarks.

## Controls

| | Mouse / keyboard | Touch |
|---|---|---|
| Pan | drag (Inspect tool), right or middle drag, arrows / WASD | one finger drag (Inspect tool) |
| Zoom | wheel, `+` `-` | pinch |
| Inspect | click a vehicle, building, lock or tile | tap |
| Roads, rail, canals, power lines | drag a line (L-shaped) | drag |
| Buildings | Build, pick a card, click to place, `R` rotates | tap to position, then Build in the confirm bar |
| Clear | click or drag a rectangle | drag, then confirm |
| Signals | click straight track: one-way east/south, one-way west/north, none | tap |
| Time | `Space` pause, `1`-`5` speeds (1x, 3x, 8x, 20x, 50x) | speed buttons |

## What the simulation actually does

Everything economic runs in integer arithmetic on a fixed tick (100 ticks per in-game hour). The simulation never reads the clock, `Math.random` or the renderer.

**Goods are physical.** A unit of any of the 12 goods is always in exactly one place: a building's input or output stock, a storage building, a transfer yard (station, quay, wharf) or a vehicle. A factory consumes only from its own input stock. Moving goods is done by *consignments*: a fixed parcel from an origin building to a destination building, planned over legs (truck, train, barge) by a router that compares road distance, rail distance and water distance (with locks), plus handling at each transfer. Inspect any vehicle or consignment to see cargo, origin, destination, every leg with the current one marked, and the obstacle holding it up.

**Production chains**

| Chain | Stages |
|---|---|
| Bread | farm (grain) > roller mill (flour, needs power) > bakery (bread) > market hall > households |
| Timber | forester (logs, replants) > sawmill (planks) > joinery (furniture) > market hall > three-storey houses |
| Metal | coal mine + iron mine > steelworks (steel) > toolworks (tools) > export, and tools speed up extractors by 50% |
| Bricks | clay pit + coal > brickworks (bricks) > house upgrades (bricks and planks) |
| Power | coal > power station; tide mills follow the tidal current and stop at slack water |

**Roads.** Each road tile has a lane per direction holding two trucks with a minimum gap. Junctions work like a railway block: a truck enters a junction, or a run of touching junction tiles, only when every junction tile it will cross is free and the lane beyond has room, and it holds those tiles until it has passed them. Neighbouring junctions therefore cannot lock each other, but a paved block (roads laid side by side) is slow, and the inspector says so. Trucks unload in loading bays; extra trucks wait in a yard queue off the street. Disconnected road networks cannot exchange goods or workers. Trucks stuck in traffic for 150 ticks look for a detour; after 1200 ticks a truck is forced through (the only non-physical rule, kept as a gridlock breaker).

**Rail.** A stopped train reserves track ahead tile by tile up to the first one-way signal facing its direction or its platform end. If any tile is held by another train, or a road vehicle stands on a level crossing in that span, the signal stays red. Reservations behind the tail are released as it moves. Single track with no passing loop therefore carries one train at a time; a passing loop needs a one-way signal at each exit. Idle trains that block a platform are moved to a free one. Waiting trains that hold each other's next block are reported as a deadlock naming the cycle.

**Water and locks.** The sea is tidal (semi-diurnal, spring and neap); canals are held at a fixed level and can only meet the sea through a lock. A lock takes one boat per cycle; gates open only when the chamber matches that side; it serves the open side first and turns round for the far side when that side's boat has waited too long. Near high water both gates stand open. Freighters need water depth to berth, cannot pass under bridges and stay out during storms.

**People.** Houses grow while powered, fed and within reach of work; 45% of residents work. Road networks joined by a working railway or a water route share one labour market (commuters ride trains and ferries). Works that sit idle hire after busy ones.

**Demolition under load.** Removing a road or railway bridge under a vehicle destroys the vehicle and books its cargo as an explicit loss. Removing land road or track strands or derails the vehicle; it resumes when the network returns. A piece of track left with no connection at all is lifted with its neighbour, and a train standing on it derails too. Every other vehicle re-plans: a new route, a different transfer yard, or diversion to the nearest storage with room.

## The ledger

For every good: `start + extracted + imported + produced = used + exported + lost + in buildings + in storage + in transit`. The Ledger tab recomputes the right-hand stocks by walking every building, yard and vehicle, independently of the counters, and also cross-checks that each consignment sits in exactly one container. Losses are listed with time, place, vehicle and reason.

## Time, snapshots, replay

A snapshot is taken every midnight and on demand. Rewinding restores it exactly; anything done afterwards is a new future. "Verify replay" restores a snapshot into a separate simulation, re-applies the recorded actions up to now and compares the full state hash, the agent decision hash (every consignment booking, vehicle assignment, signal clearance, lock admission, reroute and diversion) and every ledger field. Saves (Settings tab) contain the state, the action log and recent snapshots. Graphics settings (detail, weather effects, visible residents) only change drawing; Settings has a button that hashes the state before and after toggling them.

## Diagnostic and stress test

*Diagnostic: the missing flour* pulls down the only road bridge carrying grain at 09:00 on day one. The Goals tab then explains the resulting hunger from live state: stock levels, the last delivery of each input, which producer is idle and why, and why the remaining supply cannot reach the mill (separate road networks, no transfer yards, the edit that split them).

*Stress test* (also on the Logistics tab for any city) copies the city, waits until loaded vehicles are on each bridge, snapshots, demolishes the bridges, checks that the units booked as lost equal the units aboard the destroyed vehicles, runs the aftermath, audits the ledger, then replays the same demolition from the snapshot in a fresh simulation and compares hashes, decisions, consignments and vehicle positions.

## Campaign

1. Bread and Tide: build the mill and bakery, power them from tide mills, grow the village.
2. Coal by Sea: harbour, coal imports, a day without brownouts.
3. The Far Bank: bridge the estuary, farm the east bank, start making bricks.
4. The Iron Line: railway across the estuary, steel and tools for export; the old road bridge is pulled down on day two.
5. The Lock Keepers: canal, tidal lock and a wharf for the water-only brickworks hamlet.
6. Tidemark: 900 residents, an export surplus, three-storey houses; the railway bridge goes on day three.

## Source and tests

`src/` holds the parts (`10`-`76` simulation, `80`-`88` renderer, `90`-`94` interface, `shell.html`, `style.css`). `node tools/build.js` concatenates them into `TIDEMARK.html`. `sh test/all.sh` runs the headless suite in Node: ledger balance, determinism and replay, the bridge stress test, liveness under repeated bridge demolition, every scenario, scripted playthroughs that win every chapter (I-VI) with paid player actions only, randomised aggressive editing with replay checks, and an hour of player-like editing (`test/session.js`: 15 game days, an edit every 40 ticks, roads and track cut and relaid, bridges pulled, works renovated, houses and spurs sprawled, trucks churned) after which the city must deliver at least 60% of an untouched copy's goods with nothing stuck and a replay that matches. `tools/shot.js`, `tools/uitest.js` and `tools/perf.js` drive Chromium through Playwright.

## Known limits

- No passenger services: commuting over rail and water is abstracted into shared labour markets.
- Trains are a fixed two tiles long; platforms must be at least that.
- Rendering is Canvas 2D. Buildings and dry land are cached as sprites; on weak phones expect lower frame rates at full zoom-out. Detail "Low" helps.
- Balance is tuned by scripted playthroughs, not by many players.
