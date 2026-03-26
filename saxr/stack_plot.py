from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .generator import DataRepGenerator


def create_stack(gen: DataRepGenerator) -> None:
    """Build stacked volumes (bar, cylinder) and append them to gen.visuals."""
    # Stack is build top-down to be aligned with legend
    # Override Y boundaries to match the explicit domain in encoding
    gen.lowerY = 0.0
    gen.upperY = 0.0
    for i, row in gen.df.iterrows():
        gen.upperY = gen.upperY + gen.resolve_channel(row, 'y')
    gen.factorY = gen.chartHeight / (gen.upperY - gen.lowerY)
    posX = 0.0
    posY = gen.chartHeight
    posZ = 0.0
    i = 0
    for i, row in gen.df.iterrows():
        y = gen.resolve_channel(row, 'y')
        sh = gen.scaleY(y)
        posY = posY - (sh/2.0)
        color = gen.resolve_color(row, default='white')
        posX = gen.placeX(0.0)
        posZ = gen.placeZ(0.0)
        gen.visuals.append({
            "type": gen.mark, "x": posX, "y": posY, "z": posZ,
            "w": gen.chartWidth, "h": sh, "d": gen.chartDepth, "color": color,
        })
        posY = posY - (sh/2.0)
        i = i + 1
