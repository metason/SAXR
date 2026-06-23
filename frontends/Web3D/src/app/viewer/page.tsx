'use client';
/**
 * @module viewer/page
 * SAXR 3D Viewer — loads a sample via ?sample=<slug>&editor=open deep-link.
 * Orchestrates {@link useSampleLoader}, {@link useScenePlayback}, {@link useComparativeSelection},
 * and {@link mergeSceneWithStage} to drive the {@link DataVizCanvas} and HUD overlay.
 */

import React, { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import SceneNav from '@/components/SceneNav';
import EditorPanel from '@/components/EditorPanel';
import ShowcaseWindow from '@/components/ShowcaseWindow';
import ViewerPlayground from '@/components/ViewerPlayground';
import ComparativeScenePicker from '@/components/ComparativeScenePicker';
import { useViewerState } from '@/hooks/useViewerState';
import {
	summariseDatareps,
	type RunResult,
	type TraceStep,
	type AjvErrorLite,
} from '@/lib/showcaseTrace';

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

/** The exact /learn panel-culling demo, embedded in the viewer behind a button. */
const PanelCullingDemo = dynamic(() => import('@/app/learn/PanelCullingDemo'), {
	ssr: false,
});

/** The exact /learn shape-dispatch demo, embedded in the viewer behind a button. */
const ShapeStrategyDemo = dynamic(() => import('@/app/learn/ShapeStrategyDemo'), {
	ssr: false,
});

/** Just the node graph + "Editor → Run" sequence stepper, lifted from /learn. */
const EditorRunWalkthrough = dynamic(() => import('@/components/EditorRunWalkthrough'), {
	ssr: false,
	loading: () => (
		<div className="flex items-center justify-center h-full text-white/50">Loading architecture…</div>
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

	// ── Single active view ──
	// Exactly one HUD surface is on at a time. 'pipeline' shows the editor *and*
	// the showcase diagram window; everything else is mutually exclusive.
	type View = 'editor' | 'pipeline' | 'grid' | 'panel' | 'shapes' | 'arch' | null;
	const [view, setView] = useState<View>(null);
	// Seed from the ?editor=open deep-link the hook resolves on mount.
	React.useEffect(() => {
		if (editorOpen) setView((v) => v ?? 'editor');
	}, [editorOpen]);
	const toggle = (target: Exclude<View, null>) =>
		setView((v) => (v === target ? null : target));

	const editorVisible = view === 'editor' || view === 'pipeline';
	const showcase = view === 'pipeline';
	const gridOpen = view === 'grid';

	// Showcase trace, reported up from EditorPanel and drives the diagram window.
	const [trace, setTrace] = useState<{
		clientTrace: TraceStep[];
		runTrace: TraceStep[];
		isRunning: boolean;
		ajvErrors: AjvErrorLite[];
		configText: string;
	}>({ clientTrace: [], runTrace: [], isRunning: false, ajvErrors: [], configText: '' });
	const handleTrace = useCallback((s: typeof trace) => setTrace(s), []);

	// ── Grid: live layout controls over the real canvas ──
	// While the Grid panel is open the sliders drive the layout directly — no
	// separate override toggle. They are seeded from the sample's real specs on open.
	const [ovCols, setOvCols] = useState(2);
	const [ovGapX, setOvGapX] = useState(2);
	const [ovGapY, setOvGapY] = useState(0);
	const [ovGapZ, setOvGapZ] = useState(2);
	const sceneCount = comparativeScenes?.length ?? 0;

	React.useEffect(() => {
		if (gridOpen) {
			setOvGapX(gap[0]);
			setOvGapY(gap[1] ?? 0);
			setOvGapZ(gap[2] ?? 0);
			setOvCols(columns ?? Math.ceil(Math.sqrt(Math.max(sceneCount, 1))));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [gridOpen]);

	const effGap = gridOpen ? ([ovGapX, ovGapY, ovGapZ] as [number, number, number]) : gap;
	const effColumns = gridOpen ? ovCols : columns;

	// Full-screen demo modals (Panel / Shapes) cover the viewport; unmount the main
	// canvas under them so its drei <Html> labels (portalled to body) don't show through.
	const modalDemo = view === 'panel' || view === 'shapes' || view === 'arch';

	return (
		<div className="relative w-screen h-screen bg-gradient-to-b from-gray-900 to-black overflow-hidden">
			{/* 3D Viewport — full screen. Unmounted under a full-screen demo modal so
			    its portalled scene labels don't bleed over the modal. */}
			<div className="absolute inset-0">
				{!loading &&
					vizData &&
					!modalDemo &&
					(isComparative ? (
						<DataVizCanvas
							key={assetBasePath}
							comparativeScenes={comparativeScenes}
							gap={effGap}
							columns={effColumns}
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
					{[
						{ id: 'editor' as const, label: '</>', on: editorVisible, title: 'Editor' },
						{ id: 'grid' as const, label: 'Grid', on: gridOpen, title: 'Grid — comparative layout controls' },
						{ id: 'pipeline' as const, label: 'Pipeline', on: view === 'pipeline', title: 'Pipeline — animated token-mapping beside the editor' },
						{ id: 'panel' as const, label: 'Panel', on: view === 'panel', title: 'Panel culling demo' },
						{ id: 'shapes' as const, label: 'Shapes', on: view === 'shapes', title: 'Shape dispatch demo' },
						{ id: 'arch' as const, label: 'Architecture', on: view === 'arch', title: 'Architecture explorer + run-trace walkthrough' },
					].map((b) => (
						<button
							key={b.id}
							onClick={() => toggle(b.id)}
							title={b.title}
							className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors backdrop-blur ${
								b.on
									? 'bg-white/20 text-white border-white/40'
									: 'bg-black/60 text-white border-white/20 hover:bg-white/10'
							}`}
						>
							{b.label}
						</button>
					))}
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
			{editorVisible && (
				<div className="absolute top-16 left-4 z-20 w-[480px] h-[calc(100vh-5rem)] rounded-xl overflow-hidden border border-white/10 shadow-2xl">
					<EditorPanel
						assetBasePath={assetBasePath}
						onTrace={handleTrace}
						onRun={async (configText: string): Promise<RunResult> => {
							const response = await fetch('/api/run-pipeline', {
								headers: { 'Content-Type': 'application/json' },
								method: 'POST',
								body: JSON.stringify({ slug, configText }),
							});
							const data = await response.json().catch(() => ({}));
							const trace = Array.isArray(data.trace) ? data.trace : [];
							if (response.ok) {
								loadSample(currentSample);
								// Read the freshly generated output back and summarise the real
								// structure (stage/scene split, type histogram) for the walkthrough.
								try {
									const raw = await fetch(
										assetBasePath + '/datareps.json',
									).then((r) => r.json());
									trace.push(...summariseDatareps(raw));
								} catch {
									/* viewer still reloads; the readout is best-effort */
								}
								return { error: null, trace };
							}
							return { error: data.error ?? 'Pipeline failed', trace };
						}}
					/>
				</div>
			)}

			{/* Floating Grid controls — bottom-right, live over the real canvas */}
			{gridOpen && (
				<div className="absolute bottom-4 right-4 z-30 pointer-events-auto">
					<ViewerPlayground
						isComparative={isComparative}
						cols={ovCols}
						gapX={ovGapX}
						gapY={ovGapY}
						gapZ={ovGapZ}
						onCols={setOvCols}
						onGapX={setOvGapX}
						onGapY={setOvGapY}
						onGapZ={setOvGapZ}
						n={sceneCount}
						onClose={() => setView(null)}
					/>
				</div>
			)}

			{/* Panel-culling demo — the exact /learn demo, floating in the viewer */}
			{view === 'panel' && (
				<div className="absolute inset-0 z-40 flex items-center justify-center p-6 pointer-events-none">
					<div className="relative w-[760px] max-w-[92vw] h-[600px] max-h-[88vh] rounded-xl border border-white/15 bg-black/90 shadow-2xl overflow-hidden pointer-events-auto">
						<button
							onClick={() => setView(null)}
							className="absolute top-2 right-3 z-10 text-white/50 hover:text-white text-lg"
						>
							✕
						</button>
						<PanelCullingDemo />
					</div>
				</div>
			)}

			{/* Shape-dispatch demo — the exact /learn demo, floating in the viewer */}
			{view === 'shapes' && (
				<div className="absolute inset-0 z-40 flex items-center justify-center p-6 pointer-events-none">
					<div className="relative w-[760px] max-w-[92vw] h-[600px] max-h-[88vh] rounded-xl border border-white/15 bg-black/90 shadow-2xl overflow-auto pointer-events-auto">
						<button
							onClick={() => setView(null)}
							className="absolute top-2 right-3 z-10 text-white/50 hover:text-white text-lg"
						>
							✕
						</button>
						<ShapeStrategyDemo />
					</div>
				</div>
			)}

			{/* Editor → Run walkthrough — node graph + run-trace stepper, lifted from /learn */}
			{view === 'arch' && (
				<div className="absolute inset-0 z-40 flex items-center justify-center p-4 pointer-events-none">
					<div className="relative w-[94vw] h-[88vh] rounded-xl border border-white/15 bg-[#0a0d14] shadow-2xl overflow-hidden pointer-events-auto">
						<button
							onClick={() => setView(null)}
							className="absolute top-3 right-4 z-50 text-white/50 hover:text-white text-xl"
						>
							✕
						</button>
						<EditorRunWalkthrough />
					</div>
				</div>
			)}

			{/* Floating Pipeline diagram window — right side, mirrors the editor */}
			{showcase && (
				<div className="absolute top-16 right-4 z-20 w-[420px] h-[calc(100vh-5rem)] rounded-xl overflow-hidden border border-violet-400/20 shadow-2xl">
					<ShowcaseWindow
						clientTrace={trace.clientTrace}
						runTrace={trace.runTrace}
						isRunning={trace.isRunning}
						ajvErrors={trace.ajvErrors}
						configText={trace.configText}
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
