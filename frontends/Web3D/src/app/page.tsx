'use client';
// page.tsx
// Main SAXR Web Viewer page — loads datareps.json, renders 3D data viz with scene navigation.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { DataRep, VizJson, SpecsJson } from '@/lib/types';
import { loadVizJson, isSceneLevel, loadSpecsJson } from '@/lib/vizLoader';
import SceneNav from '@/components/SceneNav';
import SamplePicker, { SampleInfo } from '@/components/SamplePicker';

// Dynamic import for the Canvas — SSR must be disabled for Three.js / R3F
const DataVizCanvas = dynamic(() => import('@/components/DataVizCanvas'), {
	ssr: false,
	loading: () => (
		<div className="flex items-center justify-center h-full text-white/50">
			Loading 3D viewer…
		</div>
	),
});

export default function Home() {
	const [samples, setSamples] = useState<SampleInfo[]>([]);
	const [vizData, setVizData] = useState<VizJson | null>(null);
	const [currentScene, setCurrentScene] = useState(0);
	const [currentSample, setCurrentSample] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [specs, setSpecs] = useState<SpecsJson | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);

	// Auto-discover available samples via API (reads pipeline output directory)
	useEffect(() => {
		fetch('/api/samples')
			.then((r) => r.json())
			.then((list: SampleInfo[]) => {
				setSamples(list);
				if (list.length > 0) {
					setCurrentSample(list[0].vizJsonPath);
				} else {
					setLoading(false);
					setError('No samples found');
				}
			})
			.catch(() => {
				setLoading(false);
				setError('Failed to discover samples');
			});
	}, []);

	const loadSample = useCallback(
		async (path: string) => {
			if (!path) return;
			setLoading(true);
			setError(null);
			setCurrentScene(0);
			try {
				const data = await loadVizJson(path);
				setVizData(data);
				const specsData = await loadSpecsJson(
					samples.find((s) => s.vizJsonPath === path)?.assetBasePath ?? '',
				);
				setSpecs(specsData);
				setIsPlaying(specsData?.sequence?.arrangement === 'animated');
			} catch (err) {
				setError(
					err instanceof Error ? err.message : 'Failed to load datareps.json',
				);
				setVizData(null);
				setSpecs(null);
			} finally {
				setLoading(false);
			}
		},
		[samples],
	);

	useEffect(() => {
		loadSample(currentSample);
	}, [currentSample, loadSample]);

	const handleSampleChange = (path: string) => {
		setCurrentSample(path);
	};

	// Auto-play for animated sequences
	useEffect(() => {
		if (specs?.sequence?.arrangement !== 'animated' || !vizData || !isPlaying)
			return;
		const interval = (specs.sequence.interval ?? 1.5) * 1000;
		const timer = setInterval(() => {
			setCurrentScene((prev) => (prev + 1) % vizData.length);
		}, interval);
		return () => clearInterval(timer);
	}, [specs, vizData, isPlaying]);

	// Stage-level reps (panels, flags, encoding) live only in scene 0.
	// Merge them into every scene so they persist across scene changes.
	const scene = useMemo(() => {
		if (!vizData) return [];
		const current = vizData[currentScene] ?? [];
		if (currentScene === 0) return current;
		// Carry over non-shape reps from scene 0: panels (uppercase), images, encoding
		const stageReps = (vizData[0] ?? []).filter((r: DataRep) => {
			const t = r.type.toLowerCase();
			return !isSceneLevel(r) || t === 'image' || t === 'encoding';
		});
		return [...current, ...stageReps];
	}, [vizData, currentScene]);
	const repCount = scene.length;

	return (
		<div className="relative w-screen h-screen bg-gradient-to-b from-gray-900 to-black overflow-hidden">
			{/* 3D Viewport */}
			<div className="absolute inset-0">
				{!loading && vizData && (
					<DataVizCanvas
						scene={scene}
						assetBasePath={
							samples.find((s) => s.vizJsonPath === currentSample)
								?.assetBasePath || ''
						}
					/>
				)}
			</div>

			{/* HUD overlay */}
			<div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 pointer-events-none">
				{/* Left: title + sample picker */}
				<div className="flex items-center gap-4 pointer-events-auto">
					<h1 className="text-white font-semibold text-lg tracking-tight">
						SAXR Web Viewer
					</h1>
					<SamplePicker
						samples={samples}
						current={currentSample}
						onSelect={handleSampleChange}
					/>
				</div>

				{/* Right: scene navigation */}
				<div className="pointer-events-auto">
					{vizData && (
						<SceneNav
							totalScenes={vizData.length}
							currentScene={currentScene}
							onSceneChange={setCurrentScene}
							isPlaying={isPlaying}
							labels={specs?.sequence?.labels}
							domain={specs?.sequence?.domain}
							onTogglePlay={
								specs?.sequence?.arrangement === 'animated'
									? () => setIsPlaying((p) => !p)
									: undefined
							}
						/>
					)}
				</div>
			</div>

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
