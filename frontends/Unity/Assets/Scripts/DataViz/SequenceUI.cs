// SequenceUI.cs
// Runtime Canvas UI for scene navigation (prev/next, play/pause, narrative labels).
// Mirrors Web3D's SceneNav.tsx component.

using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;
using UnityEngine.XR;

namespace SAXR
{
    /// <summary>
    /// Attach to the same GameObject as DataVizLoader and SequenceController.
    /// Builds a screen-space overlay Canvas with scene navigation controls.
    /// </summary>
    [RequireComponent(typeof(DataVizLoader))]
    [RequireComponent(typeof(SequenceController))]
    public class SequenceUI : MonoBehaviour
    {
        [Header("VR World-Space Panel")]
        [Tooltip("Local Y offset from the chart pivot (negative = below).")]
        [SerializeField] private float vrYOffset = 50.0f;
        [Tooltip("Local Z offset from the chart pivot (positive = in front of chart, toward viewer).")]
        [SerializeField] private float vrZOffset = 0.0f;
        [Tooltip("Uniform scale applied to the world-space canvas (meters per pixel).")]
        [SerializeField] private float vrScale = 0.002f;

        private DataVizLoader _loader;
        private SequenceController _controller;

        private GameObject _canvasRoot;
        private Text _sceneLabel;
        private Button _playPauseBtn;
        private Text _playPauseText;
        private List<Button> _labelButtons = new List<Button>();

        // Styling
        private static readonly Color BgColor = new Color(0f, 0f, 0f, 0.6f);
        private static readonly Color BtnNormal = new Color(1f, 1f, 1f, 0.15f);
        private static readonly Color BtnActive = new Color(1f, 1f, 1f, 0.35f);

        private void Awake()
        {
            _loader = GetComponent<DataVizLoader>();
            _controller = GetComponent<SequenceController>();
        }

        private void OnEnable()
        {
            _loader.OnLoaded += RebuildUI;
        }

        private void OnDisable()
        {
            _loader.OnLoaded -= RebuildUI;
            DestroyUI();
        }

        private void Update()
        {
            if (_sceneLabel != null && _loader.SceneCount > 1)
            {
                var seq = _loader.Specs?.sequence;
                if (seq != null && seq.domain != null && seq.domain.Length >= 2 && _loader.SceneCount > 1)
                {
                    float val = seq.domain[0] + _loader.selectedScene
                        * (seq.domain[1] - seq.domain[0]) / (_loader.SceneCount - 1);
                    _sceneLabel.text = $"{Mathf.RoundToInt(val)}";
                }
                else
                {
                    _sceneLabel.text = $"Scene {_loader.selectedScene + 1} / {_loader.SceneCount}";
                }
            }

            if (_playPauseText != null)
            {
                _playPauseText.text = _controller.IsPlaying ? "Pause" : "Play";
            }

            // Highlight active label button
            for (int i = 0; i < _labelButtons.Count; i++)
            {
                var colors = _labelButtons[i].colors;
                colors.normalColor = (i == _loader.selectedScene) ? BtnActive : BtnNormal;
                _labelButtons[i].colors = colors;
            }
        }

        private void RebuildUI()
        {
            DestroyUI();

            if (_loader.SceneCount <= 1) return;

            var seq = _loader.Specs?.sequence;
            bool vr = XRSettings.isDeviceActive;

            // Create Canvas
            _canvasRoot = new GameObject("SequenceUI Canvas");
            _canvasRoot.transform.SetParent(transform, false);

            var canvas = _canvasRoot.AddComponent<Canvas>();

            if (vr)
            {
                canvas.renderMode = RenderMode.WorldSpace;
                var rt = _canvasRoot.GetComponent<RectTransform>();
                rt.sizeDelta = new Vector2(800f, 200f);
                _canvasRoot.transform.localPosition = new Vector3(0f, vrYOffset, vrZOffset);
                _canvasRoot.transform.localRotation = Quaternion.identity;
                _canvasRoot.transform.localScale = Vector3.one * vrScale;
            }
            else
            {
                canvas.renderMode = RenderMode.ScreenSpaceOverlay;
                canvas.sortingOrder = 100;
                _canvasRoot.AddComponent<CanvasScaler>();
            }

            _canvasRoot.AddComponent<GraphicRaycaster>();

            // Ensure an EventSystem exists (required for UI click handling)
            if (FindObjectOfType<EventSystem>() == null)
            {
                var es = new GameObject("EventSystem");
                es.transform.SetParent(_canvasRoot.transform, false);
                es.AddComponent<EventSystem>();
                es.AddComponent<StandaloneInputModule>();
            }

            // Bottom-center container (anchored to canvas centre in VR, bottom-centre on screen)
            var container = CreatePanel(_canvasRoot, "NavContainer");
            var containerRect = container.GetComponent<RectTransform>();
            if (vr)
            {
                containerRect.anchorMin = new Vector2(0.5f, 0.5f);
                containerRect.anchorMax = new Vector2(0.5f, 0.5f);
                containerRect.pivot = new Vector2(0.5f, 0.5f);
                containerRect.anchoredPosition = Vector2.zero;
            }
            else
            {
                containerRect.anchorMin = new Vector2(0.5f, 0f);
                containerRect.anchorMax = new Vector2(0.5f, 0f);
                containerRect.pivot = new Vector2(0.5f, 0f);
                containerRect.anchoredPosition = new Vector2(0f, 20f);
            }
            containerRect.sizeDelta = new Vector2(0f, 0f); // auto-size

            var vertLayout = container.AddComponent<VerticalLayoutGroup>();
            vertLayout.spacing = 6f;
            vertLayout.childAlignment = TextAnchor.MiddleCenter;
            vertLayout.childForceExpandWidth = false;
            vertLayout.childForceExpandHeight = false;

            var vertFitter = container.AddComponent<ContentSizeFitter>();
            vertFitter.horizontalFit = ContentSizeFitter.FitMode.PreferredSize;
            vertFitter.verticalFit = ContentSizeFitter.FitMode.PreferredSize;

            // Narrative labels row (if labels present)
            if (seq != null && seq.labels != null && seq.labels.Length > 0)
            {
                var labelsRow = CreateBar(container, "LabelsRow");
                _labelButtons.Clear();

                for (int i = 0; i < seq.labels.Length; i++)
                {
                    int sceneIdx = i; // capture for closure
                    var btn = CreateButton(labelsRow, seq.labels[i], () => _loader.ShowScene(sceneIdx));
                    _labelButtons.Add(btn);
                }
            }

            // Nav bar (Prev / Play|Pause / Scene N/Total / Next)
            var navBar = CreateBar(container, "NavBar");

            CreateButton(navBar, "< Prev", () => _loader.PreviousScene());

            if (seq != null && seq.IsAnimated)
            {
                _playPauseBtn = CreateButton(navBar, "Play", () => _controller.TogglePlayPause());
                _playPauseText = _playPauseBtn.GetComponentInChildren<Text>();
            }

            // Scene counter label
            var labelGo = CreateLabel(navBar, "SceneLabel", "");
            _sceneLabel = labelGo.GetComponent<Text>();

            CreateButton(navBar, "Next >", () => _loader.NextScene());
        }

        private void DestroyUI()
        {
            _labelButtons.Clear();
            _sceneLabel = null;
            _playPauseBtn = null;
            _playPauseText = null;
            if (_canvasRoot != null)
            {
                Destroy(_canvasRoot);
                _canvasRoot = null;
            }
        }

        // ── UI Factory Helpers ──────────────────────

        private static GameObject CreatePanel(GameObject parent, string name)
        {
            var go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent.transform, false);

            var img = go.AddComponent<Image>();
            img.color = Color.clear;

            return go;
        }

        private static GameObject CreateBar(GameObject parent, string name)
        {
            var bar = new GameObject(name, typeof(RectTransform));
            bar.transform.SetParent(parent.transform, false);

            var bg = bar.AddComponent<Image>();
            bg.color = BgColor;

            var layout = bar.AddComponent<HorizontalLayoutGroup>();
            layout.spacing = 8f;
            layout.padding = new RectOffset(12, 12, 6, 6);
            layout.childAlignment = TextAnchor.MiddleCenter;
            layout.childForceExpandWidth = false;
            layout.childForceExpandHeight = false;

            var fitter = bar.AddComponent<ContentSizeFitter>();
            fitter.horizontalFit = ContentSizeFitter.FitMode.PreferredSize;
            fitter.verticalFit = ContentSizeFitter.FitMode.PreferredSize;

            return bar;
        }

        private static Button CreateButton(GameObject parent, string label, UnityEngine.Events.UnityAction onClick)
        {
            var go = new GameObject("Btn_" + label, typeof(RectTransform));
            go.transform.SetParent(parent.transform, false);

            var img = go.AddComponent<Image>();
            img.color = BtnNormal;

            var btn = go.AddComponent<Button>();
            var colors = btn.colors;
            colors.normalColor = BtnNormal;
            colors.highlightedColor = BtnActive;
            colors.pressedColor = Color.white * 0.5f;
            btn.colors = colors;

            var layout = go.AddComponent<LayoutElement>();
            layout.minWidth = 50f;
            layout.minHeight = 30f;

            // Text child
            var textGo = new GameObject("Text", typeof(RectTransform));
            textGo.transform.SetParent(go.transform, false);

            var text = textGo.AddComponent<Text>();
            text.text = label;
            text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            text.fontSize = 14;
            text.color = Color.white;
            text.alignment = TextAnchor.MiddleCenter;

            var textRect = textGo.GetComponent<RectTransform>();
            textRect.anchorMin = Vector2.zero;
            textRect.anchorMax = Vector2.one;
            textRect.sizeDelta = Vector2.zero;
            textRect.offsetMin = new Vector2(4f, 2f);
            textRect.offsetMax = new Vector2(-4f, -2f);

            btn.onClick.AddListener(onClick);
            return btn;
        }

        private static GameObject CreateLabel(GameObject parent, string name, string text)
        {
            var go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent.transform, false);

            var t = go.AddComponent<Text>();
            t.text = text;
            t.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            t.fontSize = 14;
            t.color = Color.white;
            t.alignment = TextAnchor.MiddleCenter;

            var layout = go.AddComponent<LayoutElement>();
            layout.minWidth = 100f;
            layout.minHeight = 30f;

            return go;
        }
    }
}
