// VRControllerVisuals.cs
// Attach to a controller representation GameObject. It will follow the tracked
// XR hand position/rotation. Set Hand to Left or Right in the Inspector.
// The GameObject must be a child of the XROrigin so tracking space is correct.

using UnityEngine;
using UnityEngine.XR;

namespace SAXR
{
    public class VRControllerVisuals : MonoBehaviour
    {
        public enum Hand { Left, Right }

        [SerializeField] private Hand _hand = Hand.Right;

        private XRNode Node => _hand == Hand.Left ? XRNode.LeftHand : XRNode.RightHand;

        private void Update()
        {
            var device = InputDevices.GetDeviceAtXRNode(Node);

            if (!device.isValid)
            {
                SetVisible(false);
                return;
            }

            // Some OpenXR runtimes don't reliably report isTracked via the legacy API,
            // so show the controller whenever the device itself is valid.
            SetVisible(true);

            if (device.TryGetFeatureValue(CommonUsages.devicePosition, out Vector3 pos))
                transform.localPosition = pos;

            if (device.TryGetFeatureValue(CommonUsages.deviceRotation, out Quaternion rot))
                transform.localRotation = rot;
        }

        private void SetVisible(bool visible)
        {
            foreach (var r in GetComponentsInChildren<Renderer>())
                r.enabled = visible;
        }
    }
}