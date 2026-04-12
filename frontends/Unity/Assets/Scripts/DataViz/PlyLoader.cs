// PlyLoader.cs
// Parses ASCII PLY mesh files with vertex positions and optional vertex colors.
// Produces a Unity Mesh with per-vertex colors rendered via double-sided material.

using System;
using System.Globalization;
using System.IO;
using UnityEngine;

namespace SAXR
{
    public static class PlyLoader
    {
        public static Mesh Load(string plyText)
        {
            var lines = plyText.Split('\n');
            int vertexCount = 0;
            int faceCount = 0;
            bool hasColor = false;
            int headerEnd = 0;

            // Parse header
            for (int i = 0; i < lines.Length; i++)
            {
                string line = lines[i].Trim();
                if (line.StartsWith("element vertex"))
                    vertexCount = int.Parse(line.Split(' ')[2]);
                else if (line.StartsWith("element face"))
                    faceCount = int.Parse(line.Split(' ')[2]);
                else if (line.StartsWith("property") && (line.Contains(" red") || line.Contains(" r ")))
                    hasColor = true;
                else if (line == "end_header")
                {
                    headerEnd = i + 1;
                    break;
                }
            }

            var vertices = new Vector3[vertexCount];
            var colors = hasColor ? new Color32[vertexCount] : null;

            // Parse vertices
            for (int i = 0; i < vertexCount; i++)
            {
                string[] parts = lines[headerEnd + i].Trim().Split(new[] { ' ', '\t' }, StringSplitOptions.RemoveEmptyEntries);
                float x = float.Parse(parts[0], CultureInfo.InvariantCulture);
                float y = float.Parse(parts[1], CultureInfo.InvariantCulture);
                float z = float.Parse(parts[2], CultureInfo.InvariantCulture);
                vertices[i] = new Vector3(x, y, -z); // negate Z for Unity coords

                if (hasColor && parts.Length >= 6)
                {
                    byte r = byte.Parse(parts[3]);
                    byte g = byte.Parse(parts[4]);
                    byte b = byte.Parse(parts[5]);
                    colors[i] = new Color32(r, g, b, 255);
                }
            }

            // Parse faces
            int faceStart = headerEnd + vertexCount;
            var triangles = new int[faceCount * 3];
            int triIdx = 0;

            for (int i = 0; i < faceCount; i++)
            {
                string[] parts = lines[faceStart + i].Trim().Split(new[] { ' ', '\t' }, StringSplitOptions.RemoveEmptyEntries);
                int count = int.Parse(parts[0]);

                if (count == 3)
                {
                    triangles[triIdx++] = int.Parse(parts[1]);
                    triangles[triIdx++] = int.Parse(parts[2]);
                    triangles[triIdx++] = int.Parse(parts[3]);
                }
                else if (count == 4)
                {
                    // Triangulate quad
                    int a = int.Parse(parts[1]), b = int.Parse(parts[2]);
                    int c = int.Parse(parts[3]), d = int.Parse(parts[4]);
                    // Need to resize if quads present
                    if (triIdx + 6 > triangles.Length)
                        Array.Resize(ref triangles, triangles.Length + faceCount * 3);
                    triangles[triIdx++] = a; triangles[triIdx++] = b; triangles[triIdx++] = c;
                    triangles[triIdx++] = a; triangles[triIdx++] = c; triangles[triIdx++] = d;
                }
            }

            // Trim triangles array to actual size
            if (triIdx < triangles.Length)
                Array.Resize(ref triangles, triIdx);

            var mesh = new Mesh { name = "SurfacePLY" };
            if (vertexCount > 65535)
                mesh.indexFormat = UnityEngine.Rendering.IndexFormat.UInt32;

            mesh.vertices = vertices;
            mesh.triangles = triangles;
            if (colors != null)
                mesh.colors32 = colors;
            mesh.RecalculateNormals();
            mesh.RecalculateBounds();
            return mesh;
        }
    }
}
