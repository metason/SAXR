"""Plot creators — scatter, bar, cluster, pie.

Each function takes a :class:`~saxr.generator.DataRepGenerator` instance,
reads its encoding / dimension state, and appends DataRep dicts to
``gen.visuals``.  These dicts are later serialised as ``datareps.json`` and
consumed by the Unity runtime or the Blender exporter.
"""
from __future__ import annotations

from typing import TYPE_CHECKING, Callable

import numpy as np

if TYPE_CHECKING:
    from .generator import DataRepGenerator


def create_cluster(gen: DataRepGenerator) -> None:
    """Generate bounding-box and centroid visuals per colour category.

    For every unique value in the colour column a translucent *box* is
    placed around the min/max extents of the subset, and a small *sphere*
    marks the median position.

    Args:
        gen: Generator whose ``visuals`` list is appended to.
    """
    k = gen.key('color')
    cats = gen.dimension[k]['domain']
    color = '#FF0000'
    idx = 0

    for cat in cats:
        # --- Compute axis-aligned bounding box for this category ------
        minx, maxx, miny, maxy, minz, maxz = 0, 0, 0, 0, 0, 0
        res = gen.df[gen.df[k] == cat]
        if gen.key('x') in res:
            minx = res[gen.key('x')].min()
            maxx = res[gen.key('x')].max()
        else:
            maxx = gen.encoding[gen.key('x')]['value']
            minx = maxx - 0.005
        if gen.key('y') in res:
            miny = res[gen.key('y')].min()
            maxy = res[gen.key('y')].max()
        else:
            maxy = gen.encoding[gen.key('y')]['value']
            miny = maxy - 0.005
        if gen.key('z') in res:
            minz = res[gen.key('z')].min()
            maxz = res[gen.key('z')].max()
        else:
            maxz = gen.encoding[gen.key('z')]['value'] + idx * 0.005
            minz = maxz - idx * 0.0075
        sw = gen.scaleX(maxx - minx)
        sh = gen.scaleY(maxy - miny)
        sd = gen.scaleZ(maxz - minz)
        if 'color' in gen.encoding:
            if 'scale' in gen.encoding['color'] and 'range' in gen.encoding['color']['scale']:
                color = gen.encoding['color']['scale']['range'][idx]

        alpha = 'AA'
        if 'opacity' in gen.encoding:
            opac = gen.encoding['opacity']['value']
            alpha = '%02x' % int(opac * 255.0)

        datavis = {"type": "box", "x": gen.placeX(minx + (maxx - minx) / 2.0), "y": gen.placeY(miny + (maxy - miny) / 2.0), "z": gen.placeZ(minz + (maxz - minz) / 2.0), "w": sw, "h": sh, "d": sd, "color": color + alpha}
        gen.visuals.append(datavis)

        # --- Median marker (centroid) for this category ----------------
        medianx, mediany, medianz = 0, 0, 0
        medianx = res[gen.key('x')].median()
        mediany = res[gen.key('y')].median()
        medianz = res[gen.key('z')].median()
        sm = 0.05
        if 'size' in gen.encoding:
            size = gen.encoding['size']['value']
            sm = size * 3.0
        datavis = {"type": "sphere", "x": gen.placeX(medianx), "y": gen.placeY(mediany), "z": gen.placeZ(medianz), "w": sm, "h": sm, "d": sm, "color": color}
        gen.visuals.append(datavis)
        idx = idx + 1


def create_scatter(gen: DataRepGenerator) -> None:
    """Generate one DataRep visual per row (scatter plot).

    Each row in ``gen.df`` becomes a 3D primitive.  The visual channels
    (position, colour, shape, size) are resolved from the encoding and
    fall back to sensible defaults when not specified.

    Args:
        gen: Generator whose ``visuals`` list is appended to.
    """
    for index, row in gen.df.iterrows():
        x = gen.resolve_channel(row, 'x')
        y = gen.resolve_channel(row, 'y')
        z = gen.resolve_channel(row, 'z')
        size = gen.resolve_channel(row, 'size')
        color = gen.resolve_color(row)
        shape = gen.resolve_shape(row)

        sw = gen.scaleX(0.05)
        sh = gen.scaleY(0.05)
        sd = gen.scaleZ(0.05)
        if size > 0.0:
            sw = size
            sh = size
            sd = size
            gen.visuals.append({
                "type": shape,
                "x": gen.placeX(x), "y": gen.placeY(y), "z": gen.placeZ(z),
                "w": sw, "h": sh, "d": sd,
                "color": color,
            })


def create_bar(gen: DataRepGenerator) -> None:
    """Generate bar-chart DataRep visuals from the encoded axes.

    Supports grouped bars (via ``gen.group``) and both quantitative and
    nominal x/z axes.  Bar height is always mapped to the y channel.

    Args:
        gen: Generator whose ``visuals`` list is appended to.
    """
    colors = None
    if gen.group is not None and 'colors' in gen.group:
        colors = gen.group['colors']
    print(gen.lowerX, gen.upperX, gen.lowerY, gen.upperY, gen.lowerZ, gen.upperZ)
    for index, row in gen.df.iterrows():
        x = gen.resolve_channel(row, 'x')
        z = gen.resolve_channel(row, 'z')
        size = gen.resolve_channel(row, 'size')
        color = gen.resolve_color(row)

        # --- Y values: single or grouped ---------------------------------
        if gen.group is not None:
            yvalues = [row[field] for field in gen.group['fields']]
        else:
            yvalues = [gen.resolve_channel(row, 'y')]

        i = 0
        x0 = -(len(yvalues) - 1) / 2.0 * size   # centre grouped bars
        for y in yvalues:
            sh = gen.scaleY(y)
            sw = size if size > 0.0 else gen.scaleX(
                (gen.upperX - gen.lowerX) / (1 + len(gen.encoding['x']['scale']['range'])))
            sd = size if size > 0.0 else gen.scaleZ(
                (gen.upperZ - gen.lowerZ) / (1 + len(gen.encoding['z']['scale']['range'])))

            if gen.encoding['x']['type'] == "quantitative":
                posX = gen.placeX(x)
            else:
                posX = gen.encoding['x']['scale']['range'][gen.indexOf(x, 'x')]
            posY = sh / 2.0
            if gen.encoding['z']['type'] == "quantitative":
                posZ = gen.placeZ(z)
            else:
                posZ = gen.encoding['z']['scale']['range'][gen.indexOf(z, 'z')]
            if 'offset' in gen.encoding['x']['scale']:
                posX = posX + gen.encoding['x']['scale']['offset']
            if 'offset' in gen.encoding['y']['scale']:
                posY = posY + gen.encoding['y']['scale']['offset']
            if 'offset' in gen.encoding['z']['scale']:
                posZ = posZ + gen.encoding['z']['scale']['offset']
            posX = posX + x0 + i * size
            if colors is not None:
                color = colors[i]
            gen.visuals.append({
                "type": gen.mark, "x": posX, "y": posY, "z": posZ,
                "w": sw, "h": sh, "d": sd, "color": color,
            })
            i = i + 1


def create_pie(gen: DataRepGenerator) -> None:
    """Generate arc DataRep visuals for a donut/pie chart.

    Each row produces an ``arc`` primitive whose angular extent is
    proportional to the ``theta`` channel.  Text labels showing the
    y-values are placed around the perimeter.

    Args:
        gen: Generator whose ``visuals`` list is appended to.
    """
    # Override Y boundaries to match the explicit domain in encoding
    gen.lowerY = gen.encoding['y']['scale']['domain'][0]
    gen.upperY = gen.encoding['y']['scale']['domain'][1]
    gen.factorY = gen.chartHeight / (gen.upperY - gen.lowerY)
    start = 90.0          # start at 12-o’clock
    total = gen.df[gen.key('theta')].sum() if 'theta' in gen.encoding else 0.0
    for index, row in gen.df.iterrows():
        theta = gen.resolve_channel(row, 'theta')
        y = gen.resolve_channel(row, 'y')
        color = gen.resolve_color(row, default='white')

        posX = gen.placeX(0.0)
        posZ = gen.placeZ(0.0)
        w = 0.8 * gen.chartWidth * 0.6
        val = 360.0 * theta / total
        attr = "angle:" + str(val) + ";start:" + str(start) + ";ratio:0.5"
        radians = np.pi * (start + val / 2.0) / 180.0
        start = start + val
        gen.visuals.append({
            "type": "arc", "x": posX, "y": gen.scaleY(y) / 2.0, "z": posZ,
            "w": w, "h": gen.scaleY(y), "d": w,
            "color": color, "asset": attr,
        })
        label_r = 0.8 * gen.chartWidth * 0.475 / 2.0
        txtx = label_r * np.cos(radians)
        txtz = label_r * np.sin(radians)
        gen.visuals.append({
            "type": "text",
            "x": posX + txtx, "y": gen.scaleY(y) + 0.005, "z": posZ - txtz + 0.01,
            "w": 0.05, "h": 0.0, "d": 0.025,
            "color": "#000000", "asset": str(y),
        })
    gen.visuals.append({
        "type": "text", "x": posX, "y": 0.02, "z": posZ,
        "w": 0.05, "h": 0.0, "d": 0.035,
        "color": "#000000", "asset": gen.encoding['y']['title'],
    })


# ---------------------------------------------------------------------------
# Plot-type registry (Open/Closed principle)
# ---------------------------------------------------------------------------
# New plot types can be added by importing PLOT_REGISTRY and inserting a
# callable, e.g.:
#     from saxr.plots import PLOT_REGISTRY
#     PLOT_REGISTRY["heatmap"] = create_heatmap
# ---------------------------------------------------------------------------

from .stack_plot import create_stack

PLOT_REGISTRY: dict[str, Callable[[DataRepGenerator], None]] = {
    "scatter": create_scatter,
    "bar":     create_bar,
    "cluster": create_cluster,
    "pie":     create_pie,
    "stack":   create_stack
}
