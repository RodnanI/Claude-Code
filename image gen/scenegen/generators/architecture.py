"""Panel-block facades.

Builds the front of a post-war prefabricated apartment block -- the panelka --
as a grid of identical bays. The look depends on a few specific things, and
they are what this generator spends its geometry on:

  * visible joints between precast panels, which read as a shadow grid;
  * windows recessed deep enough to throw their own shadow;
  * recessed loggias with solid parapets, breaking the window rhythm;
  * near-total repetition, with only lit windows varying.

That last point is what makes the result liminal rather than merely
architectural. The eye looks for variation, finds only the same cell again,
and cannot fix a scale or an edge to the building.

The facade is built in the Y-Z plane facing -X, so an unrotated facade is seen
by a camera sitting at negative X looking toward the origin.
"""

from __future__ import annotations

import bpy

from ..util import apply_transform, new_mesh_object, rng_for
from .meshkit import MeshBuilder

# material slots
PANEL, TRIM, GLASS, GLASS_LIT, PARAPET = range(5)

TONE_LAYER = "panel_tone"


def build_facade(spec: dict, library, warn):
    bays = spec.get("bays", 24)
    floors = spec.get("floors", 24)
    bay_w = spec.get("bay_width", 3.2)
    floor_h = spec.get("floor_height", 2.8)
    recess = spec.get("recess", 0.35)
    seam = spec.get("seam", 0.05)
    lit_fraction = spec.get("lit_fraction", 0.06)
    balcony_every = spec.get("balcony_every", 3)
    seed = spec.get("seed", 0)

    rand = rng_for("facade", seed, bays, floors)
    builder = MeshBuilder()

    total_w = bays * bay_w
    total_h = floors * floor_h

    if bays * floors > 40_000:
        warn(f"facade has {bays * floors:,} bays; this will be slow to build. "
             f"Fog usually hides anything past ~40 bays.")

    weathering = spec.get("weathering", 0.5)

    for row in range(floors):
        z0 = row * floor_h
        for column in range(bays):
            y0 = column * bay_w
            loggia = balcony_every > 0 and (column + row // 2) % balcony_every == 0
            lit = rand.random() < lit_fraction
            # Precast panels were cast in different batches and have weathered
            # for decades, so no two are quite the same shade. This is the
            # detail that stops a large facade reading as flat cardboard.
            builder.tone = 0.5 + weathering * rand.uniform(-0.5, 0.5)
            _bay(builder, y0, z0, bay_w, floor_h, recess, seam, loggia, lit, rand)

    # The building continues past the modelled grid; capping the ends with a
    # plain slab stops the camera seeing through the edge if the fog is thin.
    builder.tone = 0.5
    builder.box((0.0, -0.4, -0.4), (recess + 1.2, total_w + 0.4, 0.0), PANEL)
    builder.box((0.0, -0.4, total_h), (recess + 1.2, total_w + 0.4, total_h + 0.4),
                PANEL)

    mesh = builder.to_mesh("Facade", tone_layer=TONE_LAYER)
    obj = new_mesh_object(spec.get("id") or "Facade", mesh)
    # Centre the grid on the object's origin so `location` places the middle of
    # the wall, which is what an author aiming a camera actually wants.
    for vertex in mesh.vertices:
        vertex.co.y -= total_w * 0.5
        vertex.co.z -= total_h * 0.5
    apply_transform(obj, spec)

    for material in _materials(spec, library):
        mesh.materials.append(material)
    return obj


def _bay(builder, y0, z0, width, height, recess, seam, loggia, lit, rand):
    """One apartment cell: panel face, recessed opening, glass or loggia."""
    y1, z1 = y0 + width, z0 + height

    # The precast panel sits slightly proud of the joint plane, so the seam
    # between panels reads as a continuous shadow line across the facade.
    panel_x = -0.02

    if loggia:
        margin_y, sill, head = 0.22, 0.12, 0.22
    else:
        margin_y, sill, head = 0.52, 0.95, 0.42

    oy0, oy1 = y0 + margin_y, y1 - margin_y
    oz0, oz1 = z0 + sill, z1 - head

    # Joint ring at x = 0, then the panel face stepped forward inside it. All
    # of this is one precast unit, so it all carries the same tone -- the
    # joint reads because of the 2 cm step and its own shadow, not because it
    # is painted a different colour.
    builder.frame(y0, z0, y1, z1,
                  y0 + seam, z0 + seam, y1 - seam, z1 - seam, 0.0, PANEL)
    builder.frame(y0 + seam, z0 + seam, y1 - seam, z1 - seam,
                  oy0, oz0, oy1, oz1, panel_x, PANEL)
    builder.reveal(y0 + seam, z0 + seam, y1 - seam, z1 - seam,
                   0.0, panel_x, PANEL)

    if loggia:
        _loggia(builder, oy0, oz0, oy1, oz1, panel_x, recess)
        return

    builder.reveal(oy0, oz0, oy1, oz1, panel_x, recess, PANEL)
    glass = GLASS_LIT if lit else GLASS
    builder.quad((recess, oy0, oz0), (recess, oy1, oz0),
                 (recess, oy1, oz1), (recess, oy0, oz1), glass)

    # A centre mullion: two panes per window is the standard panelka sash, and
    # it gives the facade a finer rhythm than the bays alone.
    mid = (oy0 + oy1) * 0.5
    builder.box((recess - 0.06, mid - 0.03, oz0), (recess, mid + 0.03, oz1), TRIM)


def _loggia(builder, oy0, oz0, oy1, oz1, panel_x, recess):
    """A recessed balcony with a solid parapet and a glazed back wall."""
    depth = recess + 1.25
    builder.reveal(oy0, oz0, oy1, oz1, panel_x, depth, PANEL)

    # Floor and soffit of the recess.
    builder.box((panel_x, oy0, oz0 - 0.12), (depth, oy1, oz0), TRIM)
    builder.box((panel_x, oy0, oz1), (depth, oy1, oz1 + 0.10), TRIM)

    # Back wall, part glazed: the flat of the apartment behind the balcony.
    door_y0, door_y1 = oy0 + 0.25, oy0 + 1.15
    builder.frame(oy0, oz0, oy1, oz1, door_y0, oz0 + 0.05, door_y1, oz1 - 0.25,
                  depth, PANEL)
    builder.quad((depth, door_y0, oz0 + 0.05), (depth, door_y1, oz0 + 0.05),
                 (depth, door_y1, oz1 - 0.25), (depth, door_y0, oz1 - 0.25),
                 GLASS)

    # Parapet slab across the front of the opening.
    builder.box((panel_x - 0.06, oy0, oz0), (panel_x + 0.12, oy1, oz0 + 1.05),
                PARAPET)


def _panel_material(spec):
    """Concrete whose shade comes from the per-panel tone attribute.

    Built by hand rather than through the material preset system because it
    needs to read a mesh attribute, which the declarative material schema
    deliberately does not expose. Supplying `panel_material` in the scene file
    replaces this and loses the panel-to-panel variation.
    """
    from ..validate import parse_color

    mat = bpy.data.materials.new("PanelConcrete")
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = 0.89

    tone = nt.nodes.new("ShaderNodeVertexColor")
    tone.layer_name = TONE_LAYER
    tone.location = (-800, 0)

    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.location = (-600, 0)
    # Tones are generated across the full 0-1 range, so the stops sit at the
    # extremes; ColorRamp positions outside that range clamp silently.
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = (*parse_color(
        spec.get("panel_dark") or "#5f6259", "", []), 1.0)
    ramp.color_ramp.elements[1].position = 1.0
    ramp.color_ramp.elements[1].color = (*parse_color(
        spec.get("panel_light") or "#b3b2a6", "", []), 1.0)
    nt.links.new(tone.outputs["Color"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])

    # Fine aggregate roughness so the concrete catches the flat light.
    coords = nt.nodes.new("ShaderNodeTexCoord")
    coords.location = (-800, -300)
    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.location = (-620, -300)
    mapping.inputs["Scale"].default_value = (9.0, 9.0, 9.0)
    nt.links.new(coords.outputs["Object"], mapping.inputs["Vector"])

    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.location = (-440, -300)
    noise.inputs["Scale"].default_value = 1.0
    noise.inputs["Detail"].default_value = 8.0
    nt.links.new(mapping.outputs["Vector"], noise.inputs["Vector"])

    bump = nt.nodes.new("ShaderNodeBump")
    bump.location = (-240, -300)
    bump.inputs["Strength"].default_value = 0.14
    nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def _materials(spec, library):
    """The five slots a facade uses, in order."""
    trim = {
        "preset": "concrete",
        "color": "#75736c",
        "bump": {"type": "noise", "scale": 8.0, "strength": 0.10},
    }
    glass = {
        "preset": "glass",
        "color": "#20262a",
        "roughness": 0.06,
        "transmission": 0.0,
        "metallic": 0.15,
    }
    lit = {
        "preset": "emission",
        "emission_color": "#d8c9a3",
        "emission_strength": 2.2,
    }
    parapet = {
        "preset": "concrete",
        "color": "#8a8880",
        "bump": {"type": "noise", "scale": 12.0, "strength": 0.14},
    }

    panel = spec.get("panel_material")
    return [
        library.resolve(panel, None, "panel") if panel not in (None, {}, "")
        else _panel_material(spec),
        library.resolve(spec.get("trim_material"), trim, "trim"),
        library.resolve(spec.get("glass_material"), glass, "glass"),
        library.resolve(spec.get("lit_material"), lit, "lit"),
        library.resolve(spec.get("parapet_material"), parapet, "parapet"),
    ]
