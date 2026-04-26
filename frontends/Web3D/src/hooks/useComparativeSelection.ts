'use client';
/**
 * @module useComparativeSelection
 * Manages which scenes are selected for comparative side-by-side display.
 * Initial selection is driven by `specs.sequence.selection` (domain values) when provided,
 * falling back to the first two scenes. Users can always toggle scenes interactively.
 * There is no upper limit on selection size — the grid layout adapts automatically.
 */

import { useEffect, useState } from 'react';
import { VizJson, SpecsJson } from '@/lib/types';

export function useComparativeSelection(
	vizData: VizJson | null,
	specs: SpecsJson | null,
) {
	const [selectedScenes, setSelectedScenes] = useState<number[]>([]);
	const [allowedScenes, setAllowedScenes] = useState<number[] | null>(null);

	useEffect(() => {
		if (!vizData || vizData.length < 3) {
			setSelectedScenes([]);
			setAllowedScenes(null);
			return;
		}
		const seq = specs?.sequence;
		if (seq?.selection && seq?.domain && seq.selection.length >= 1) {
			const [dMin, dMax] = seq.domain;
			const totalData = vizData.length - 1; // scene 0 is the stage
			const indices = seq.selection
				.map(
					(v) => Math.round(((v - dMin) / (dMax - dMin)) * (totalData - 1)) + 1,
				)
				.filter((i) => i >= 1 && i < vizData.length);
			const resolved = indices.length >= 1 ? indices : [1, 2];
			setSelectedScenes(resolved);
			setAllowedScenes(resolved); // restrict buttons to this set
		} else {
			setSelectedScenes([1, 2]);
			setAllowedScenes(null); // all scenes available
		}
	}, [vizData, specs]);

	const toggleScene = (sceneIndex: number) => {
		// If allowedScenes is set, only toggle within that set
		if (allowedScenes && !allowedScenes.includes(sceneIndex)) return;
		if (selectedScenes.includes(sceneIndex) && selectedScenes.length > 1) {
			setSelectedScenes(selectedScenes.filter((i) => i !== sceneIndex));
		} else if (!selectedScenes.includes(sceneIndex)) {
			setSelectedScenes([...selectedScenes, sceneIndex].sort((a, b) => a - b));
		}
	};

	return {
		selectedScenes,
		setSelectedScenes,
		allowedScenes,
		toggleScene,
	};
}
