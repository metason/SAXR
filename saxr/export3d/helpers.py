"""Pure-Python helpers for the 3D export pipeline.

These functions have **no** dependency on ``bpy`` and can be tested
without Blender.
"""

from __future__ import annotations


def kv2dict(text: str) -> dict[str, str]:
    """Convert a semicolon-separated key:value string to a dictionary.

    Used to parse the ``asset`` field of ``arc`` type DataReps which packs
    angle, start, and ratio as ``'angle:90;start:0;ratio:0.5'``.

    Args:
        text: Semicolon-separated ``key:value`` pairs.

    Returns:
        A plain dict, e.g. ``{'angle': '90', 'start': '0', 'ratio': '0.5'}``.
    """
    res: dict[str, str] = {}
    for sub in text.split(';'):
        if ':' in sub:
            kv = sub.split(':')
            key = kv[0].strip()
            val = kv[1].strip()
            res[key] = val
    return res


def position(rep: dict) -> tuple[float, float, float]:
    """Extract Blender-space position ``(x, -z, y)`` from a DataRep dict."""
    return (rep['x'], -rep['z'], rep['y'])


def scale(rep: dict) -> tuple[float, float, float]:
    """Extract scale ``(w, d, h)`` from a DataRep dict."""
    return (rep['w'], rep['d'], rep['h'])
