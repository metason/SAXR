"""Panel rendering (xy, zy, xz, legends) via Matplotlib.

Panels are 2-D images (PNG) that the Unity runtime textures onto planes
inside the 3-D stage.  Each panel shows axis grids, tick labels, and
optionally the data points themselves (``+s`` suffix) so that the viewer
gets spatial reference even when the 3-D objects are hard to read.

The panel spec is a list of short codes like
``['XY', '-XY', 'ZY', 'xz+s', 'Lc<-', 'Lm>_']`` that encode:

* which plane (xy, zy, xz),
* whether to mirror ("-" prefix),
* whether to overlay scatter points ("+s" suffix),
* legend type (lc = colour, lm = marker, lg = group, ls = size),
* anchor / layout characters (``<>^v-_=``).
"""
from __future__ import annotations

import os
from typing import TYPE_CHECKING

import matplotlib as mpl
import matplotlib.pyplot as plt

from .constants import MARKER_SYMBOLS
from .helpers import inch2m

if TYPE_CHECKING:
    from .generator import DataRepGenerator


def export_legend(gen: DataRepGenerator, legend, filename: str = "legend.png"):
    """Save a Matplotlib legend as a transparent PNG and return its bbox.

    Args:
        gen:      Generator instance (provides ``folder`` and ``dpi``).
        legend:   A ``matplotlib.legend.Legend`` object.
        filename: Output file name relative to ``gen.folder``.

    Returns:
        The bounding box of the legend in *figure* inches — used later to
        size the corresponding 3-D plane.
    """
    fig = legend.figure
    fig.canvas.draw()
    bbox = legend.get_window_extent()
    bbox = bbox.transformed(fig.dpi_scale_trans.inverted())
    print("EXPORT LEGEND")
    print(os.path.join(gen.folder, filename))
    fig.savefig(os.path.join(gen.folder, filename), dpi=gen.dpi, bbox_inches=bbox)
    return bbox


def create_legend(gen: DataRepGenerator, spec: str, bbox, y0: float) -> dict:
    """Position a legend panel in the 3D stage based on layout spec.

    The last characters of *spec* (after the two-letter legend code) are
    layout anchors:

    * ``<`` / ``>``  — left / right
    * ``^`` / ``v``  — top / bottom (vertical panels)
    * ``-`` / ``_``  — front / back (floor panels, when '=' is present)

    Args:
        gen:  Generator instance (provides chart dimensions, asset URL).
        spec: The panel spec string, e.g. ``'lc<-'``.
        bbox: Bounding box from :func:`export_legend` (figure-inches).
        y0:   Vertical offset used for wall-mounted legends.

    Returns:
        A ``dict`` ready to be appended to ``gen.visuals``.
    """
    leg = spec[:3]
    layout = spec[2:]
    # Convert legend bbox from figure inches to stage metres
    w = inch2m((bbox.x1 - bbox.x0) * 4.8 * gen.stage['width'])
    h = inch2m((bbox.y1 - bbox.y0) * 4.8 * gen.stage['width'])
    x = 0.0
    y = 0.005
    z = 0.0
    if '=' in layout:
        # Floor-mounted legend (horizontal plane)
        shift = gen.stage['depth'] * 0.15
        if '<' in layout:
            x = -float(gen.chartWidth / 2.0) + w / 2.0
        elif '>' in layout:
            x = float(gen.chartWidth / 2.0) - w / 2.0
        if '-' in layout:
            z = -float(gen.chartDepth / 2.0) + h / 2.0 + shift
        elif '_' in layout:
            z = float(gen.chartDepth / 2.0) + h / 2.0 + shift
        panel = {"type": gen.maptype[spec], "x": x, "y": y, "z": z, "w": w, "d": h, "h": 0, "asset": gen.assetURL + leg[:2] + ".png"}
        return panel
    else:
        # Wall-mounted legend (vertical plane)
        if '<' in layout:
            x = -float(gen.chartWidth / 2.0) + w / 2.0
        elif '>' in layout:
            x = float(gen.chartWidth / 2.0) - w / 2.0
        y = y0 + gen.chartHeight / 2.0
        if 'v' in layout:
            y = y0 + h / 2.0
        elif '^' in layout:
            y = y0 + float(gen.chartHeight / 2.0) - h / 2.0
        z = 0.0
        if '-' in layout:
            z = -float(gen.chartDepth / 2.0)
        elif '_' in layout:
            z = float(gen.chartDepth / 2.0)
        panel = {"type": gen.maptype[spec], "x": x, "y": y, "z": z, "w": w, "d": 0, "h": h, "asset": gen.assetURL + leg[:2] + ".png"}
        return panel


def _render_xy_panels(gen, spec, ctx):
    """Render XY wall panels (front/back) and re-derive X/Y scales."""
    if not any(p.startswith('xy') or p.startswith('-xy') for p in spec):
        return
    fig, ax = plt.subplots(facecolor=(1, 1, 1, 0.0), layout="constrained")
    fig.set_size_inches(4.8 * gen.stage['width'] / gen.stage['height'], 4.8)
    ax.set_facecolor(gen.bgColor)
    ax.grid(color=gen.gridColor, linewidth=1.25)
    ax.tick_params(top=True, labeltop=True, bottom=False, labelbottom=False, color=gen.gridColor, labelcolor=gen.labelColor)
    ax.set_title(gen.title, color=gen.titleColor)
    ax.xaxis.set_label_position("top")
    ax.spines['top'].set_visible(False)
    ax2 = ax.twinx()
    if gen.dimension[gen.key('x')]['type'] == 'quantitative':
        ax.set_xlim(gen.lowerX, gen.upperX)
    if gen.dimension[gen.key('y')]['type'] == 'quantitative':
        ax.set_ylim(gen.lowerY, gen.upperY)
        ax2.set_ylim(gen.lowerY, gen.upperY)
    ax2.tick_params(right=True, labelright=True, color=gen.gridColor, labelcolor=gen.labelColor)
    ax2.spines['top'].set_visible(False)
    if 'title' in gen.encoding['x']:
        ax.set_xlabel(gen.encoding['x']['title'], color=gen.labelColor)
    if 'title' in gen.encoding['y']:
        ax.set_ylabel(gen.encoding['y']['title'], color=gen.labelColor)
        ax2.set_ylabel(gen.encoding['y']['title'], color=gen.labelColor)
    if gen.dimension[gen.key('x')]['type'] == 'quantitative' and gen.dimension[gen.key('y')]['type'] == 'quantitative':
        ax.scatter(gen.df[gen.key('x')], gen.df[gen.key('y')], alpha=0)
    else:
        ax.bar(gen.df[gen.key('x')], gen.df[gen.key('y')], alpha=0)
    if 'xy' in spec:
        plt.savefig(os.path.join(gen.folder, 'xy.png'))
        panel = {"type": gen.maptype["xy"], "x": 0.0, "y": float(ctx['panelY']), "z": -float(gen.chartDepth / 2.0), "w": float(ctx['panelWidth']), "d": 0, "h": float(ctx['panelHeight']), "asset": gen.assetURL + "xy.png"}
        gen.visuals.append(panel)
    if '-xy' in spec:
        ax.xaxis.set_inverted(True)
        plt.savefig(os.path.join(gen.folder, '-xy.png'))
        panel = {"type": gen.maptype["-xy"], "x": 0.0, "y": float(ctx['panelY']), "z": float(gen.chartDepth / 2.0), "w": float(ctx['panelWidth']), "d": 0, "h": float(ctx['panelHeight']), "asset": gen.assetURL + "-xy.png"}
        gen.visuals.append(panel)
    ax.xaxis.set_inverted(False)
    if 'xy+s' in spec:
        for xp, yp, c, m in zip(gen.df[gen.key('x')], gen.df[gen.key('y')], gen.getColor(), gen.getMarkers()):
            ax.scatter(xp, yp, s=gen.getSize2D(), c=c, marker=m)
        plt.savefig(os.path.join(gen.folder, 'xy+s.png'))
        panel = {"type": gen.maptype["xy+s"][:2], "x": 0.0, "y": float(ctx['panelY']), "z": -float(gen.chartDepth / 2.0), "w": float(ctx['panelWidth']), "d": 0, "h": float(ctx['panelHeight']), "asset": gen.assetURL + "xy+s.png"}
        gen.visuals.append(panel)
    ax.xaxis.set_inverted(True)
    if '-xy+s' in spec:
        for xp, yp, c, m in zip(gen.df[gen.key('x')], gen.df[gen.key('y')], gen.getColor(), gen.getMarkers()):
            ax.scatter(xp, yp, s=gen.getSize2D(), c=c, marker=m)
        plt.savefig(os.path.join(gen.folder, '-xy+s.png'))
        panel = {"type": gen.maptype["-xy+s"][:3], "x": 0.0, "y": float(ctx['panelY']), "z": float(gen.chartDepth / 2.0), "w": float(ctx['panelWidth']), "d": 0, "h": float(ctx['panelHeight']), "asset": gen.assetURL + "-xy+s.png"}
        gen.visuals.append(panel)

    fig_width, fig_height = plt.gcf().get_size_inches()
    chartBox = ax.get_position()
    plotHeight = chartBox.y1 - chartBox.y0
    ctx['panelHeight'] = gen.chartHeight / plotHeight
    ctx['panelY'] = -chartBox.y0 * ctx['panelHeight']
    plotWidth = chartBox.x1 - chartBox.x0
    if ctx['adjustBaseSize']:
        ctx['panelWidth'] = ctx['panelHeight'] * fig_width / fig_height
        gen.chartWidth = ctx['panelWidth'] * plotWidth
    else:
        ctx['panelWidth'] = gen.chartWidth / plotWidth

    # Re-derive scale for X axis
    if gen.dimension[gen.key('x')]['type'] == 'quantitative':
        if 'scale' not in gen.encoding['x']:
            gen.factorX = gen.chartWidth / (gen.upperX - gen.lowerX)
            scale = {'domain': [gen.lowerX, gen.upperX], 'range': [gen.placeX(gen.lowerX), gen.placeX(gen.upperX)]}
            gen.encoding['x']['scale'] = scale
        else:
            gen.factorX = (gen.encoding['x']['scale']['range'][1] - gen.encoding['x']['scale']['range'][0]) / (gen.upperX - gen.lowerX)
    else:
        lo, hi = ax.get_xlim()
        if lo > hi:
            gen.lowerX = hi; gen.upperX = lo
        else:
            gen.lowerX = lo; gen.upperX = hi
        gen.factorX = gen.chartWidth / (gen.upperX - gen.lowerX)
        xrange = [gen.placeX(x) for x in ax.get_xticks()]
        scale = {'domain': gen.dimension[gen.key('x')]['domain'], 'range': xrange}
        gen.encoding['x']['scale'] = scale

    if gen.dimension[gen.key('y')]['type'] == 'quantitative':
        if 'scale' not in gen.encoding['y']:
            gen.factorY = gen.chartHeight / (gen.upperY - gen.lowerY)
            scale = {'domain': [gen.lowerY, gen.upperY], 'range': [gen.placeY(gen.lowerY), gen.placeY(gen.upperY)]}
            gen.encoding['y']['scale'] = scale
        else:
            if 'range' not in gen.encoding['y']['scale']:
                gen.encoding['y']['scale']['range'] = [0.0, gen.chartHeight]
            gen.factorY = (gen.encoding['y']['scale']['range'][1] - gen.encoding['y']['scale']['range'][0]) / (gen.upperY - gen.lowerY)
    else:
        lo, hi = ax.get_ylim()
        if lo > hi:
            gen.lowerY = hi; gen.upperY = lo
        else:
            gen.lowerY = lo; gen.upperY = hi
        gen.factorY = gen.chartHeight / (gen.upperY - gen.lowerY)
        yrange = [gen.placeY(x) for x in ax.get_yticks()]
        scale = {'domain': gen.dimension[gen.key('y')]['domain'], 'range': yrange}
        gen.encoding['y']['scale'] = scale


def _render_zy_panels(gen, spec, ctx):
    """Render ZY side panels and re-derive Z scale."""
    if not any(p.startswith('zy') or p.startswith('-zy') for p in spec):
        return
    fig, ax = plt.subplots(facecolor=(1, 1, 1, 0.0), layout="constrained")
    fig.set_size_inches(4.8 * gen.stage['depth'] / gen.stage['height'], 4.8)
    ax.set_facecolor(gen.bgColor)
    if gen.dimension[gen.key('z')]['type'] == 'quantitative':
        ax.set_xlim(gen.lowerZ, gen.upperZ)
    if gen.dimension[gen.key('y')]['type'] == 'quantitative':
        ax.set_ylim(gen.lowerY, gen.upperY)
    ax.grid(color=gen.gridColor, linewidth=1.25)
    ax.tick_params(top=True, labeltop=True, bottom=False, labelbottom=False, color=gen.gridColor, labelcolor=gen.labelColor)
    ax.set_title(gen.title, color=gen.titleColor)
    ax.xaxis.set_label_position("top")
    ax.spines['top'].set_visible(False)
    ax2 = ax.twinx()
    ax2.tick_params(right=True, labelright=True, color=gen.gridColor, labelcolor=gen.labelColor)
    ax2.set_ylim(gen.lowerY, gen.upperY)
    ax2.spines['top'].set_visible(False)
    if 'title' in gen.encoding['z']:
        ax.set_xlabel(gen.encoding['z']['title'], color=gen.labelColor)
    if 'title' in gen.encoding['y']:
        ax.set_ylabel(gen.encoding['y']['title'], color=gen.labelColor)
        ax2.set_ylabel(gen.encoding['y']['title'], color=gen.labelColor)
    if gen.dimension[gen.key('z')]['type'] == 'quantitative' and gen.dimension[gen.key('y')]['type'] == 'quantitative':
        ax.scatter(gen.df[gen.key('z')], gen.df[gen.key('y')], alpha=0)
    else:
        ax.bar(gen.df[gen.key('z')], gen.df[gen.key('y')], alpha=0)
    if 'zy' in spec:
        plt.savefig(os.path.join(gen.folder, 'zy.png'))
        panel = {"type": gen.maptype["zy"], "x": float(gen.chartWidth / 2.0), "y": float(ctx['panelY2']), "z": 0.0, "w": float(ctx['panelDepth2']), "d": 0, "h": float(ctx['panelHeight2']), "asset": gen.assetURL + "zy.png"}
        gen.visuals.append(panel)
    if '-zy' in spec:
        ax.xaxis.set_inverted(True)
        plt.savefig(os.path.join(gen.folder, '-zy.png'))
        panel = {"type": gen.maptype["-zy"], "x": -float(gen.chartWidth / 2.0), "y": float(ctx['panelY2']), "z": 0.0, "w": float(ctx['panelDepth2']), "d": 0, "h": float(ctx['panelHeight2']), "asset": gen.assetURL + "-zy.png"}
        gen.visuals.append(panel)
    ax.xaxis.set_inverted(False)
    if 'zy+s' in spec:
        for zp, yp, c, m in zip(gen.df[gen.key('z')], gen.df[gen.key('y')], gen.getColor(), gen.getMarkers()):
            ax.scatter(zp, yp, s=gen.getSize2D(), c=c, marker=m)
        plt.savefig(os.path.join(gen.folder, 'zy+s.png'))
        panel = {"type": gen.maptype["zy+s"][:2], "x": float(gen.chartWidth / 2.0), "y": float(ctx['panelY2']), "z": 0.0, "w": float(ctx['panelDepth2']), "d": 0, "h": float(ctx['panelHeight2']), "asset": gen.assetURL + "zy+s.png"}
        gen.visuals.append(panel)
    ax.xaxis.set_inverted(True)
    if '-zy+s' in spec:
        for zp, yp, c, m in zip(gen.df[gen.key('z')], gen.df[gen.key('y')], gen.getColor(), gen.getMarkers()):
            ax.scatter(zp, yp, s=gen.getSize2D(), c=c, marker=m)
        plt.savefig(os.path.join(gen.folder, '-zy+s.png'))
        panel = {"type": gen.maptype["-zy+s"][:3], "x": -float(gen.chartWidth / 2.0), "y": float(ctx['panelY2']), "z": 0.0, "w": float(ctx['panelDepth2']), "d": 0, "h": float(ctx['panelHeight2']), "asset": gen.assetURL + "-zy+s.png"}
        gen.visuals.append(panel)

    fig_width, fig_height = plt.gcf().get_size_inches()
    chartBox = ax.get_position()
    plotHeight2 = chartBox.y1 - chartBox.y0
    ctx['panelHeight2'] = gen.chartHeight / plotHeight2
    ctx['panelY2'] = -chartBox.y0 * ctx['panelHeight2']
    plotDepth2 = chartBox.x1 - chartBox.x0
    if ctx['adjustBaseSize']:
        ctx['panelDepth2'] = ctx['panelHeight2'] * fig_width / fig_height
        gen.chartDepth = ctx['panelDepth2'] * plotDepth2
    else:
        ctx['panelDepth2'] = gen.chartDepth / plotDepth2
    ctx['shiftZ'] = (chartBox.x0 - (1.0 - chartBox.x1)) * ctx['panelDepth2'] / 2.0
    if gen.dimension[gen.key('z')]['type'] == 'quantitative':
        if 'scale' not in gen.encoding['z']:
            gen.factorZ = abs(gen.chartDepth / (gen.upperZ - gen.lowerZ))
            scale = {'domain': [gen.lowerZ, gen.upperZ], 'range': [gen.placeZ(gen.lowerZ), gen.placeZ(gen.upperZ)]}
            gen.encoding['z']['scale'] = scale
        else:
            gen.factorZ = (gen.encoding['z']['scale']['range'][1] - gen.encoding['z']['scale']['range'][0]) / (gen.upperZ - gen.lowerZ)
    else:
        lo, hi = ax.get_xlim()
        if lo > hi:
            gen.lowerZ = hi; gen.upperZ = lo
        else:
            gen.lowerZ = lo; gen.upperZ = hi
        gen.factorZ = gen.chartDepth / (gen.upperZ - gen.lowerZ)
        zrange = [gen.placeZ(z) for z in ax.get_xticks()]
        scale = {'domain': gen.dimension[gen.key('z')]['domain'], 'range': zrange}
        gen.encoding['z']['scale'] = scale


def _align_side_panels(gen, ctx):
    """Adjust XY and ZY panel positions after real chart boxes are known."""
    for panel in gen.visuals:
        if panel['type'].lower().startswith('xy'):
            panel['y'] = ctx['panelY']
            panel['z'] = -float(gen.chartDepth / 2.0)
            panel['w'] = float(ctx['panelWidth'])
            panel['h'] = float(ctx['panelHeight'])
        if panel['type'].lower().startswith('-xy'):
            panel['y'] = ctx['panelY']
            panel['z'] = float(gen.chartDepth / 2.0)
            panel['w'] = float(ctx['panelWidth'])
            panel['h'] = float(ctx['panelHeight'])
        if panel['type'].lower().startswith('zy'):
            panel['x'] = float(gen.chartWidth / 2.0)
            panel['y'] = float(ctx['panelY2'])
            panel['z'] = panel['z'] - ctx['shiftZ']
            panel['w'] = float(ctx['panelDepth2'])
            panel['h'] = float(ctx['panelHeight2'])
        if panel['type'].lower().startswith('-zy'):
            panel['x'] = -float(gen.chartWidth / 2.0)
            panel['y'] = float(ctx['panelY2'])
            panel['z'] = panel['z'] + ctx['shiftZ']
            panel['w'] = float(ctx['panelDepth2'])
            panel['h'] = float(ctx['panelHeight2'])


def _render_xz_panels(gen, spec):
    """Render XZ floor panels (grid, scatter overlay, or pie)."""
    if not any(p.startswith('xz') for p in spec):
        return
    fig, ax = plt.subplots(figsize=plt.figaspect(1.0), facecolor=(1, 1, 1, 0.0), layout="constrained")
    ax.set_facecolor(gen.bgColor)
    if 'xz+p' in spec:
        aspectratio = gen.stage['depth'] / gen.stage['width']
        fig.set_size_inches(4.8 * aspectratio, 4.8)
        ax.set_title(gen.title, color=gen.titleColor, fontdict={'fontsize': 16})
        patches, texts, autotexts = ax.pie(gen.df[gen.key('theta')], colors=plt.get_cmap(gen.palette['nominal']).colors, labels=gen.df[gen.key('category')],
                                           autopct='%1.1f%%', pctdistance=0.8, radius=1.0, startangle=90, textprops={'fontsize': 12})
        [_.set_color(gen.labelColor) for _ in texts]
        [_.set_color(gen.labelColor) for _ in autotexts]
        centre_circle = plt.Circle((0, 0), 0.60, fc=gen.bgColor)
        fig.gca().add_artist(centre_circle)
        plt.savefig(os.path.join(gen.folder, 'xz+p.png'))
    else:
        fig.set_size_inches(4.8 * gen.stage['width'] / gen.stage['height'], 4.8 * gen.stage['depth'] / gen.stage['height'])
        plt.yticks(rotation=-90)
        ax.tick_params(top=True, labeltop=True, bottom=False, labelbottom=True, right=False, labelright=False, color=gen.gridColor, labelcolor=gen.labelColor)
        ax2 = ax.twinx()
        ax2.tick_params(right=True, labelright=True, color=gen.gridColor, labelcolor=gen.labelColor)
        if gen.dimension[gen.key('x')]['type'] == 'quantitative':
            ax.set_xlim(gen.lowerX, gen.upperX)
            ax2.set_xlim(gen.lowerX, gen.upperX)
        if gen.dimension[gen.key('z')]['type'] == 'quantitative':
            ax.set_ylim(gen.lowerZ, gen.upperZ)
            ax2.set_ylim(gen.lowerZ, gen.upperZ)
            ax.set_yticklabels(ax.get_yticklabels(), rotation=-90)
            ax2.set_yticklabels(ax2.get_yticklabels(), rotation=90)
        else:
            ax.set_ylim(gen.upperZ, gen.lowerZ)
            ax2.set_ylim(gen.upperZ, gen.lowerZ)
        ax.grid(color=gen.gridColor, linewidth=1.25)
        ax.yaxis.set_inverted(True)
        ax2.yaxis.set_inverted(True)

        if gen.dimension[gen.key('x')]['type'] == 'quantitative' and gen.dimension[gen.key('z')]['type'] == 'quantitative':
            ax.scatter(gen.df[gen.key('x')], gen.df[gen.key('z')], alpha=0)
        else:
            ax.bar(gen.df[gen.key('x')], gen.df[gen.key('z')], alpha=0)
            ax2.set_yticks(ax.get_yticks())
            ax2.set_yticklabels(ax.get_yticklabels(), rotation=--90)
        ax2.spines['top'].set_visible(False)
        if 'title' in gen.encoding['x']:
            ax.set_xlabel(gen.encoding['x']['title'], color=gen.labelColor)
            ax2.set_xlabel(gen.encoding['x']['title'], color=gen.labelColor)
        if 'title' in gen.encoding['y']:
            ax.set_ylabel(gen.encoding['z']['title'], color=gen.labelColor, rotation=-90, labelpad=12)
            ax2.set_ylabel(gen.encoding['z']['title'], color=gen.labelColor)
        if 'xz' in spec:
            plt.savefig(os.path.join(gen.folder, 'xz.png'))
        if 'xz+s' in spec:
            for xp, zp, c, m in zip(gen.df[gen.key('x')], gen.df[gen.key('z')], gen.getColor(), gen.getMarkers()):
                ax.scatter(xp, zp, s=gen.getSize2D(), c=c, marker=m)
            plt.savefig(os.path.join(gen.folder, 'xz+s.png'))

    fig_width, fig_height = plt.gcf().get_size_inches()
    chartBox = ax.get_position()
    plotDepth3 = chartBox.y1 - chartBox.y0
    panelDepth3 = gen.chartDepth / plotDepth3
    plotWidth3 = chartBox.x1 - chartBox.x0
    panelWidth3 = gen.chartWidth / plotWidth3
    shiftX = (chartBox.x0 - (1.0 - chartBox.x1)) * panelWidth3 / 2.0
    shiftZ = (chartBox.y0 - (1.0 - chartBox.y1)) * panelDepth3 / 2.0

    if 'xz' in spec:
        panel = {"type": gen.maptype["xz"], "x": 0.0 - shiftX, "y": 0.0, "z": shiftZ, "w": float(panelWidth3), "d": float(panelDepth3), "h": 0.0, "asset": gen.assetURL + "xz.png"}
        gen.visuals.append(panel)
    if 'xz+s' in spec:
        panel = {"type": gen.maptype["xz+s"][:2], "x": 0.0 - shiftX, "y": 0.0, "z": shiftZ, "w": float(panelWidth3), "d": float(panelDepth3), "h": 0.0, "asset": gen.assetURL + "xz+s.png"}
        gen.visuals.append(panel)
    if 'xz+p' in spec:
        panel = {"type": gen.maptype["xz+p"][:2], "x": 0.0 - shiftX, "y": 0.0, "z": shiftZ, "w": float(panelWidth3), "d": float(panelDepth3), "h": 0.0, "asset": gen.assetURL + "xz+p.png"}
        gen.visuals.append(panel)


def _render_legends(gen, spec, panelY2):
    """Render colour, group, marker, and size legend panels."""
    if any(p.startswith('lc') for p in spec):
        fig, ax = plt.subplots(figsize=plt.figaspect(1.0), facecolor=(1, 1, 1, 0.0), layout="constrained")
        colorRange = gen.encoding['color']['scale']['range']
        if gen.encoding['color']['type'] == 'quantitative':
            fig, ax = plt.subplots(figsize=(6, 1), layout='constrained')
            cmap = plt.get_cmap(gen.palette['metrical'])
            norm = mpl.colors.Normalize(vmin=gen.encoding['color']['scale']['domain'][0], vmax=gen.encoding['color']['scale']['domain'][1])
            fig.colorbar(mpl.cm.ScalarMappable(norm=norm, cmap=cmap),
                         cax=ax, orientation='horizontal', label=gen.encoding['color']['title'])
            bbox = fig.get_window_extent()
            bbox = bbox.transformed(fig.dpi_scale_trans.inverted())
            fig.savefig(os.path.join(gen.folder, 'lc.png'), dpi=gen.dpi, bbox_inches=bbox)
        else:
            f = lambda m, c: plt.plot([], [], marker=m, color=c, ls="none")[0]
            labels = gen.encoding['color']['labels']
            handles = [f("s", colorRange[i]) for i in range(len(colorRange))]
            legend = fig.legend(handles, labels, loc='center', framealpha=0, frameon=True, title=gen.encoding['color']['title'])
            bbox = export_legend(gen, legend, 'lc.png')
        legSpec = next((element for element in spec if str(element).startswith('lc')))
        panel = create_legend(gen, legSpec, bbox, panelY2)
        gen.visuals.append(panel)

    if any(p.startswith('lg') for p in spec) and gen.group is not None:
        fig, ax = plt.subplots(figsize=plt.figaspect(1.0), facecolor=(1, 1, 1, 0.0), layout="constrained")
        colorRange = gen.group['colors']
        f = lambda m, c: plt.plot([], [], marker=m, color=c, ls="none")[0]
        handles = [f("s", colorRange[i]) for i in range(len(colorRange))]
        labels = gen.group['fields']
        legend = fig.legend(handles, labels, loc='center', framealpha=0, frameon=True, title=gen.encoding['y']['title'])
        bbox = export_legend(gen, legend, 'lg.png')
        legSpec = next((element for element in spec if str(element).startswith('lg')))
        panel = create_legend(gen, legSpec, bbox, panelY2)
        gen.visuals.append(panel)

    if any(p.startswith('lm') for p in spec):
        fig, ax = plt.subplots(figsize=plt.figaspect(1.0), facecolor=(1, 1, 1, 0.0), layout="constrained")
        markerRange = gen.encoding['shape']['scale']['range']
        f = lambda m, c: plt.plot([], [], marker=m, color=c, ls="none")[0]
        handles = [f(MARKER_SYMBOLS[i], "black") for i in range(len(markerRange))]
        labels = gen.encoding['shape']['labels']
        legend = fig.legend(handles, labels, loc='center', framealpha=0, frameon=True, title=gen.encoding['shape']['title'])
        bbox = export_legend(gen, legend, 'lm.png')
        legSpec = next((element for element in spec if str(element).startswith('lm')))
        panel = create_legend(gen, legSpec, bbox, panelY2)
        gen.visuals.append(panel)

    if any(p.startswith('ls') for p in spec):
        print('TODO: size/magnitude legend')


def render_panels(gen: DataRepGenerator, spec: list) -> None:
    """Render Matplotlib panels (xy, zy, xz, legends) and emit panel visuals.

    Delegates to :func:`_render_xy_panels`, :func:`_render_zy_panels`,
    :func:`_render_xz_panels`, and :func:`_render_legends`.

    Args:
        gen:  Generator instance — mutated in-place.
        spec: List of panel-spec strings (e.g. ``['XY', '-ZY', 'Lc<-']``).
    """
    # Shared layout state passed between panel renderers
    ctx = {
        'panelWidth': gen.chartWidth,
        'panelHeight': gen.chartHeight,
        'panelY': 0.0,
        'panelDepth2': gen.chartDepth,
        'panelHeight2': gen.chartHeight,
        'panelY2': 0.0,
        'shiftZ': 0.0,
        'adjustBaseSize': False,
    }

    # Normalise spec to lowercase; keep a mapping to recover original casing
    speclc = list(map(str.lower, spec))
    gen.maptype = dict(zip(speclc, spec))
    spec = speclc

    _render_xy_panels(gen, spec, ctx)
    _render_zy_panels(gen, spec, ctx)
    _align_side_panels(gen, ctx)
    _render_xz_panels(gen, spec)
    _render_legends(gen, spec, ctx['panelY2'])

    # Encoding meta-panel — tells Unity where the chart boundaries are
    if gen.doSaveEncoding:
        panel = {"type": "encoding", "x": 0, "y": 0, "z": 0, "w": float(gen.chartWidth), "d": float(gen.chartDepth), "h": float(gen.chartHeight), "asset": gen.assetURL + "encoding.json"}
        gen.visuals.insert(0, panel)
    print("Factors: ", gen.factorX, gen.factorY, gen.factorZ)
