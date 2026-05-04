"""Blender PBR material cache — one material per colour name.

Materials are looked up by name in a local ``dict`` first (O(1)),
falling back to a scan of ``bpy.data.materials`` for materials that
were created outside this cache.
"""

from __future__ import annotations

from typing import Any

import bpy
import matplotlib.colors as mcolors


class Materials:
    """Cache that maps colour names to Blender ``bpy.types.Material`` objects.

    Identical colours share a single PBR material, avoiding duplicates.

    Example::

        mat = Materials.get("red")
        mat2 = Materials.get("red")  # same object, no new material
    """

    # static cache
    _cache: dict[str, Any] = {}

    @classmethod
    def get(cls, color: str) -> Any:
        """Return an existing material or create a new PBR material.

        Args:
            color: Any colour string accepted by ``matplotlib.colors``.

        Returns:
            A ``bpy.types.Material`` instance.
        """
        if color in Materials._cache:
            return Materials._cache[color]

        # Check bpy.data.materials for pre-existing materials
        for mat in bpy.data.materials:
            if mat.name == color:
                Materials._cache[color] = mat
                return mat

        # Create new PBR material
        material = bpy.data.materials.new(name=color)
        principled_bsdf_node = material.node_tree.nodes["Principled BSDF"]
        rgba = mcolors.to_rgba(color)
        principled_bsdf_node.inputs["Base Color"].default_value = rgba
        principled_bsdf_node.inputs["Metallic"].default_value = 0.2
        principled_bsdf_node.inputs["Roughness"].default_value = 1.0
        principled_bsdf_node.inputs["Alpha"].default_value = rgba[-1]

        Materials._cache[color] = material
        return material
