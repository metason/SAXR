"""Blender CLI launcher for the SAXR 3D export pipeline.

Usage::

    blender --background --python export3D.py -- <sample-folder> [format]

All logic lives in :mod:`saxr.export3d.exporter`.
"""

from saxr.export3d.exporter import Exporter3D, main, kv2dict  # noqa: F401 (backward compat)

if __name__ == '__main__':
    main()