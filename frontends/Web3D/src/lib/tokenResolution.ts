/**
 * @module tokenResolution
 * The bridge from an AJV error (a logical JSON Pointer into the *data*) to an exact
 * character range in the *source text* (§6.2.9). AJV validates the parsed object and
 * has no source positions; jsonc-parser re-parses the raw text into a CST that keeps
 * each node's offset/length, so a path can be resolved to the precise token. Shared
 * by {@link EditorPanel} (to place Monaco markers) and the AJV explainer (to show the
 * resolution), so both run the same algorithm.
 */

import { parseTree, findNodeAtLocation, type Node } from 'jsonc-parser';

/** A 1-based editor position, matching Monaco's API. */
export interface Position {
	line: number;
	column: number;
}

/** One zoom level of the path walk: the node region for a path prefix. */
export interface PathStep {
	/** The segment consumed at this depth ("scenes", 0, "type"), or null for root. */
	segment: string | number | null;
	offset: number;
	length: number;
}

export interface ResolvedToken {
	/** instancePath split into object keys / array indices. */
	segments: (string | number)[];
	/** Character offset of the token in the source text. */
	offset: number;
	/** Length of the token in characters. */
	length: number;
	start: Position;
	end: Position;
	/** The exact source substring the squiggle covers. */
	matched: string;
}

/**
 * Convert an AJV instancePath (RFC 6901 JSON Pointer) into a path array
 * suitable for jsonc-parser's findNodeAtLocation.
 */
export function instancePathToSegments(instancePath: string): (string | number)[] {
	if (!instancePath) return [];
	return instancePath
		.split('/')
		.slice(1)
		.map((seg) => {
			const decoded = seg.replace(/~1/g, '/').replace(/~0/g, '~');
			return /^\d+$/.test(decoded) ? Number(decoded) : decoded;
		});
}

/**
 * Convert a character offset in `text` to a 1-based {line, column} position by
 * scanning and counting newlines (char code 10).
 */
export function offsetToPosition(text: string, offset: number): Position {
	let line = 1;
	let column = 1;
	const limit = Math.min(offset, text.length);
	for (let i = 0; i < limit; i++) {
		if (text.charCodeAt(i) === 10) {
			line++;
			column = 1;
		} else {
			column++;
		}
	}
	return { line, column };
}

/**
 * Resolve an AJV error's instancePath to the exact source token. For `required`
 * errors AJV reports the parent object's path, so pass `missingProperty` to land
 * on the missing key's node when present (falling back to the object itself).
 * Returns null when the text cannot be parsed.
 */
export function resolveToken(
	text: string,
	instancePath: string,
	missingProperty?: string,
): ResolvedToken | null {
	const tree = parseTree(text);
	if (!tree) return null;

	const segments = instancePathToSegments(instancePath);
	let target: Node | undefined = findNodeAtLocation(tree, segments);

	if (missingProperty && target) {
		const child = findNodeAtLocation(tree, [...segments, missingProperty]);
		if (child) target = child;
	}

	const offset = target?.offset ?? 0;
	const length = target?.length ?? 1;
	return {
		segments,
		offset,
		length,
		start: offsetToPosition(text, offset),
		end: offsetToPosition(text, offset + length),
		matched: text.substr(offset, length),
	};
}

/**
 * Build the sequence of node regions the path walks through — root, then each
 * prefix of the instancePath — so the resolution can be animated as a zoom from
 * the whole document down to the single token. Each step is what
 * findNodeAtLocation returns for that prefix.
 */
export function resolvePath(text: string, instancePath: string): PathStep[] | null {
	const tree = parseTree(text);
	if (!tree) return null;

	const segments = instancePathToSegments(instancePath);
	const steps: PathStep[] = [{ segment: null, offset: tree.offset, length: tree.length }];

	for (let i = 1; i <= segments.length; i++) {
		const node = findNodeAtLocation(tree, segments.slice(0, i));
		if (!node) break;
		steps.push({ segment: segments[i - 1], offset: node.offset, length: node.length });
	}
	return steps;
}
