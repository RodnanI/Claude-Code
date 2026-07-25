"""Camera placement and lens setup."""

from __future__ import annotations

import math

import bpy
from mathutils import Vector

from .util import aim

_CAMERA_TYPES = {"perspective": "PERSP", "orthographic": "ORTHO",
                 "panoramic": "PANO"}


def build_camera(spec: dict, registry: dict, warn):
    """Create the scene camera. `registry` maps object ids to objects."""
    data = bpy.data.cameras.new("Camera")
    obj = bpy.data.objects.new("Camera", data)
    bpy.context.collection.objects.link(obj)
    bpy.context.scene.camera = obj

    location = Vector(spec.get("location", (0.0, -10.0, 5.0)))
    obj.location = location

    data.type = _CAMERA_TYPES.get(spec.get("type", "perspective"), "PERSP")
    data.lens = spec.get("focal_length_mm", 50.0)
    data.sensor_width = spec.get("sensor_width_mm", 36.0)
    data.ortho_scale = spec.get("ortho_scale", 10.0)
    data.shift_x, data.shift_y = spec.get("shift", (0.0, 0.0))
    data.clip_start, data.clip_end = spec.get("clip", (0.1, 100000.0))

    if data.type == "PANO" and hasattr(data, "panorama_type"):
        data.panorama_type = {
            "equirectangular": "EQUIRECTANGULAR",
            "fisheye_equisolid": "FISHEYE_EQUISOLID",
        }.get(spec.get("panoramic_type", "equirectangular"), "EQUIRECTANGULAR")

    target = spec.get("look_at")
    if target is not None:
        aim(obj, Vector(target), spec.get("roll_deg", 0.0))
    elif spec.get("rotation_deg") is not None:
        obj.rotation_euler = tuple(math.radians(a) for a in spec["rotation_deg"])
    else:
        warn("camera has neither look_at nor rotation_deg; aiming at the origin.")
        aim(obj, Vector((0.0, 0.0, 0.0)), spec.get("roll_deg", 0.0))

    _apply_dof(obj, data, spec, location, target, registry, warn)
    return obj


def _apply_dof(obj, data, spec, location, target, registry, warn):
    dof_spec = spec.get("depth_of_field") or {}
    if not dof_spec.get("enabled"):
        data.dof.use_dof = False
        return

    data.dof.use_dof = True
    data.dof.aperture_fstop = dof_spec.get("f_stop", 2.8)
    data.dof.aperture_blades = dof_spec.get("blades", 0)

    focus_id = dof_spec.get("focus_object")
    if focus_id:
        focus_obj = registry.get(focus_id)
        if focus_obj is None:
            warn(f"camera.depth_of_field.focus_object {focus_id!r} matches no "
                 f"object id; falling back to a distance.")
        else:
            data.dof.focus_object = focus_obj
            return

    distance = dof_spec.get("focus_distance")
    if distance is None:
        if target is None:
            warn("depth of field is on but there is nothing to focus on; "
                 "using 10 m.")
            distance = 10.0
        else:
            # Focusing on the look_at point is almost always what was meant.
            distance = (Vector(target) - location).length
    data.dof.focus_distance = max(distance, 1e-4)
