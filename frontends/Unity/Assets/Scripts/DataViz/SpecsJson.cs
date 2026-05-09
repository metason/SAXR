// SpecsJson.cs
// Data model for specs.json deserialization.
// Mirrors the SequenceConfig / SpecsJson interfaces in Web3D's types.ts.

using System;
using UnityEngine;

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
        public float[] gap;
        public float[] selection;
        public int columns = 0;

        public bool IsAnimated => arrangement == "animated";
        public bool IsNarrative => arrangement == "narrative";
        public bool IsComparative => arrangement == "comparative";

        public Vector3 GapVector => gap != null && gap.Length >= 3 
            ? new Vector3(gap[0], gap[1], gap[2]) 
            : new Vector3(2f, 0f, 0f);
    }

    [Serializable]
    public class SpecsJson
    {
        public SequenceConfig sequence;
    }
}
