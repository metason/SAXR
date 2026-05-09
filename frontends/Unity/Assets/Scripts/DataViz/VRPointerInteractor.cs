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

            Canvas.ForceUpdateCanvases();

            // Ray along the Aim object's Z axis — matches the visible ray in the prefab
            var ray = new Ray(_aimTransform.position, _aimTransform.forward);
            Debug.DrawRay(ray.origin, ray.direction * _maxDistance, Color.cyan);

            Button hit = FindClosestButton(ray);
            if (hit != _hoveredButton)
            {
                _hoveredButton = hit;
                Debug.Log(hit != null
                    ? $"[VRPointerInteractor] ({_hand}) Ray over: {hit.name}"
                    : $"[VRPointerInteractor] ({_hand}) Ray left buttons.");
            }

            if (justPressed)
            {
                // Spawn debug cube at the point where the ray meets the closest button's plane
                SpawnHitMarker(ray);

                if (_hoveredButton != null)
                {
                    Debug.Log($"[VRPointerInteractor] ({_hand}) Clicking: {_hoveredButton.name}");
                    _hoveredButton.onClick.Invoke();
                }
            }
        }

        private void SpawnHitMarker(Ray ray)
        {
            // Find the first button plane the ray intersects and place the marker there
            var corners = new Vector3[4];
            float closest = _maxDistance;
            Vector3 hitPoint = ray.GetPoint(_maxDistance);

            foreach (var btn in FindObjectsByType<Button>(FindObjectsSortMode.None))
            {
                if (!btn.gameObject.activeInHierarchy) continue;
                var rt = btn.GetComponent<RectTransform>();
                if (rt == null) continue;

                rt.GetWorldCorners(corners);
                var normal = Vector3.Cross(corners[1] - corners[0], corners[3] - corners[0]).normalized;
                if (normal == Vector3.zero) continue;

                var plane = new Plane(normal, corners[0]);
                if (!plane.Raycast(ray, out float dist) || dist >= closest) continue;

                closest = dist;
                hitPoint = ray.GetPoint(dist);
            }

            var marker = GameObject.CreatePrimitive(PrimitiveType.Cube);
            marker.name = "HitMarker";
            marker.transform.position = hitPoint;
            marker.transform.localScale = Vector3.one * 0.02f;
            Destroy(marker.GetComponent<Collider>());
            Destroy(marker, 3f);
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