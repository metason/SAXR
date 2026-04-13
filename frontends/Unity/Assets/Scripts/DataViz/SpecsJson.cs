// SpecsJson.cs
// Data model for specs.json deserialization.
// Mirrors the SequenceConfig / SpecsJson interfaces in Web3D's types.ts.

using System;

namespace SAXR
{
    [Serializable]
    public class SequenceConfig
    {
        public string field = "";
        public float[] domain;
        public string arrangement = "";
        public float interval = 1.5f;
        public string[] labels;

        public bool IsAnimated => arrangement == "animated";
        public bool IsNarrative => arrangement == "narrative";
    }

    [Serializable]
    public class SpecsJson
    {
        public SequenceConfig sequence;
    }
}
