/**
 * @module sceneMerge
 * Pure function to merge stage-level reps from scene 0 into the current scene.
 * Stage-level reps (panels, flags, encoding) live only in scene 0 —
 * this function ensures they persist across scene changes.
 */

import { DataRep, VizJson } from '@/lib/types';
import { isSceneLevel } from '@/lib/vizLoader';

/**
 * Merge persistent stage-level reps (scene 0) with the active data scene.
 * @param vizData - Full visualization data (all scenes), or `null` if not loaded.
 * @param currentScene - Zero-based index of the scene to display.
 * @returns Flat array of DataReps combining the current scene with stage elements.
 */
export function mergeSceneWithStage(
	vizData: VizJson | null,
	currentScene: number,
): DataRep[] {
	if (!vizData) return [];
	const current = vizData[currentScene] ?? [];
	if (currentScene === 0) return current;
	// Carry over non-shape reps from scene 0: panels (uppercase), images, encoding
	const stageReps = (vizData[0] ?? []).filter((r: DataRep) => {
		const t = r.type.toLowerCase();
		return !isSceneLevel(r) || t === 'image' || t === 'encoding';
	});
	return [...current, ...stageReps];
}

export function mergeMultipleScenesWithStage(
	vizData: VizJson | null,
	sceneIndices: number[],
): DataRep[][] {
	if (!vizData) return [];
	return sceneIndices.map((index) => mergeSceneWithStage(vizData, index));
}
