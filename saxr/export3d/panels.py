"""Textured panel creation for image-backed DataRep planes (xy, zy, xz, legend, etc.)."""

from __future__ import annotations

import math
import os

import bpy


def create_panel(rep: dict, folder: str, data_stage, data_scene) -> None:
    """Create a textured plane panel and link it into the scene collection."""
    ptype = rep['type'].lower()
    rotx = math.pi / 2.0
    roty = 0.0
    if rep['h'] > rep['d']:
        dim = (rep['w'], rep['h'], 0.0)
    else:
        dim = (rep['w'], rep['d'], 0.0)
        rotx = 0.0
    pos = (rep['x'], -rep['z'], rep['y'] + rep['h'] / 2.0)
    if ptype.startswith("-xy"):
        roty = math.pi
    if ptype.startswith("-zy"):
        roty = math.pi / 2.0
    if ptype.startswith("zy"):
        roty = -math.pi / 2.0
    if ptype.startswith("xz"):
        rotx = 0.0
    if ptype.startswith("l") and '=' in ptype:
        rotx = 0.0
    bpy.ops.mesh.primitive_plane_add(size=1.0, location=pos, rotation=(rotx, 0.0, roty))
    plane = bpy.context.active_object
    plane.data.name = plane.name = ptype
    plane.dimensions = dim
    img_file = os.path.join(folder, os.path.basename(rep['asset']))
    img = bpy.data.images.load(img_file)
    mat = bpy.data.materials.new(ptype)
    mat.use_backface_culling = True
    mat.blend_method = 'CLIP'
    node_tex = mat.node_tree.nodes.new("ShaderNodeTexImage")
    node_tex.image = img
    links = mat.node_tree.links
    links.new(node_tex.outputs[0], mat.node_tree.nodes[0].inputs["Base Color"])
    links.new(node_tex.outputs[1], mat.node_tree.nodes[0].inputs["Alpha"])
    bpy.context.active_object.data.materials.append(mat)
    if ptype == rep['type']:
        data_stage.objects.unlink(plane)
        data_scene.objects.link(plane)
