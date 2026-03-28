'use client';
// SceneNav.tsx
// Scene navigation bar — switch between scenes in a multi-scene datareps.json.
// Equivalent of Unity DataVizLoader's SelectedScene / NextScene / PrevScene.

import React from 'react';

interface SceneNavProps {
	totalScenes: number;
	currentScene: number;
	onSceneChange: (index: number) => void;
}

export default function SceneNav({
	totalScenes,
	currentScene,
	onSceneChange,
}: SceneNavProps) {
	if (totalScenes <= 1) return null;

	return (
		<div className="flex items-center gap-3 bg-black/60 backdrop-blur rounded-lg px-4 py-2 text-white text-sm">
			<button
				className="px-2 py-1 rounded hover:bg-white/20 disabled:opacity-30 transition"
				disabled={currentScene === 0}
				onClick={() => onSceneChange(currentScene - 1)}
			>
				◀ Prev
			</button>
			<span className="tabular-nums">
				Scene {currentScene + 1} / {totalScenes}
			</span>
			<button
				className="px-2 py-1 rounded hover:bg-white/20 disabled:opacity-30 transition"
				disabled={currentScene === totalScenes - 1}
				onClick={() => onSceneChange(currentScene + 1)}
			>
				Next ▶
			</button>
		</div>
	);
}
