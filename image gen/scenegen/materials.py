"""Material construction.

A material is a preset plus overrides. The preset supplies a physically
sensible starting point -- correct IOR, plausible roughness, the right
absorption for water -- and any field the author sets explicitly wins.

Transmissive presets attach a Volume Absorption node as well as setting the
Principled BSDF's transmission. That volume term is what makes deep water read
as blue-green while a shallow puddle of the same material stays clear; without
it, transmissive surfaces look like coloured cellophane.
"""

from __future__ import annotations

import bpy

from .validate import parse_color

# Preset table. Values are in Principled BSDF terms; `_volume` marks presets
# that also want a Volume Absorption node.
PRESETS: dict[str, dict] = {
    "matte":         {"color": (0.32, 0.32, 0.32), "roughness": 0.85},
    "plastic":       {"color": (0.25, 0.28, 0.35), "roughness": 0.35, "coat": 0.35},
    "metal":         {"color": (0.56, 0.57, 0.58), "roughness": 0.28, "metallic": 1.0},
    "brushed_metal": {"color": (0.52, 0.53, 0.55), "roughness": 0.45, "metallic": 1.0},
    "chrome":        {"color": (0.78, 0.79, 0.80), "roughness": 0.02, "metallic": 1.0},
    "mirror":        {"color": (0.92, 0.92, 0.92), "roughness": 0.0,  "metallic": 1.0},
    "gold":          {"color": (0.94, 0.72, 0.28), "roughness": 0.16, "metallic": 1.0},
    "copper":        {"color": (0.93, 0.60, 0.42), "roughness": 0.22, "metallic": 1.0},

    "glass":         {"color": (1.0, 1.0, 1.0), "roughness": 0.0,
                      "transmission": 1.0, "ior": 1.45},
    "frosted_glass": {"color": (1.0, 1.0, 1.0), "roughness": 0.28,
                      "transmission": 1.0, "ior": 1.45},
    # Water: IOR 1.333 at 20 C. Absorption tuned so ~8 m of travel reads as a
    # convincing sea green, which is roughly right for coastal water.
    "water":         {"color": (1.0, 1.0, 1.0), "roughness": 0.0,
                      "transmission": 1.0, "ior": 1.333,
                      "_volume": {"color": (0.12, 0.42, 0.45), "distance": 8.0}},
    "ice":           {"color": (1.0, 1.0, 1.0), "roughness": 0.12,
                      "transmission": 1.0, "ior": 1.31,
                      "_volume": {"color": (0.55, 0.75, 0.85), "distance": 2.0}},

    "concrete":      {"color": (0.28, 0.28, 0.27), "roughness": 0.88},
    "asphalt":       {"color": (0.025, 0.025, 0.028), "roughness": 0.72},
    "brick":         {"color": (0.22, 0.07, 0.045), "roughness": 0.88},
    "plaster":       {"color": (0.72, 0.68, 0.60), "roughness": 0.92},
    "wood":          {"color": (0.22, 0.10, 0.038), "roughness": 0.48},
    "bark":          {"color": (0.055, 0.035, 0.022), "roughness": 0.92},
    "grass":         {"color": (0.055, 0.14, 0.028), "roughness": 0.78},
    "foliage":       {"color": (0.045, 0.13, 0.025), "roughness": 0.62,
                      "subsurface": 0.16},
    "sand":          {"color": (0.50, 0.42, 0.24), "roughness": 0.92},
    "dirt":          {"color": (0.085, 0.055, 0.032), "roughness": 0.95},
    "rock":          {"color": (0.145, 0.135, 0.12), "roughness": 0.86},
    "snow":          {"color": (0.86, 0.90, 0.95), "roughness": 0.34,
                      "subsurface": 0.30},
    "fabric":        {"color": (0.30, 0.28, 0.26), "roughness": 0.95, "sheen": 0.45},
    "rubber":        {"color": (0.018, 0.018, 0.018), "roughness": 0.88},
    "ceramic":       {"color": (0.80, 0.78, 0.74), "roughness": 0.14, "coat": 0.55},
    "emission":      {"color": (1.0, 1.0, 1.0), "roughness": 0.5,
                      "emission_color": (1.0, 0.95, 0.85), "emission_strength": 5.0},
}

# Principled socket names moved around in Blender 4.x, so look them up by the
# names 4.2 uses and skip anything absent rather than raising.
_SOCKETS = {
    "color": "Base Color",
    "roughness": "Roughness",
    "metallic": "Metallic",
    "transmission": "Transmission Weight",
    "ior": "IOR",
    "alpha": "Alpha",
    "coat": "Coat Weight",
    "sheen": "Sheen Weight",
    "subsurface": "Subsurface Weight",
    "emission_color": "Emission Color",
    "emission_strength": "Emission Strength",
}


_COLOR_FIELDS = ("color", "emission_color", "absorption_color")


def _as_color(value):
    """Accept a hex string or a linear triple.

    Materials reaching this module from a scene file have already been
    validated, but the generators build their own default materials as plain
    dicts with hex colours in them. Normalising here keeps those definitions
    readable instead of forcing every generator to pre-convert.
    """
    if isinstance(value, str):
        return parse_color(value, "material colour", [])
    return value


def _normalise(spec: dict) -> dict:
    """Copy `spec` with every colour field converted to linear RGB."""
    out = dict(spec)
    for field in _COLOR_FIELDS:
        if out.get(field) is not None:
            out[field] = _as_color(out[field])

    texture = out.get("texture")
    if isinstance(texture, dict):
        texture = dict(texture)
        for field in ("color_a", "color_b"):
            if texture.get(field) is not None:
                texture[field] = _as_color(texture[field])
        out["texture"] = texture
    return out


def _set(bsdf, key, value):
    name = _SOCKETS.get(key)
    if name is None or value is None or name not in bsdf.inputs:
        return
    socket = bsdf.inputs[name]
    if socket.type == "RGBA":
        socket.default_value = (*_as_color(value)[:3], 1.0)
    else:
        socket.default_value = float(value)


def _coords(nt, scale):
    """Object-space texture coordinates at a given scale.

    Object coordinates -- not Generated -- so that a texture scale of 2 means
    the same physical size on a pebble and on a mountain. Generated coordinates
    normalise to each object's bounding box, which makes shared materials
    inconsistent across differently sized objects.
    """
    tex_coord = nt.nodes.new("ShaderNodeTexCoord")
    mapping = nt.nodes.new("ShaderNodeMapping")
    nt.links.new(tex_coord.outputs["Object"], mapping.inputs["Vector"])
    mapping.inputs["Scale"].default_value = (scale, scale, scale)
    return mapping.outputs["Vector"]


def _ramp(nt, source, color_a, color_b, contrast):
    """Map a scalar texture through a two-stop colour ramp."""
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (*color_a, 1.0)
    ramp.color_ramp.elements[1].color = (*color_b, 1.0)
    # Higher contrast squeezes the stops toward the middle, hardening the edge.
    spread = max(0.001, 1.0 / max(contrast, 0.001)) * 0.5
    ramp.color_ramp.elements[0].position = max(0.0, 0.5 - spread)
    ramp.color_ramp.elements[1].position = min(1.0, 0.5 + spread)
    nt.links.new(source, ramp.inputs["Fac"])
    return ramp.outputs["Color"]


def _build_texture(nt, spec, base_color):
    """Return a colour output socket for the texture spec, or None."""
    kind = spec.get("type", "none")
    if kind == "none":
        return None

    scale = spec.get("scale", 5.0)
    detail = spec.get("detail", 2.0)
    contrast = spec.get("contrast", 1.0)
    a = spec.get("color_a") or tuple(c * 0.75 for c in base_color)
    b = spec.get("color_b") or tuple(min(1.0, c * 1.35) for c in base_color)
    vector = _coords(nt, scale)

    if kind == "noise":
        node = nt.nodes.new("ShaderNodeTexNoise")
        node.inputs["Scale"].default_value = 1.0
        node.inputs["Detail"].default_value = detail
        nt.links.new(vector, node.inputs["Vector"])
        return _ramp(nt, node.outputs["Fac"], a, b, contrast)

    if kind == "voronoi":
        node = nt.nodes.new("ShaderNodeTexVoronoi")
        node.inputs["Scale"].default_value = 1.0
        nt.links.new(vector, node.inputs["Vector"])
        return _ramp(nt, node.outputs["Distance"], a, b, contrast)

    if kind == "gradient":
        node = nt.nodes.new("ShaderNodeTexGradient")
        nt.links.new(vector, node.inputs["Vector"])
        return _ramp(nt, node.outputs["Fac"], a, b, contrast)

    if kind == "checker":
        node = nt.nodes.new("ShaderNodeTexChecker")
        node.inputs["Scale"].default_value = 1.0
        node.inputs["Color1"].default_value = (*a, 1.0)
        node.inputs["Color2"].default_value = (*b, 1.0)
        nt.links.new(vector, node.inputs["Vector"])
        return node.outputs["Color"]

    if kind == "bricks":
        node = nt.nodes.new("ShaderNodeTexBrick")
        node.inputs["Scale"].default_value = 1.0
        node.inputs["Color1"].default_value = (*a, 1.0)
        node.inputs["Color2"].default_value = (*b, 1.0)
        node.inputs["Mortar"].default_value = (0.16, 0.15, 0.14, 1.0)
        node.inputs["Mortar Size"].default_value = 0.02
        nt.links.new(vector, node.inputs["Vector"])
        return node.outputs["Color"]

    return None


def _build_bump(nt, spec, bsdf):
    kind = spec.get("type", "none")
    if kind == "none" or spec.get("strength", 0.0) <= 0.0:
        return

    scale = spec.get("scale", 8.0)
    vector = _coords(nt, scale)

    if kind == "voronoi":
        node = nt.nodes.new("ShaderNodeTexVoronoi")
        node.inputs["Scale"].default_value = 1.0
        height = node.outputs["Distance"]
    elif kind == "waves":
        node = nt.nodes.new("ShaderNodeTexWave")
        node.inputs["Scale"].default_value = 1.0
        height = node.outputs["Fac"]
    else:
        node = nt.nodes.new("ShaderNodeTexNoise")
        node.inputs["Scale"].default_value = 1.0
        node.inputs["Detail"].default_value = spec.get("detail", 3.0)
        height = node.outputs["Fac"]

    nt.links.new(vector, node.inputs["Vector"])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = spec.get("strength", 0.2)
    nt.links.new(height, bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])


def build_material(spec: dict, name: str = "material"):
    """Turn a validated material dict into a Blender material."""
    spec = _normalise(spec)
    preset_name = spec.get("preset", "matte")
    preset = dict(PRESETS.get(preset_name, PRESETS["matte"]))
    volume = preset.pop("_volume", None)

    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    output = nt.nodes["Material Output"]

    # Preset first, then explicit overrides.
    for key, value in preset.items():
        _set(bsdf, key, value)
    for key in _SOCKETS:
        if spec.get(key) is not None:
            _set(bsdf, key, spec[key])

    base_color = spec.get("color") or preset.get("color", (0.5, 0.5, 0.5))

    texture = _build_texture(nt, spec.get("texture") or {}, base_color)
    if texture is not None:
        nt.links.new(texture, bsdf.inputs["Base Color"])

    _build_bump(nt, spec.get("bump") or {}, bsdf)

    # Volume absorption for anything transmissive that asked for it.
    absorption_color = spec.get("absorption_color")
    absorption_distance = spec.get("absorption_distance")
    if absorption_color is not None or absorption_distance is not None or volume:
        vol_color = absorption_color or (volume or {}).get("color", (0.5, 0.5, 0.5))
        vol_distance = absorption_distance or (volume or {}).get("distance", 5.0)
        absorb = nt.nodes.new("ShaderNodeVolumeAbsorption")
        absorb.inputs["Color"].default_value = (*vol_color, 1.0)
        # Density is the reciprocal of the distance light travels before the
        # tint saturates, which is how Beer-Lambert absorption actually works.
        absorb.inputs["Density"].default_value = 1.0 / max(vol_distance, 1e-4)
        nt.links.new(absorb.outputs["Volume"], output.inputs["Volume"])

    # Alpha below 1 needs the blend mode changed or Eevee renders it opaque.
    alpha = spec.get("alpha")
    if alpha is not None and alpha < 1.0:
        mat.blend_method = "BLEND"

    _tidy(nt)
    return mat


def _tidy(nt):
    """Lay the graph out left to right so a human opening the .blend can read it."""
    for i, node in enumerate(nt.nodes):
        if node.type == "OUTPUT_MATERIAL":
            node.location = (400, 0)
        elif node.type == "BSDF_PRINCIPLED":
            node.location = (100, 0)
        else:
            node.location = (-400 - (i % 4) * 220, 300 - (i // 4) * 260)


class MaterialLibrary:
    """Resolves material references, caching by name so the library is shared."""

    def __init__(self, named: dict):
        self._specs = named or {}
        self._cache: dict[str, object] = {}
        self._anon = 0

    def resolve(self, ref, fallback: dict | None = None, name: str = "material"):
        """`ref` is a library name, an inline material dict, or None."""
        if ref is None or ref == {} or ref == "":
            if fallback is None:
                return None
            return self._inline(fallback, name)

        if isinstance(ref, str):
            if ref not in self._specs:
                known = ", ".join(sorted(self._specs)) or "(none defined)"
                raise KeyError(
                    f"material {ref!r} is not in the scene's `materials` "
                    f"library. Defined: {known}")
            if ref not in self._cache:
                self._cache[ref] = build_material(self._specs[ref], ref)
            return self._cache[ref]

        return self._inline(ref, name)

    def _inline(self, spec: dict, name: str):
        self._anon += 1
        return build_material(spec, f"{name}.{self._anon:03d}")
