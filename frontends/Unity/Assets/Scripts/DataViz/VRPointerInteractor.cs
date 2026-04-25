// VRPointerInteractor.cs
// Attach to a controller root (alongside VRControllerVisuals).

using UnityEngine;
using UnityEngine.UI;
using UnityEngine.XR;

namespace SAXR
{
    public class VRPointerInteractor : MonoBehaviour
    {
        public enum Hand { Left, Right }

        [SerializeField] private Hand _hand = Hand.Left;
        [SerializeField] private float _maxDistance = 10f;
        [SerializeField] private float _hitPadding = 0.06f; // world-space expansion around each button

        private XRNode Node => _hand == Hand.Left ? XRNode.LeftHand : XRNode.RightHand;

        private Transform _aimTransform;
        private bool _wasTriggered;
        private Button _hoveredButton;
        private float _scanLogTimer;

        private void Start()
        {
            foreach (Transform t in GetComponentsInChildren<Transform>(true))
            {
                if (t.name == "Aim") { _aimTransform = t; break; }
            }
            if (_aimTransform == null)
            {
                Debug.LogWarning($"[VRPointerInteractor] ({_hand}) Aim child not found, using own transform.");
                _aimTransform = transform;
            }
            Debug.Log($"[VRPointerInteractor] ({_hand}) Started. Aim={_aimTransform.name}");
        }

        private void Update()
        {
            if (_aimTransform == null) return;

            // Read trigger
            var device = InputDevices.GetDeviceAtXRNode(Node);
            bool triggered = false;
            if (device.isValid)
            {
                if (!device.TryGetFeatureValue(CommonUsages.triggerButton, out triggered))
                {
                    device.TryGetFeatureValue(CommonUsages.trigger, out float a);
                    triggered = a > 0.5f;
                }
            }
            bool justPressed = triggered && !_wasTriggered;
            _wasTriggered = triggered;

            var ray = new Ray(_aimTransform.position, _aimTransform.forward);

            // Periodic scan log — every 3 s show what buttons exist in scene
            _scanLogTimer -= Time.deltaTime;
            if (_scanLogTimer <= 0f)
            {
                _scanLogTimer = 3f;
                var all = FindObjectsByType<Button>(FindObjectsSortMode.None);
                Debug.Log($"[VRPointerInteractor] ({_hand}) Scene has {all.Length} Button(s).");
                foreach (var b in all)
                    Debug.Log($"  • {b.name}  interactable={b.IsInteractable()}  active={b.gameObject.activeInHierarchy}");
            }

            // On trigger press: detailed per-button diagnostic
            if (justPressed)
            {
                Debug.Log($"[VRPointerInteractor] ({_hand}) Trigger pressed. Ray origin={ray.origin:F2} dir={ray.direction:F2}");
                var all = FindObjectsByType<Button>(FindObjectsSortMode.None);
                foreach (var btn in all)
                {
                    var rt = btn.GetComponent<RectTransform>();
                    if (rt == null) { Debug.Log($"  {btn.name}: no RectTransform"); continue; }

                    var corners = new Vector3[4];
                    rt.GetWorldCorners(corners);
                    var normal = Vector3.Cross(corners[1] - corners[0], corners[3] - corners[0]).normalized;
                    var plane = new Plane(normal, corners[0]);
                    bool planeHit = plane.Raycast(ray, out float dist);
                    Vector3 hitPt = planeHit ? ray.GetPoint(dist) : Vector3.zero;
                    bool inRect = planeHit && IsPointInQuad(hitPt, corners, 0f);
                    bool inRectPadded = planeHit && IsPointInQuad(hitPt, corners, _hitPadding);

                    Debug.Log($"  {btn.name}: corners=({corners[0]:F2},{corners[1]:F2},{corners[2]:F2},{corners[3]:F2}) " +
                              $"planeHit={planeHit} dist={dist:F2} hitPt={hitPt:F2} inRect={inRect} inRect+pad={inRectPadded}");
                }
            }

            // Hover detection every frame
            Button hit = FindClosestButton(ray);
            if (hit != _hoveredButton)
            {
                _hoveredButton = hit;
                Debug.Log(hit != null
                    ? $"[VRPointerInteractor] ({_hand}) Ray over: {hit.name}"
                    : $"[VRPointerInteractor] ({_hand}) Ray left buttons.");
            }

            if (justPressed && _hoveredButton != null)
            {
                Debug.Log($"[VRPointerInteractor] ({_hand}) Clicking: {_hoveredButton.name}");
                _hoveredButton.onClick.Invoke();
            }
        }

        private Button FindClosestButton(Ray ray)
        {
            var corners = new Vector3[4];
            float closestDist = _maxDistance;
            Button closest = null;

            foreach (var btn in FindObjectsByType<Button>(FindObjectsSortMode.None))
            {
                if (!btn.IsInteractable() || !btn.gameObject.activeInHierarchy) continue;
                var rt = btn.GetComponent<RectTransform>();
                if (rt == null) continue;

                rt.GetWorldCorners(corners);
                var normal = Vector3.Cross(corners[1] - corners[0], corners[3] - corners[0]).normalized;
                if (normal == Vector3.zero) continue;

                var plane = new Plane(normal, corners[0]);
                if (!plane.Raycast(ray, out float dist) || dist > closestDist) continue;

                if (!IsPointInQuad(ray.GetPoint(dist), corners, _hitPadding)) continue;

                closestDist = dist;
                closest = btn;
            }

            return closest;
        }

        // Returns true if worldPoint lies inside the world-space quad (optionally expanded by padding)
        // corners order: bottom-left, top-left, top-right, bottom-right (Unity GetWorldCorners order)
        private static bool IsPointInQuad(Vector3 point, Vector3[] corners, float padding)
        {
            Vector3[] c = corners;
            if (padding > 0f)
            {
                var center = (corners[0] + corners[1] + corners[2] + corners[3]) * 0.25f;
                c = new Vector3[4];
                for (int i = 0; i < 4; i++)
                {
                    var dir = corners[i] - center;
                    c[i] = corners[i] + (dir.sqrMagnitude > 0.0001f ? dir.normalized * padding : Vector3.zero);
                }
            }
            var n = Vector3.Cross(c[1] - c[0], c[3] - c[0]);
            return Vector3.Dot(Vector3.Cross(c[1] - c[0], point - c[0]), n) >= 0f &&
                   Vector3.Dot(Vector3.Cross(c[2] - c[1], point - c[1]), n) >= 0f &&
                   Vector3.Dot(Vector3.Cross(c[3] - c[2], point - c[2]), n) >= 0f &&
                   Vector3.Dot(Vector3.Cross(c[0] - c[3], point - c[3]), n) >= 0f;
        }
    }
}