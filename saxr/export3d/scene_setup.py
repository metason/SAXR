"""Blender scene setup — collection hierarchy and cleanup."""

from __future__ import annotations

import logging

import bpy

logger = logging.getLogger(__name__)


def clean_scene() -> None:
    """Remove all objects from the current Blender scene."""
    bpy.ops.object.select_all(action='DESELECT')
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()


def create_data_stage():
    """Set up ``Data_Stage > Data_Scenes > Scene`` collection hierarchy.

    Returns:
        Tuple of (data_stage, data_scenes, data_scene) collections.
    """
    logger.info("Blender %s", bpy.app.version_string)
    clean_scene()
    for ob in bpy.context.scene.objects:
        logger.debug("Remaining object: %s", ob)
    bpy.ops.object.select_all(action="DESELECT")
    data_stage = bpy.context.scene.collection.children[0]
    data_stage.name = "Data_Stage"
    data_scenes = bpy.data.collections.new("Data_Scenes")
    data_stage.children.link(data_scenes)
    data_scene = bpy.data.collections.new("Scene")
    data_scenes.children.link(data_scene)
    return data_stage, data_scenes, data_scene
