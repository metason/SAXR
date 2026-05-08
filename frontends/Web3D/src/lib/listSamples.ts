/**
 * @module listSamples
 * Server-only utility: scans `SAXR/samples/` and returns all discovered samples.
 * Used by both the API route and the landing page server component so neither
 * has to make an internal HTTP round-trip.
 */

import fs from 'fs';
import path from 'path';
import { SampleInfo } from './types';

export function listSamples(): SampleInfo[] {
	const samplesDir = path.resolve(process.cwd(), '..', '..', 'samples');

	if (!fs.existsSync(samplesDir)) return [];

	const entries = fs.readdirSync(samplesDir, { withFileTypes: true });
	const samples: SampleInfo[] = [];

	for (const entry of entries) {
		if (!entry.isDirectory()) continue;

		const dir = path.join(samplesDir, entry.name);
		const vizPath = path.join(dir, 'datareps.json');
		const settingsPath = path.join(dir, 'config.json');

		if (!fs.existsSync(vizPath)) continue;

		let title = entry.name.charAt(0).toUpperCase() + entry.name.slice(1);
		let description: string | undefined;
		if (fs.existsSync(settingsPath)) {
			try {
				const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
				if (settings.title) title = settings.title;
				if (settings.description) description = settings.description;
			} catch {
				// keep default title
			}
		}

		samples.push({
			name: title,
			description,
			slug: entry.name,
			vizJsonPath: `/samples/${entry.name}/datareps.json`,
			assetBasePath: `/samples/${entry.name}`,
		});
	}

	samples.sort((a, b) => a.slug.localeCompare(b.slug));
	return samples;
}
