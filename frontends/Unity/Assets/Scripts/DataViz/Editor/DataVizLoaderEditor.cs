// Custom Inspector for DataVizLoader.
// Shows a dropdown of all available samples and a Reload button.

using UnityEditor;
using UnityEngine;

namespace SAXR
{
    [CustomEditor(typeof(DataVizLoader))]
    public class DataVizLoaderEditor : Editor
    {
        public override void OnInspectorGUI()
        {
            DataVizLoader loader = (DataVizLoader)target;

            // ── Sample selector dropdown ────────────
            EditorGUILayout.LabelField("Data Source", EditorStyles.boldLabel);

            DataVizLoader.GetAvailableSamples(out string[] names, out string[] paths);

            int newIndex = EditorGUILayout.Popup("Sample", loader.sampleIndex, names);
            if (newIndex != loader.sampleIndex)
            {
                Undo.RecordObject(loader, "Change Sample");
                loader.sampleIndex = newIndex;
                EditorUtility.SetDirty(loader);
            }

            // Show custom path field only when "Custom…" is selected
            bool isCustom = (loader.sampleIndex >= paths.Length - 1);
            if (isCustom)
            {
                EditorGUILayout.PropertyField(serializedObject.FindProperty("vizJsonPath"),
                    new GUIContent("Viz Json Path", "Relative path from repo root, absolute path, or URL"));
            }

            EditorGUILayout.PropertyField(serializedObject.FindProperty("assetBasePath"),
                new GUIContent("Asset Base Path", "Leave empty to auto-detect from datareps.json folder"));

            EditorGUILayout.Space();

            // ── Scene selection ─────────────────────
            EditorGUILayout.LabelField("Scene Selection", EditorStyles.boldLabel);
            EditorGUILayout.PropertyField(serializedObject.FindProperty("selectedScene"));

            serializedObject.ApplyModifiedProperties();

            // ── Sequence info (play mode, when specs loaded) ──
            if (Application.isPlaying && loader.Specs?.sequence != null)
            {
                EditorGUILayout.Space();
                EditorGUILayout.LabelField("Sequence", EditorStyles.boldLabel);

                var seq = loader.Specs.sequence;
                EditorGUILayout.LabelField("Arrangement", seq.arrangement);
                EditorGUILayout.LabelField("Scene Count", loader.SceneCount.ToString());

                if (seq.IsAnimated)
                {
                    EditorGUILayout.LabelField("Interval", seq.interval + "s");
                }

                if (seq.labels != null && seq.labels.Length > 0)
                {
                    EditorGUILayout.LabelField("Labels", string.Join(", ", seq.labels));
                }
            }

            // ── Scene nav buttons (play mode) ───────
            if (Application.isPlaying && loader.SceneCount > 1)
            {
                EditorGUILayout.Space();
                EditorGUILayout.BeginHorizontal();
                if (GUILayout.Button("◀ Prev"))
                    loader.PreviousScene();

                var controller = loader.GetComponent<SequenceController>();
                if (controller != null && loader.Specs?.sequence != null && loader.Specs.sequence.IsAnimated)
                {
                    string playLabel = controller.IsPlaying ? "⏸ Pause" : "▶ Play";
                    if (GUILayout.Button(playLabel))
                        controller.TogglePlayPause();
                }

                if (GUILayout.Button("Next ▶"))
                    loader.NextScene();
                EditorGUILayout.EndHorizontal();
            }

            // ── Reload button (play mode only) ──────
            EditorGUILayout.Space();
            GUI.enabled = Application.isPlaying;
            if (GUILayout.Button("Reload Sample", GUILayout.Height(30)))
            {
                loader.Reload();
            }
            GUI.enabled = true;

            if (!Application.isPlaying)
            {
                EditorGUILayout.HelpBox("Press Play, then click Reload to switch samples at runtime.", MessageType.Info);
            }
        }
    }
}
