'use client';
// SamplePicker.tsx
// Dropdown to choose which sample dataset to visualize.

import React from 'react';

export interface SampleInfo {
	name: string;
	vizJsonPath: string;
	assetBasePath: string;
}

interface SamplePickerProps {
	samples: SampleInfo[];
	current: string;
	onSelect: (vizJsonPath: string) => void;
}

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
