"""Shape handler functions and SHAPE_REGISTRY for 3D DataRep creation.

Each public ``create_*`` function has the signature::

    def create_<shape>(rep: dict, setup_fn: SetupFn) -> None

where *setup_fn* is a callback (typically ``Exporter3D._setup_data_rep_item``)
that assigns material and moves the object into the scene collection.

New shapes can be added by writing a handler and registering it in
:data:`SHAPE_REGISTRY` — no changes to ``Exporter3D._create_data_rep`` needed.
"""

from __future__ import annotations

import math
from typing import Callable

import bpy

from .helpers import kv2dict, position, scale

# Type alias for the setup callback
SetupFn = Callable[[dict], None]


# ── Simple primitives ────────────────────────────────────────────────────

def create_sphere(rep: dict, setup_fn: SetupFn) -> None:
    """Create an ico-sphere DataRep."""
    pos, sc = position(rep), scale(rep)
    bpy.ops.mesh.primitive_ico_sphere_add(
        radius=0.5, subdivisions=3, location=pos, scale=sc,
    )
    bpy.ops.object.shade_smooth()
    setup_fn(rep)


def create_box(rep: dict, setup_fn: SetupFn) -> None:
    """Create a cube DataRep."""
    pos, sc = position(rep), scale(rep)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=pos, scale=sc)
    setup_fn(rep)


def create_cylinder(rep: dict, setup_fn: SetupFn) -> None:
    """Create a cylinder DataRep."""
    pos, sc = position(rep), scale(rep)
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=32, radius=0.5, depth=1.0, location=pos, scale=sc,
    )
    bpy.ops.object.shade_smooth()
    setup_fn(rep)


def create_pyramid(rep: dict, setup_fn: SetupFn) -> None:
    """Create an upward-pointing pyramid (4-sided cone)."""
    pos, sc = position(rep), scale(rep)
    bpy.ops.mesh.primitive_cone_add(
        vertices=4, radius1=0.5, depth=1.0, location=pos, scale=sc,
    )
    setup_fn(rep)


def create_pyramid_down(rep: dict, setup_fn: SetupFn) -> None:
    """Create a downward-pointing pyramid."""
    pos, sc = position(rep), scale(rep)
    bpy.ops.mesh.primitive_cone_add(
        vertices=4, radius1=0.5, depth=1.0,
        location=pos, scale=sc, rotation=(math.pi, 0, 0),
    )
    setup_fn(rep)


# ── Compound primitives ──────────────────────────────────────────────────

def create_octahedron(rep: dict, setup_fn: SetupFn) -> None:
    """Create an octahedron from two opposing cones."""
    pos, sc = position(rep), scale(rep)
    bpy.ops.mesh.primitive_cone_add(
        vertices=4, radius1=0.5, depth=0.5,
        location=(pos[0], pos[1], pos[2] + rep['h'] / 4.0), scale=sc,
    )
    upper = bpy.context.active_object
    bpy.ops.mesh.primitive_cone_add(
        vertices=4, radius1=0.5, depth=0.5,
        location=(pos[0], pos[1], pos[2] - rep['h'] / 4.0),
        scale=sc, rotation=(math.pi, 0, 0),
    )
    lower = bpy.context.active_object
    upper.select_set(True)
    lower.select_set(True)
    bpy.ops.object.join()
    setup_fn(rep)


def _create_composite(
    rep: dict,
    setup_fn: SetupFn,
    arm_scales: list[tuple[float, float, float]],
    rotation: tuple[float, float, float] | None = None,
) -> None:
    """Create a composite shape from multiple cubes joined together.

    Shared implementation for :func:`create_plus` and :func:`create_cross`.
    """
    pos = position(rep)
    objects = []
    for sc in arm_scales:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=pos, scale=sc)
        objects.append(bpy.context.active_object)
    for obj in objects:
        obj.select_set(True)
    bpy.ops.object.join()
    if rotation is not None:
        bpy.context.active_object.rotation_euler = rotation
    setup_fn(rep)


def create_plus(rep: dict, setup_fn: SetupFn) -> None:
    """Create a 3D plus sign from three orthogonal bars."""
    w, d, h = rep['w'], rep['d'], rep['h']
    _create_composite(rep, setup_fn, arm_scales=[
        (w, d * 0.2, h * 0.2),
        (w * 0.2, d, h * 0.2),
        (w * 0.2, d * 0.2, h),
    ])


def create_cross(rep: dict, setup_fn: SetupFn) -> None:
    """Create a rotated 3D cross from three orthogonal bars."""
    w, d, h = rep['w'], rep['d'], rep['h']
    _create_composite(rep, setup_fn, arm_scales=[
        (w, d * 0.15, h * 0.15),
        (w * 0.15, d, h * 0.15),
        (w * 0.15, d * 0.15, h),
    ], rotation=(math.pi / 6.0, math.pi / 5.0, math.pi / 4.0))


# ── Geometry-based shapes ────────────────────────────────────────────────

def create_arc(rep: dict, setup_fn: SetupFn) -> None:
    """Create a pie-chart arc via mesh spin."""
    kvs = kv2dict(rep['asset'])
    rotx = math.pi / 2.0
    w = rep['w'] / 2.0 * float(kvs['ratio'])
    shift = (rep['w'] / 4.0) * (1.0 + float(kvs['ratio']))
    dim = (w, rep['h'], 0.0)

    bpy.ops.mesh.primitive_plane_add(
        size=1.0, location=(shift, 0.0, rep['h'] / 2.0),
        rotation=(rotx, 0.0, 0.0),
    )
    plane = bpy.context.active_object
    plane.dimensions = dim

    pivot = (0.0, 0.0, 0.0)
    rot_start = float(kvs['start']) * math.pi / 180.0
    bpy.ops.transform.rotate(value=rot_start, center_override=pivot)

    bpy.ops.object.mode_set(mode='EDIT')
    rot_angle = -float(kvs['angle']) * math.pi / 180.0
    bpy.ops.mesh.spin(
        steps=32, angle=rot_angle, center=(0, 0, 0), axis=(0, 0, 1),
    )
    bpy.ops.object.mode_set(mode='OBJECT')

    arc = bpy.context.active_object
    arc.data.name = plane.name = rep['type']
    setup_fn(rep)


def create_plane(rep: dict, setup_fn: SetupFn) -> None:
    """Create a flat plane DataRep."""
    rotx = math.pi / 2.0
    roty = 0.0
    if rep['h'] > rep['d']:
        dim = (rep['w'], rep['h'], 0.0)
    else:
        dim = (rep['w'], rep['d'], 0.0)
        rotx = 0.0

    pos = (rep['x'], -rep['z'], rep['y'] + rep['h'] / 2.0)
    bpy.ops.mesh.primitive_plane_add(
        size=1.0, location=pos, rotation=(rotx, 0.0, roty),
    )
    plane = bpy.context.active_object
    plane.data.name = plane.name = rep['type']
    plane.dimensions = dim
    setup_fn(rep)


def create_text(rep: dict, setup_fn: SetupFn) -> None:
    """Create a 3D text mesh DataRep."""
    bpy.ops.object.text_add()
    obj = bpy.context.object
    obj.data.body = rep['asset']
    obj.select_set(True)
    bpy.ops.object.convert(target='MESH')

    w = obj.dimensions[0]
    h = obj.dimensions[1]
    roty = 0.0
    rotz = 0.0

    if rep['h'] > rep['d']:
        factor = 1.0 * rep['h'] / h
        rotx = math.pi / 2.0
        pos = (rep['x'] - w * factor / 2.0, -rep['z'], rep['y'])
    else:
        factor = 1.0 * rep['d'] / h
        rotx = 0.0
        pos = (rep['x'] - w * factor / 2.0, -rep['z'] - h * factor / 2.0, rep['y'])

    obj.rotation_euler = (rotx, roty, rotz)
    obj.location = pos
    obj.scale = (factor, factor, factor)
    setup_fn(rep)


# ── Registry ─────────────────────────────────────────────────────────────

SHAPE_REGISTRY: dict[str, Callable[[dict, SetupFn], None]] = {
    "sphere":       create_sphere,
    "box":          create_box,
    "cylinder":     create_cylinder,
    "pyramid":      create_pyramid,
    "pyramid_down": create_pyramid_down,
    "octahedron":   create_octahedron,
    "plus":         create_plus,
    "cross":        create_cross,
    "arc":          create_arc,
    "plane":        create_plane,
    "text":         create_text,
}
