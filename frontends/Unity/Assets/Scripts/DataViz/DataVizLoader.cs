// DataVizLoader.cs
// MonoBehaviour that loads datareps.json and builds the 3D data visualization.
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
    /// <summary>
    /// Attach this MonoBehaviour to any GameObject.
    /// It loads datareps.json (file or URL), parses it via VizJsonParser,
    /// and builds the full Data Stage / Scene hierarchy via DataViz.
    ///
    /// Hierarchy created:
    ///   DataVizLoader (this)
    ///     └─ Data Stage
    ///         ├─ Stage Set     (panels/walls – uppercase type)
    ///         └─ Scenes
    ///             ├─ Scene 0   (active)
    ///             ├─ Scene 1   (hidden)
    ///             └─ ...
    /// </summary>
    public class DataVizLoader : MonoBehaviour
    {
        [Header("Data Source")]
        [Tooltip("Select a sample from the samples folder, or choose 'Custom…' to enter a path manually.")]
        public int sampleIndex = 0;

        [Tooltip("Custom path/URL to datareps.json (used when 'Custom…' is selected).\nRelative to repo root, absolute, or URL.")]
        public string vizJsonPath = "";

        [Tooltip("Base path/URL for panel image assets (folder containing PNGs).\nLeave empty to auto-detect from vizJsonPath folder.")]
        public string assetBasePath = "";

        /// <summary>
        /// Discover all sample folders that contain a datareps.json file.
        /// Returns display names (folder names) and their relative paths.
        /// </summary>
        public static void GetAvailableSamples(out string[] names, out string[] paths)
        {
            string samplesDir = Path.Combine(RepoRoot, "samples");
            var nameList = new List<string>();
            var pathList = new List<string>();

            if (Directory.Exists(samplesDir))
            {
                string[] dirs = Directory.GetDirectories(samplesDir);
                System.Array.Sort(dirs);
                foreach (string dir in dirs)
                {
                    string vizPath = Path.Combine(dir, "datareps.json");
                    if (File.Exists(vizPath))
                    {
                        string folderName = Path.GetFileName(dir);
                        nameList.Add(folderName);
                        // Store as relative path from repo root
                        pathList.Add("samples/" + folderName + "/datareps.json");
                    }
                }
            }

            // Always add "Custom…" as last option
            nameList.Add("Custom\u2026");
            pathList.Add("");

            names = nameList.ToArray();
            paths = pathList.ToArray();
        }

        /// <summary>
        /// Get the resolved vizJsonPath based on current sampleIndex.
        /// </summary>
        public string ResolvedVizJsonPath
        {
            get
            {
                GetAvailableSamples(out string[] names, out string[] paths);
                if (sampleIndex >= 0 && sampleIndex < paths.Length && !string.IsNullOrEmpty(paths[sampleIndex]))
                    return paths[sampleIndex];
                return vizJsonPath; // custom path
            }
        }

        [Header("Scene Selection")]
        [Tooltip("Which scene index to show initially (others are hidden)")]
        public int selectedScene = 0;

        private GameObject _stageRoot;
        private List<GameObject> _sceneNodes = new List<GameObject>();
        private SpecsJson _specs;

        /// <summary>
        /// Parsed specs.json for the current sample (null if not available).
        /// </summary>
        public SpecsJson Specs => _specs;

        /// <summary>
        /// Fired after the visualization (and optional specs) have been loaded.
        /// SequenceController and SequenceUI subscribe to this.
        /// </summary>
        public event Action OnLoaded;

        /// <summary>
        /// Number of scenes loaded.
        /// </summary>
        public int SceneCount => _sceneNodes.Count;

        /// <summary>
        /// Repo root: 2 levels up from Application.dataPath (Unity/Assets → repo root).
        /// Works for any clone of the repo regardless of where it lives on disk.
        /// </summary>
        private static string RepoRoot =>
            Path.GetFullPath(Path.Combine(Application.dataPath, "..", "..", ".."));

        /// <summary>
        /// Resolve a path: absolute → use as-is, relative → resolve from repo root.
        /// </summary>
        private static string ResolvePath(string path)
        {
            if (Path.IsPathRooted(path))
                return path;
            return Path.GetFullPath(Path.Combine(RepoRoot, path));
        }

        private void Start()
        {
            string path = ResolvedVizJsonPath;
            if (!string.IsNullOrEmpty(path))
            {
                vizJsonPath = path;
                StartCoroutine(LoadVizJson());
            }
        }

        /// <summary>
        /// Destroy the current visualization and reload from the selected sample.
        /// Can be called from inspector button, script, or UI.
        /// </summary>
        public void Reload()
        {
            // Destroy existing stage
            if (_stageRoot != null)
            {
                Destroy(_stageRoot);
                _stageRoot = null;
            }
            _sceneNodes.Clear();
            _specs = null;

            string path = ResolvedVizJsonPath;
            if (!string.IsNullOrEmpty(path))
            {
                vizJsonPath = path;
                assetBasePath = ""; // re-detect from new path
                StartCoroutine(LoadVizJson());
            }
        }

        /// <summary>
        /// Load datareps.json from file or URL.
        /// </summary>
        private IEnumerator LoadVizJson()
        {
            string json = null;

            if (vizJsonPath.StartsWith("http://") || vizJsonPath.StartsWith("https://"))
            {
                // Load from URL
                using (UnityWebRequest req = UnityWebRequest.Get(vizJsonPath))
                {
                    yield return req.SendWebRequest();

                    if (req.result != UnityWebRequest.Result.Success)
                    {
                        Debug.LogError($"DataViz: Failed to load datareps.json from {vizJsonPath}: {req.error}");
                        yield break;
                    }
                    json = req.downloadHandler.text;
                }
            }
            else
            {
                // Load from local file
                string fullPath = ResolvePath(vizJsonPath);

                if (!File.Exists(fullPath))
                {
                    Debug.LogError($"DataViz: datareps.json not found at {fullPath}");
                    yield break;
                }
                json = File.ReadAllText(fullPath);

                // Auto-detect assetBasePath from datareps.json folder if not set
                if (string.IsNullOrEmpty(assetBasePath))
                {
                    assetBasePath = Path.GetDirectoryName(fullPath);
                }
            }

            if (string.IsNullOrEmpty(json))
            {
                Debug.LogError("DataViz: datareps.json is empty.");
                yield break;
            }

            List<List<DataRep>> scenes = VizJsonParser.Parse(json);
            CreateDataScenery(scenes);

            // Load specs.json from the same folder (best-effort)
            yield return StartCoroutine(LoadSpecsJson());

            OnLoaded?.Invoke();
        }

        /// <summary>
        /// Load specs.json from the same folder as datareps.json (best-effort).
        /// </summary>
        private IEnumerator LoadSpecsJson()
        {
            _specs = null;
            string specsPath;

            if (vizJsonPath.StartsWith("http://") || vizJsonPath.StartsWith("https://"))
            {
                // Replace filename in URL
                int lastSlash = vizJsonPath.LastIndexOf('/');
                specsPath = vizJsonPath.Substring(0, lastSlash + 1) + "specs.json";

                using (UnityWebRequest req = UnityWebRequest.Get(specsPath))
                {
                    yield return req.SendWebRequest();
                    if (req.result == UnityWebRequest.Result.Success)
                    {
                        _specs = JsonUtility.FromJson<SpecsJson>(req.downloadHandler.text);
                    }
                }
            }
            else
            {
                string dir = string.IsNullOrEmpty(assetBasePath)
                    ? Path.GetDirectoryName(ResolvePath(vizJsonPath))
                    : assetBasePath;
                specsPath = Path.Combine(dir, "specs.json");

                if (File.Exists(specsPath))
                {
                    string text = File.ReadAllText(specsPath);
                    _specs = JsonUtility.FromJson<SpecsJson>(text);
                }
            }

            if (_specs?.sequence != null)
                Debug.Log($"DataViz: Loaded specs.json (arrangement={_specs.sequence.arrangement}).");
        }

        /// <summary>
        /// Build the full GameObject hierarchy from parsed scenes.
        /// Mirrors DataViz.swift's createDataScenery().
        /// </summary>
        private void CreateDataScenery(List<List<DataRep>> scenes)
        {
            // Root
            _stageRoot = new GameObject("Data Stage");
            _stageRoot.transform.SetParent(transform, false);

            GameObject stageSet = new GameObject("Stage Set");
            stageSet.transform.SetParent(_stageRoot.transform, false);

            GameObject sceneList = new GameObject("Scenes");
            sceneList.transform.SetParent(_stageRoot.transform, false);

            _sceneNodes.Clear();

            for (int i = 0; i < scenes.Count; i++)
            {
                GameObject sceneNode = new GameObject($"Scene {i}");
                sceneNode.transform.SetParent(sceneList.transform, false);
                _sceneNodes.Add(sceneNode);

                foreach (DataRep rep in scenes[i])
                {
                    string typeLower = rep.type.ToLower();

                    if (typeLower == "encoding")
                    {
                        Debug.Log($"DataViz encoding: {rep.asset}");
                        continue;
                    }

                    GameObject node = DataViz.CreateDataRep(rep);

                    if (rep.IsSceneLevel)
                    {
                        // Lowercase type → scene-level data rep
                        node.transform.SetParent(sceneNode.transform, false);
                    }
                    else
                    {
                        // Uppercase type → stage-level panel/wall
                        node.transform.SetParent(stageSet.transform, false);
                    }

                    // If this is a panel with an asset, load the texture
                    if (!string.IsNullOrEmpty(rep.asset) && node.name.StartsWith("VizPanel."))
                    {
                        StartCoroutine(LoadPanelTexture(node, rep.asset));
                    }

                    // If this is a surface with a PLY asset, load the mesh
                    if (!string.IsNullOrEmpty(rep.asset) && node.name == "DataRep.surface")
                    {
                        StartCoroutine(LoadSurfacePly(node, rep.asset));
                    }
                }

                // Hide non-selected scenes
                if (i != selectedScene)
                {
                    sceneNode.SetActive(false);
                }
            }

            // Remove empty stage set
            if (stageSet.transform.childCount == 0)
            {
                Destroy(stageSet);
            }

            Debug.Log($"DataViz: Loaded {scenes.Count} scene(s), showing scene {selectedScene}.");
        }

        /// <summary>
        /// Load a panel image (PNG) and apply it as a texture.
        /// </summary>
        private IEnumerator LoadPanelTexture(GameObject panel, string assetName)
        {
            string imagePath = assetName;

            // Build full path/URL
            if (!assetName.StartsWith("http"))
            {
                string fileName = Path.GetFileName(assetName);
                if (!string.IsNullOrEmpty(assetBasePath))
                    imagePath = ResolvePath(Path.Combine(assetBasePath, fileName));
                else
                    imagePath = ResolvePath(fileName);
            }

            using (UnityWebRequest req = UnityWebRequestTexture.GetTexture(imagePath))
            {
                yield return req.SendWebRequest();

                if (req.result != UnityWebRequest.Result.Success)
                {
                    Debug.LogWarning($"DataViz: Failed to load panel image {imagePath}: {req.error}");
                    yield break;
                }

                Texture2D tex = DownloadHandlerTexture.GetContent(req);
                Renderer renderer = panel.GetComponent<Renderer>();
                if (renderer != null)
                {
                    renderer.material.mainTexture = tex;
                }
            }
        }

        /// <summary>
        /// Load a PLY mesh file and apply it to a surface GameObject.
        /// </summary>
        private IEnumerator LoadSurfacePly(GameObject surfaceRoot, string assetName)
        {
            string plyPath = assetName;

            if (!assetName.StartsWith("http"))
            {
                string fileName = Path.GetFileName(assetName);
                if (!string.IsNullOrEmpty(assetBasePath))
                    plyPath = ResolvePath(Path.Combine(assetBasePath, fileName));
                else
                    plyPath = ResolvePath(fileName);
            }

            string plyText = null;

            if (plyPath.StartsWith("http://") || plyPath.StartsWith("https://"))
            {
                using (UnityWebRequest req = UnityWebRequest.Get(plyPath))
                {
                    yield return req.SendWebRequest();
                    if (req.result != UnityWebRequest.Result.Success)
                    {
                        Debug.LogWarning($"DataViz: Failed to load PLY from {plyPath}: {req.error}");
                        yield break;
                    }
                    plyText = req.downloadHandler.text;
                }
            }
            else
            {
                if (!File.Exists(plyPath))
                {
                    Debug.LogWarning($"DataViz: PLY file not found at {plyPath}");
                    yield break;
                }
                plyText = File.ReadAllText(plyPath);
            }

            Mesh mesh = PlyLoader.Load(plyText);
            MeshFilter mf = surfaceRoot.GetComponentInChildren<MeshFilter>();
            if (mf != null)
                mf.mesh = mesh;

            // Apply vertex-color material if the mesh has colors
            MeshRenderer mr = surfaceRoot.GetComponentInChildren<MeshRenderer>();
            if (mr != null && mesh.colors32 != null && mesh.colors32.Length > 0)
            {
                Material mat = new Material(Shader.Find("Standard"));
                mat.EnableKeyword("_VERTEXCOLOR");
                mat.SetFloat("_Glossiness", 0.3f);
                // Use a shader that supports vertex colors + double-sided
                Shader vcShader = Shader.Find("Particles/Standard Unlit");
                if (vcShader != null)
                {
                    mat = new Material(vcShader);
                    mat.SetFloat("_ColorMode", 1f); // vertex color
                    mat.SetInt("_Cull", 0); // double-sided
                }
                mr.material = mat;
            }
        }

        // ── Public API for scene switching ──────────

        /// <summary>
        /// Show a specific scene by index, hiding all others.
        /// Use for level-of-detail, time series, or storytelling navigation.
        /// </summary>
        public void ShowScene(int index)
        {
            for (int i = 0; i < _sceneNodes.Count; i++)
            {
                _sceneNodes[i].SetActive(i == index);
            }
            selectedScene = index;
        }

        /// <summary>
        /// Show the next scene (wraps around).
        /// </summary>
        public void NextScene()
        {
            if (_sceneNodes.Count == 0) return;
            ShowScene((selectedScene + 1) % _sceneNodes.Count);
        }

        /// <summary>
        /// Show the previous scene (wraps around).
        /// </summary>
        public void PreviousScene()
        {
            if (_sceneNodes.Count == 0) return;
            ShowScene((selectedScene - 1 + _sceneNodes.Count) % _sceneNodes.Count);
        }
    }
}
