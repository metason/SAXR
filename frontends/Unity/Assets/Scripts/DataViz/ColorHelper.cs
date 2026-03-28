// ColorHelper.cs
// Hex color parsing for SAXR DataReps (handles #RRGGBB and #RRGGBBAA)

using UnityEngine;

namespace SAXR
{
    public static class ColorHelper
    {
        /// <summary>
        /// Parse a hex color string like "#FF8800" or "#FF8800CC" (with alpha).
        /// Returns the parsed Color and the transparency value (1 - alpha, for material fade).
        /// </summary>
        public static Color ParseHexColor(string hex, out float transparency)
        {
            transparency = 0f;

            if (string.IsNullOrEmpty(hex))
                return Color.white;

            // Ensure leading #
            if (!hex.StartsWith("#"))
                hex = "#" + hex;

            // #RRGGBBAA format (9 chars)
            if (hex.Length > 7)
            {
                string alphaHex = hex.Substring(7, 2);
                string rgbHex = hex.Substring(0, 7);

                if (ColorUtility.TryParseHtmlString(rgbHex, out Color col))
                {
                    if (int.TryParse(alphaHex, System.Globalization.NumberStyles.HexNumber, null, out int alphaInt))
                    {
                        float alpha = alphaInt / 255f;
                        col.a = alpha;
                        transparency = 1f - alpha;
                    }
                    return col;
                }
            }

            // #RRGGBB format (7 chars)
            if (ColorUtility.TryParseHtmlString(hex, out Color color))
                return color;

            // Fallback: try named colors
            return TryNamedColor(hex.TrimStart('#'));
        }

        /// <summary>
        /// Try common CSS/matplotlib named colors.
        /// </summary>
        private static Color TryNamedColor(string name)
        {
            switch (name.ToLower())
            {
                case "red": return Color.red;
                case "green": return Color.green;
                case "blue": return Color.blue;
                case "white": return Color.white;
                case "black": return Color.black;
                case "yellow": return Color.yellow;
                case "cyan": return Color.cyan;
                case "magenta": return Color.magenta;
                case "orange": return new Color(1f, 0.647f, 0f);
                case "gray": case "grey": return Color.gray;
                default: return Color.white;
            }
        }

        /// <summary>
        /// Apply color to a renderer, handling transparency if needed.
        /// </summary>
        public static void ApplyColor(Renderer renderer, string hexColor)
        {
            Color color = ParseHexColor(hexColor, out float transparency);

            Material mat = renderer.material;
            mat.color = color;

            if (transparency > 0f)
            {
                // Switch to transparent rendering mode
                mat.SetFloat("_Mode", 3); // Transparent
                mat.SetInt("_SrcBlend", (int)UnityEngine.Rendering.BlendMode.SrcAlpha);
                mat.SetInt("_DstBlend", (int)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
                mat.SetInt("_ZWrite", 0);
                mat.DisableKeyword("_ALPHATEST_ON");
                mat.EnableKeyword("_ALPHABLEND_ON");
                mat.DisableKeyword("_ALPHAPREMULTIPLY_ON");
                mat.renderQueue = 3000;
            }
        }
    }
}
