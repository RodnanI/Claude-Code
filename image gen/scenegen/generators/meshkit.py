"""A minimal mesh builder.

Generated objects are assembled as one mesh with per-face material indices
rather than as parented hierarchies of primitives. One mesh means the scatter
system can make thousands of linked duplicates that share a single set of
vertex data, which is the difference between a forest that renders and one
that exhausts memory.
"""

from __future__ import annotations

import math

import bpy
from mathutils import Matrix, Vector


class MeshBuilder:
    """Accumulates vertices and faces, then emits a Blender mesh."""

    def __init__(self):
        self.verts: list[tuple[float, float, float]] = []
        self.faces: list[tuple[int, ...]] = []
        self.face_materials: list[int] = []
        self.smooth: list[bool] = []
        self.face_tones: list[float] = []
        # Set this before emitting faces and every face built afterwards
        # carries the value, which is how the facade tags each precast panel
        # with its own shade.
        self.tone = 1.0

    # -- helpers ----------------------------------------------------------

    def _add_face(self, indices, material, smooth):
        self.faces.append(tuple(indices))
        self.face_materials.append(material)
        self.smooth.append(smooth)
        self.face_tones.append(self.tone)

    @staticmethod
    def _frame(direction: Vector) -> Matrix:
        """A rotation taking +Z onto `direction`."""
        if direction.length < 1e-9:
            return Matrix.Identity(3)
        return direction.normalized().to_track_quat("Z", "Y").to_matrix()

    # -- primitives -------------------------------------------------------

    def quad(self, p0, p1, p2, p3, material=0, smooth=False):
        """One flat face from four corners, wound in order."""
        base = len(self.verts)
        self.verts += [tuple(p0), tuple(p1), tuple(p2), tuple(p3)]
        self._add_face((base, base + 1, base + 2, base + 3), material, smooth)

    def box(self, lo, hi, material=0, smooth=False):
        """An axis-aligned box spanning `lo` to `hi`."""
        (x0, y0, z0), (x1, y1, z1) = lo, hi
        base = len(self.verts)
        self.verts += [
            (x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),
            (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
        for face in ((0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4),
                     (2, 3, 7, 6), (1, 2, 6, 5), (0, 4, 7, 3)):
            self._add_face([base + i for i in face], material, smooth)

    def frame(self, y0, z0, y1, z1, oy0, oz0, oy1, oz1, x, material=0):
        """Four quads filling the area between an outer and an inner rectangle.

        Used for every wall surface that has a hole in it -- the plane around a
        window, the face of a panel around its opening. Building the wall as a
        frame avoids boolean geometry entirely, which keeps the mesh clean and
        the build fast even for thousands of openings.
        """
        # below, above, left, right
        self.quad((x, y0, z0), (x, y1, z0), (x, y1, oz0), (x, y0, oz0), material)
        self.quad((x, y0, oz1), (x, y1, oz1), (x, y1, z1), (x, y0, z1), material)
        self.quad((x, y0, oz0), (x, oy0, oz0), (x, oy0, oz1), (x, y0, oz1), material)
        self.quad((x, oy1, oz0), (x, y1, oz0), (x, y1, oz1), (x, oy1, oz1), material)

    def reveal(self, oy0, oz0, oy1, oz1, x_front, x_back, material=0):
        """The four side walls of a recess: window jambs, sill and head."""
        self.quad((x_front, oy0, oz0), (x_back, oy0, oz0),
                  (x_back, oy1, oz0), (x_front, oy1, oz0), material)
        self.quad((x_front, oy1, oz1), (x_back, oy1, oz1),
                  (x_back, oy0, oz1), (x_front, oy0, oz1), material)
        self.quad((x_front, oy0, oz1), (x_back, oy0, oz1),
                  (x_back, oy0, oz0), (x_front, oy0, oz0), material)
        self.quad((x_front, oy1, oz0), (x_back, oy1, oz0),
                  (x_back, oy1, oz1), (x_front, oy1, oz1), material)

    def tube(self, start, end, radius_start, radius_end, segments=12,
             material=0, smooth=True, cap_start=True, cap_end=True):
        """A tapered tube from `start` to `end`. Trunks, branches, stems."""
        start, end = Vector(start), Vector(end)
        rotation = self._frame(end - start)
        base = len(self.verts)

        for point, radius in ((start, radius_start), (end, radius_end)):
            for s in range(segments):
                angle = 2.0 * math.pi * s / segments
                local = Vector((math.cos(angle) * radius,
                                math.sin(angle) * radius, 0.0))
                self.verts.append(tuple(point + rotation @ local))

        for s in range(segments):
            nxt = (s + 1) % segments
            self._add_face(
                (base + s, base + nxt, base + segments + nxt, base + segments + s),
                material, smooth)

        if cap_start and radius_start > 1e-6:
            self.verts.append(tuple(start))
            centre = len(self.verts) - 1
            for s in range(segments):
                nxt = (s + 1) % segments
                self._add_face((centre, base + nxt, base + s), material, False)
        if cap_end and radius_end > 1e-6:
            self.verts.append(tuple(end))
            centre = len(self.verts) - 1
            for s in range(segments):
                nxt = (s + 1) % segments
                self._add_face(
                    (centre, base + segments + s, base + segments + nxt),
                    material, False)

    def cone(self, base_point, apex, radius, segments=16, material=0,
             smooth=True):
        self.tube(base_point, apex, radius, 0.0, segments, material, smooth,
                  cap_start=True, cap_end=False)

    def sphere(self, centre, radius, segments=16, rings=8, material=0,
               scale=(1.0, 1.0, 1.0), smooth=True, deform=None):
        """A UV sphere, optionally squashed by `scale` or bent by `deform`.

        `deform` receives the unit-sphere direction and returns a radius
        multiplier -- that is how rocks get their lumps.
        """
        centre = Vector(centre)
        base = len(self.verts)

        for ring in range(rings + 1):
            phi = math.pi * ring / rings
            sin_phi, cos_phi = math.sin(phi), math.cos(phi)
            for s in range(segments):
                theta = 2.0 * math.pi * s / segments
                unit = Vector((sin_phi * math.cos(theta),
                               sin_phi * math.sin(theta), cos_phi))
                r = radius * (deform(unit) if deform else 1.0)
                self.verts.append(tuple(centre + Vector(
                    (unit.x * r * scale[0], unit.y * r * scale[1],
                     unit.z * r * scale[2]))))

        for ring in range(rings):
            for s in range(segments):
                nxt = (s + 1) % segments
                a = base + ring * segments + s
                b = base + ring * segments + nxt
                c = base + (ring + 1) * segments + nxt
                d = base + (ring + 1) * segments + s
                if ring == 0:
                    self._add_face((a, c, d), material, smooth)
                elif ring == rings - 1:
                    self._add_face((a, b, c), material, smooth)
                else:
                    self._add_face((a, b, c, d), material, smooth)

    def blade(self, root, tip, width, material=0, droop=0.0, segments=5,
              smooth=True):
        """A tapering strip: palm fronds, grass blades, leaves.

        `droop` bends the strip downward along its length, which is what makes
        a frond look like it is hanging rather than sticking out rigidly.
        """
        root, tip = Vector(root), Vector(tip)
        axis = tip - root
        rotation = self._frame(axis)
        side = rotation @ Vector((1.0, 0.0, 0.0))
        base = len(self.verts)

        for i in range(segments + 1):
            t = i / segments
            # Quadratic sag, zero at the root and maximal at the tip.
            point = root + axis * t - Vector((0.0, 0.0, droop * t * t))
            half = width * 0.5 * (1.0 - t ** 1.5)
            self.verts.append(tuple(point - side * half))
            self.verts.append(tuple(point + side * half))

        for i in range(segments):
            a = base + i * 2
            self._add_face((a, a + 1, a + 3, a + 2), material, smooth)

    # -- output -----------------------------------------------------------

    def to_mesh(self, name: str, tone_layer: str | None = None):
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata(self.verts, [], self.faces)
        mesh.update()
        for polygon, material, smooth in zip(
                mesh.polygons, self.face_materials, self.smooth):
            polygon.material_index = material
            polygon.use_smooth = smooth

        if tone_layer:
            # Colour attributes only live on points or corners, so the
            # per-face value is written to each of that face's corners.
            attribute = mesh.color_attributes.new(
                name=tone_layer, type="FLOAT_COLOR", domain="CORNER")
            for polygon, tone in zip(mesh.polygons, self.face_tones):
                for corner in polygon.loop_indices:
                    attribute.data[corner].color = (tone, tone, tone, 1.0)

        mesh.validate(verbose=False)
        return mesh
