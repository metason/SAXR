"""Shared constants for the SAXR data-rep pipeline.

All lists that describe shapes, markers, and marker symbols are kept in a
parallel structure: element *i* in each list represents the same visual
primitive.  The Unity runtime and Blender exporter both consume the
``SHAPES`` names, while ``MARKERS`` / ``MARKER_SYMBOLS`` are used only by
Matplotlib for 2-D panel rendering.
"""

# 3D shapes used in DataRep objects (consumed by Unity & Blender)
SHAPES: list[str] = ["sphere", "box", "pyramid", "pyramid_down", "octahedron", "plus", "cross"]

# Matplotlib 2D marker names (correspond 1:1 with SHAPES)
MARKERS: list[str] = ['circle', 'square', 'triangle_up', 'triangle_down', 'diamond', 'plus', 'cross']

# Matplotlib marker symbols (correspond 1:1 with SHAPES and MARKERS)
MARKER_SYMBOLS: list[str] = ['o', 's', '^', 'v', 'D', 'P', 'X']

# Default colour palettes keyed by dimension type
DEFAULT_PALETTE: dict[str, str] = {
    "metrical": "Oranges",
    "temporal": "Greys",
    "nominal": "tab10",
}

# Mapping from export format names to output file names
FORMAT_EXTENSIONS: dict[str, str] = {
    "blend": "viz.blend",
    "usdz":  "viz.usdz",
    "usdc":  "viz.usdc",
    "gltf":  "viz.gltf",
    "glb":   "viz.glb",
    "fbx":   "viz.fbx",
}
