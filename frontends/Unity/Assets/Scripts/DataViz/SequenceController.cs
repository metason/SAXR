// SequenceController.cs
// Handles animated auto-play and sequence state for multi-scene visualizations.
// Mirrors the auto-play useEffect in Web3D's page.tsx.

using System.Collections;
using UnityEngine;

namespace SAXR
{
    /// <summary>
    /// Attach to the same GameObject as DataVizLoader.
    /// Automatically starts/stops playback based on specs.json sequence config.
    /// </summary>
    [RequireComponent(typeof(DataVizLoader))]
    public class SequenceController : MonoBehaviour
    {
        private DataVizLoader _loader;
        private Coroutine _playCoroutine;

        public bool IsPlaying { get; private set; }

        private void Awake()
        {
            _loader = GetComponent<DataVizLoader>();
        }

        private void OnEnable()
        {
            _loader.OnLoaded += OnVisualizationLoaded;
        }

        private void OnDisable()
        {
            _loader.OnLoaded -= OnVisualizationLoaded;
            StopPlayback();
        }

        private void OnVisualizationLoaded()
        {
            StopPlayback();

            var seq = _loader.Specs?.sequence;
            if (seq != null && seq.IsAnimated && _loader.SceneCount > 1)
            {
                Play();
            }
        }

        public void Play()
        {
            if (IsPlaying || _loader.SceneCount <= 1) return;
            IsPlaying = true;
            _playCoroutine = StartCoroutine(AutoPlayCoroutine());
        }

        public void Pause()
        {
            StopPlayback();
        }

        public void TogglePlayPause()
        {
            if (IsPlaying)
                Pause();
            else
                Play();
        }

        private void StopPlayback()
        {
            IsPlaying = false;
            if (_playCoroutine != null)
            {
                StopCoroutine(_playCoroutine);
                _playCoroutine = null;
            }
        }

        private IEnumerator AutoPlayCoroutine()
        {
            float interval = _loader.Specs?.sequence?.interval ?? 1.5f;
            if (interval <= 0f) interval = 1.5f;

            while (true)
            {
                yield return new WaitForSeconds(interval);
                _loader.NextScene();
            }
        }
    }
}
