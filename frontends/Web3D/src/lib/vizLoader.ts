/**
 * @module vizLoader
 * Fetch and parse datareps.json files (`Array<Array<DataRep>>`).
 * Equivalent of VizJsonParser in DataViz.cs / JSON decoding in DataViz.swift.
 */

import { DataRep, VizJson, ParsedVizData, SpecsJson } from './types';
import * as THREE from 'three';

export { classifyRep } from '@/components/shapes/registry';
export type { RepCategory } from '@/components/shapes/registry';

/**
 * Load a datareps.json from a URL or local path and parse it into a
 * {@link ParsedVizData} with an explicit stage/scenes split.
 * @param url - URL or path to the datareps.json file.
 * @returns Parsed data with `stage` (scene 0) and `scenes` (scenes 1..n).
 * @throws Error if the fetch fails or the JSON structure is invalid.
 */
export async function loadVizJson(url: string): Promise<ParsedVizData> {
	const res = await fetch(url);
	if (!res.ok)
		throw new Error(
			`Failed to load datareps.json: ${res.status} ${res.statusText}`,
		);
	const raw: VizJson = await res.json();

	// Validate structure: must be array of arrays
	if (!Array.isArray(raw) || raw.length === 0) {
		throw new Error('datareps.json must be a non-empty array of arrays');
	}
	if (!Array.isArray(raw[0])) {
		throw new Error('datareps.json must be an array of arrays (scenes)');
	}

	return { stage: raw[0] ?? [], scenes: raw.slice(1) };
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
 * Interpolate a domain label for a scene index.
 * Maps a 0-based scene index linearly onto `[domain[0], domain[1]]` and returns
 * the rounded value as a string. Used by SceneNav, ComparativeScenePicker, and
 * useViewerState to produce consistent year/value labels from the same formula.
 * @param sceneIndex - 0-based index into the data scenes array.
 * @param totalScenes - Total number of data scenes.
 * @param domain - `[min, max]` value range from `specs.sequence.domain`.
 * @returns Rounded interpolated value as a string (e.g. `"2012"`).
 */
export function domainLabelForScene(
	sceneIndex: number,
	totalScenes: number,
	domain: number[],
): string {
	const value =
		domain[0] +
		(sceneIndex * (domain[1] - domain[0])) / Math.max(totalScenes - 1, 1);
	return String(Math.round(value));
}

/**
 * Load specs.json from a sample's base URL.
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
