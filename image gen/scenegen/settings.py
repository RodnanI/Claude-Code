"""Render settings: resolution, sampling, ray depth, tone mapping, output."""

from __future__ import annotations

import re

import bpy

# Presets name the *long* edge, so "4k" plus a portrait aspect ratio yields a
# 2160x3840 image rather than something 3840 tall.
RESOLUTION_LONG_EDGE = {
    "480p": 854, "720p": 1280, "1080p": 1920,
    "1440p": 2560, "4k": 3840, "8k": 7680,
}

_ASPECT_RE = re.compile(r"^\s*([0-9]*\.?[0-9]+)\s*[:/x]\s*([0-9]*\.?[0-9]+)\s*$")

_VIEW_TRANSFORMS = {"agx": "AgX", "filmic": "Filmic", "standard": "Standard"}

_LOOKS = {
    "none": ["None"],
    "punchy": ["AgX - Punchy", "Punchy", "Filmic - High Contrast"],
    "greyscale": ["AgX - Greyscale", "Greyscale"],
    "high_contrast": ["AgX - High Contrast", "High Contrast",
                      "Filmic - High Contrast"],
    "low_contrast": ["AgX - Low Contrast", "Low Contrast",
                     "Filmic - Low Contrast"],
}


def parse_aspect(value: str | None, warn) -> float | None:
    """'16:9' -> 1.777..., or None if unset/unparseable."""
    if value in (None, ""):
        return None
    match = _ASPECT_RE.match(str(value))
    if match:
        w, h = float(match.group(1)), float(match.group(2))
        if w > 0 and h > 0:
            return w / h
    try:
        ratio = float(value)
        if ratio > 0:
            return ratio
    except (TypeError, ValueError):
        pass
    warn(f"could not read aspect_ratio {value!r}; expected something like "
         f"'16:9'. Ignoring it.")
    return None


def resolve_resolution(resolution, aspect_ratio, warn) -> tuple[int, int]:
    """Return (width, height) in pixels from a preset or explicit pair."""
    if isinstance(resolution, (list, tuple)):
        width, height = int(round(resolution[0])), int(round(resolution[1]))
        if aspect_ratio:
            warn("aspect_ratio is ignored when resolution is an explicit "
                 "[width, height] pair.")
        return max(width, 1), max(height, 1)

    long_edge = RESOLUTION_LONG_EDGE.get(str(resolution), 1920)
    ratio = parse_aspect(aspect_ratio, warn) or (16 / 9)

    if ratio >= 1.0:
        width = long_edge
        height = int(round(long_edge / ratio))
    else:
        height = long_edge
        width = int(round(long_edge * ratio))

    # Even dimensions keep video encoders and denoisers happy.
    return max(width - (width % 2), 2), max(height - (height % 2), 2)


def _try_assign(owner, attribute, candidates) -> bool:
    """Assign the first candidate the enum actually accepts."""
    for candidate in candidates:
        try:
            setattr(owner, attribute, candidate)
            return True
        except TypeError:
            continue
    return False


def apply(spec: dict, warn) -> tuple[int, int]:
    """Push render settings onto the current scene. Returns (width, height)."""
    scene = bpy.context.scene
    render = scene.render

    width, height = resolve_resolution(
        spec.get("resolution", "1080p"), spec.get("aspect_ratio"), warn)
    render.resolution_x = width
    render.resolution_y = height
    render.resolution_percentage = 100
    render.pixel_aspect_x = render.pixel_aspect_y = 1.0

    engine = spec.get("engine", "cycles")
    if engine == "eevee":
        # Blender 4.2 renamed the rasteriser; accept either id.
        if not _try_assign(render, "engine",
                           ["BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"]):
            warn("EEVEE is unavailable in this build; using Cycles.")
            render.engine = "CYCLES"
            engine = "cycles"
    else:
        render.engine = "CYCLES"

    if engine == "cycles":
        _apply_cycles(scene, spec, warn)
    else:
        _apply_eevee(scene, spec)

    _apply_film(scene, render, spec.get("film") or {}, warn)
    _apply_output(render, spec.get("output") or {}, warn)

    threads = spec.get("threads", 0)
    if threads > 0:
        render.threads_mode = "FIXED"
        render.threads = threads
    else:
        render.threads_mode = "AUTO"

    return width, height


def _apply_cycles(scene, spec, warn):
    cycles = scene.cycles
    cycles.device = "CPU"  # no GPU is assumed; see README
    cycles.samples = spec.get("samples", 128)
    cycles.seed = spec.get("seed", 0)

    threshold = spec.get("adaptive_threshold", 0.01)
    cycles.use_adaptive_sampling = threshold > 0.0
    if threshold > 0.0:
        cycles.adaptive_threshold = threshold

    cycles.use_denoising = spec.get("denoise", True)
    if cycles.use_denoising:
        _try_assign(cycles, "denoiser", ["OPENIMAGEDENOISE", "OPTIX"])

    rt = spec.get("ray_tracing") or {}
    cycles.max_bounces = rt.get("max_bounces", 12)
    cycles.diffuse_bounces = rt.get("diffuse_bounces", 4)
    cycles.glossy_bounces = rt.get("glossy_bounces", 4)
    cycles.transmission_bounces = rt.get("transmission_bounces", 12)
    cycles.volume_bounces = rt.get("volume_bounces", 2)
    cycles.transparent_max_bounces = rt.get("transparent_bounces", 8)
    cycles.caustics_reflective = rt.get("caustics_reflective", False)
    cycles.caustics_refractive = rt.get("caustics_refractive", False)
    cycles.blur_glossy = rt.get("blur_glossy", 1.0)

    clamp = rt.get("clamp_indirect", 10.0)
    cycles.sample_clamp_indirect = clamp

    # Caustics are the classic "why is my render still noisy" trap: the paths
    # that carry them are rare, and glossy blur destroys them. Say so once
    # rather than silently producing a grainy image.
    if rt.get("caustics_refractive") or rt.get("caustics_reflective"):
        if cycles.blur_glossy > 0.0:
            warn("caustics are enabled but ray_tracing.blur_glossy is "
                 f"{cycles.blur_glossy}, which blurs them away. Set it to 0 "
                 "for sharp caustics.")
        if cycles.samples < 256:
            warn(f"caustics are enabled at only {cycles.samples} samples; "
                 "expect visible noise. 512+ is usual.")
        if 0.0 < clamp < 10.0:
            warn(f"ray_tracing.clamp_indirect is {clamp}, which will dim "
                 "caustics. Raise it or set it to 0.")


def _apply_eevee(scene, spec):
    eevee = scene.eevee
    samples = spec.get("samples", 128)
    for attribute in ("taa_render_samples", "taa_samples"):
        if hasattr(eevee, attribute):
            setattr(eevee, attribute, max(1, min(samples, 4096)))
    if hasattr(eevee, "use_raytracing"):
        eevee.use_raytracing = True


def _apply_film(scene, render, film, warn):
    view = scene.view_settings
    view.exposure = film.get("exposure", 0.0)

    transform = _VIEW_TRANSFORMS.get(film.get("view_transform", "agx"), "AgX")
    if not _try_assign(view, "view_transform", [transform, "Standard"]):
        warn(f"view transform {transform!r} is unavailable in this build.")

    look = film.get("look", "none")
    if not _try_assign(view, "look", _LOOKS.get(look, ["None"]) + ["None"]):
        warn(f"look {look!r} is unavailable for this view transform.")

    render.film_transparent = film.get("transparent_background", False)
    render.use_motion_blur = film.get("motion_blur", False)


def _apply_output(render, output, warn):
    settings = render.image_settings
    file_format = {"png": "PNG", "jpeg": "JPEG", "webp": "WEBP",
                   "exr": "OPEN_EXR"}.get(output.get("format", "png"), "PNG")
    settings.file_format = file_format

    depth = output.get("color_depth", "8")
    # Each format supports a different subset; pick the closest legal depth
    # instead of failing on an impossible combination.
    allowed = {"PNG": ["8", "16"], "JPEG": ["8"], "WEBP": ["8"],
               "OPEN_EXR": ["16", "32"]}[file_format]
    if depth not in allowed:
        chosen = allowed[-1] if int(depth) > int(allowed[-1]) else allowed[0]
        if file_format != "OPEN_EXR" or depth != "8":
            warn(f"{file_format} does not support {depth}-bit output; "
                 f"using {chosen}-bit.")
        depth = chosen
    settings.color_depth = depth

    if file_format in ("JPEG", "WEBP"):
        settings.quality = output.get("quality", 90)

    # RGBA only makes sense with a transparent film; otherwise alpha is 1
    # everywhere and just wastes a channel.
    settings.color_mode = "RGBA" if render.film_transparent else "RGB"
