'use client';
// SceneNav.tsx
// Scene navigation bar — switch between scenes in a multi-scene datareps.json.
// Equivalent of Unity DataVizLoader's SelectedScene / NextScene / PrevScene.

import React from 'react';

interface SceneNavProps {
	totalScenes: number;
	currentScene: number;
	onSceneChange: (index: number) => void;
	isPlaying?: boolean;
	onTogglePlay?: () => void;
	labels?: string[];
	domain?: number[];
}

export default function SceneNav({
	totalScenes,
	currentScene,
	onSceneChange,
	isPlaying,
	onTogglePlay,
	labels,
	domain,
}: SceneNavProps) {
	if (totalScenes <= 1) return null;

	if (labels && labels.length > 0) {
		return (
			<div className="flex flex-col items-center gap-2">
				<div className="flex items-center gap-3 bg-black/60 backdrop-blur rounded-lg px-4 py-2 text-white text-sm">
					{labels.map((label, index) => (
						<button
							key={index}
							onClick={() => onSceneChange(index)}
							className={
								index === currentScene
									? 'px-2 py-1 rounded bg-white/30'
									: 'px-2 py-1 rounded hover:bg-white/20'
							}
						>
							{label}
						</button>
					))}
				</div>
				<div className="flex items-center gap-3 bg-black/60 backdrop-blur rounded-lg px-4 py-2 text-white text-sm">
					<button
						className="px-2 py-1 rounded hover:bg-white/20 disabled:opacity-30 transition"
						disabled={currentScene === 0}
						onClick={() => onSceneChange(currentScene - 1)}
					>
						◀ Prev
					</button>

					{onTogglePlay && (
						<button
							className="px-2 py-1 rounded hover:bg-white/20 transition"
							onClick={onTogglePlay}
						>
							{isPlaying ? '⏸' : '▶'}
						</button>
					)}

					<button
						className="px-2 py-1 rounded hover:bg-white/20 disabled:opacity-30 transition"
						disabled={currentScene === totalScenes - 1}
						onClick={() => onSceneChange(currentScene + 1)}
					>
						Next ▶
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex items-center gap-3 bg-black/60 backdrop-blur rounded-lg px-4 py-2 text-white text-sm">
			<button
				className="px-2 py-1 rounded hover:bg-white/20 disabled:opacity-30 transition"
				disabled={currentScene === 0}
				onClick={() => onSceneChange(currentScene - 1)}
			>
				◀ Prev
			</button>

			{onTogglePlay && (
				<button
					className="px-2 py-1 rounded hover:bg-white/20 transition"
					onClick={onTogglePlay}
				>
					{isPlaying ? '⏸' : '▶'}
				</button>
			)}

			<span className="tabular-nums">
				{domain && domain.length >= 2
					? domain[0] + currentScene
					: `Scene ${currentScene + 1} / ${totalScenes}`}
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
