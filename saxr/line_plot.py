from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .generator import DataRepGenerator


def create_line(gen: DataRepGenerator) -> None:
    """Build line plot and append to gen.visuals."""
    posx = 0.0
    posy = 0.0
    posz = 0.0
    posX = 0.0
    posY = 0.0
    posZ = 0.0
    c = ""
    i = 0
    for i, row in gen.df.iterrows():
        x = gen.resolve_channel(row, 'x')
        y = gen.resolve_channel(row, 'y')
        z = gen.resolve_channel(row, 'z')
        posX = gen.placeX(x)
        posY = gen.placeY(y)
        posZ = gen.placeZ(z)
        color = gen.resolve_color(row, default='white')
        if c == color:
            w = posX - posx
            h = posY - posy
            d = posZ - posz
            cx = posx + w/2.0 
            cy = posy + h/2.0 
            cz = posz + d/2.0 
            gen.visuals.append({
                "type": "line", "x": cx, "y": cy, "z": cz,
                "w": w, "h": h, "d": d, "color": color
            })
        posx = posX
        posy = posY
        posz = posZ
        c = color
        i = i + 1
