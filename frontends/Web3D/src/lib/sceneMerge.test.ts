/**
 * Tests for sceneMerge pure functions.
 * These functions merge stage-level DataReps with data scene DataReps.
 */
import { describe, it, expect } from 'vitest';
import {
	mergeSceneWithStage,
	mergeMultipleScenesWithStage,
} from '../lib/sceneMerge';
import type { DataRep, ParsedVizData } from '../lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const makeRep = (type: string, extra?: Partial<DataRep>): DataRep => ({
	type,
	x: 0,
	y: 0,
	z: 0,
	w: 1,
	h: 1,
	d: 1,
	...extra,
});

/** A stage rep that should always be carried over (panel == uppercase type). */
const panelRep = makeRep('XY'); // isSceneLevel returns false for uppercase

/** A stage rep that should NOT be carried over (a sphere is scene-level). */
const stageShape = makeRep('sphere');

/** A data rep for a data scene. */
const dataRep = makeRep('box');

// ---------------------------------------------------------------------------
// mergeSceneWithStage
// ---------------------------------------------------------------------------
describe('mergeSceneWithStage', () => {
	it('returns empty array for null vizData', () => {
		expect(mergeSceneWithStage(null, 0)).toEqual([]);
	});

	it('returns stage directly when there are no data scenes', () => {
		const vizData: ParsedVizData = { stage: [panelRep], scenes: [] };
		expect(mergeSceneWithStage(vizData, 0)).toEqual([panelRep]);
	});

	it('merges data scene with stage panel rep', () => {
		const vizData: ParsedVizData = {
			stage: [panelRep],
			scenes: [[dataRep]],
		};
		const result = mergeSceneWithStage(vizData, 0);
		// data rep comes first, then stage panel rep
		expect(result).toContainEqual(dataRep);
		expect(result).toContainEqual(panelRep);
		expect(result).toHaveLength(2);
	});

	it('excludes scene-level shapes (e.g. sphere) from stage carry-over', () => {
		const vizData: ParsedVizData = {
			stage: [panelRep, stageShape],
			scenes: [[dataRep]],
		};
		const result = mergeSceneWithStage(vizData, 0);
		expect(result).toContainEqual(dataRep);
		expect(result).toContainEqual(panelRep);
		expect(result).not.toContainEqual(stageShape);
	});

	it('always carries over image reps from stage', () => {
		const imageRep = makeRep('image');
		const vizData: ParsedVizData = {
			stage: [imageRep],
			scenes: [[dataRep]],
		};
		const result = mergeSceneWithStage(vizData, 0);
		expect(result).toContainEqual(imageRep);
	});

	it('always carries over encoding reps from stage', () => {
		const encodingRep = makeRep('encoding');
		const vizData: ParsedVizData = {
			stage: [encodingRep],
			scenes: [[dataRep]],
		};
		const result = mergeSceneWithStage(vizData, 0);
		expect(result).toContainEqual(encodingRep);
	});

	it('returns empty array for out-of-bounds scene index', () => {
		const vizData: ParsedVizData = { stage: [panelRep], scenes: [] };
		// scenes[5] is undefined, falls back to stage (no scenes case)
		expect(mergeSceneWithStage(vizData, 5)).toEqual([panelRep]);
	});
});

// ---------------------------------------------------------------------------
// mergeMultipleScenesWithStage
// ---------------------------------------------------------------------------
describe('mergeMultipleScenesWithStage', () => {
	it('returns empty array for null vizData', () => {
		expect(mergeMultipleScenesWithStage(null, [0, 1])).toEqual([]);
	});

	it('returns one merged array per requested scene index', () => {
		const scene0Rep = makeRep('sphere', { x: 1 });
		const scene1Rep = makeRep('sphere', { x: 2 });
		const vizData: ParsedVizData = {
			stage: [panelRep],
			scenes: [[scene0Rep], [scene1Rep]],
		};
		const result = mergeMultipleScenesWithStage(vizData, [0, 1]);
		expect(result).toHaveLength(2);
		expect(result[0]).toContainEqual(scene0Rep);
		expect(result[1]).toContainEqual(scene1Rep);
		// Both scenes carry the panel rep
		expect(result[0]).toContainEqual(panelRep);
		expect(result[1]).toContainEqual(panelRep);
	});
});
