"""Shape handler functions and SHAPE_REGISTRY for 3D DataViz creation.

Each public ``create_*`` function has the signature::

    def create_<shape>(rep: dict, setup_fn: SetupFn) -> None

where *setup_fn* is a callback (typically ``Exporter3D._setup_data_rep_item``)
that assigns material and moves the object into the scene collection.

New shapes can be added by writing a handler and registering it in
:data:`SHAPE_REGISTRY` — no changes to ``Exporter3D._create_data_rep`` needed.
"""

from __future__ import annotations

import os
import math

from typing import Callable

import bpy
from .helpers import kv2dict, position, scale
from saxr.export3d.materials import Materials


# Type alias for the setup callback
SetupFn = Callable[[dict], None]

def magnitude(x): 
    return math.sqrt(sum(i**2 for i in x))

# ── Simple primitives ────────────────────────────────────────────────────

def create_sphere(rep: dict, setup_fn: SetupFn) -> None:
    """Create an ico-sphere DataViz."""
    pos, sc = position(rep), scale(rep)
    bpy.ops.mesh.primitive_ico_sphere_add(
        radius=0.5, subdivisions=3, location=pos, scale=sc,
    )
    bpy.ops.object.shade_smooth()
    setup_fn(rep)


def create_box(rep: dict, setup_fn: SetupFn) -> None:
    """Create a cube DataViz."""
    pos, sc = position(rep), scale(rep)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=pos, scale=sc)
    setup_fn(rep)


def create_cylinder(rep: dict, setup_fn: SetupFn) -> None:
    """Create a cylinder DataViz."""
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
    enlargeFactor = 1.3 # 2D diamond mark in Matplotlib is larger
    sc = [enlargeFactor * f for f in sc]
    bpy.ops.mesh.primitive_cone_add(
        vertices=4, radius1=0.5, depth=0.5,
        location=(pos[0], pos[1], pos[2] + (rep['h']*enlargeFactor) / 4.0), scale=sc,
    )
    upper = bpy.context.active_object
    bpy.ops.mesh.primitive_cone_add(
        vertices=4, radius1=0.5, depth=0.5,
        location=(pos[0], pos[1], pos[2] - (rep['h']*enlargeFactor) / 4.0),
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
        (w, d * 0.3, h * 0.3),
        (w * 0.3, d, h * 0.3),
        (w * 0.3, d * 0.3, h),
    ])


def create_cross(rep: dict, setup_fn: SetupFn) -> None:
    """Create a rotated 3D cross from three orthogonal bars."""
    w, d, h = rep['w'], rep['d'], rep['h']
    _create_composite(rep, setup_fn, arm_scales=[
        (w, d * 0.3, h * 0.3),
        (w * 0.3, d, h * 0.3),
        (w * 0.3, d * 0.3, h),
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

def create_line(rep: dict, setup_fn: SetupFn) -> None:
    """Create a line DataViz."""
    global lastColor
    pos = position(rep)
    v1 = (rep['x'] - rep['w']/2.0, rep['y'] - rep['h']/2.0, rep['z'] - rep['d']/2.0)
    v2 = (rep['x'] + rep['w']/2.0, rep['y'] + rep['h']/2.0, rep['z'] + rep['d']/2.0)
    dvec = (v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2])
    dist = magnitude(dvec)
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=8, radius=0.0025, depth=dist, location=pos, end_fill_type='NOTHING'
    )
    cylinder = bpy.context.active_object
    phi = math.atan2(dvec[2], dvec[0]) 
    theta = math.acos(dvec[1]/dist) 
    cylinder.rotation_euler[1] = theta
    cylinder.rotation_euler[2] = -phi
    cylinder.data.name = cylinder.name = rep['type']
    setup_fn(rep)

lastAreaColor:str = "" # used to create new area on changed color

def create_area(rep: dict, setup_fn: SetupFn) -> None:
    """Create a area DataViz."""
    global lastAreaColor
    v1 = (rep['x'] - rep['w']/2.0, -(rep['z'] - rep['d']/2.0), rep['y'] - rep['h']/2.0)
    v2 = (rep['x'] + rep['w']/2.0, -(rep['z'] + rep['d']/2.0), rep['y'] + rep['h']/2.0)
    v0 = (rep['x'] - rep['w']/2.0, -(rep['z'] - rep['d']/2.0), 0.0)
    v3 = (rep['x'] + rep['w']/2.0, -(rep['z'] + rep['d']/2.0), 0.0)
    verts = [v0, v1, v2, v3]
    edges = [[0,1],[1,2],[2,3],[3,0]]
    faces =  [(0, 1, 2, 3)]
    mesh = bpy.data.meshes.new("quad_mesh")
    mesh.from_pydata(verts, edges, faces)
    mesh.update()
    area = bpy.data.objects.new("area", mesh)
    area.data.name = area.name = "quad" # rep['type']
    area.data.materials.append(Materials.get(rep['color']))
    ds = bpy.context.scene.collection.children[0]
    if ds != None:
        scenes = ds.children[0]
        if scenes != None:
            scene = scenes.children[0]
            if scene != None:
                if len(scene.children) == 0 or rep['color'] != lastAreaColor:
                    line = bpy.data.collections.new("Area")
                    scene.children.link(line)
                line = scene.children[-1]
                line.objects.link(area)
                lastAreaColor = rep['color']

def create_plane(rep: dict, setup_fn: SetupFn) -> None:
    """Create a flat plane DataViz."""
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

def create_surface(rep: dict, setup_fn: SetupFn) -> None:
    """Create a surface DataViz."""
    rotx = math.pi / 2.0
    roty = 0.0
    fileURL = os.path.join(rep['folder'], 'surface.ply')
    bpy.ops.wm.ply_import(filepath=fileURL)
    surface = bpy.context.active_object
    surface.rotation_euler = (math.pi / 2.0, 0.0, 0.0)
    material = bpy.data.materials.new(name="vertexColoring")
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    if len(surface.data.materials) > 0:
        surface.data.materials[0] = material
    else:
        surface.data.materials.append(material)
    nodes.clear()
    node_attr = nodes.new(type='ShaderNodeVertexColor')
    #node_attr.layer_name = "displayColor"
    node_principled = nodes.new(type='ShaderNodeBsdfPrincipled')
    node_output = nodes.new(type='ShaderNodeOutputMaterial')
    
    links.new(node_attr.outputs['Color'], node_principled.inputs['Base Color'])
    links.new(node_principled.outputs['BSDF'], node_output.inputs['Surface'])

    node_principled.inputs["Metallic"].default_value = 0.2
    node_principled.inputs["Roughness"].default_value = 1.0
    #bpy.ops.object.shade_smooth()


def create_text(rep: dict, setup_fn: SetupFn) -> None:
    """Create a 3D text mesh DataViz."""
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
    "line":         create_line,
    "area":         create_area,
    "plane":        create_plane,
    "surface":      create_surface,
    "text":         create_text,
}
