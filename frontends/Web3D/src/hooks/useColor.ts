'use client';
/**
 * @module useColor
 * Converts a hex color string to a Three.js Color + opacity.
 * Extracted from DataRepMesh.tsx — used by every shape component.
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import { parseHexColor } from '@/lib/vizLoader';

/**
 * Hook that parses a hex color string into a memoized Three.js `Color` and opacity.
 * @param hex - Hex color string (`'#RRGGBB'` or `'#RRGGBBAA'`), or `undefined` for default gray.
 * @returns Object with `color` (THREE.Color) and `opacity` (0–1).
 */
export function useColor(hex?: string) {
	return useMemo(() => {
		if (!hex) return { color: new THREE.Color(0.8, 0.8, 0.8), opacity: 1 };
		const { r, g, b, opacity } = parseHexColor(hex);
		return { color: new THREE.Color(r, g, b), opacity };
	}, [hex]);
}
