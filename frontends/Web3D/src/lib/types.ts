// types.ts
// Data types matching the datareps.json format produced by SAXR datarepgen.py
// Mirrors DataRep.cs (Unity) and DataRep struct in DataViz.swift

export interface DataRep {
	type: string;
	x: number;
	y: number;
	z: number;
	w: number;
	h: number;
	d: number;
	color?: string;
	asset?: string;
}

/** datareps.json is Array<Array<DataRep>> — each inner array is a "scene" */
export type VizJson = DataRep[][];

/** Parsed key:value pairs from semicolon-separated asset strings (e.g. arc params) */
export type KVMap = Record<string, string>;
