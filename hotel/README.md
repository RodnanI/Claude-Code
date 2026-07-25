# Grand hotel — VHS found footage

A 300-second found-footage tape from a Backrooms hotel and shopping mall,
rendered from scratch. No image generation, no assets, no stock footage, no
textures: every frame is raymarched from signed distance fields by a small C
program, and every sound is synthesised from oscillators, noise and filters.

    ./build.sh              # -> hotel_vhs.mp4 (640x480, 24 fps, 5:00, ~95 MB)

The last frame matches the first, the lounge phrase is exactly thirty seconds
long so ten of them fit the tape, and the burned-in counter was zeroed at the
head of the segment and wraps with it. It loops in picture, in sound, and in the
character generator: measured against the finished frames, frame 7199 to frame 0
differs by a mean of 10.30 levels out of 255, where an ordinary adjacent-frame
transition on this tape differs by 10.31. The seam is the grain, and nothing
else.

## What is on the tape

| time | |
|---|---|
| 0:00 | The camcorder is lying on deep-crimson patterned carpet in front of a mahogany reception desk. There is a surveillance monitor standing on the desk. It is wired to this camera, so the picture it is showing contains the picture it is showing, and so on, for as many generations as the tube can hold. |
| 0:05 | Somebody picks it up. They walk an arc across the front of the desk — brass bellhop carts, fluted marble, the key wall with a third of its pigeonholes still holding a tag — and keep coming back to the monitor. |
| 0:13 | They lean in and stab the zoom rocker at the tunnel in the glass. Six jabs. The feed loses sync and the tube falls back to the radar green it was built to draw. |
| 0:20 | They stand up and start walking. Guest corridors: dark oak below the rail, damask above it, doors with brass numbers, sconces every few metres, and chandeliers at every second junction. |
| 0:24 | A framed portrait. Everything below the brow has run. |
| 0:31 | A brass-framed mirror, with a corridor in it that nobody is in. |
| 1:12 | The corridors open into an atrium: three levels of shopfronts, still lit, still stocked, going as far in both directions as the fog allows. |
| 1:24 | A longcase clock against a pier. There is another one two bays down. They do not agree, and neither of them agrees with the one after that. |
| 1:31 | An arcade, off the promenade. They stop walking for eight seconds and look into it. Every cabinet is in attract mode. None of them are in step and none of them are being played. |
| 1:45 | A fountain, overgrown, with something thick in the bottom of it that turns over rather than splashes. |
| 2:01 | A grand piano on a dais with the lid up. Keys are going down. |
| 2:28 | A rusted brass escalator. They cross the landing and get on it. It does not arrive anywhere: the density of the air in this atrium *rises* with height, so the top of it is the point at which you stop being able to see a ceiling. |
| 2:58 | Everything stops. The music, the ticking, the water, the cabinets, the machine they are standing on. All of it, on one frame. |
| 3:00 | A ballroom. Velvet floor to cornice, parquet, three chandeliers, and something standing in the middle of it that is three metres tall and draped in tarnished silk. |
| 3:00 | Twenty seconds in which it turns its face to the lens. It does this in four movements and you do not catch any of them beginning. There is nothing on the face. |
| 3:18 | Twenty seconds in which the building stops holding still: the damask leaves the walls, the chandeliers swing with nothing to swing them, perspective stops being perspective, and there are voices in the stereo that are not in the room. |
| 3:38 | It twitches, its arms come out too far, and it comes. |
| 3:39 | Running. Velvet hallways, glass coming down out of the fittings, lift doors surging open onto shafts with no car in them, and footsteps behind that are too heavy and land too often. |
| 4:08 | A spiral stair. There is no floor plane in this scene, which is the only reason it can keep going down. |
| 4:32 | A service floor. Cinder block, conduit, one fluorescent every third cell — and the hotel's carpet, still running down the middle of it. |
| 4:49 | The carpet stops being loaded. |
| 4:52 | It lands on the carpet in front of the monitor, and the tape is where it started. |

## How it works

**`hl_core.h`** — maths, hashed value noise, and the building. A guest floor is a
lattice, not a maze: hallways every six cells in both directions with a solid
five-by-five block of rooms in between, so you can always see a long way down
one and every junction is the junction you just left. The atrium, the ballroom,
the stairwell and the lift lobbies are all signed distance fields.

Four things here are worth knowing:

- *The floor and the ceiling are not in the distance field.* They are planes,
  intersected analytically in `trace()`. A corridor scene spends most of its ray
  budget skimming carpet, and taking the two planes out of the SDF is what lets
  a sphere-tracer run the length of a hallway in a handful of steps instead of
  creeping along at the height of the lens.
- *A far-field distance table.* Sphere-tracing a grid exactly costs a 3x3
  neighbourhood per step. Outside that ring the marcher uses a precomputed
  per-cell distance to the nearest wall, so an empty hallway is crossed in two
  or three steps rather than thirty. The table is built once, at start-up, and
  is reduced by the furthest any sconce or architrave protrudes, or it would not
  be a bound.
- *The chandeliers are on three exact lattices.* The far-field table only knows
  about walls. A ray running the length of a hallway would step straight through
  six light fittings, so the fittings are folded — `rep1` on two periods, three
  families, one for each hallway direction and one for the junctions — and the
  marcher is handed a bounding cylinder it is not allowed to step past. Nothing
  in a corridor may hang below 2.2 m either: the whole fitting is 1.32 units
  deep, a 3.05 m ceiling caps the scale at 0.64, and a chandelier the operator
  walks through is a chandelier nobody believes.
- *Nothing may stand where the operator walks, and nobody sprints by accident.*
  `hl_render -dump` replays all 7200 frames of the camera path and prints the
  clearance at each one. It found the junction chandeliers hanging at eye level,
  and it found the last leg of the promenade walk routed underneath the
  escalator, where the truss is already two metres up and a person on the floor
  would have to duck. The same dump measures per-frame travel: the promenade
  timings were originally guessed knot by knot, which put the arcade glance
  thirty metres past the arcade and had the operator covering the last stretch
  at six metres a second. They are now integrated from a speed profile — slow
  near the things worth slowing for, about 1.5 m/s otherwise — so the walk comes
  out at a measured 1.06 m/s mean, 1.66 m/s peak, and every glance fires while
  the thing being glanced at is actually there.

**`hl_shade.h`** — materials, the light, the monitor and the marcher. Every
surface is a function: the carpet medallion on its half-drop repeat, the damask,
marble veining that picks its own direction in every slab, quartersawn oak with
ray fleck, tarnished brass, crazed mannequin plastic, and attract mode on every
cabinet screen. Also:

- *The feedback tap.* The monitor samples the **previous finished frame** of the
  tape and screens the house caption over it. Point the lens at it and the
  recursion is real, not faked — each generation picks up another set of
  scanlines, another pass of grain and another notch of contrast. The thing that
  makes or breaks it is loop gain on *luma*, not on green: green only carries
  0.587 of the luma, so a green gain of 0.87 is a luma gain of 0.77 and the
  tunnel is gone in five generations. The triple is set so the round trip
  through the whole tape chain lands just under one, with a soft ceiling on the
  result, which is why the middle of the tunnel blooms out and then stops
  instead of pinning to a flat rectangle.
- *The tube does not fail to white.* Driven hard enough the feed loses sync, and
  what is left is the P1 phosphor doing the only thing it was ever good at: a
  rotating sweep, range rings, and returns from things that are not moving.
- *The fog in the atrium works the other way up.* Density rises with height,
  integrated along the ray, so the escalator can climb into a ceiling that is
  never there while the promenade underneath stays clear.
- *Mirrors and shop glass trace real rays.* The glass traces two — one carried
  through it and one off it, mixed on a Fresnel term — which is the only way a
  boutique looks like it has anything behind the window.
- *Noise level of detail.* Procedural noise has no mip chain, so any octave
  finer than a pixel turns into moire. Each octave, each stripe, each hard edge
  and every 5x7 glyph fades toward its own mean once it stops being resolvable,
  which is why the carpet does not boil at the end of a corridor and a backlit
  fascia thirty metres down the promenade does not turn into a picket fence.
- *The sensor has a shoulder.* Twenty-four fascia and shop lamps all adding up
  puts the promenade several stops over range. That would be survivable on its
  own, except that the bloom divides by `1 - threshold`, so anything over one
  gets tripled before the tape ever sees it — and the YIQ round trip in the tape
  chain turns a hugely over-range pixel into a clipped primary. The promenade
  came out striped with pure green piers and pure blue shop windows, which took
  a while to recognise as the mannequins standing behind them. Every pixel now
  rolls off above 0.80 and desaturates toward white on the way, which is what a
  cheap CCD does anyway, and the bloom source is capped as well.
- *Light on the far side of a surface does not put a highlight on it.* A lamp
  directly behind a shop window gives `l ≈ -n` and `rd ≈ -n`, so `l - rd` is
  very nearly the zero vector — and `norm3` of that falls back to a unit axis,
  which for a shopfront *is* the normal. `pow(dot(n,h), 140)` then returns 1 and
  the whole pane lights up in the colour of the lamp inside the shop. Specular
  is gated on the light being on the same side as the normal, and on the half
  vector being long enough to normalise.

**`hl_main.c`** — the operator and the tape. They walk a timed spline with a
gait — vertical bob, lateral sway, roll into the sway, handheld drift from fbm
noise — and glance at the things worth glancing at. The tape chain is a full
pass: lens distortion, bloom, the colour inversion, a character generator burned
in before the tape sees it, then per-line head tracking error, colour-under
chroma, luma softening with the overshoot a recorder invents, grain that worsens
in the shadows, dropouts, head-switching noise along the bottom edge, and
ghosting off the previous field.

Two details in the tape were worth getting right. Head jitter is **correlated**
down the field: white noise per line combs the picture into confetti, whereas a
smooth wave with a little grit on top looks like a tape. And the colour
inversion inverts **chroma** rather than luma — a straight `1-c` on a scene this
dark produces a white frame with nothing in it, so every colour goes to its
opposite while the picture survives, and only the five hard hits go fully
negative.

**`hl_audio.py`** — the sound. The bed is a lounge arrangement written out as
notes: eight bars of four at 64, which is exactly thirty seconds, which is
exactly a tenth of the tape. Electric piano voiced as a tine under a pickup with
the amp's own tremolo, three detuned ranks of strings behind a lowpass that has
been in a ceiling since 1979, an upright bass on one and three, and a brush on
two and four. Nothing in the arrangement is allowed to be interesting. Around
it: mains hum at 60 and its octave with the ballast iron clipping on the
fundamental, five longcase movements that each keep their own time, water that
turns over rather than splashes, seven cabinets in attract mode that are not in
step, a grand piano playing a line that does not resolve, footsteps placed from
the event times the renderer exported so feet land on the frames the camera
bobbed on, and formant-shaped whispers that are the only wide thing in an
otherwise mono mix because they are not in the building. At 2:58 all of it stops
on one frame and what is left is tape hiss, which is what silence on a tape
actually is. Then wow and flutter, band limiting to 9 kHz, saturation, and
dropouts keyed to the same frames the picture tears on.

## Files

    hl_core.h    maths, noise, the corridors, the atrium, the ballroom, the figure
    hl_shade.h   materials, the light, the monitor, the fog, the marcher
    hl_main.c    camera choreography, the VHS chain, the frame loop
    hl_audio.py  the lounge bed and everything else
    build.sh     render + synthesise + mux + compress onto a size target
    shot.sh      render a single frame at a given second, for inspection

`./shot.sh 190 out 40` renders the frame at 3:10 to a PNG, with forty frames of
warm-up first so the feedback loop is charged.
`./hl_render -dump` audits the camera path without rendering anything, and
writes the sidecar the sound pass needs.
`./hl_render -mat` renders material ids instead of light, which is how a
surface that is misbehaving gets named instead of guessed at — it is the reason
the striped promenade turned out to be mannequins and not, as it looked, the
piers.

## Requirements

gcc with OpenMP, Python 3 with numpy and scipy, and an ffmpeg binary
(`pip install imageio-ffmpeg` provides one). About an hour on four cores.
