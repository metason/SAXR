'use client';
/**
 * @module SceneNav
 * Scene navigation bar for multi-scene visualizations.
 * Adapts its UI based on the sequence arrangement type from specs.json:
 *
 * | Arrangement | UI                                               |
 * |-------------|--------------------------------------------------|
 * | animated    | ◀ Prev \| ▶/⏸ \| Scene counter \| Next ▶           |
 * | narrative   | [label1] [label2] … (top) + ◀ Prev / Next ▶      |
 * | (default)   | ◀ Prev \| Scene counter \| Next ▶                 |
 *
 * Returns `null` for single-scene datasets (nothing to navigate).
 */

import React from 'react';

/** Props passed from page.tsx — all sequence-related data comes via specs.json */
interface SceneNavProps {
	totalScenes: number; // datareps.json outer array length
	currentScene: number; // 0-based index of the active scene
	onSceneChange: (index: number) => void; // callback to switch scene
	isPlaying?: boolean; // true if auto-play is active (animated)
	onTogglePlay?: () => void; // toggle auto-play; undefined = no button shown
	labels?: string[]; // narrative labels from specs.json sequence.labels
	domain?: number[]; // [min, max] from specs.json sequence.domain
}

/**
 * Scene navigation bar. Adapts its controls based on the arrangement mode.
 * Returns `null` when `totalScenes <= 1`.
 */
export default function SceneNav({
	totalScenes,
	currentScene,
	onSceneChange,
	isPlaying,
	onTogglePlay,
	labels,
	domain,
}: SceneNavProps) {
	// Single-scene datasets need no navigation
	if (totalScenes <= 1) return null;

	const hasLabels = labels && labels.length > 0;

	// Shared Tailwind classes to avoid repetition
	const barStyle =
		'flex items-center gap-3 bg-black/60 backdrop-blur rounded-lg px-4 py-2 text-white text-sm';
	const btnStyle =
		'px-2 py-1 rounded hover:bg-white/20 disabled:opacity-30 transition';

	return (
		<div className="flex flex-col items-center gap-2">
			{/* ── Narrative label row (only when labels are provided) ── */}
			{hasLabels && (
				<div className={barStyle}>
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
			)}

			{/* ── Shared nav controls (always shown) ── */}
			<div className={barStyle}>
				<button
					className={btnStyle}
					disabled={currentScene === 0}
					onClick={() => onSceneChange(currentScene - 1)}
				>
					◀ Prev
				</button>

				{/* Play/Pause — only rendered for animated arrangement */}
				{onTogglePlay && (
					<button className={btnStyle} onClick={onTogglePlay}>
						{isPlaying ? '⏸' : '▶'}
					</button>
				)}

				{/* Scene counter — hidden when labels are shown (narrative) */}
				{!hasLabels && (
					<span className="tabular-nums">
						{domain && domain.length >= 2 && typeof domain[0] === 'number'
							? domain[0] + currentScene
							: `Scene ${currentScene + 1} / ${totalScenes}`}
					</span>
				)}

				<button
					className={btnStyle}
					disabled={currentScene === totalScenes - 1}
					onClick={() => onSceneChange(currentScene + 1)}
				>
					Next ▶
				</button>
			</div>
		</div>
	);
}
