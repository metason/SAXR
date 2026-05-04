'use client';
/**
 * @module ComparativeScenePicker
 * HUD overlay buttons for selecting which scenes to show in comparative mode.
 * Each button toggles a scene index; active scenes are highlighted.
 */

import React from 'react';
import { domainLabelForScene } from '@/lib/vizLoader';

interface ComparativeScenePickerProps {
	/** Scene indices to display as buttons (0-based into `ParsedVizData.scenes`). Defaults to all data scenes. */
	allowedScenes: number[] | null;
	/** Currently selected scene indices. */
	selectedScenes: number[];
	/** Total number of data scenes (`ParsedVizData.scenes.length`). */
	totalScenes: number;
	/** Optional domain `[min, max]` used to label each button with its data value. */
	domain?: number[];
	/** Called when a scene button is clicked. */
	onToggle: (sceneIndex: number) => void;
}

export default function ComparativeScenePicker({
	allowedScenes,
	selectedScenes,
	totalScenes,
	domain,
	onToggle,
}: ComparativeScenePickerProps) {
	const scenes =
		allowedScenes ?? Array.from({ length: totalScenes }, (_, i) => i);

	return (
		<div className="flex items-center gap-2 pointer-events-auto flex-wrap justify-center">
			{scenes.map((sceneIndex: number) => {
				const label = domain
					? String(
							Math.round(
								domain[0] +
									(sceneIndex * (domain[1] - domain[0])) /
										Math.max(totalScenes - 1, 1),
							),
						)
					: `Scene ${sceneIndex + 1}`;
				const isSelected = selectedScenes.includes(sceneIndex);
				return (
					<button
						key={sceneIndex}
						onClick={() => onToggle(sceneIndex)}
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
	);
}
