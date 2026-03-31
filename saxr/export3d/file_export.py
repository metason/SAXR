"""Scene export helpers — dispatch to the correct bpy export operator."""

from __future__ import annotations

import logging
import os

import bpy

logger = logging.getLogger(__name__)


def save_scene(folder: str, output_file: str, format_name: str) -> None:
    """Export the current Blender scene to *folder/output_file*."""
    output_path = os.path.join(folder, output_file)
    logger.info("Saving %s", output_path)
    if format_name == "blend":
        bpy.ops.wm.save_as_mainfile(filepath=output_path, check_existing=False)
    elif format_name in ("usdc", "usdz"):
        bpy.ops.wm.usd_export(filepath=output_path, check_existing=False, export_mesh_colors=True, convert_orientation=True, export_global_forward_selection='NEGATIVE_Z', export_global_up_selection='Y')
    elif format_name == "fbx":
        bpy.ops.export_scene.fbx(filepath=output_path, check_existing=False)
    elif format_name == "gltf":
        bpy.ops.export_scene.gltf(filepath=output_path, check_existing=False, export_format='')
    elif format_name == "glb":
        bpy.ops.export_scene.gltf(filepath=output_path, check_existing=False, export_format='GLB')
