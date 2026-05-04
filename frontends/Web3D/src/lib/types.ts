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

/**
 * Raw wire format: the `datareps.json` array-of-arrays as decoded from JSON.
 * Scene 0 is the stage (persistent elements); scenes 1..n are data frames.
 * @internal Use {@link ParsedVizData} in application code.
 */
export type VizJson = DataRep[][];

/**
 * Parsed visualization data with an explicit stage/scene separation.
 * Eliminates the implicit "scene 0 is the stage" convention by naming each part.
 *
 * Produced by {@link loadVizJson} from the raw {@link VizJson} wire format.
 */
export interface ParsedVizData {
	/** Stage-level DataReps — panels, axes, and encoding markers persisted across all data scenes. */
	stage: DataRep[];
	/** Data scenes: each entry is one animation frame / story step / LOD level. */
	scenes: DataRep[][];
}

/** Parsed key:value pairs from semicolon-separated asset strings (e.g. arc params) */
export type KVMap = Record<string, string>;

/** XYZ offset between scenes in comparative mode: `[gapX, gapY, gapZ]` in metres.
 * `gapX` controls column spacing, `gapZ` controls row spacing.
 * `gapY` is reserved for vertical (LOD) stacking and is always 0 in current arrangements.
 */
export type GapVector = [gapX: number, gapY: number, gapZ: number];

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
	/** XYZ offset between side-by-side placements in metres for `'comparative'` arrangement. */
	gap?: GapVector;
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

/** Metadata for a discovered sample dataset, as returned by GET /api/samples. */
export interface SampleInfo {
	/** Display name (from config.json `title`, or capitalized directory name). */
	name: string;
	/** Optional description from config.json. */
	description?: string;
	/** Short identifier matching the samples/ directory name. */
	slug: string;
	/** URL path to the sample's datareps.json. */
	vizJsonPath: string;
	/** URL base path for resolving panel/texture assets. */
	assetBasePath: string;
}
