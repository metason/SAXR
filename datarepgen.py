"""Entry point for the SAXR Data-Representation Generator.

Usage::

    python datarepgen.py <sample-folder>

The *sample-folder* must contain a ``settings.json`` that describes the
data source, visual encoding, panel layout, and output options.
All heavy lifting is delegated to the :class:`saxr.DataRepGenerator` class.
"""

import os
import sys

from saxr import DataRepGenerator


def main() -> None:
    """Parse CLI args, resolve the sample folder, and run the pipeline."""
    folder = os.getcwd()
    if len(sys.argv) > 1:
        folder_name = sys.argv[1]
        if folder_name.startswith('/'):
            folder = folder_name
        else:
            folder = os.path.join(folder, folder_name)
    print(folder)

    gen = DataRepGenerator(folder)
    gen.run()

if __name__ == '__main__':
    main()
