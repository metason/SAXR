"""Dimension and encoding resolution for DataRepGenerator.

This module contains the two heaviest pieces of configuration logic:

* :func:`deduce_dimensions` — inspects the pandas DataFrame to classify
  each column as *nominal*, *temporal*, or *quantitative* and to compute
  its domain (unique categories or [min, max]).
* :func:`deduce_encoding` — resolves every visual channel (x, y, z,
  colour, shape, size) by combining the user-supplied ``encoding`` dict
  from *config.json* with the deduced dimension metadata.  It builds
  scale objects (domain → range) and sets the generator's boundary /
  factor attributes used later for coordinate mapping.
"""
from __future__ import annotations

from typing import TYPE_CHECKING

import matplotlib.pyplot as plt

from .constants import SHAPES, MARKERS, MARKER_SYMBOLS
from .helpers import rgb2hex

if TYPE_CHECKING:
    from .generator import DataRepGenerator


def deduce_dimensions(gen: DataRepGenerator) -> None:
    """Infer dimension type and domain from the loaded DataFrame.

    For each column the dtype is inspected:

    * ``object`` / ``category`` / ``string`` → *nominal*
    * ``datetime64`` → *temporal*
    * ``int64`` / anything else → *quantitative*

    If the user already provided a ``scale.domain`` in config.json the
    automatic domain calculation is skipped for that column.

    Args:
        gen: The generator instance whose ``df`` and ``encoding`` are read
             and whose ``dimension`` dict is populated in-place.
    """
    print(gen.df.columns)
    print(gen.encoding)
    for col in gen.df.columns:
        calcDomain = True
        spec = {}

        # Honour a user-supplied domain (config.json) if present
        if col in gen.encoding and 'scale' in gen.encoding[col] and 'domain' in gen.encoding[col]['scale']:
            spec['domain'] = gen.encoding[col]['scale']['domain']
            calcDomain = False
        print(col, calcDomain)
        # --- Classify column dtype -----------------------------------------------
        if gen.df[col].dtype == 'object' or gen.df[col].dtype == 'category' or gen.df[col].dtype == 'str' or gen.df[col].dtype.name == 'string':
            spec['type'] = 'nominal'
            if calcDomain:
                cat = gen.df[col].unique()
                # Only store categories when cardinality is low enough to be useful
                if cat.size < gen.df[col].size or len(cat) <= 10:
                    spec['domain'] = cat.tolist()
        elif gen.df[col].dtype == 'datetime64[ns]':
            spec['type'] = 'temporal'
            if calcDomain:
                spec['domain'] = [str(gen.df[col].min()), str(gen.df[col].max())]
        elif gen.df[col].dtype == 'int64':
            spec['type'] = 'quantitative'
            if calcDomain:
                spec['domain'] = [int(gen.df[col].min()), int(gen.df[col].max())]
        else:
            spec['type'] = 'quantitative'
            if calcDomain:
                spec['domain'] = [float(gen.df[col].min()), float(gen.df[col].max())]
        gen.dimension[col] = spec
    print("Dimensions:")
    print(gen.dimension)


def deduce_encoding(gen: DataRepGenerator) -> None:
    """Compute scales, ranges, and factors for each visual channel.

    Iterates over the channels **x, y, z, color, shape, size** (when
    present) and for each one:

    1. Resolves the data-column ``field`` alias.
    2. Looks up or builds a ``scale`` dict with ``domain`` and ``range``.
    3. For *quantitative* axes adds a 5 % padding (scatter only) and
       computes the linear ``factor`` used by ``placeX``/``placeY``/
       ``placeZ``.
    4. For *nominal* channels (colour, shape) maps categories to a
       colour palette or shape list.

    Args:
        gen: The generator instance — mutated in-place.
    """
    # === X channel ================================================================
    if 'x' in gen.encoding:
        key = 'x'
        scale = None

        # Resolve field alias (e.g. encoding.x.field = "sepal_length")
        if 'field' in gen.encoding["x"] and isinstance(gen.encoding["x"]['field'], str):
            xkey = gen.encoding["x"]['field']
            if xkey != key:
                if key in gen.dimension:
                    gen.dimension[xkey] = gen.dimension[key]
                key = xkey
            if 'title' not in gen.encoding['x']:
                gen.encoding['x']['title'] = key

        # Build the scale: domain → range (stage coordinates)
        if key in gen.dimension and 'domain' in gen.dimension[key]:
            if 'x' in gen.encoding and 'scale' in gen.encoding['x'] and 'domain' in gen.encoding['x']['scale']:
                scale = {'domain': gen.encoding['x']['scale']['domain']}
            else:
                scale = {'domain': gen.dimension[key]['domain']}
            if 'range' in gen.dimension[key]:
                scale['range'] = gen.dimension[key]['range']
            else:
                scale['range'] = [-gen.chartWidth/2.0, gen.chartWidth/2.0]
            gen.encoding['x']['scale'] = scale

        # For quantitative axes: compute boundary padding and linear factor
        if key in gen.dimension and 'type' in gen.dimension[key]:
            type = gen.dimension[key]['type']
            gen.encoding['x']['type'] = type
            if type == 'quantitative':
                min = gen.encoding['x']['scale']['domain'][0]
                max = gen.encoding['x']['scale']['domain'][1]
                delta = 0.0
                if gen.plot == 'scatter':
                    delta = (max - min) * 0.05   # 5 % padding for scatter plots
                gen.lowerX = min - delta
                gen.upperX = max + delta
                if 'range' in gen.encoding['x']['scale']:     
                    gen.factorX = (gen.encoding['x']['scale']['range'][1] - gen.encoding['x']['scale']['range'][0]) / (gen.upperX - gen.lowerX)   

    # === Y channel ================================================================
    if 'y' in gen.encoding:
        key = 'y'
        scale = None

        # Resolve field alias
        if 'field' in gen.encoding["y"] and isinstance(gen.encoding["y"]['field'], str):
            ykey = gen.encoding["y"]['field']
            if ykey != key:
                if key in gen.dimension:
                    gen.dimension[ykey] = gen.dimension[key]
                key = ykey
            if 'title' not in gen.encoding['y']:
                gen.encoding['y']['title'] = key
            if 'type' in gen.dimension[key]:
                type = gen.dimension[key]['type']
                gen.encoding['y']['type'] = type

        # Build scale (y range starts at 0 — no centering)
        if key in gen.dimension and 'domain' in gen.dimension[key]:
            if 'y' in gen.encoding and 'scale' in gen.encoding['y'] and 'domain' in gen.encoding['y']['scale']:
                scale = {'domain': gen.encoding['y']['scale']['domain']}
            else:
                scale = {'domain': gen.dimension[key]['domain']}
            if 'range' in gen.dimension[key]:
                scale['range'] = gen.dimension[key]['range']
            else:
                scale['range'] = [0.0, gen.chartHeight]
            gen.encoding['y']['scale'] = scale

        # Quantitative boundary + factor (same 5 % padding for scatter)
        if gen.encoding['y']['type'] == 'quantitative':
            min = gen.encoding['y']['scale']['domain'][0]
            max = gen.encoding['y']['scale']['domain'][1]
            delta = 0.0
            if gen.plot == 'scatter':
                delta = (max - min) * 0.05
            gen.lowerY = min - delta
            gen.upperY = max + delta
            if 'range' in gen.encoding['y']['scale']:     
                gen.factorY = (gen.encoding['y']['scale']['range'][1] - gen.encoding['y']['scale']['range'][0]) / (gen.upperY - gen.lowerY)  
        
    # === Z channel ================================================================
    if 'z' in gen.encoding:
        key = 'z'
        scale = None

        # Resolve field alias
        if 'field' in gen.encoding["z"] and isinstance(gen.encoding["z"]['field'], str):
            zkey = gen.encoding["z"]['field']
            if zkey != key:
                if key in gen.dimension:
                    gen.dimension[zkey] = gen.dimension[key]
                key = zkey
            if 'title' not in gen.encoding['z']:
                gen.encoding['z']['title'] = key
        if key in gen.dimension and 'domain' in gen.dimension[key]:
            if 'z' in gen.encoding and 'scale' in gen.encoding['z'] and 'domain' in gen.encoding['z']['scale']:
                scale = {'domain': gen.encoding['z']['scale']['domain']}
            else:
                scale = {'domain': gen.dimension[key]['domain']}
            if 'range' in gen.dimension[key]:
                scale['range'] = gen.dimension[key]['range']
            else:
                scale['range'] = [-gen.chartDepth/2.0, gen.chartDepth/2.0]
            gen.encoding['z']['scale'] = scale
        if key in gen.dimension and 'type' in gen.dimension[key]:
            type = gen.dimension[key]['type']
            gen.encoding['z']['type'] = type
            if type == 'quantitative':
                min = gen.encoding['z']['scale']['domain'][0]
                max = gen.encoding['z']['scale']['domain'][1]
                delta = 0.0
                if gen.plot == 'scatter':
                    delta = (max - min) * 0.05
                gen.lowerZ = min - delta
                gen.upperZ = max + delta
                if 'range' in gen.encoding['z']['scale']:     
                    gen.factorZ = (gen.encoding['z']['scale']['range'][1] - gen.encoding['z']['scale']['range'][0]) / (gen.upperZ - gen.lowerZ)  
        
    # === Colour channel ===========================================================
    if 'color' in gen.encoding:
        key = 'color'
        if 'field' in gen.encoding["color"] and isinstance(gen.encoding["color"]['field'], str):
            key = gen.encoding["color"]['field']
            if 'title' not in gen.encoding['color']:
                gen.encoding['color']['title'] = key
            cat = []
            if key in gen.dimension and 'type' in gen.dimension[key]:
                type = gen.dimension[key]['type']
                gen.encoding['color']['type'] = type
            if key in gen.dimension and 'domain' in gen.dimension[key]:
                if 'color' in gen.encoding and 'scale' in gen.encoding['color'] and 'domain' in gen.encoding['color']['scale']:
                    cat = gen.encoding['color']['scale']['domain']
                else:
                    cat = gen.dimension[key]['domain']
                if 'labels' not in gen.encoding['color']:
                    gen.encoding['color']['labels'] = cat

                if 'color' in gen.encoding and 'scale' in gen.encoding['color'] and 'range' in gen.encoding['color']['scale']:
                    scale = {'domain': cat, 'range': gen.encoding['color']['scale']['range']}
                    gen.encoding['color']['scale'] = scale
                else:
                    # Nominal (<=10 categories): pick from a qualitative palette
                    if type != 'quantitative' and len(cat) <= 10:
                        rgb_values = plt.get_cmap(gen.palette['nominal']).colors
                        color_list = [rgb2hex(r, g, b) for r, g, b in rgb_values[:len(cat)]]
                        scale = {'domain': cat, 'range': color_list}
                        gen.encoding['color']['scale'] = scale
                    else:
                        # Quantitative: sample two colours from a sequential colormap
                        cmap = plt.get_cmap(gen.palette['metrical'])
                        rgb0 = cmap(cat[0])
                        rgb1 = cmap(cat[1])
                        rgb_values = [rgb0, rgb1]
                        print("rgb_values")
                        print(rgb_values)
                        color_list = [rgb2hex(r, g, b) for r, g, b, a in rgb_values[:len(cat)]]
                        scale = {'domain': cat, 'range': color_list}
                        gen.encoding['color']['scale'] = scale

    # === Shape channel ============================================================
    if 'shape' in gen.encoding:
        key = 'shape'
        if 'field' in gen.encoding['shape'] and isinstance(gen.encoding["shape"]['field'], str):
            key = gen.encoding['shape']['field']
        if 'title' not in gen.encoding['shape']:
            gen.encoding['shape']['title'] = key
        cat = []
        if key in gen.dimension and 'type' in gen.dimension[key]:
            type = gen.dimension[key]['type']
            gen.encoding['shape']['type'] = type
        if key in gen.dimension and 'domain' in gen.dimension[key]:
            if 'shape' in gen.encoding and 'scale' in gen.encoding['shape'] and 'domain' in gen.encoding['shape']['scale']:
                cat = gen.encoding['shape']['scale']['domain']
            else:
                cat = gen.dimension[key]['domain']
        # Cap at 7 — we only have 7 distinct 3D shapes / markers
        if len(cat) <= 7:
            gen.encoding['shape']['labels'] = cat
            gen.encoding['shape']['marks'] = MARKER_SYMBOLS[:len(cat)]
            scale = {'domain': cat, 'range': SHAPES[:len(cat)]}
            gen.encoding['shape']['scale'] = scale

    # === Size channel =============================================================
    if 'size' in gen.encoding:
        key = 'size'
        if 'field' in gen.encoding["size"]:
            key = gen.encoding["size"]['field']
        if key in gen.dimension and 'type' in gen.dimension[key]:
            type = gen.dimension[key]['type']
            gen.encoding['size']['type'] = type
        cat = []
        if key in gen.dimension and 'domain' in gen.dimension[key]:
            cat = gen.dimension[key]['domain']
            if len(cat) <= 7:
                gen.encoding['size']['labels'] = cat
                scale = {'domain': cat, 'range': []}
                gen.encoding['size']['scale'] = scale
        # Inline size values override the data column
        if 'values' in gen.encoding["size"]:
            gen.df['size'] = gen.encoding["size"]["values"]
    print("Encoding:")
    print(gen.encoding)
    print("Boundaries: ", gen.lowerX, gen.upperX, gen.lowerY, gen.upperY, gen.lowerZ, gen.upperZ)
