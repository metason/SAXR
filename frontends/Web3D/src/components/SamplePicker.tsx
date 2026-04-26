'use client';
/**
 * @module SamplePicker
 * Dropdown to choose which sample dataset to visualize.
 */

import React from 'react';

/** Metadata for a discovered sample dataset. */
export interface SampleInfo {
	/** Display name (from config.json `title`, or capitalized directory name). */
	name: string;
	/** URL path to the sample’s datareps.json. */
	vizJsonPath: string;
	/** URL base path for resolving panel/texture assets. */
	assetBasePath: string;
}

/** Props for the {@link SamplePicker} component. */
interface SamplePickerProps {
	/** Available sample datasets. */
	samples: SampleInfo[];
	/** Currently selected `vizJsonPath`. */
	current: string;
	/** Callback when the user selects a different sample. */
	onSelect: (vizJsonPath: string) => void;
}

/** Dropdown `<select>` for choosing a sample dataset. */
export default function SamplePicker({
	samples,
	current,
	onSelect,
}: SamplePickerProps) {
	return (
		<select
			className="bg-black/60 backdrop-blur text-white rounded-lg px-3 py-2 text-sm border border-white/20 cursor-pointer"
			value={current}
			onChange={(e) => onSelect(e.target.value)}
		>
			{samples.map((s) => (
				<option key={s.vizJsonPath} value={s.vizJsonPath}>
					{s.name}
				</option>
			))}
		</select>
	);
}
