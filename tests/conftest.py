"""Shared test fixtures for the SAXR test suite.

Import ``make_gen`` in every test module to get a fully initialised
DataRepGenerator without any file I/O.
"""
from __future__ import annotations

import os
import sys
import pandas as pd

path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "SAXR-main", "SAXR-main")
sys.path.append(path)

from saxr.generator import DataRepGenerator


def make_gen() -> DataRepGenerator:
    """Return a DataRepGenerator with sensible defaults, bypassing __init__."""
    g = object.__new__(DataRepGenerator)
    g.folder         = "/tmp"
    g.outputFile     = "datareps.json"
    g.assetURL       = ""
    g.doSaveEncoding = False
    g.title          = ""
    g.stage          = {"height": 1.0, "width": 1.0, "depth": 1.0}
    g.dpi            = 200
    g.chartHeight    = 1.0
    g.chartWidth     = 1.0
    g.chartDepth     = 1.0
    g.bgColor        = [1.0, 1.0, 1.0]
    g.gridColor      = [0.7, 0.85, 1.0]
    g.labelColor     = g.gridColor
    g.titleColor     = g.gridColor
    g.sequence       = None
    g.visuals        = []
    g.scenes         = []
    g.df             = pd.DataFrame()
    g.srcdf          = None
    g.dimension      = {}
    g.encoding       = {}
    g.panelsSpec     = {}
    g.maptype        = None
    g.lowerX         = -0.5
    g.upperX         = 0.5
    g.lowerY         = 0.0
    g.upperY         = 1.0
    g.lowerZ         = -0.5
    g.upperZ         = 0.5
    g.factorX        = 1.0
    g.factorY        = 1.0
    g.factorZ        = 1.0
    g.palette        = {"nominal": "tab10", "metrical": "viridis"}
    g.mark           = "sphere"
    g.plot           = "scatter"
    g.group          = None
    return g
