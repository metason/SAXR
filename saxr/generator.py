"""DataRepGenerator — orchestrator class holding pipeline state.

This is the central entry point of the SAXR package.  A
:class:`DataRepGenerator` object stores every piece of mutable state that
the pipeline needs (data, encoding, scale factors, visuals list, …) and
*delegates* the heavy lifting to the specialised modules
:mod:`~saxr.encoding`, :mod:`~saxr.plots`, and :mod:`~saxr.panels`.

Typical usage::

    gen = DataRepGenerator("samples/iris")
    gen.run()  # reads settings.json, creates panels & plots, writes viz.json
"""
from __future__ import annotations

import os
import sys
import json
from typing import Any, Union

import pandas as pd
import matplotlib as mpl

from .constants import SHAPES, MARKERS, MARKER_SYMBOLS, DEFAULT_PALETTE
from .encoding import deduce_dimensions, deduce_encoding
from .plots import PLOT_REGISTRY
from .panels import render_panels


class DataRepGenerator:
    """Generates DataRep ``viz.json`` and panel images from a ``settings.json``.

    The class owns all shared pipeline state as instance attributes and
    provides thin delegate methods that forward to the pure-function
    modules (encoding, plots, panels).  This keeps the class focused on
    *state management* while complex algorithms live in their own files.

    Args:
        folder: Absolute or relative path to the sample directory that
                contains ``settings.json`` and the data file.
    """

    def __init__(self, folder: str) -> None:
        self.folder = folder

        # ---- SETTINGS (overwritten by values read from settings.json) ----
        self.outputFile = "viz.json"
        self.assetURL = ""
        self.doSaveEncoding = True
        self.title = ""
        self.stage = {
            "height": 1.0,
            "width": 1.0,
            "depth": 1.0
        }
        self.dpi = 200

        # ---- STATE ----
        self.chartHeight = 1.0
        self.chartWidth = 1.0
        self.chartDepth = 1.0
        self.bgColor = [1.0, 1.0, 1.0]
        self.gridColor = [0.7, 0.85, 1.0]
        self.labelColor = self.gridColor
        self.titleColor = self.gridColor
        self.sequence = None
        self.visuals: list = []
        self.scenes: list = []
        self.df: pd.DataFrame = pd.DataFrame()
        self.srcdf = None
        self.dimension: dict = {}
        self.encoding: dict = {}
        self.panelsSpec: dict = {}
        self.maptype = None
        self.lowerX = -0.5
        self.upperX = 0.5
        self.lowerY = 0.0
        self.upperY = 1.0
        self.lowerZ = -0.5
        self.upperZ = 0.5
        self.factorX = 1.0
        self.factorY = 1.0
        self.factorZ = 1.0
        self.palette = dict(DEFAULT_PALETTE)
        self.mark = "sphere"
        self.plot = "scatter"
        self.group = None

        mpl.rcParams['figure.dpi'] = self.dpi

    # ---- HELPERS ----

    def key(self, field: str) -> str:
        """Resolve the data-column name for a visual channel.

        If the encoding for *field* specifies a ``field`` alias (e.g.
        ``encoding.x.field = 'sepal_length'``), that alias is returned;
        otherwise *field* itself is returned unchanged.

        Args:
            field: Channel name (``'x'``, ``'y'``, ``'z'``, ``'color'``,
                   ``'shape'``, ``'size'``).

        Returns:
            The DataFrame column name to use.
        """
        if field in self.encoding:
            if 'field' in self.encoding[field]:
                if isinstance(self.encoding[field]['field'], str):
                    return self.encoding[field]['field']
                else:
                    if 'group' in self.encoding[field]['field'] and self.group is not None:
                        grpKey = self.encoding[field]['field']['group']
                        if grpKey in self.group:
                            return self.group[grpKey][0]
        return field

    def indexOf(self, val: Any, dim: str) -> int:
        """Return the index of *val* in the scale domain of *dim*, or -1.

        Args:
            val: The value to look up.
            dim: The channel whose scale domain is searched.

        Returns:
            Zero-based index, or ``-1`` if not found.
        """
        if dim in self.encoding:
            if 'scale' in self.encoding[dim] and 'domain' in self.encoding[dim]['scale']:
                return self.encoding[dim]['scale']['domain'].index(val)
        return -1

    def scaleX(self, val: float) -> float:
        """Scale a width value to stage coordinates along X."""
        return val * self.factorX

    def scaleY(self, val: float) -> float:
        """Scale a height value to stage coordinates along Y."""
        return val * self.factorY

    def scaleZ(self, val: float) -> float:
        """Scale a depth value to stage coordinates along Z."""
        return val * self.factorZ

    def placeX(self, val: float) -> float:
        """Map a data X value to a centred stage position."""
        return (val - (self.lowerX + (self.upperX - self.lowerX) / 2.0)) * self.factorX

    def placeY(self, val: float) -> float:
        """Map a data Y value to a stage position (zero-based)."""
        return (val - self.lowerY) * self.factorY

    def placeZ(self, val: float) -> float:
        """Map a data Z value to a centred stage position."""
        return (val - (self.lowerZ + (self.upperZ - self.lowerZ) / 2.0)) * self.factorZ

    # ---- ENCODING ACCESSORS ----

    def getSize2D(self) -> Union[float, pd.Series]:
        """Return marker size(s) in Matplotlib points for 2D panel rendering."""
        factor = 0.6
        if 'size' in self.encoding:
            if 'value' in self.encoding['size']:
                return self.encoding['size']['value'] * 100.0 * factor * self.dpi / 2.54
        if self.key("size") in self.df and self.df.dtypes[self.key("size")] == float:
            return self.df[self.key("size")].map(lambda x: x * 100.0 * factor * self.dpi / 2.54)
        return factor * self.dpi / 2.54

    def getSize(self) -> Union[float, pd.Series]:
        """Return 3D DataRep element size (scalar or Series)."""
        if 'size' in self.encoding:
            if 'value' in self.encoding['size']:
                return self.encoding['size']['value']
        if self.key("size") in self.df and self.df.dtypes[self.key('size')] == float:
            return self.df[self.key('size')]
        return 0.05

    def getMarker(self) -> Union[str, pd.Series]:
        """Return the Matplotlib marker symbol(s) for the current shape encoding."""
        if 'shape' in self.encoding:
            if 'marks' in self.encoding['shape']:
                return self.df[self.key("shape")].map(lambda x: self.encoding['shape']['marks'][self.encoding['shape']['scale']['domain'].index(x)])

            if 'value' in self.encoding['shape']:
                m = self.encoding['shape']['value']
                if m in MARKERS or m in MARKER_SYMBOLS:
                    return m
                if m in SHAPES:
                    idx = SHAPES.index(m)
                    if idx >= 0:
                        return MARKER_SYMBOLS[idx]
        return 'o'

    def getMarkers(self) -> list:
        """Return a list of marker symbols (wraps a single marker in a list)."""
        m = self.getMarker()
        if isinstance(m, str):
            return [m]
        return m

    def getShape(self) -> str:
        """Return the 3D shape name for the current shape encoding."""
        if 'shape' in self.encoding:
            if 'value' in self.encoding['shape']:
                sh = self.encoding['shape']['value']
                if sh in SHAPES:
                    return sh
                if sh in MARKERS:
                    idx = MARKERS.index(sh)
                    if idx >= 0:
                        return SHAPES[idx]
                if sh in MARKER_SYMBOLS:
                    idx = MARKER_SYMBOLS.index(sh)
                    if idx >= 0:
                        return SHAPES[idx]
        return 'sphere'

    def getColor(self) -> Union[str, pd.Series]:
        """Return the colour value(s) for the current colour encoding."""
        if 'color' in self.encoding:
            if 'value' in self.encoding['color']:
                return self.encoding['color']['value']
            if self.key("color") in self.df and 'scale' in self.encoding['color']:
                return self.df[self.key("color")].map(lambda x: self.encoding['color']['scale']['range'][self.encoding['color']['scale']['domain'].index(x)])
        return 'orange'

    # ---- PER-ROW CHANNEL RESOLUTION (used by plot creators) ----

    def resolve_channel(self, row, channel: str, default=0):
        """Resolve a single encoding channel to its value for *row*."""
        if channel in self.encoding:
            if 'value' in self.encoding[channel]:
                return self.encoding[channel]['value']
            key = self.key(channel)
            if key in row:
                return row[key]
            return default
        if channel in row:
            return row[channel]
        return default

    def resolve_color(self, row, default: str = 'orange') -> str:
        """Resolve the colour channel for *row*, handling quantitative and nominal scales."""
        from .helpers import rgb2hex
        if 'color' not in self.encoding:
            return row['color'] if 'color' in row else default
        enc = self.encoding['color']
        if 'value' in enc:
            return enc['value']
        if not isinstance(enc.get('field'), str):
            return default
        val = row[self.key('color')]
        if 'scale' not in enc:
            return default
        if enc['type'] == 'quantitative':
            cmap = mpl.colormaps.get_cmap(self.palette['metrical'])
            domain = enc['scale']['domain']
            cval = (val - domain[0]) / (domain[1] - domain[0])
            rgb = cmap(cval)
            return rgb2hex(rgb[0], rgb[1], rgb[2])
        idx = enc['scale']['domain'].index(val)
        return enc['scale']['range'][idx]

    def resolve_shape(self, row, default: str = 'sphere') -> str:
        """Resolve the shape channel for *row* from encoding or direct value."""
        if 'shape' in self.encoding:
            if 'value' in self.encoding['shape']:
                return self.encoding['shape']['value']
            val = row[self.key('shape')]
            if 'scale' in self.encoding['shape']:
                idx = self.encoding['shape']['scale']['domain'].index(val)
                return self.encoding['shape']['scale']['range'][idx]
            return default
        if 'shape' in row:
            return row['shape']
        return default

    def exportLegend(self, legend, filename: str = "legend.png"):
        """Save a Matplotlib legend as a transparent PNG and return its bbox."""
        from .panels import export_legend
        return export_legend(self, legend, filename)

    # ---- CORE PIPELINE ----

    def execute(self, settings: dict) -> None:
        """Apply a settings dict: load data, set stage, configure encodings.

        This is the main configuration entry point.  The keys of
        *settings* correspond 1:1 to the fields in ``settings.json``.
        Processing order matters — data must be loaded before dimensions
        are deduced, and dimensions must exist before encodings are
        resolved.

        Args:
            settings: Parsed JSON dictionary from ``settings.json``.
        """
        # --- Stage geometry ------------------------------------------------
        if 'title' in settings:
            self.title = settings["title"]
        if 'height' in settings:
            self.stage["height"] = settings["height"]
        if 'width' in settings:
            self.stage["width"] = settings["width"]
        if 'depth' in settings:
            self.stage["depth"] = settings["depth"]
        if 'stage' in settings:
            self.stage = settings['stage']
        self.chartWidth = self.stage['width']
        self.chartHeight = self.stage['height']
        self.chartDepth = self.stage['depth']

        # --- Dimension inference -------------------------------------------
        if 'dimension' in settings:
            self.dimension = settings['dimension']
        if 'data' in settings:
            if 'url' in settings['data']:
                self.loadData(settings['data']['url'])
            else:
                # Inline data embedded directly in settings.json
                if 'values' in settings['data']:
                    values = settings['data']['values']
                    if isinstance(values, dict):
                        self.df = pd.DataFrame(values)
                    else:
                        self.df = pd.DataFrame.from_dict(values)
            # Attempt to parse string columns as datetime
            for col in self.df.columns:
                if self.df[col].dtype == 'object':
                    try:
                        self.df[col] = pd.to_datetime(self.df[col])
                    except ValueError:
                        pass
            print(self.df)
            print(self.df.dtypes)
            self.deduceDimensions()

        # --- Grouping / aux visuals / panels / mark / plot type -----------
        if 'group' in settings:
            self.group = settings["group"]

        if 'auxReps' in settings:
            self.visuals = settings["auxReps"]

        if 'panels' in settings:
            self.panelsSpec = settings["panels"]

        if 'mark' in settings:
            self.mark = settings["mark"]

        if 'plot' in settings:
            self.plot = settings["plot"]

        if 'sequence' in settings:
            # Sequence = animated time series across DataFrame subsets
            self.sequence = settings['sequence']
            if 'field' in self.sequence and 'domain' in self.sequence:
                self.srcdf = self.df.copy()
                self.df = self.srcdf[self.srcdf[self.sequence['field']] == self.sequence['domain'][0]]

        # --- Encoding (must come after data + dimensions) -----------------
        if 'encoding' in settings:
            enc = settings["encoding"]
            self.encoding = enc
            self.deduceEncoding()

        # --- Appearance (colours, palette, output path) -------------------
        if 'background' in settings:
            self.bgColor = settings["background"]
        if 'bgColor' in settings:
            self.bgColor = settings["bgColor"]

        if 'gridColor' in settings:
            self.gridColor = settings["gridColor"]
        if 'labelColor' in settings:
            self.labelColor = settings["labelColor"]
        else:
            self.labelColor = self.gridColor
        if 'titleColor' in settings:
            self.titleColor = settings["titleColor"]
        else:
            self.titleColor = self.gridColor

        if 'palette' in settings:
            self.palette.update(settings["palette"])

        if 'output' in settings:
            self.outputFile = settings["output"]

        if 'assetURL' in settings:
            self.assetURL = settings["assetURL"]

    # ---- DELEGATES ----

    def deduceDimensions(self) -> None:
        """Infer dimension type and domain from the loaded DataFrame."""
        deduce_dimensions(self)

    def deduceEncoding(self) -> None:
        """Compute scales, ranges, and factors for each visual channel."""
        deduce_encoding(self)

    def loadData(self, dataFile: str) -> None:
        """Load a CSV, JSON, or Excel file into ``self.df``.

        The file format is detected from its extension.  Supports local
        paths (relative or absolute) as well as URLs.

        Args:
            dataFile: File path or URL pointing to the data source.
        """
        if dataFile:
            path = dataFile
            if dataFile.startswith("http") == False and dataFile.startswith("file:") == False and dataFile.startswith("/") == False:
                path = os.path.join(self.folder, dataFile)
            if path.endswith("json"):
                self.df = pd.read_json(path)
            elif path.endswith("xlsx"):
                self.df = pd.read_excel(path)
            elif path.endswith("csv"):
                self.df = pd.read_csv(path)
            else:
                self.df = pd.read_csv(path)

    def createPanels(self, spec: list) -> None:
        """Render Matplotlib panels (xy, zy, xz, legends) and emit panel visuals."""
        render_panels(self, spec)

    def createPlots(self) -> None:
        """Dispatch to the correct plot-type creator via PLOT_REGISTRY."""
        handler = PLOT_REGISTRY.get(self.plot)
        if handler:
            handler(self)
        else:
            raise ValueError(f"Unknown plot type: {self.plot}")

    # ---- SEQUENCE / SCENES ----

    def testScale(self) -> None:
        """Append reference geometry for debugging scale alignment."""
        ref = {"type": "box", "x": 0.0, "y": self.placeY(2.25), "z": self.placeZ(self.upperZ), "w": 0.5, "d": 0.1, "h": 0.01, "color": "green"}
        self.visuals.append(ref)
        ref2 = {"type": "box", "x": 0.0, "y": self.placeY(1.5), "z": self.placeZ(self.upperZ), "w": 0.4, "d": 0.1, "h": 0.08, "color": "yellow"}
        self.visuals.append(ref2)
        ref3 = {"type": "box", "x": self.placeX(2.0), "y": self.placeY(1.0), "z": self.placeZ(self.upperZ), "w": 0.01, "d": 0.1, "h": 0.3, "color": "red"}
        self.visuals.append(ref3)
        ref4 = {"type": "box", "x": self.placeX(self.lowerX), "y": self.placeY(2.0), "z": self.placeZ(3.0), "w": 0.03, "d": 0.03, "h": 0.03, "color": "blue"}
        self.visuals.append(ref4)

    def createDataViz(self) -> None:
        """Build all scenes — handles sequences (animation frames) if configured."""
        if self.sequence is not None and 'domain' in self.sequence:
            for val in range(self.sequence['domain'][0] + 1, self.sequence['domain'][1] + 2):
                self.createPlots()
                self.scenes.append(self.visuals)
                self.visuals = []
                self.df = self.srcdf[self.srcdf[self.sequence['field']] == val]
            self.scenes.append(self.visuals)
        else:
            self.createPlots()
            self.scenes.append(self.visuals)

    def saveEncoding(self) -> None:
        """Write encoding.json to the sample folder."""
        jsonFile = os.path.join(self.folder, 'encoding.json')
        with open(jsonFile, 'w') as jsonout:
            json.dump(self.encoding, jsonout)
            jsonout.close()

    def saveVizRep(self) -> None:
        """Write the final viz.json (list of scenes) to disk."""
        path = str(self.outputFile)
        outputURL = path
        if path.startswith("http") == False and path.startswith("file") == False and path.startswith("/") == False:
            outputURL = os.path.join(self.folder, path)
        with open(outputURL, 'w') as outfile:
            json.dump(self.scenes, outfile)
            outfile.close()

    def run(self) -> None:
        """Full pipeline: load settings, create panels, create viz, save output.

        This is the top-level method invoked by the CLI entry point
        (``datarepgen.py``).  It reads ``settings.json`` from
        ``self.folder``, then runs the complete generation pipeline.
        """
        try:
            with open(os.path.join(self.folder, 'settings.json'), 'r') as data:
                self.execute(json.load(data))
        except FileNotFoundError:
            print("Usage: python3 datarepgen.py <folder>")
            print("folder needs to contain a <settings.json> file!")
            print(self.folder)
            sys.exit(1)
        self.createPanels(self.panelsSpec)
        self.createDataViz()
        self.saveVizRep()
        if self.doSaveEncoding:
            self.saveEncoding()
