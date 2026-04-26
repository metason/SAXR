'use client';
/**
 * @module useSampleLoader
 * Encapsulates sample discovery and data loading logic extracted from page.tsx.
 */

import { useCallback, useEffect, useState } from 'react';
import { VizJson, SpecsJson } from '@/lib/types';
import { loadVizJson, loadSpecsJson } from '@/lib/vizLoader';
import { SampleInfo } from '@/components/SamplePicker';

/**
 * Hook that auto-discovers available samples and loads the selected dataset.
 * Fetches `/api/samples` on mount, then loads `datareps.json` + `specs.json`
 * whenever the selected sample changes.
 * @returns Object containing `samples`, `vizData`, `specs`, `loading`, `error`,
 *          `currentSample`, `assetBasePath`, and `handleSampleChange`.
 */
export function useSampleLoader() {
	const [samples, setSamples] = useState<SampleInfo[]>([]);
	const [vizData, setVizData] = useState<VizJson | null>(null);
	const [currentSample, setCurrentSample] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [specs, setSpecs] = useState<SpecsJson | null>(null);

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
			try {
				const data = await loadVizJson(path);
				setVizData(data);
				const specsData = await loadSpecsJson(
					samples.find((s) => s.vizJsonPath === path)?.assetBasePath ?? '',
				);
				setSpecs(specsData);
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

	const assetBasePath =
		samples.find((s) => s.vizJsonPath === currentSample)?.assetBasePath || '';

	return {
		samples,
		vizData,
		specs,
		loading,
		error,
		currentSample,
		assetBasePath,
		handleSampleChange,
		loadSample,
	};
}
