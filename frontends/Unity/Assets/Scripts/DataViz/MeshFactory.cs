// MeshFactory.cs
// Procedural mesh generation for shapes not built into Unity (pyramid, octahedron, arc)

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
        /// Create an arc (donut segment) mesh.
        /// Parameters come from the DataRep asset string: "ratio:X;start:Y;angle:Z"
        /// </summary>
        /// <param name="width">Total width of the arc area</param>
        /// <param name="height">Height of the arc strip</param>
        /// <param name="ratio">Inner/outer radius ratio (0-1)</param>
        /// <param name="startAngle">Start angle in degrees</param>
        /// <param name="sweepAngle">Sweep angle in degrees</param>
        /// <param name="segments">Number of arc segments</param>
        public static Mesh CreateArc(float width, float height, float ratio, float startAngle, float sweepAngle, int segments = 32)
        {
            Mesh mesh = new Mesh { name = "Arc" };

            float outerR = width / 2f;
            float innerR = outerR * ratio;

            int vertCount = (segments + 1) * 2;
            Vector3[] vertices = new Vector3[vertCount];
            Vector2[] uv = new Vector2[vertCount];

            float startRad = startAngle * Mathf.Deg2Rad;
            float sweepRad = sweepAngle * Mathf.Deg2Rad;

            for (int i = 0; i <= segments; i++)
            {
                float t = (float)i / segments;
                float angle = startRad + t * sweepRad;
                float cos = Mathf.Cos(angle);
                float sin = Mathf.Sin(angle);

                // Inner vertex
                vertices[i * 2] = new Vector3(innerR * cos, 0, innerR * sin);
                uv[i * 2] = new Vector2(t, 0);

                // Outer vertex
                vertices[i * 2 + 1] = new Vector3(outerR * cos, 0, outerR * sin);
                uv[i * 2 + 1] = new Vector2(t, 1);
            }

            int[] triangles = new int[segments * 6];
            for (int i = 0; i < segments; i++)
            {
                int idx = i * 6;
                int v = i * 2;
                triangles[idx + 0] = v;
                triangles[idx + 1] = v + 2;
                triangles[idx + 2] = v + 1;
                triangles[idx + 3] = v + 1;
                triangles[idx + 4] = v + 2;
                triangles[idx + 5] = v + 3;
            }

            mesh.vertices = vertices;
            mesh.uv = uv;
            mesh.triangles = triangles;
            mesh.RecalculateNormals();
            mesh.RecalculateBounds();
            return mesh;
        }
    }
}
