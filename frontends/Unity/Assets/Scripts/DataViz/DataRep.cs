// DataRep.cs
// Data Representation model for SAXR Unity adapter
// Matches the datareps.json format produced by datarepgen.py

using System;

namespace SAXR
{
    /// <summary>
    /// A single data representation element.
    /// Deserialized from datareps.json which contains Array of Array of DataRep.
    /// </summary>
    [Serializable]
    public class DataRep
    {
        public string type = "box";
        public float x = 0f;
        public float y = 0f;
        public float z = 0f;
        public float w = 0.05f;
        public float h = 0.05f;
        public float d = 0.05f;
        public string color = "";
        public string asset = "";

        /// <summary>
        /// True if type is all-lowercase (scene-level data point).
        /// False if type contains uppercase chars (stage-level panel/wall).
        /// </summary>
        public bool IsSceneLevel => type == type.ToLower();
    }
}
