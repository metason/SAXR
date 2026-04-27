'use client';
/**
 * @module page
 * Main SAXR Web Viewer page — loads datareps.json, renders 3D data viz with scene navigation.
 * Orchestrates {@link useSampleLoader}, {@link useScenePlayback}, {@link useComparativeSelection},
 * and {@link mergeSceneWithStage} to drive the {@link DataVizCanvas} and HUD overlay.
 */

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useSampleLoader } from '@/hooks/useSampleLoader';
import { useScenePlayback } from '@/hooks/useScenePlayback';
import {
	mergeSceneWithStage,
	mergeMultipleScenesWithStage,
} from '@/lib/sceneMerge';
import { useComparativeSelection } from '@/hooks/useComparativeSelection';
import SceneNav from '@/components/SceneNav';
import SamplePicker from '@/components/SamplePicker';
import EditorPanel from '@/components/EditorPanel';
import { SpecsJson } from '@/lib/types';
import { useEffect, useState } from 'react';

/**
 * Lazily loaded 3D canvas component.
 * SSR is disabled because Three.js requires the browser's WebGL API,
 * which does not exist on the server. `dynamic()` delays rendering to the client.
 */
const DataVizCanvas = dynamic(() => import('@/components/DataVizCanvas'), {
	ssr: false,
	loading: () => (
		<div className="flex items-center justify-center h-full text-white/50">
			Loading 3D viewer…
		</div>
	),
});

export default function Home() {
	/** Loaded dataset, sample list, and asset base URL. See {@link useSampleLoader}. */
	const {
		samples,
		vizData,
		specs,
		loading,
		error,
		currentSample,
		assetBasePath,
		handleSampleChange,
		loadSample,
	} = useSampleLoader();

	const [editorOpen, setEditorOpen] = useState(false);

	// Clear editor overrides when the user picks a different sample
	useEffect(() => {}, [currentSample]);

	/** Current scene index, auto-play state, and playback controls. See {@link useScenePlayback}. */
	const { currentScene, setCurrentScene, isPlaying, totalScenes, togglePlay } =
		useScenePlayback(vizData, specs);

	/** Selected scenes for comparative view. See {@link useComparativeSelection}. */
	const { selectedScenes, toggleScene, allowedScenes } =
		useComparativeSelection(vizData, specs);

	/** `true` when the sequence arrangement is `'comparative'` (side-by-side mode). */
	const isComparative = specs?.sequence?.arrangement === 'comparative';

	/**
	 * All selected scenes merged with stage elements, ready for side-by-side rendering.
	 * `null` when arrangement is not `'comparative'`. See {@link mergeMultipleScenesWithStage}.
	 */
	const comparativeScenes = useMemo(() => {
		if (isComparative) {
			return mergeMultipleScenesWithStage(vizData, selectedScenes);
		}
		return null;
	}, [isComparative, vizData, selectedScenes]);

	/** XYZ spacing between scenes. Falls back to `[2, 0, 0]` if not set in specs. */
	const gap = specs?.sequence?.gap ?? [2, 0, 0];

	/** Column count for comparative grid. If omitted from specs, computed automatically. */
	const columns = specs?.sequence?.columns;

	/**
	 * One label string per selected scene, used as floating 3D labels in comparative mode.
	 * Derived from the same domain interpolation as the HUD scene picker buttons.
	 */
	const sceneLabels = useMemo(() => {
		if (!isComparative || !vizData) return [];
		const domain = specs?.sequence?.domain;
		return selectedScenes.map((sceneIndex) =>
			domain
				? String(
						Math.round(
							domain[0] +
								((sceneIndex - 1) * (domain[1] - domain[0])) /
									(totalScenes - 2),
						),
					)
				: `Scene ${sceneIndex}`,
		);
	}, [isComparative, vizData, selectedScenes, specs, totalScenes]);

	/**
	 * Active scene merged with persistent stage elements from scene 0 (panels, labels, legends).
	 * `useMemo` ensures recomputation only when `vizData` or `currentScene` changes.
	 */
	const scene = useMemo(
		() => mergeSceneWithStage(vizData, currentScene),
		[vizData, currentScene],
	);

	/** Total number of DataRep primitives in the current scene — displayed in the info bar. */
	const repCount = scene.length;

	return (
		<div className="relative w-screen h-screen bg-gradient-to-b from-gray-900 to-black overflow-hidden">
			{/* 3D Viewport — always full screen */}
			<div className="absolute inset-0">
				{!loading &&
					vizData &&
					(isComparative ? (
						<DataVizCanvas
							comparativeScenes={comparativeScenes}
							gap={gap}
							columns={columns}
							sceneLabels={sceneLabels}
							assetBasePath={assetBasePath}
						/>
					) : (
						<DataVizCanvas scene={scene} assetBasePath={assetBasePath} />
					))}
			</div>

			{/* HUD overlay */}
			<div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 pointer-events-none">
				{/* Left: title + editor toggle */}
				<div className="flex items-center gap-4 pointer-events-auto">
					<h1 className="text-white font-semibold text-lg tracking-tight">
						SAXR Web Viewer
					</h1>
					<button
						onClick={() => setEditorOpen((o) => !o)}
						className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors backdrop-blur ${
							editorOpen
								? 'bg-white/20 text-white border-white/40'
								: 'bg-black/60 text-white border-white/20 hover:bg-white/10'
						}`}
					>
						{'</>'}
					</button>
				</div>

				{/* Center: comparative scene picker — only visible in comparative mode */}
				{isComparative && vizData && (
					<div className="flex items-center gap-2 pointer-events-auto flex-wrap justify-center">
						{(
							allowedScenes ??
							Array.from({ length: totalScenes - 1 }, (_, i) => i + 1)
						).map((sceneIndex: number) => {
							const domain = specs?.sequence?.domain;
							const label = domain
								? String(
										Math.round(
											domain[0] +
												((sceneIndex - 1) * (domain[1] - domain[0])) /
													(totalScenes - 2),
										),
									)
								: `Scene ${sceneIndex}`;
							const isSelected = selectedScenes.includes(sceneIndex);
							return (
								<button
									key={sceneIndex}
									onClick={() => toggleScene(sceneIndex)}
									className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors backdrop-blur ${
										isSelected
											? 'bg-white/20 text-white border-white/40'
											: 'bg-black/60 text-white border-white/20 hover:bg-white/10'
									}`}
								>
									{label}
								</button>
							);
						})}
					</div>
				)}

				{/* Right: scene nav + sample picker */}
				<div className="flex items-center gap-3 pointer-events-auto">
					{vizData && !isComparative && (
						<SceneNav
							totalScenes={totalScenes}
							currentScene={currentScene}
							onSceneChange={setCurrentScene}
							isPlaying={isPlaying}
							labels={specs?.sequence?.labels}
							domain={specs?.sequence?.domain}
							onTogglePlay={togglePlay}
						/>
					)}
					<SamplePicker
						samples={samples}
						current={currentSample}
						onSelect={handleSampleChange}
					/>
				</div>
			</div>

			{/* Floating editor box — appears below the header when open */}
			{editorOpen && (
				<div className="absolute top-16 left-4 z-20 w-[480px] h-[calc(100vh-5rem)] rounded-xl overflow-hidden border border-white/10 shadow-2xl">
					<EditorPanel
						assetBasePath={assetBasePath}
						//onSpecsChange={(parsed) => setOverrideSpecs(parsed)}
						// playbutton and then onSpecsChange.
						onRun={async (configText: string): Promise<string | null> => {
							const slug = assetBasePath.split('/').pop();
							const response = await fetch('/api/run-pipeline', {
								headers: { 'Content-Type': 'application/json' },
								method: 'POST',
								body: JSON.stringify({ slug, configText }),
							});
							if (response.ok) {
								loadSample(currentSample);
								return null;
							} else {
								const data = await response.json().catch(() => ({}));
								return data.error ?? 'Pipeline failed';
							}
						}}
					/>
				</div>
			)}

			{/* Bottom info bar */}
			<div className="absolute bottom-4 left-4 z-10 text-white/40 text-xs pointer-events-none">
				{loading && 'Loading…'}
				{error && <span className="text-red-400">{error}</span>}
				{!loading && vizData && (
					<span>
						{repCount} data reps · {vizData.length} scene
						{vizData.length !== 1 && 's'} · Orbit: drag · Zoom: scroll
					</span>
				)}
			</div>
		</div>
	);
}
