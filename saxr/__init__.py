"""SAXR — Spatial Analysis and XR data-representation generation pipeline.

Public API
----------
.. autoclass:: DataRepGenerator

The package is structured as follows:

- **constants** — lookup tables shared by the generator and exporter.
- **helpers** — small pure-utility functions (colour conversion, unit maths).
- **encoding** — dimension inference and visual-channel encoding logic.
- **plots** — creators for scatter, bar, cluster, and pie chart visuals.
- **panels** — Matplotlib-based 2-D panel rendering and legend export.
- **generator** — the :class:`DataRepGenerator` orchestrator that ties
  everything together.
"""

from .generator import DataRepGenerator

__all__ = ["DataRepGenerator"]
