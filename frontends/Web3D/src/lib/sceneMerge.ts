/**
 * @module sceneMerge
 * Pure functions to merge stage-level reps from {@link ParsedVizData.stage}
 * into the current scene from {@link ParsedVizData.scenes}.
 * Stage-level reps (panels, flags, encoding) persist across scene changes.
 */

import { DataRep, ParsedVizData } from '@/lib/types';
import { isSceneLevel } from '@/lib/vizLoader';

/**
 * Merge persistent stage-level reps with the active data scene.
 * @param vizData - Parsed visualization data, or `null` if not loaded.
 * @param sceneIndex - Zero-based index into `vizData.scenes`.
 * @returns Flat array of DataReps: active scene reps + non-shape stage reps.
 *          When there are no data scenes, returns the stage reps directly.
 */
export function mergeSceneWithStage(
	vizData: ParsedVizData | null,
	sceneIndex: number,
): DataRep[] {
	if (!vizData) return [];
	if (vizData.scenes.length === 0) return vizData.stage;
	const current = vizData.scenes[sceneIndex] ?? [];
	// Carry over non-shape reps from the stage: panels (uppercase), images, encoding
	const stageReps = vizData.stage.filter((r: DataRep) => {
		const t = r.type.toLowerCase();
		return !isSceneLevel(r) || t === 'image' || t === 'encoding';
	});
	return [...current, ...stageReps];
}

export function mergeMultipleScenesWithStage(
	vizData: ParsedVizData | null,
	sceneIndices: number[],
): DataRep[][] {
	if (!vizData) return [];
	return sceneIndices.map((index) => mergeSceneWithStage(vizData, index));
}
