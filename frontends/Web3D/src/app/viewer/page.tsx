'use client';
/**
 * @module viewer/page
 * SAXR 3D Viewer — loads a sample via ?sample=<slug>&editor=open deep-link.
 * Orchestrates {@link useSampleLoader}, {@link useScenePlayback}, {@link useComparativeSelection},
 * and {@link mergeSceneWithStage} to drive the {@link DataVizCanvas} and HUD overlay.
 */

import React from 'react';
import dynamic from 'next/dynamic';
import SceneNav from '@/components/SceneNav';
import EditorPanel from '@/components/EditorPanel';
import ComparativeScenePicker from '@/components/ComparativeScenePicker';
import { useViewerState } from '@/hooks/useViewerState';

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

export default function ViewerPage() {
	const {
		vizData,
		specs,
		loading,
		error,
		currentSample,
		assetBasePath,
		slug,
		loadSample,
		editorOpen,
		setEditorOpen,
		currentScene,
		setCurrentScene,
		isPlaying,
		totalScenes,
		togglePlay,
		isComparative,
		selectedScenes,
		toggleScene,
		allowedScenes,
		comparativeScenes,
		sceneLabels,
		gap,
		columns,
		scene,
		repCount,
	} = useViewerState();

	return (
		<div className="relative w-screen h-screen bg-gradient-to-b from-gray-900 to-black overflow-hidden">
			{/* 3D Viewport — always full screen */}
			<div className="absolute inset-0">
				{!loading &&
					vizData &&
					(isComparative ? (
						<DataVizCanvas
							key={assetBasePath}
							comparativeScenes={comparativeScenes}
							gap={gap}
							columns={columns}
							sceneLabels={sceneLabels}
							assetBasePath={assetBasePath}
						/>
					) : (
						<DataVizCanvas
							key={assetBasePath}
							scene={scene}
							assetBasePath={assetBasePath}
						/>
					))}
			</div>

			{/* HUD overlay */}
			<div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 pointer-events-none">
				{/* Left: back link + editor toggle */}
				<div className="flex items-center gap-4 pointer-events-auto">
					<a
						href="/"
						className="px-3 py-1.5 rounded-lg text-sm font-medium border border-white/20 bg-black/60 text-white hover:bg-white/10 transition-colors backdrop-blur"
					>
						← Examples
					</a>
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

				{/* Center: comparative scene picker */}
				{isComparative && vizData && (
					<ComparativeScenePicker
						allowedScenes={allowedScenes}
						selectedScenes={selectedScenes}
						totalScenes={totalScenes}
						domain={specs?.sequence?.domain}
						onToggle={toggleScene}
					/>
				)}

				{/* Right: scene nav */}
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
				</div>
			</div>

			{/* Floating editor panel */}
			{editorOpen && (
				<div className="absolute top-16 left-4 z-20 w-[480px] h-[calc(100vh-5rem)] rounded-xl overflow-hidden border border-white/10 shadow-2xl">
					<EditorPanel
						assetBasePath={assetBasePath}
						onRun={async (configText: string): Promise<string | null> => {
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
						{repCount} data reps · {totalScenes} scene
						{totalScenes !== 1 && 's'} · Orbit: drag · Zoom: scroll
					</span>
				)}
			</div>
		</div>
	);
}
