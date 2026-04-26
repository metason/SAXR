'use client';
/**
 * @module useScenePlayback
 * Encapsulates scene navigation and auto-play logic extracted from page.tsx.
 */

import { useEffect, useState } from 'react';
import { VizJson, SpecsJson } from '@/lib/types';

/**
 * Hook that manages the current scene index and auto-play timer.
 * Resets to scene 0 when new data is loaded. Starts auto-play automatically
 * for `'animated'` arrangement.
 * @param vizData - Full visualization data (all scenes), or `null` if not loaded.
 * @param specs - Parsed specs.json, or `null` if unavailable.
 * @returns Object with `currentScene`, `setCurrentScene`, `isPlaying`,
 *          `totalScenes`, and `togglePlay` (undefined if not animated).
 */
export function useScenePlayback(
	vizData: VizJson | null,
	specs: SpecsJson | null,
) {
	const [currentScene, setCurrentScene] = useState(0);
	const [isPlaying, setIsPlaying] = useState(false);

	// Reset playback state when new data is loaded
	useEffect(() => {
		setCurrentScene(0);
		setIsPlaying(specs?.sequence?.arrangement === 'animated');
	}, [vizData, specs]);

	// Auto-play for animated sequences
	useEffect(() => {
		if (
			specs?.sequence?.arrangement !== 'animated' ||
			!vizData ||
			vizData.length === 0 ||
			!isPlaying
		)
			return;
		const interval = (specs.sequence.interval ?? 1.5) * 1000;
		const timer = setInterval(() => {
			setCurrentScene((prev) => (prev + 1) % vizData.length);
		}, interval);
		return () => clearInterval(timer);
	}, [specs, vizData, isPlaying]);

	const totalScenes = vizData?.length ?? 0;

	const togglePlay =
		specs?.sequence?.arrangement === 'animated'
			? () => setIsPlaying((p) => !p)
			: undefined;

	return {
		currentScene,
		setCurrentScene,
		isPlaying,
		totalScenes,
		togglePlay,
	};
}
