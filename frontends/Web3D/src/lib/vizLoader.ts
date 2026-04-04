// vizLoader.ts
// Fetch and parse datareps.json files (Array<Array<DataRep>>)
// Equivalent of VizJsonParser in DataViz.cs / JSON decoding in DataViz.swift

import { DataRep, VizJson } from './types';

/**
 * Load a datareps.json from a URL or local path and parse it.
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
 * e.g. "ratio:0.5;start:0;angle:120" → { ratio: "0.5", start: "0", angle: "120" }
 * Matches DataViz.ParseKV() in C#.
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
 * Parse hex color string (#RRGGBB or #RRGGBBAA) into { r, g, b, opacity }.
 * All values 0–1. Matches ColorHelper.ParseHexColor() in C#.
 */
export function parseHexColor(hex: string): {
	r: number;
	g: number;
	b: number;
	opacity: number;
} {
	if (!hex) return { r: 1, g: 1, b: 1, opacity: 1 };

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
 * Matches DataRep.IsSceneLevel in C#.
 */
export function isSceneLevel(rep: DataRep): boolean {
	return rep.type === rep.type.toLowerCase();
}

/**
 * Classify a DataRep type for rendering.
 */
export type RepCategory = 'shape' | 'panel' | 'encoding' | 'text';

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
		].includes(t)
	) {
		return 'shape';
	}
	// Everything else is a panel (xy, -xy, zy, -zy, xz, lc=..., etc.)
	return 'panel';
}
