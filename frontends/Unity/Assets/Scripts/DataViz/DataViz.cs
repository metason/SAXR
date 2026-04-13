// DataViz.cs
// Unity C# adapter for SAXR - equivalent of DataViz.swift (SceneKit)
// Loads datareps.json and creates the 3D data visualization at runtime.
//
// Usage:
//   1. Attach DataVizLoader to a GameObject in your scene.
//   2. Set vizJsonPath to a local file path or URL pointing to datareps.json.
//   3. Set assetBasePath to the folder/URL containing panel PNG images.
//   4. At runtime it builds the full Data Stage hierarchy under itself.

using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using UnityEngine.Networking;

namespace SAXR
{
    // ──────────────────────────────────────────────
    //  JSON wrapper – datareps.json is Array<Array<DataRep>>
    // ──────────────────────────────────────────────

    /// <summary>
    /// Helper to deserialize datareps.json (Unity's JsonUtility cannot deserialize
    /// bare arrays, so we wrap with JsonHelper).
    /// </summary>
    public static class VizJsonParser
    {
        /// <summary>
        /// Parse the top-level array-of-arrays from datareps.json text.
        /// </summary>
        public static List<List<DataRep>> Parse(string json)
        {
            // Unity's JsonUtility can't handle bare arrays.
            // Wrap in {"scenes": [...]} so we can deserialize.
            string wrapped = "{\"scenes\":" + json + "}";
            SceneListWrapper wrapper = JsonUtility.FromJson<SceneListWrapper>(wrapped);

            // SceneListWrapper.scenes is a flat list – we need to split by inner arrays.
            // Since JsonUtility can't do nested generic lists, use a lightweight manual approach.
            return ParseManual(json);
        }

        private static List<List<DataRep>> ParseManual(string json)
        {
            // Minimal bracket counter parser for [[{...},{...}],[{...}]]
            var scenes = new List<List<DataRep>>();
            json = json.Trim();

            if (json.Length < 2 || json[0] != '[')
            {
                Debug.LogError("DataViz: datareps.json must be an array of arrays.");
                return scenes;
            }

            // Strip outer []
            json = json.Substring(1, json.Length - 2).Trim();

            // Split into inner arrays by tracking bracket depth
            int depth = 0;
            int start = -1;

            for (int i = 0; i < json.Length; i++)
            {
                char c = json[i];
                if (c == '[')
                {
                    if (depth == 0) start = i;
                    depth++;
                }
                else if (c == ']')
                {
                    depth--;
                    if (depth == 0 && start >= 0)
                    {
                        string inner = json.Substring(start, i - start + 1);
                        var reps = ParseInnerArray(inner);
                        scenes.Add(reps);
                        start = -1;
                    }
                }
            }

            return scenes;
        }

        private static List<DataRep> ParseInnerArray(string json)
        {
            var list = new List<DataRep>();
            json = json.Trim();

            // Strip outer []
            if (json.Length < 2) return list;
            json = json.Substring(1, json.Length - 2).Trim();

            // Split by top-level commas between {} objects
            int depth = 0;
            int start = 0;
            for (int i = 0; i < json.Length; i++)
            {
                char c = json[i];
                if (c == '{') depth++;
                else if (c == '}') depth--;
                else if (c == ',' && depth == 0)
                {
                    string objStr = json.Substring(start, i - start).Trim();
                    if (objStr.Length > 0)
                    {
                        DataRep rep = JsonUtility.FromJson<DataRep>(objStr);
                        if (rep != null) list.Add(rep);
                    }
                    start = i + 1;
                }
            }

            // Last object
            string last = json.Substring(start).Trim();
            if (last.Length > 0)
            {
                DataRep rep = JsonUtility.FromJson<DataRep>(last);
                if (rep != null) list.Add(rep);
            }

            return list;
        }

        [Serializable]
        private class SceneListWrapper
        {
            public List<DataRep> scenes;
        }
    }

    // ──────────────────────────────────────────────
    //  DataViz – creates GameObjects from DataReps
    // ──────────────────────────────────────────────

    public static class DataViz
    {
        /// <summary>
        /// Parse key:value pairs from a semicolon-separated asset string.
        /// e.g. "ratio:0.5;start:0;angle:120"
        /// </summary>
        public static Dictionary<string, string> ParseKV(string str)
        {
            var dict = new Dictionary<string, string>();
            if (string.IsNullOrEmpty(str)) return dict;

            foreach (string sub in str.Split(';'))
            {
                if (sub.Contains(":"))
                {
                    string[] kv = sub.Split(':');
                    if (kv.Length >= 2)
                        dict[kv[0].Trim()] = kv[1].Trim();
                }
            }
            return dict;
        }

        // ── Primitive creation ──────────────────────

        /// <summary>
        /// Create a single DataRep as a Unity GameObject.
        /// This is the C# equivalent of DataViz.swift's createDataRep().
        /// </summary>
        public static GameObject CreateDataRep(DataRep rep)
        {
            // ── Coordinate system conversion ──────────────
            // SceneKit uses right-handed coords (Z toward viewer),
            // Unity uses left-handed (Z away from viewer).
            // Negate Z once here so every shape lands correctly.
            rep.z = -rep.z;

            string typeLower = rep.type.ToLower();

            switch (typeLower)
            {
                case "box":     return CreateBox(rep);
                case "sphere":  return CreateSphere(rep);
                case "cylinder": return CreateCylinder(rep);
                case "pyramid": return CreatePyramid(rep, false);
                case "pyramid_down": return CreatePyramid(rep, true);
                case "octahedron": return CreateOctahedron(rep);
                case "plus":    return CreatePlus(rep);
                case "cross":   return CreateCross(rep);
                case "plane":   return CreatePlane(rep);
                case "arc":     return CreateArc(rep);
                case "surface": return CreateSurface(rep);
                case "text":    return CreateText(rep);
                case "encoding":
                    Debug.Log($"DataViz encoding: {rep.asset}");
                    return new GameObject("Encoding");
                default:
                    // Panel types (xy, -xy, zy, -zy, xz, lc=..., etc.)
                    return CreatePanel(rep);
            }
        }

        // ── Box ─────────────────────────────────────

        private static GameObject CreateBox(DataRep rep)
        {
            GameObject go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.name = "DataRep." + rep.type;
            go.transform.localPosition = new Vector3(rep.x, rep.y, rep.z);
            go.transform.localScale = new Vector3(rep.w, rep.h, rep.d);
            ApplyColor(go, rep.color);
            return go;
        }

        // ── Sphere ──────────────────────────────────

        private static GameObject CreateSphere(DataRep rep)
        {
            GameObject go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            go.name = "DataRep." + rep.type;
            go.transform.localPosition = new Vector3(rep.x, rep.y, rep.z);
            go.transform.localScale = new Vector3(rep.w, rep.h, rep.d);
            ApplyColor(go, rep.color);
            return go;
        }

        // ── Cylinder ────────────────────────────────

        private static GameObject CreateCylinder(DataRep rep)
        {
            GameObject go = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            go.name = "DataRep." + rep.type;
            go.transform.localPosition = new Vector3(rep.x, rep.y, rep.z);
            // Unity cylinder is height 2 by default, so halve Y scale
            go.transform.localScale = new Vector3(rep.w, rep.h / 2f, rep.d);
            ApplyColor(go, rep.color);
            return go;
        }

        // ── Pyramid ─────────────────────────────────

        private static GameObject CreatePyramid(DataRep rep, bool upsideDown)
        {
            GameObject go = new GameObject("DataRep." + rep.type);
            go.transform.localPosition = new Vector3(rep.x, rep.y, rep.z);

            // Child mesh
            GameObject meshObj = new GameObject("PyramidMesh");
            meshObj.transform.SetParent(go.transform, false);
            MeshFilter mf = meshObj.AddComponent<MeshFilter>();
            MeshRenderer mr = meshObj.AddComponent<MeshRenderer>();
            mf.mesh = MeshFactory.CreatePyramid();

            meshObj.transform.localScale = new Vector3(rep.w, rep.h, rep.d);

            if (upsideDown)
            {
                meshObj.transform.localRotation = Quaternion.Euler(180f, 0f, 0f);
                meshObj.transform.localPosition = new Vector3(0, rep.h / 2f, 0);
            }
            else
            {
                meshObj.transform.localPosition = new Vector3(0, -rep.h / 2f, 0);
            }

            ApplyColor(meshObj, rep.color);
            return go;
        }

        // ── Octahedron ──────────────────────────────

        private static GameObject CreateOctahedron(DataRep rep)
        {
            GameObject go = new GameObject("DataRep." + rep.type);
            go.transform.localPosition = new Vector3(rep.x, rep.y, rep.z);

            GameObject meshObj = new GameObject("OctahedronMesh");
            meshObj.transform.SetParent(go.transform, false);
            MeshFilter mf = meshObj.AddComponent<MeshFilter>();
            MeshRenderer mr = meshObj.AddComponent<MeshRenderer>();
            mf.mesh = MeshFactory.CreateOctahedron();

            meshObj.transform.localScale = new Vector3(rep.w, rep.h, rep.d);
            ApplyColor(meshObj, rep.color);
            return go;
        }

        // ── Plus (3 perpendicular boxes) ────────────

        private static GameObject CreatePlus(DataRep rep)
        {
            float factor = 0.2f;
            GameObject go = new GameObject("DataRep." + rep.type);
            go.transform.localPosition = new Vector3(rep.x, rep.y, rep.z);

            // X bar
            GameObject bar1 = GameObject.CreatePrimitive(PrimitiveType.Cube);
            bar1.transform.SetParent(go.transform, false);
            bar1.transform.localScale = new Vector3(rep.w, rep.h * factor, rep.d * factor);
            ApplyColor(bar1, rep.color);

            // Y bar
            GameObject bar2 = GameObject.CreatePrimitive(PrimitiveType.Cube);
            bar2.transform.SetParent(go.transform, false);
            bar2.transform.localScale = new Vector3(rep.w * factor, rep.h, rep.d * factor);
            ApplyColor(bar2, rep.color);

            // Z bar
            GameObject bar3 = GameObject.CreatePrimitive(PrimitiveType.Cube);
            bar3.transform.SetParent(go.transform, false);
            bar3.transform.localScale = new Vector3(rep.w * factor, rep.h * factor, rep.d);
            ApplyColor(bar3, rep.color);

            return go;
        }

        // ── Cross (rotated plus) ────────────────────

        private static GameObject CreateCross(DataRep rep)
        {
            float factor = 0.15f;
            GameObject go = new GameObject("DataRep." + rep.type);
            go.transform.localPosition = new Vector3(rep.x, rep.y, rep.z);

            GameObject bar1 = GameObject.CreatePrimitive(PrimitiveType.Cube);
            bar1.transform.SetParent(go.transform, false);
            bar1.transform.localScale = new Vector3(rep.w, rep.h * factor, rep.d * factor);
            ApplyColor(bar1, rep.color);

            GameObject bar2 = GameObject.CreatePrimitive(PrimitiveType.Cube);
            bar2.transform.SetParent(go.transform, false);
            bar2.transform.localScale = new Vector3(rep.w * factor, rep.h, rep.d * factor);
            ApplyColor(bar2, rep.color);

            GameObject bar3 = GameObject.CreatePrimitive(PrimitiveType.Cube);
            bar3.transform.SetParent(go.transform, false);
            bar3.transform.localScale = new Vector3(rep.w * factor, rep.h * factor, rep.d);
            ApplyColor(bar3, rep.color);

            // Rotated as in Swift/Blender: pi/6, pi/5, pi/4
            go.transform.localRotation = SceneKitRotation(
                Mathf.Rad2Deg * Mathf.PI / 6f,
                Mathf.Rad2Deg * Mathf.PI / 5f,
                Mathf.Rad2Deg * (-Mathf.PI / 4f)
            );

            return go;
        }

        // ── Plane ───────────────────────────────────

        private static GameObject CreatePlane(DataRep rep)
        {
            GameObject go = GameObject.CreatePrimitive(PrimitiveType.Quad);
            go.name = "DataRep." + rep.type;
            go.transform.localPosition = new Vector3(rep.x, rep.y + rep.h / 2f, rep.z);

            if (rep.h > rep.d)
            {
                // Vertical plane (XY)
                go.transform.localScale = new Vector3(rep.w, rep.h, 1f);
                go.transform.localRotation = Quaternion.identity;
            }
            else
            {
                // Horizontal plane (XZ)
                go.transform.localScale = new Vector3(rep.w, rep.d, 1f);
                go.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);
            }

            ApplyColor(go, rep.color);
            return go;
        }

        // ── Arc ─────────────────────────────────────

        private static GameObject CreateArc(DataRep rep)
        {
            var kvs = ParseKV(rep.asset);

            float ratio = kvs.ContainsKey("ratio") ? float.Parse(kvs["ratio"], System.Globalization.CultureInfo.InvariantCulture) : 0.5f;
            float startAngle = kvs.ContainsKey("start") ? float.Parse(kvs["start"], System.Globalization.CultureInfo.InvariantCulture) : 0f;
            float angle = kvs.ContainsKey("angle") ? float.Parse(kvs["angle"], System.Globalization.CultureInfo.InvariantCulture) : 90f;

            GameObject go = new GameObject("DataRep." + rep.type);
            go.transform.localPosition = new Vector3(rep.x, rep.y, rep.z);

            GameObject meshObj = new GameObject("ArcMesh");
            meshObj.transform.SetParent(go.transform, false);
            MeshFilter mf = meshObj.AddComponent<MeshFilter>();
            MeshRenderer mr = meshObj.AddComponent<MeshRenderer>();
            mf.mesh = MeshFactory.CreateArc(rep.w, rep.h, ratio, startAngle, angle);

            ApplyColor(meshObj, rep.color);
            return go;
        }

        // ── Text ────────────────────────────────────

        private static GameObject CreateText(DataRep rep)
        {
            GameObject go = new GameObject("DataRep.text");
            go.transform.localPosition = new Vector3(rep.x, rep.y, rep.z);

            // Use TextMesh for basic 3D text; upgrade to TextMeshPro if available
            TextMesh tm = go.AddComponent<TextMesh>();
            tm.text = rep.asset;
            tm.characterSize = 0.01f;
            tm.anchor = TextAnchor.MiddleCenter;
            tm.alignment = TextAlignment.Center;

            // Scale to match requested dimensions
            float baseFontHeight = 0.0825f; // approximate height of default font at characterSize=0.01
            float factor;
            if (rep.h > rep.d)
            {
                factor = rep.h / baseFontHeight;
                // Vertical text (facing camera in XY plane) – default orientation
            }
            else
            {
                factor = rep.d / baseFontHeight;
                go.transform.localRotation = Quaternion.Euler(90f, 0f, 0f); // flat on XZ
            }
            go.transform.localScale = Vector3.one * factor;

            // Apply text color
            if (!string.IsNullOrEmpty(rep.color))
            {
                Color col = ColorHelper.ParseHexColor(rep.color, out _);
                tm.color = col;
            }

            return go;
        }

        // ── Surface (PLY mesh loaded async) ─────────────

        /// <summary>
        /// Create a placeholder GameObject for a surface (PLY file).
        /// The actual mesh is loaded asynchronously by DataVizLoader.
        /// </summary>
        private static GameObject CreateSurface(DataRep rep)
        {
            GameObject go = new GameObject("DataRep.surface");
            go.transform.localPosition = new Vector3(rep.x, rep.y, rep.z);
            go.transform.localScale = new Vector3(rep.w, rep.h, rep.d);

            GameObject meshObj = new GameObject("SurfaceMesh");
            meshObj.transform.SetParent(go.transform, false);
            meshObj.AddComponent<MeshFilter>();
            MeshRenderer mr = meshObj.AddComponent<MeshRenderer>();

            // Default material — will be replaced with vertex-color material when PLY loads
            mr.material = new Material(Shader.Find("Standard"));
            mr.material.SetFloat("_Glossiness", 0.3f);

            return go;
        }

        // ── Panel (image texture on quad) ───────────

        private static GameObject CreatePanel(DataRep rep)
        {
            string typeLower = rep.type.ToLower();
            GameObject go = GameObject.CreatePrimitive(PrimitiveType.Quad);
            go.name = "VizPanel." + rep.type;
            go.transform.localPosition = new Vector3(rep.x, rep.y + rep.h / 2f, rep.z);

            // Default: vertical XY plane
            float rotY = 0f;
            bool horizontal = false;

            if (typeLower.StartsWith("-xy"))
                rotY = 180f;
            else if (typeLower.StartsWith("-zy"))
                rotY = 90f;
            else if (typeLower.StartsWith("zy"))
                rotY = -90f;
            else if (typeLower.StartsWith("xz"))
                horizontal = true;
            else if (typeLower.StartsWith("l") && typeLower.Contains("="))
                horizontal = true; // legend panels are horizontal

            // Generic flat-panel detection: h==0 with non-zero d means
            // the panel lies on the XZ ground plane (e.g. flag images in eco).
            if (!horizontal && rep.h == 0f && rep.d > 0f)
                horizontal = true;

            if (horizontal)
            {
                go.transform.localScale = new Vector3(rep.w, rep.d, 1f);
                go.transform.localRotation = Quaternion.Euler(90f, 0f, 0f); // Unity-native: lay flat facing up
            }
            else
            {
                if (rep.h > rep.d)
                    go.transform.localScale = new Vector3(rep.w, rep.h, 1f);
                else
                    go.transform.localScale = new Vector3(rep.w, rep.d, 1f);

                go.transform.localRotation = SceneKitRotation(0f, rotY, 0f); // from Swift source
            }

            // Make material unlit + double-sided for panel images
            Renderer renderer = go.GetComponent<Renderer>();
            Material mat = new Material(Shader.Find("Unlit/Transparent"));
            if (mat == null)
                mat = new Material(Shader.Find("Unlit/Texture"));
            renderer.material = mat;

            // Texture will be loaded asynchronously by DataVizLoader
            return go;
        }

        // ── Helpers ─────────────────────────────────

        /// <summary>
        /// Convert SceneKit euler angles (right-handed) to Unity (left-handed).
        /// Negating the Z axis reverses the direction of X and Y rotations.
        /// Rotation values in calling code match the Swift/SceneKit source.
        /// </summary>
        private static Quaternion SceneKitRotation(float xDeg, float yDeg, float zDeg)
        {
            return Quaternion.Euler(-xDeg, -yDeg, zDeg);
        }

        private static void ApplyColor(GameObject go, string hexColor)
        {
            Renderer renderer = go.GetComponent<Renderer>();
            if (renderer == null)
            {
                renderer = go.GetComponentInChildren<Renderer>();
            }
            if (renderer != null && !string.IsNullOrEmpty(hexColor))
            {
                ColorHelper.ApplyColor(renderer, hexColor);
            }
        }
    }
}
