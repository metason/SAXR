// MeshFactory.cs
// Procedural mesh generation for shapes not built into Unity (pyramid, octahedron, arc)

using System.Collections.Generic;
using UnityEngine;

namespace SAXR
{
    public static class MeshFactory
    {
        /// <summary>
        /// Create a 4-sided pyramid (cone with 4 vertices at base).
        /// Base radius 0.5, height 1.0, centered at origin.
        /// </summary>
        public static Mesh CreatePyramid()
        {
            Mesh mesh = new Mesh { name = "Pyramid" };

            float r = 0.5f;
            float halfH = 0.5f;

            // 4 base corners + apex
            Vector3 apex = new Vector3(0, halfH, 0);
            Vector3 bl = new Vector3(-r, -halfH, -r);
            Vector3 br = new Vector3(r, -halfH, -r);
            Vector3 fr = new Vector3(r, -halfH, r);
            Vector3 fl = new Vector3(-r, -halfH, r);

            // Each face has its own vertices for flat shading
            mesh.vertices = new Vector3[]
            {
                // Front face
                fl, fr, apex,
                // Right face
                fr, br, apex,
                // Back face
                br, bl, apex,
                // Left face
                bl, fl, apex,
                // Bottom face (2 triangles)
                bl, br, fr,
                bl, fr, fl
            };

            mesh.triangles = new int[]
            {
                0, 1, 2,     // front
                3, 4, 5,     // right
                6, 7, 8,     // back
                9, 10, 11,   // left
                12, 13, 14,  // bottom tri 1
                15, 16, 17   // bottom tri 2
            };

            mesh.RecalculateNormals();
            mesh.RecalculateBounds();
            return mesh;
        }

        /// <summary>
        /// Create an octahedron (two pyramids joined at base).
        /// Overall height 1.0, width 1.0, centered at origin.
        /// </summary>
        public static Mesh CreateOctahedron()
        {
            Mesh mesh = new Mesh { name = "Octahedron" };

            float r = 0.5f;
            float halfH = 0.5f;

            Vector3 top = new Vector3(0, halfH, 0);
            Vector3 bottom = new Vector3(0, -halfH, 0);
            Vector3 left = new Vector3(-r, 0, 0);
            Vector3 right = new Vector3(r, 0, 0);
            Vector3 front = new Vector3(0, 0, r);
            Vector3 back = new Vector3(0, 0, -r);

            // 8 triangular faces, each with own vertices for flat shading
            mesh.vertices = new Vector3[]
            {
                // Upper 4 faces
                front, right, top,
                right, back, top,
                back, left, top,
                left, front, top,
                // Lower 4 faces
                right, front, bottom,
                back, right, bottom,
                left, back, bottom,
                front, left, bottom
            };

            mesh.triangles = new int[]
            {
                0, 1, 2,
                3, 4, 5,
                6, 7, 8,
                9, 10, 11,
                12, 13, 14,
                15, 16, 17,
                18, 19, 20,
                21, 22, 23
            };

            mesh.RecalculateNormals();
            mesh.RecalculateBounds();
            return mesh;
        }

        /// <summary>
        /// Create a solid arc (donut segment) mesh: an annular wedge extruded
        /// vertically by <paramref name="height"/>. The mesh is centered on Y
        /// (spanning -height/2 .. +height/2) so, once positioned at the DataRep's
        /// y, the slice sits on the ground plane.
        /// Parameters come from the DataRep asset string: "ratio:X;start:Y;angle:Z"
        /// </summary>
        /// <param name="width">Outer diameter of the arc (outer radius = width/2)</param>
        /// <param name="height">Vertical thickness of the slice</param>
        /// <param name="ratio">Inner/outer radius ratio (0-1)</param>
        /// <param name="startAngle">Start angle in degrees</param>
        /// <param name="sweepAngle">Sweep angle in degrees</param>
        /// <param name="segments">Number of arc segments</param>
        public static Mesh CreateArc(float width, float height, float ratio, float startAngle, float sweepAngle, int segments = 32)
        {
            Mesh mesh = new Mesh { name = "Arc" };

            if (segments < 1) segments = 1;

            float outerR = width / 2f;
            float innerR = outerR * ratio;
            float halfH = height / 2f;

            float startRad = startAngle * Mathf.Deg2Rad;
            float sweepRad = sweepAngle * Mathf.Deg2Rad;

            var vertices = new List<Vector3>();
            var triangles = new List<int>();

            // Add a quad as two triangles (a,b,c) + (a,c,d). Vertex order sets the
            // winding so RecalculateNormals produces an outward-facing normal.
            void AddQuad(Vector3 a, Vector3 b, Vector3 c, Vector3 d)
            {
                int baseIdx = vertices.Count;
                vertices.Add(a);
                vertices.Add(b);
                vertices.Add(c);
                vertices.Add(d);
                triangles.Add(baseIdx + 0);
                triangles.Add(baseIdx + 1);
                triangles.Add(baseIdx + 2);
                triangles.Add(baseIdx + 0);
                triangles.Add(baseIdx + 2);
                triangles.Add(baseIdx + 3);
            }

            // Walls and top/bottom faces, one ring step at a time.
            for (int i = 0; i < segments; i++)
            {
                float a0 = startRad + ((float)i / segments) * sweepRad;
                float a1 = startRad + ((float)(i + 1) / segments) * sweepRad;
                float c0 = Mathf.Cos(a0), s0 = Mathf.Sin(a0);
                float c1 = Mathf.Cos(a1), s1 = Mathf.Sin(a1);

                Vector3 innerTop0 = new Vector3(innerR * c0, halfH, innerR * s0);
                Vector3 outerTop0 = new Vector3(outerR * c0, halfH, outerR * s0);
                Vector3 innerTop1 = new Vector3(innerR * c1, halfH, innerR * s1);
                Vector3 outerTop1 = new Vector3(outerR * c1, halfH, outerR * s1);

                Vector3 innerBot0 = new Vector3(innerR * c0, -halfH, innerR * s0);
                Vector3 outerBot0 = new Vector3(outerR * c0, -halfH, outerR * s0);
                Vector3 innerBot1 = new Vector3(innerR * c1, -halfH, innerR * s1);
                Vector3 outerBot1 = new Vector3(outerR * c1, -halfH, outerR * s1);

                AddQuad(innerTop0, innerTop1, outerTop1, outerTop0); // top (+Y)
                AddQuad(innerBot0, outerBot0, outerBot1, innerBot1); // bottom (-Y)
                AddQuad(outerTop0, outerTop1, outerBot1, outerBot0); // outer wall
                AddQuad(innerTop1, innerTop0, innerBot0, innerBot1); // inner wall
            }

            // End caps close the wedge at the start and end angles.
            AddCap(startRad, true);
            AddCap(startRad + sweepRad, false);

            void AddCap(float angle, bool isStart)
            {
                float cos = Mathf.Cos(angle), sin = Mathf.Sin(angle);
                Vector3 innerTop = new Vector3(innerR * cos, halfH, innerR * sin);
                Vector3 outerTop = new Vector3(outerR * cos, halfH, outerR * sin);
                Vector3 outerBot = new Vector3(outerR * cos, -halfH, outerR * sin);
                Vector3 innerBot = new Vector3(innerR * cos, -halfH, innerR * sin);

                if (isStart)
                    AddQuad(innerTop, outerTop, outerBot, innerBot);
                else
                    AddQuad(innerBot, outerBot, outerTop, innerTop);
            }

            mesh.vertices = vertices.ToArray();
            mesh.triangles = triangles.ToArray();
            mesh.RecalculateNormals();
            mesh.RecalculateBounds();
            return mesh;
        }
    }
}
