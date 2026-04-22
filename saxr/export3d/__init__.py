"""Blender 3D export sub-package for the SAXR pipeline.

Provides:
- :class:`Exporter3D` — orchestrator that reads datareps.json and builds a Blender scene.
- :func:`main` — CLI entry point.
- :class:`Materials` — colour-keyed PBR material cache.
- :data:`SHAPE_REGISTRY` — type→handler mapping for DataRep shapes.
- Pure helpers: :func:`kv2dict`, :func:`position`, :func:`scale`.
- Scene setup: :func:`create_data_stage`, :func:`clean_scene`.
- File export: :func:`save_scene`.
- Panel creation: :func:`create_panel`.
"""

from .helpers import kv2dict, position, scale
from .materials import Materials
from .shapes import SHAPE_REGISTRY
from .scene_setup import clean_scene, create_data_stage
from .file_export import save_scene
from .panels import create_panel
from .exporter import Exporter3D, main

__all__ = [
    "Exporter3D",
    "main",
    "kv2dict",
    "position",
    "scale",
    "Materials",
    "SHAPE_REGISTRY",
    "clean_scene",
    "create_data_stage",
    "save_scene",
    "create_panel",
]
