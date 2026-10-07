# SQUAWK: live flight radar

A Flightradar-style live air traffic map built on free, keyless ADS-B data. Plain HTML, CSS and JavaScript: no framework, no build step, no API keys.

Open `index.html` directly, or serve the folder (`python3 -m http.server` inside `FlightRadar/`, then visit `http://localhost:8000`). Serving it over http(s) also enables the installable PWA and offline app shell. If GitHub Pages is enabled for this repo, it runs as-is from `/FlightRadar/`.

**Single file:** `squawk-standalone.html` is the whole app (map engine, fonts, reference data) in one 2.4 MB file that works by double-clicking it. Regenerate it after edits with `python3 build_standalone.py`. It skips the PWA install and offline app shell, which need a server.

## Data, and what happens when it fails

| Source | Used for | Key needed |
| --- | --- | --- |
| adsb.lol, airplanes.live, adsb.fi | Live positions (250 nm query circles), worldwide emergency and military sweeps, network search | No |
| OpenSky Network | Last-resort live source (bounding box, rate limited) and full-flight tracks | No |
| adsbdb.com, adsb.lol routeset | Routes, airline, aircraft details | No |
| Planespotters.net | Aircraft photos (credited and linked as their terms require) | No |
| RainViewer | Weather radar overlay | No |
| aviationweather.gov | METAR for the airport board | No |
| OpenFreeMap, Esri, AWS Terrain Tiles | Vector basemap, satellite imagery, relief | No |
| OurAirports, tar1090-db, Natural Earth | Bundled offline reference data in `data/` | n/a |

- **Automatic failover.** Providers are tried in order. A CORS or network failure benches a provider immediately, HTTP 429 backs off exponentially, and the next network takes over.
- **Coverage tiling.** Free APIs cap a query at 250 nm, so the viewport is tiled into a hex grid of query circles, polled round-robin with the center weighted most. Turn on *Coverage zones* to watch it happen.
- **Simulation fallback.** If every live feed is unreachable (offline, blocked network, rate limited), the app switches to clearly labelled simulated traffic flying real routes between real airports, and quietly probes the live networks every 45 s to switch back.
- **Offline basemap.** If the tile server is unreachable, it falls back to bundled Natural Earth coastlines and borders.
- **CORS proxy.** Optional setting for networks that block browser requests (prefix or `{url}` template).

## Features

**Map and rendering**
- Aircraft are drawn on a canvas synced to the MapLibre camera, so they glide at full frame rate between updates using dead reckoning (speed, track, estimated turn rate, climb rate capped at the autopilot target altitude), with error blending so updates never jump.
- Procedurally generated silhouettes per class: four-engine heavies, widebodies, narrowbodies, aft-engine regionals, business jets, turboprops, military transports, light aircraft, fighters, helicopters with rotor discs, gliders, balloons, drones, ground vehicles.
- Color by altitude, speed, climb rate, class (palette validated for color-vision deficiency) or mono.
- Labels with collision avoidance, hover cards, lock-on reticle, pulsing emergency rings.
- Basemaps: *Scope* (custom dark console style), *Chart* (paper aeronautical style), *Satellite*.
- **3D airspace**: aircraft at true altitude (adjustable exaggeration) with ground stalks and shadows, plus a 3D altitude curtain under the selected flight.
- **Radar scope mode**: rotating sweep; blips only repaint when the beam passes, with afterglow history.
- **Chase cam** and follow mode, globe projection, day/night terminator with twilight bands, weather radar, terrain relief, range rings, traffic density heatmap, a winds-aloft vector field built from aircraft-reported winds.

**Flight details**
- Photo, airline, route with live progress and ETA (flagged when the published route does not match where the aircraft actually is), altitude/speed/vertical rate/track/squawk, autopilot selected altitude, heading and modes, wind with head/tailwind component, outside air temperature with ISA deviation, linked altitude and speed profile charts, full-flight trace when the network allows it, registration country from the ICAO address block, wake class and engine type.

**Tools**
- Search across tracked aircraft, airports, operators, plus worldwide network lookup by callsign, registration or ICAO hex.
- Filters: altitude and speed ranges, class, on-ground, squawk, wildcard text (`BAW*, A388`), presets.
- Virtualized list of everything in view, sortable.
- Airspace analytics: KPIs, altitude histogram, traffic over time, fleet mix, records, top operators/types/countries.
- Alerts: emergency squawks (7500/7600/7700) worldwide, rare types, military, very high or fast aircraft, LADD/PIA flags.
- Watchlist with sound and background-tab notifications.
- Airport board: METAR with flight category plus inbound, outbound, on-ground and overhead traffic classified live.
- **Sky view**: polar plot of everything above your horizon (curvature-corrected elevation), compass mode, and an experimental **AR camera** overlay on phones.
- Shareable deep links (`#@lat,lon,zoomz/hex`), saved view, units (ft/kt/nm, metric, imperial), frame rate cap for battery.

**Intro**
CRT power-on, a mechanical split-flap title, a boot log that reports the real loading state (map, reference data, which feed linked, targets decoded), then an amber radar scope whose coastlines, borders, airports and blips are projected through the real map camera, ending in a sweep-shaped wipe that reveals the live map and dives in. Full on first visit, short afterwards (configurable), skippable with Esc, disabled for reduced-motion users.

## Keyboard

| Key | Action | Key | Action |
| --- | --- | --- | --- |
| `/` | Search | `Esc` | Close / deselect |
| `F` | Follow | `C` | Chase cam |
| `3` | 3D airspace | `G` | Globe |
| `R` | Radar scope | `P` | Next map style |
| `L` | Labels | `T` | Trails |
| `K` | Color mode | `N` | Nearest aircraft |
| `[` `]` | Previous / next aircraft | `X` | Surprise me |
| `M` `S` `A` `W` `V` | Layers, Stats, Alerts, Watch, Sky | `?` | Help |

On phones: tap an aircraft for a draggable three-stop bottom sheet; two fingers tilt and rotate.

## Files

```
index.html              shell and icon sprite
css/app.css             all styling (dark console and light chart themes, mobile layout)
js/core.js              namespace, events, settings, geo math, color scales, formatting
js/feed.js              providers, normalization, failover, coverage scheduler
js/sim.js               simulated traffic fallback
js/tracker.js           aircraft store, dead reckoning, trails, filters, alerts
js/enrich.js            routes, photos, traces, METAR (cached)
js/map.js               MapLibre styles, overlay layers, camera
js/render.js            canvas aircraft renderer, 3D, scope mode, labels, wind field
js/icons.js             procedural silhouettes and type classification
js/charts.js            small canvas charts
js/ui.js, detail.js, panels.js, sky.js, intro.js, app.js
data/                   airports, aircraft types, operators, ICAO address ranges, coastlines, borders
vendor/                 MapLibre GL JS 5.24 (BSD-3-Clause)
fonts/                  B612 and B612 Mono by Airbus (OFL)
```

## Known limits

- Free community networks have coverage gaps (oceans, parts of Africa and Asia). Zoomed far out, only the nearest query circles are polled; zoom in for full coverage.
- Route databases are community maintained and can be stale; the app flags routes that do not fit the aircraft position instead of trusting them.
- Full-flight traces and METAR depend on those services allowing browser requests; when they do not, the app falls back to the trail it records itself.
- The AR overlay depends on the phone compass, which is often off by 10 to 20 degrees; use the heading trim slider.
- Built and tested in headless Chromium against the providers' documented response formats; the build sandbox could not reach the live APIs themselves.
