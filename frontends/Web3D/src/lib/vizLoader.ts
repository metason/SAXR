/**
 * @module vizLoader
 * Fetch and parse datareps.json files (`Array<Array<DataRep>>`).
 * Equivalent of VizJsonParser in DataViz.cs / JSON decoding in DataViz.swift.
 */

import { DataRep, VizJson, SpecsJson } from './types';
import * as THREE from 'three';

/**
 * Load a datareps.json from a URL or local path and parse it.
 * @param url - URL or path to the datareps.json file.
 * @returns Parsed array-of-arrays structure (scenes of DataReps).
 * @throws Error if the fetch fails or the JSON structure is invalid.
 */
export async function loadVizJson(url: string): Promise<VizJson> {
	const res = await fetch(url);
	if (!res.ok)
		throw new Error(
			`Failed to load datareps.json: ${res.status} ${res.statusText}`,
		);
	const data: VizJson = await res.json();

	// Validate structure: must be array of arrays
	if (!Array.isArray(data) || data.length === 0) {
		throw new Error('datareps.json must be a non-empty array of arrays');
	}
	if (!Array.isArray(data[0])) {
		throw new Error('datareps.json must be an array of arrays (scenes)');
	}

	return data;
}

/**
 * Parse semicolon-separated key:value pairs from a DataRep asset string.
 * @param str - Semicolon-separated string, e.g. `"ratio:0.5;start:0;angle:120"`.
 * @returns Key-value dictionary, e.g. `{ ratio: "0.5", start: "0", angle: "120" }`.
 * @see DataViz.ParseKV() in C#.
 */
export function parseKV(str: string): Record<string, string> {
	const dict: Record<string, string> = {};
	if (!str) return dict;
	for (const sub of str.split(';')) {
		if (sub.includes(':')) {
			const [key, ...rest] = sub.split(':');
			dict[key.trim()] = rest.join(':').trim();
		}
	}
	return dict;
}

/**
 * Parse hex color string (`#RRGGBB` or `#RRGGBBAA`) into normalized RGBA components.
 * @param hex - Hex color string, Three.js named color, or raw hex digits.
 * @returns Object with `r`, `g`, `b` (0–1) and `opacity` (0–1).
 * @see ColorHelper.ParseHexColor() in C#.
 */
export function parseHexColor(hex: string): {
	r: number;
	g: number;
	b: number;
	opacity: number;
} {
	if (!hex) return { r: 1, g: 1, b: 1, opacity: 1 };

	if (!hex.startsWith('#') && !/^[0-9a-fA-F]+$/.test(hex)) {
		try {
			const c = new THREE.Color(hex);
			return { r: c.r, g: c.g, b: c.b, opacity: 1 };
		} catch {
			return { r: 1, g: 1, b: 1, opacity: 1 };
		}
	}

	if (!hex.startsWith('#')) hex = '#' + hex;

	let r = 1,
		g = 1,
		b = 1,
		opacity = 1;

	if (hex.length > 7) {
		// #RRGGBBAA
		const alphaHex = hex.substring(7, 9);
		const rgb = hex.substring(0, 7);
		r = parseInt(rgb.substring(1, 3), 16) / 255;
		g = parseInt(rgb.substring(3, 5), 16) / 255;
		b = parseInt(rgb.substring(5, 7), 16) / 255;
		opacity = parseInt(alphaHex, 16) / 255;
	} else if (hex.length >= 7) {
		// #RRGGBB
		r = parseInt(hex.substring(1, 3), 16) / 255;
		g = parseInt(hex.substring(3, 5), 16) / 255;
		b = parseInt(hex.substring(5, 7), 16) / 255;
	}

	return { r, g, b, opacity };
}

/**
 * Determine if a DataRep is a scene-level data point (all-lowercase type)
 * vs a stage-level panel/wall (has uppercase).
 * @param rep - The DataRep to classify.
 * @returns `true` if the rep belongs to a data scene, `false` if stage-level.
 * @see DataRep.IsSceneLevel in C#.
 */
export function isSceneLevel(rep: DataRep): boolean {
	return rep.type === rep.type.toLowerCase();
}

/**
 * Category for routing a DataRep to the correct renderer.
 * - `'shape'` — 3D geometry (sphere, box, arc, etc.)
 * - `'panel'` — textured image quad (xy, zy, xz, lc=…)
 * - `'encoding'` — encoding metadata (not rendered)
 * - `'text'` — text element
 */
export type RepCategory = 'shape' | 'panel' | 'encoding' | 'text';

/**
 * Classify a DataRep type for rendering dispatch.
 * @param rep - The DataRep to classify.
 * @returns The rendering category for the given rep.
 */

export function classifyRep(rep: DataRep): RepCategory {
	const t = rep.type.toLowerCase();
	if (t === 'encoding') return 'encoding';
	if (t === 'text') return 'text';
	if (
		[
			'box',
			'sphere',
			'cylinder',
			'pyramid',
			'pyramid_down',
			'octahedron',
			'plus',
			'cross',
			'plane',
			'arc',
			'surface', // Add surface as a renderable shape type for ply files
		].includes(t)
	) {
		return 'shape';
	}
	// Everything else is a panel (xy, -xy, zy, -zy, xz, lc=..., etc.)
	return 'panel';
}

/**
 * Load specs.json from a sample’s base URL.
 * @param baseUrl - Asset base path for the sample (e.g. `/samples/eco`).
 * @returns Parsed specs or `null` if the file doesn’t exist or fails to load.
 */
export async function loadSpecsJson(
	baseUrl: string,
): Promise<SpecsJson | null> {
	try {
		const res = await fetch(`${baseUrl}/specs.json`);
		if (!res.ok) return null;
		return await res.json();
	} catch {
		return null;
	}
}
