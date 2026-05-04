'use client';
/**
 * @module useViewerState
 * Composite hook that assembles all viewer state from the individual domain hooks.
 * Keeps {@link ViewerPage} a pure layout component — all state logic lives here.
 *
 * Combines:
 * - {@link useSampleLoader} — sample discovery and datareps loading
 * - {@link useScenePlayback} — scene index and auto-play
 * - {@link useComparativeSelection} — multi-scene selection for comparative mode
 * - Derived values: merged scenes, scene labels, rep count
 */

import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSampleLoader } from './useSampleLoader';
import { useScenePlayback } from './useScenePlayback';
import { useComparativeSelection } from './useComparativeSelection';
import {
	mergeSceneWithStage,
	mergeMultipleScenesWithStage,
} from '@/lib/sceneMerge';
import { domainLabelForScene } from '@/lib/vizLoader';

export function useViewerState() {
	const searchParams = useSearchParams();
	const initialSlug = searchParams.get('sample') ?? undefined;

	// --- Editor panel open/close ---
	const [editorOpen, setEditorOpen] = useState(false);
	useEffect(() => {
		if (searchParams.get('editor') === 'open') setEditorOpen(true);
	}, [searchParams]);

	// --- Sample loading ---
	const {
		vizData,
		specs,
		loading,
		error,
		currentSample,
		assetBasePath,
		slug,
		loadSample,
	} = useSampleLoader(initialSlug);

	// --- Scene playback ---
	const { currentScene, setCurrentScene, isPlaying, totalScenes, togglePlay } =
		useScenePlayback(vizData, specs);

	// --- Comparative mode selection ---
	const { selectedScenes, toggleScene, allowedScenes } =
		useComparativeSelection(vizData, specs);

	// --- Derived values ---
	const isComparative = specs?.sequence?.arrangement === 'comparative';
	const gap = specs?.sequence?.gap ?? ([2, 0, 0] as [number, number, number]);
	const columns = specs?.sequence?.columns;

	const comparativeScenes = useMemo(() => {
		if (!isComparative) return null;
		return mergeMultipleScenesWithStage(vizData, selectedScenes);
	}, [isComparative, vizData, selectedScenes]);

	const sceneLabels = useMemo(() => {
		if (!isComparative || !vizData) return [];
		const domain = specs?.sequence?.domain;
		return selectedScenes.map((sceneIndex) =>
			domain
				? domainLabelForScene(sceneIndex, totalScenes, domain)
				: `Scene ${sceneIndex + 1}`,
		);
	}, [isComparative, vizData, selectedScenes, specs, totalScenes]);

	const scene = useMemo(
		() => mergeSceneWithStage(vizData, currentScene),
		[vizData, currentScene],
	);

	return {
		// Sample
		vizData,
		specs,
		loading,
		error,
		currentSample,
		assetBasePath,
		slug,
		loadSample,
		// Editor
		editorOpen,
		setEditorOpen,
		// Playback
		currentScene,
		setCurrentScene,
		isPlaying,
		totalScenes,
		togglePlay,
		// Comparative
		isComparative,
		selectedScenes,
		toggleScene,
		allowedScenes,
		comparativeScenes,
		sceneLabels,
		gap,
		columns,
		// Derived scene
		scene,
		repCount: scene.length,
	};
}
