from __future__ import annotations

from typing import TYPE_CHECKING

import os
import numpy as np
import matplotlib.tri as mtri


if TYPE_CHECKING:
    from .generator import DataRepGenerator


def write_ply(filename, vx, vy, vz, faces=None, colors=None):
    """Store triangle mesh into .ply file format

    Writes a triangle mesh (optionally with per-vertex colors) into the ply file format, in a way consistent with, e.g., importing to Blender.

    Parameters
    ----------
    filename : str
        Name of the file ending in ".ply" to which to write the mesh
    vx, vy, vz : numpy double array
        vertex coordinates in x,y,z
    faces : numpy int array, optional (default None)
        Matrix of triangle face indices into vertices. If none, only the vertices will be written (e.g., a point cloud)
    colors : numpy double array, optional (default None)
        Array of per-vertex colors. It can be a matrix of per-row RGB values, or a vector of scalar values that gets transformed by a colormap.

    """

    f = open(filename,"w")
    f.write("ply\nformat {} 1.0\n".format('ascii'))
    f.write("element vertex {}\n".format(vx.shape[0]))
    f.write("property double x\n")
    f.write("property double y\n")
    f.write("property double z\n")
    if (colors is not None):
        f.write("property uchar red\n")
        f.write("property uchar green\n")
        f.write("property uchar blue\n")
    if (faces is not None):
        f.write("element face {}\n".format(faces.shape[0]))
    else:
        f.write("element face 0\n")
    f.write("property list int int vertex_indices\n")
    f.write("end_header\n")
    if (colors is None):
        for i in range(vx.shape[0]):
            f.write("{} {} {}\n".format(vx[i],vy[i],vz[i]))
    else:
        for i in range(vx.shape[0]):
            f.write("{} {} {} {} {} {}\n".format(vx[i],vy[i],vz[i],int(colors[i,0]),int(colors[i,1]),int(colors[i,2])))
    if (faces is not None):
        for i in range(faces.shape[0]):
            f.write("3 {} {} {}\n".format(faces[i,0],faces[i,2],faces[i,1]))
    f.close()

def create_surface(gen: DataRepGenerator) -> None:
    """Build surface plot and append it to gen.visuals."""
    # Surface is stored as PLY file
    points = gen.df.shape[0] # amount of rows
    posX = 0.0
    posY = gen.chartHeight/2.0
    posZ = 0.0
    xList = np.empty(shape=points, dtype=float)
    yList = np.empty(shape=points, dtype=float)
    zList = np.empty(shape=points, dtype=float)
    cList = np.empty(shape=(points, 3), dtype=int)
    for index, row in gen.df.iterrows():
        x = gen.resolve_channel(row, 'x')
        y = gen.resolve_channel(row, 'y')
        z = gen.resolve_channel(row, 'z')
        xList[index] = gen.placeX(x)
        yList[index] = gen.placeY(y)
        zList[index] = gen.placeZ(z)
        color = gen.resolve_color(row)
        c = color.lstrip('#')
        rgb = tuple(int(c[i:i+2], 16) for i in (0, 2, 4))
        cList[index] = rgb

    triang = mtri.Triangulation(xList, zList)
    #isBad = np.where((x<1) | (x>99) | (y<1) | (y>99), True, False)
    #mask = np.any(isBad[triang.triangles],axis=1)
    #triang.set_mask(mask)

    write_ply(os.path.join(gen.folder, "surface.ply"), xList, yList, zList, faces=triang.triangles, colors=cList)
    gen.visuals.append({
        "type": "surface", "x": posX, "y": posY, "z": posZ,
        "w": gen.chartWidth, "h": gen.chartHeight, "d": gen.chartDepth, "asset": "surface.ply",
    })
