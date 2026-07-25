# Theme park — VHS found footage

A 300-second found-footage tape from a Backrooms theme park, rendered from
scratch. No image generation, no assets, no stock footage, no textures: every
frame is raymarched from signed distance fields by a small C program, and every
sound is synthesised from oscillators, noise and filters.

    ./build.sh              # -> themepark_vhs.mp4 (640x480, 24 fps, 5:00)

The last frame matches the first, and the calliope phrase is exactly thirty
seconds long, so ten of them fit the tape and the music at 5:00 is the music at
0:00. It loops in both picture and sound.

## What is on the tape

| time | |
|---|---|
| 0:00 | The camcorder is lying on its side on sticky asphalt in front of a giant, rust-stained carnival ticket booth. There is a small monitor let into the counter. It is playing a muted loop of an empty ferris wheel turning, and it is also playing what the camcorder can see, so it is playing itself, forever. |
| 0:05 | Someone picks it up. They walk an arc across the front of the booth — the conical roof, the rust, the barred window, the TICKETS neon — and keep coming back to the monitor. |
| 0:13 | They lean in and stab the zoom rocker at the tunnel in the glass. Six jabs. The chroma loses lock and the loop stops being a picture at all. |
| 0:17 | Rainbow static. |
| 0:20 | They stand up and start walking. A mid-1990s midway under a black sky with nothing in it. Rows of identical prize booths, neon signs spelling the same promises, oversized plushies nobody has won. |
| 0:56 | A carousel, turning, in silence, the wrong way round, with no horses on it. |
| 1:13 | A wooden coaster runs level on its trestle, rolls over, and goes into the concrete. It does not come out anywhere. |
| 1:50 | A popcorn cart. The kettle has not stopped. There is a drift of it on the asphalt. |
| 2:24 | A wide plaza opens up, and there is something standing in the middle of it. |
| 2:26 | The calliope slurs down an octave and stops. |
| 2:31 | Twenty seconds in which nothing happens. A mascot costume — a jester, painted, weathered, with two porcelain eyes that were bought separately — stands beside an abandoned bumper car arena and looks at the lens. The camera circles it and will not look away. |
| 2:51 | It twitches. |
| 2:51 | The colours turn over, the geometry stops holding still, perspective stops being perspective, the calliope comes back playing backwards, and there are voices that are not in the park. |
| 3:01 | Its posture snaps into something with too many joints in it, and it comes. |
| 3:05 | Running. Midway alleys, a funhouse where none of the walls are plumb, a hall of mirrors, and then the same midway again, with footsteps behind that are too heavy and land too often. |
| 4:43 | The asphalt stops being loaded. |
| 4:52 | It lands on the asphalt in front of the monitor, and the tape is where it started. |

## How it works

**`pk_core.h`** — maths, hashed value noise, and the park. The midway is three
cells of street and four of booth block, forever: a layout rather than a maze,
so you can always see a long way down it and every midway looks exactly like
the one before. Every big structure — ferris wheels, coaster loops, drop towers
— comes from a lattice with one entry every 42 by 48 metres, chosen by hash and
always landing inside a block, so nothing ever stands in a walkway. The kiosk,
the carousel, the buried coaster, the popcorn cart, the arena, the floodlight
masts and the costume are all signed distance fields.

Three things here are worth knowing:

- *The ground is not in the distance field.* It is a plane, intersected
  analytically. An outdoor scene spends most of its ray budget skimming the
  floor, and taking the floor out of the SDF is what lets a sphere-tracer cross
  forty metres of empty midway in a handful of steps instead of creeping along
  at the height of the camera.
- *A far-field distance table.* Sphere tracing a grid exactly costs a 3x3
  neighbourhood per step. Outside that ring the marcher uses a precomputed
  per-cell distance to the nearest block, so an open plaza is crossed in two or
  three steps rather than thirty. The table is built once, at start-up, and is
  deliberately conservative: it is reduced by the largest distance any awning or
  sign protrudes, or the bound would not be a bound.
- *Nothing is allowed to stand where the operator walks.* `pk_render -dump`
  replays the whole camera path and prints the clearance at every one of the
  7200 frames. It found a lamp standard sitting on a crossing centreline and a
  coaster trestle across the chase loop, which is a much better way to discover
  those than watching an hour of render.

**`pk_shade.h`** — materials, lights, the monitor and the marcher. Every surface
is procedural: asphalt aggregate and the tack of whatever was spilled on it,
canvas stripes, rust weeping out of every fixing, matted fur, greasepaint that
has been rained on for years, crazed porcelain. Also:

- *The feedback tap.* The monitor in the counter samples the **previous finished
  frame** of the tape and screens the ferris wheel loop over it. Point the lens
  at it and the recursion is real, not faked — each generation picks up another
  set of scanlines, another pass of grain and another notch of contrast, so the
  tunnel comes apart on its own. Drive it hard enough and the chroma gives up
  before the luma does, which is why it ends in rainbow and not in white.
- *The fog has a top.* The sky over this park is black and has no stars, but the
  haze on the ground is lit by the neon, so silhouettes read against it. Density
  falls off with height and is integrated along the ray, which is what separates
  the two. The neon also scatters: a directional lobe per lamp, evaluated
  against the ray, which is what puts the halo round every sign.
- *One bounce of mirror.* The hall of mirrors traces a real reflected ray, twice
  deep, so the corridors that are not there behave like corridors. The silvering
  is patchy and nobody has cleaned it, which is the only reason the frame rate
  survives.
- *Noise level of detail.* Procedural noise has no mip chain, so any octave
  finer than a pixel turns into moire. Each octave, and each painted stripe,
  fades toward its mean once it stops being resolvable.

**`pk_main.c`** — the operator and the tape. They walk a timed spline with a
gait — vertical bob, lateral sway, roll into the sway, handheld drift from fbm
noise — and glance at the things worth looking at. The tape chain is a full
pass: lens distortion, bloom, the colour inversion, a character generator burned
in before the tape sees it, then per-line head tracking error, colour-under
chroma, luma softening with the overshoot a recorder invents, grain that worsens
in the shadows, dropouts, head-switching noise along the bottom edge and
ghosting off the previous field.

Two details in the tape were worth getting right. Head jitter is **correlated**
down the field: white noise per line combs the picture into confetti, whereas a
smooth wave with a little grit on top looks like a tape. And the colour
inversion inverts **chroma** rather than luma — a straight `1-c` on a night
scene produces a white frame with nothing in it, so every colour goes to its
opposite while the picture survives, and only the five hard hits go fully
negative.

**`pk_audio.py`** — the sound. The calliope is a real band organ, written out as
notes: a waltz in A minor, voiced as steam whistles with strong odd harmonics,
three detuned ranks to a note and a breath of air in front of every attack. At
2:25 the transport carrying it is resampled at a falling rate, so it slurs down
an octave and grinds to a halt on a chord that hangs there and sags. Around it:
cold-cathode buzz at twice the mains with the iron clipping on the 60 Hz,
footsteps placed from the event times the renderer exported so feet land on the
frames the camera bobs on, popcorn, formant-shaped whispers that are the only
wide thing in an otherwise mono mix because they are not in the park, and a
second set of footsteps that is too heavy, lands too often, and closes the whole
time. Then wow and flutter, band limiting to 9 kHz, saturation, and dropouts
keyed to the same frames the picture tears on.

## Files

    pk_core.h    maths, noise, the midway, the rides, the props, the costume
    pk_shade.h   materials, neon, the monitor, fog, mirrors, the raymarcher
    pk_main.c    camera choreography, the VHS chain, the frame loop
    pk_audio.py  the calliope and everything else
    build.sh     render + synthesise + mux
    shot.sh      render a single frame at a given second, for inspection

`./shot.sh 168 out` renders the frame at 2:48 to a PNG.
`./pk_render -dump` audits the camera path without rendering anything.

## Requirements

gcc with OpenMP, Python 3 with numpy and scipy, and an ffmpeg binary
(`pip install imageio-ffmpeg` provides one). About half an hour on four cores.
