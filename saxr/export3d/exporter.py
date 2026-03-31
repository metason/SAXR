"""Exporter3D — orchestrator that reads datareps.json and builds a 3D Blender scene."""

from __future__ import annotations

import json
import logging
import os
import sys
from typing import Any

import bpy

from saxr.constants import FORMAT_EXTENSIONS
from saxr.export3d.helpers import kv2dict          # re-exported for backward compat
from saxr.export3d.material_cache import MaterialCache
from saxr.export3d.shapes import SHAPE_REGISTRY
from saxr.export3d.file_export import save_scene
from saxr.export3d.scene_setup import create_data_stage
from saxr.export3d.panels import create_panel

logger = logging.getLogger(__name__)


class Exporter3D:
    """Reads ``datareps.json`` and builds a 3D Blender scene."""

    def __init__(self, folder: str, format_name: str = "blend") -> None:
        self.folder = folder
        self.format_name = format_name
        self.input_file = "datareps.json"
        self.output_file = FORMAT_EXTENSIONS.get(format_name, "viz.blend")
        self.data_stage: Any = None
        self.data_scenes: Any = None
        self.data_scene: Any = None
        self.materials = MaterialCache()

    def _setup_data_rep_item(self, rep: dict) -> None:
        """Assign material to the active object and move it into the scene collection."""
        obj = bpy.context.active_object
        obj.name = "DataRep." + rep['type']
        obj.data.materials.append(self.materials.get(rep['color']))
        self.data_stage.objects.unlink(obj)
        self.data_scene.objects.link(obj)

    def _create_data_stage(self) -> None:
        self.data_stage, self.data_scenes, self.data_scene = create_data_stage()

    def _save_file(self) -> None:
        save_scene(self.folder, self.output_file, self.format_name)

    def _create_panel(self, rep: dict) -> None:
        create_panel(rep, self.folder, self.data_stage, self.data_scene)

    def _create_data_rep(self, rep: dict) -> None:
        """Dispatch a single DataRep to the appropriate shape handler."""
        handler = SHAPE_REGISTRY.get(rep['type'])
        if handler is not None:
            if rep['type'] == 'surface':
                rep['folder'] = self.folder
            handler(rep, self._setup_data_rep_item)
        elif rep['type'] == 'encoding':
            logger.info("encoding: %s", rep['asset'])
        else:
            self._create_panel(rep)
        bpy.ops.object.select_all(action="DESELECT")

    def _execute(self, datareps: list) -> None:
        for rep in datareps[0]:
            self._create_data_rep(rep, )

    def run(self) -> None:
        """Full pipeline: set up stage, load datareps.json, create objects, save."""
        try:
            with open(os.path.join(self.folder, self.input_file), 'r') as data:
                self._create_data_stage()
                self._execute(json.load(data))
                self._save_file()
        except FileNotFoundError:
            logger.error(
                "Usage: python export3D.py <folder> <format>\n"
                "Folder needs to contain a <datareps.json> file created by datarepgen.py.\n"
                "Supported output formats: usdz, usdc, gltf, glb, fbx, blend.\n"
                "Given folder: %s", self.folder,
            )
            sys.exit(1)


def main() -> None:
    """Parse CLI args and run the Blender export pipeline."""
    folder = os.getcwd()
    format_name = "blend"

    if len(sys.argv) > 1:
        folder_name = sys.argv[1]
        logger.info("Sample folder: %s", folder_name)
        if folder_name.startswith('/'):
            folder = folder_name
        else:
            folder = os.path.join(folder, folder_name)
    logger.info("Resolved path: %s", folder)

    if len(sys.argv) > 2:
        format_name = sys.argv[2]

    Exporter3D(folder, format_name).run()
