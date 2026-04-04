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
