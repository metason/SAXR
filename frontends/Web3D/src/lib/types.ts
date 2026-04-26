/**
 * @module types
 * Data types matching the datareps.json format produced by SAXR datarepgen.py.
 * Mirrors DataRep.cs (Unity) and DataRep struct in DataViz.swift.
 */

/** A positioned, scaled, colored 3D primitive in the SAXR visualization. */
export interface DataRep {
	/** Shape type identifier (e.g. `'sphere'`, `'box'`, `'xy'`, `'pyramid_down'`). */
	type: string;
	/** Position X in 3D space. */
	x: number;
	/** Position Y in 3D space. */
	y: number;
	/** Position Z in 3D space. */
	z: number;
	/** Width (scale X). */
	w: number;
	/** Height (scale Y). */
	h: number;
	/** Depth (scale Z). */
	d: number;
	/** Hex color string (`'#RRGGBB'` or `'#RRGGBBAA'`). */
	color?: string;
	/** Image path (panels), KV params (arcs), or PLY path (surfaces). */
	asset?: string;
}

/** datareps.json is Array<Array<DataRep>> — each inner array is a "scene" */
export type VizJson = DataRep[][];

/** Parsed key:value pairs from semicolon-separated asset strings (e.g. arc params) */
export type KVMap = Record<string, string>;

/** Sequence configuration from specs.json controlling multi-scene presentation. */
export interface SequenceConfig {
	/** Data field driving the sequence (e.g. `'year'`). */
	field?: string;
	/** Value range `[min, max]` for the sequence domain (e.g. `[2000, 2020]`). */
	domain?: number[];
	/** How scenes are presented: auto-play, storytelling, side-by-side, or LOD. */
	arrangement?: 'animated' | 'comparative' | 'LOD' | 'narrative';
	/** Auto-play interval in seconds (default: 1.5). Only used with `'animated'`. */
	interval?: number;
	/** Scene labels for `'narrative'` arrangement — one per scene. */
	labels?: string[];
	/** XYZ offset between side-by-side placements in meters for `'comparative'` arrangement. */
	gap?: number[];
	/** Initial domain values to show in comparative mode (e.g. `[2000, 2010, 2020]`). Users can still toggle interactively. */
	selection?: number[];
	/** Number of columns in the comparative grid. If omitted, computed from scene count. */
	columns?: number;
}

/** Parsed specs.json containing sequence and encoding metadata. */
export interface SpecsJson {
	/** Multi-scene sequence configuration. */
	sequence?: SequenceConfig;
	/** Encoding metadata (axes, color mappings, etc.). */
	encoding?: Record<string, unknown>;
}
