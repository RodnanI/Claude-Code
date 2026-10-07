# wndo

A window to sit at. Six places outside the glass, rain or frost or condensation on it, a candle and a mug on the sill, and sound to match. By default your eyes rest on the glass, so the world outside melts into bokeh; one key racks focus outward and the scenery underneath comes into view.

Open `wndo.html` in any current desktop or tablet browser. It is a single standalone file with no network requests. `index.html` is the same thing loaded from `src/` for development.

## Places

| | place | what is out there | what you hear |
|---|---|---|---|
| 01 | City Rain | a wet avenue from the sixth floor at 2 a.m., traffic lights cycling, cars that stop at red, buses, neon, pedestrians with umbrellas, an occasional storm | rain on the glass, a gutter dripping into a puddle, tyres hissing past, thunder |
| 02 | Pine Wind | a birch clearing and misty pines from a cabin, gusts you can see travelling through the trees and the grass, leaves blowing past, the sun breaking through now and then | wind in gusts, leaves, branches creaking, birds when it calms |
| 03 | Low Tide | a beach house at sunset, breaking waves that run up the sand, the glitter path, gulls, a lighthouse, a ship | each wave you see breaking, surf, gulls |
| 04 | Fireflies | a hay meadow on a June night, the moon, heat lightning far off, a farm across the fields | crickets, peepers, an owl; the window is open a crack |
| 05 | First Snow | a village at blue hour, a lantern lighting the falling snow, string lights, chimney smoke, frost on the panes, flakes landing on the glass and melting | the fire behind you, a clock |
| 06 | Night Train | a window seat in the rain: catenary poles whipping past, level crossings, stations, tunnels, a motorway, towns and wind turbines on the horizon | rail joints, the rumble, crossing bells sliding past with the Doppler drop |

## Controls

- **space** or **double-click**: focus on the glass or on the world outside
- **mouse wheel**: rack focus by hand, anywhere in between
- **click and drag**: draw in the condensation; it fogs back in over time
- **left / right**, **1 to 6**: change place (the glass fogs over, the place changes, the fog lifts)
- **m** sound, **s** settings, **f** fullscreen, **h** hide everything
- moving the mouse (or tilting a tablet, if you allow motion) shifts your head: the frame and sill move against the glass, near things against far things

## Settings

Everything is in the drawer (the sliders icon), grouped as View, Weather, Window, Sound, Image, Performance and Extras. Weather is remembered per place. Highlights:

- **Bokeh**: blur strength, aperture shape (round, five, six, eight blades), soap-bubble edge, cat's-eye vignetting, colour fringe, brightness, glow in the air
- **Weather**: rain, wind, mist, condensation, frost, lightning, plus traffic, snowfall, swell, firefly count or train speed depending on the place
- **Window**: frame style (picture, casement, cross, sash, loft, train, none), finish, candle, tea, plant, room lamp, reflections, how fast the fog returns
- **Sound**: master and five layers (rain, wind, life outside, room, thunder), window open or closed
- **Image**: brightness, warmth, colour, film grain, vignette
- **Performance**: quality preset, **bokeh only** (skips the scenery entirely and keeps just the lights, glass and room, very light on a tablet battery), frame cap, adaptive resolution, half-detail scenery while blurred
- **Extras**: clock, sleep timer (fades picture and sound over the last minute), wander (drifts to another place every so often)

## How it works

All of it is generated in the browser, there are no images or recordings.

- **Picture**: WebGL2. Each place is raytraced in a fragment shader in HDR: boxes and slabs for the city and the village (with interior-mapped rooms behind every window), analytic sea and sky for the coast, layered silhouettes for distance. Trees and grass are painted with Canvas2D at load and drawn as swaying billboards. The scene writes its distance into alpha so lights can be hidden by what stands in front of them.
- **Bokeh**: the scene goes through a 13-tap blur pyramid; every point light (lamps, headlights, fireflies, sun glints, string lights) is drawn as its own sprite whose size follows the circle of confusion for its distance, so out of focus it becomes a proper disc with aperture blades, a bright rim and cat's eye, and in focus it is a point. Wet roads and water get mirrored, stretched copies.
- **Glass**: procedural beads and sliding runs with stick-slip motion and trails, refracting a sharp copy of the outside upside down, plus condensation, frost growing from the pane edges, smudges that catch bright light, and two faint reflections of the room.
- **Room**: the frame, reveals, sill and objects are traced as nested 3D rectangles, so they show true perspective when your head moves, and they go soft when you focus far.
- **Sound**: Web Audio, all synthesis. Dense textures (rain on glass, crickets) are pre-rendered into loops so they keep going in a background tab; sparse events (thunder, passing cars, waves, bells, birds) are scheduled ahead and tied to what happens on screen.

## Building

```
python3 build.py
```

inlines `src/style.css` and every script in `index.html` into `wndo.html`.

## Honest limits

The blurred view is where this shines. Focused outside, the city, village and coast hold up well at night and at dusk; daylight foliage is painted sprites and looks like it up close. The train is the sparsest place. It needs WebGL2 (any browser from the last few years). On an older tablet start with the Balanced or Battery preset, or turn on Bokeh only.
