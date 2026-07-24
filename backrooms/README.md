# Backrooms — VHS found footage

A 300-second found-footage tape, rendered from scratch. No image generation, no
assets, no stock footage: every frame is raymarched from signed distance fields
by a small C program, and every sound is synthesised from oscillators and noise.

    ./build.sh              # -> backrooms_vhs.mp4 (640x480, 24 fps, 5:00)

## What is on the tape

| time | |
|---|---|
| 0:00 | The camcorder is lying on the carpet, on its side, pointed at a CRT on a rolling cart. The CRT is showing what the camcorder can see, so it is showing itself, forever. |
| 0:06 | Someone picks it up, walks an arc around the cart to bend the tunnel in the glass, then leans in and stabs the zoom rocker at the snow. |
| 0:20 | They stand up and start walking. Level 0: damp carpet, yellow wallpaper coming away in sheets, fluorescent tubes that will not stop buzzing. |
| 0:34 | A doorway, halfway up a wall, opening onto nothing. |
| 0:50 | Ceiling light fittings lying face-up on the carpet, throwing shadows the wrong way. |
| 1:16 | An arcade cabinet, on, showing static. |
| 1:29 | A puddle of black liquid that does not move. |
| 1:32 | The wallpaper stops mid-wall and becomes concrete. Copper pipes, dripping. Level 1. |
| 1:52 | Through a fire door onto a catwalk. The building turns out to have no bottom — the shaft falls seventy metres into the white-tiled basins of Level 37. |
| 2:08 | A slow pan across it. |
| 2:30 | Every sound in the room stops at once. |
| 2:38 | There is something standing on the opposite catwalk. Its head is not moving like a head. |
| 2:52 | It notices. |
| 2:56 | Running. Concrete service halls, then back into the yellow, with footsteps behind that are not theirs. |
| 4:44 | The floor stops being there. |
| 4:52 | It lands on the carpet in front of the CRT, and the tape is where it started. |

The last frame matches the first, so it loops.

## How it works

**`bk_core.h`** — vector maths, hashed value noise, and the world. Level 0 and
Level 1 are grid mazes carved from solid blocks along the camera's own path, so
the walker can never end up inside a wall. The atrium is a hollow box 52 m
across and 118 m tall with bays cut into it, two catwalks facing each other, and
Level 37's basin field at the bottom. Props (the television, the cart, the
stranded doorway, the arcade cabinet, the puddle, the figure) are all SDFs.

**`bk_shade.h`** — materials, lighting and the marcher. Every surface is
procedural: the wallpaper's roll seams and peeling, the carpet's damp patches,
concrete shuttering lines, copper patina, tile grout. Three details matter more
than the rest:

- *The feedback tap.* The television samples the **previous finished frame** of
  the tape. Point the camera at it and the recursion is real, not faked — each
  generation picks up another set of scanlines, another pass of grain and
  another notch of contrast, so the tunnel falls away into noise on its own.
- *Noise LOD.* Procedural noise has no mip chain, so any octave finer than a
  pixel turns into moiré. Each octave fades toward its mean once it stops being
  resolvable.
- *Grazing rays.* Sphere tracing a 190 m wall at a shallow angle runs out of
  steps. Shading those rays anyway, instead of dropping them to fog, is what
  stops contour lines from being drawn across every large surface. Grating is
  alpha-tested so you can see the drop through the floor you are standing on.

**`bk_main.c`** — the camera and the tape. The operator walks a timed spline
with a gait: vertical bob, lateral sway, roll into the sway, plus handheld
drift from fbm noise, and glances scripted at the things worth looking at. The
tape chain is a full pass: lens distortion, then per-line head tracking error,
colour-under chroma (heavily band-limited and delayed against luma), luma
softening with the overshoot a recorder invents, tape grain that worsens in the
shadows, oxide dropouts, head-switching noise along the bottom edge, ghosting
off the previous field, and a character generator whose output is burned in
before any of that happens — which is why the timestamp tears along with the
picture, and why it recurses inside the television.

**`audio.py`** — the sound. Mains hum and its harmonics for the tubes (every
frequency an integer, so the bed is phase-continuous across the loop), footsteps
placed from the event times the renderer exported so feet land on the frames the
camera bobs on, a second set of footsteps that gains on the first, an FM screech,
and a hard cut to nothing but tape hiss at 2:30. Then wow, flutter, band
limiting to 9 kHz, saturation, and dropouts keyed to the same frames the picture
tears on.

## Files

    bk_core.h    geometry, noise, levels, props
    bk_shade.h   materials, lighting, raymarcher, CRT feedback
    bk_main.c    camera choreography, VHS processing, frame loop
    audio.py     sound design
    build.sh     render + synthesise + mux
    shot.sh      render a single frame at a given second, for inspection

`./shot.sh 168 out` renders the frame at 2:48 to a PNG. Handy, because a
five-minute render is a slow way to find out a wall is in the wrong place.

## Requirements

gcc with OpenMP, Python 3 with numpy and scipy, and an ffmpeg binary
(`pip install imageio-ffmpeg` provides one).
