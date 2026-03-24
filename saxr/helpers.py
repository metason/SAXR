"""Pure utility functions used across the SAXR pipeline.

These are intentionally kept free of any pipeline state so they can be
imported and tested in isolation.
"""


def rgb2hex(red: float, green: float, blue: float) -> str:
    """Convert (0-1) RGB floats to a hex colour string.

    Args:
        red:   Red channel in the range 0.0 – 1.0.
        green: Green channel in the range 0.0 – 1.0.
        blue:  Blue channel in the range 0.0 – 1.0.

    Returns:
        A ``#rrggbb`` hex string (e.g. ``'#ff8000'``).
    """
    return '#%02x%02x%02x' % (int(red * 255.0), int(green * 255.0), int(blue * 255.0))


def inch2m(inch: float) -> float:
    """Convert inches to metres.

    Args:
        inch: Length in inches.

    Returns:
        The equivalent length in metres.
    """
    return inch * 2.54 / 100.0
