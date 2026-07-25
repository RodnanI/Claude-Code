"""Basic shapes.

These use Blender's own primitive operators, then override the transform from
the scene file so that `location`, `rotation_deg` and `scale` behave
identically for primitives and for generated scenery.
"""

from __future__ import annotations

import bpy

from ..util import apply_transform, shade_smooth


def build_primitive(spec: dict, library, warn):
    kind = spec["type"]

    if kind == "plane":
        size = spec.get("size", 10.0)
        subdivisions = spec.get("subdivisions", 0)
        if subdivisions > 0:
            bpy.ops.mesh.primitive_grid_add(
                x_subdivisions=subdivisions + 1, y_subdivisions=subdivisions + 1,
                size=size)
        else:
            bpy.ops.mesh.primitive_plane_add(size=size)
        obj = bpy.context.object

    elif kind == "cube":
        size = spec.get("size", 2.0)
        bpy.ops.mesh.primitive_cube_add(
            size=size if isinstance(size, (int, float)) else 1.0)
        obj = bpy.context.object
        if not isinstance(size, (int, float)):
            # A per-axis size is applied to the unit cube via its mesh so the
            # object's own `scale` field stays free for the author to use.
            for vertex in obj.data.vertices:
                vertex.co.x *= size[0]
                vertex.co.y *= size[1]
                vertex.co.z *= size[2]

    elif kind == "sphere":
        bpy.ops.mesh.primitive_uv_sphere_add(
            radius=spec.get("radius", 1.0),
            segments=spec.get("segments", 48),
            ring_count=spec.get("rings", 24))
        obj = bpy.context.object
        shade_smooth(obj, True)

    elif kind == "cylinder":
        bpy.ops.mesh.primitive_cylinder_add(
            radius=spec.get("radius", 1.0),
            depth=spec.get("depth", 2.0),
            vertices=spec.get("vertices", 48),
            end_fill_type="NGON" if spec.get("caps", True) else "NOTHING")
        obj = bpy.context.object
        _smooth_sides(obj)

    elif kind == "cone":
        bpy.ops.mesh.primitive_cone_add(
            radius1=spec.get("radius", 1.0),
            radius2=spec.get("radius_top", 0.0),
            depth=spec.get("depth", 2.0),
            vertices=spec.get("vertices", 48))
        obj = bpy.context.object
        _smooth_sides(obj)

    elif kind == "torus":
        bpy.ops.mesh.primitive_torus_add(
            major_radius=spec.get("major_radius", 1.0),
            minor_radius=spec.get("minor_radius", 0.25),
            major_segments=spec.get("segments", 48),
            minor_segments=max(12, spec.get("segments", 48) // 2))
        obj = bpy.context.object
        shade_smooth(obj, True)

    else:
        raise AssertionError(f"build_primitive called with {kind!r}")

    if spec.get("id"):
        obj.name = spec["id"]
    apply_transform(obj, spec)

    if spec.get("shade_smooth") is not None:
        shade_smooth(obj, spec["shade_smooth"])

    material = library.resolve(spec.get("material"), {"preset": "matte"}, kind)
    obj.data.materials.clear()
    obj.data.materials.append(material)
    return obj


def _smooth_sides(obj):
    """Smooth the curved wall of a cylinder or cone but keep the caps flat.

    Flat caps read as machined edges; smoothing everything makes the rim look
    melted. Side faces are the quads, caps are the n-gons and triangles.
    """
    for polygon in obj.data.polygons:
        polygon.use_smooth = len(polygon.vertices) == 4
