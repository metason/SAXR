/**
 * @module listSamples
 * Server-only utility: scans `SAXR/samples/` and returns all discovered samples.
 * Used by both the API route and the landing page server component so neither
 * has to make an internal HTTP round-trip.
 */

import fs from 'fs';
import path from 'path';
import { SampleInfo } from './types';

/**
 * Sample folders kept in the repository (for the pipeline, Unity, and ARchi VR)
 * but hidden from the Web3D gallery and viewer. `cluster` is titled "Iris" and
 * uses the cluster plot type, which would surface as a confusing duplicate of
 * the `iris` sample in the web UI.
 */
const HIDDEN_SLUGS = new Set(['cluster']);

export function listSamples(): SampleInfo[] {
	const samplesDir = path.resolve(process.cwd(), '..', '..', 'samples');

	if (!fs.existsSync(samplesDir)) return [];

	const entries = fs.readdirSync(samplesDir, { withFileTypes: true });
	const samples: SampleInfo[] = [];

	for (const entry of entries) {
		if (!entry.isDirectory()) continue;
		if (HIDDEN_SLUGS.has(entry.name)) continue;

		const dir = path.join(samplesDir, entry.name);
		const settingsPath = path.join(dir, 'config.json');

		// List any sample that has a config.json — not one that has already been
		// generated. On a fresh clone datareps.json is git-ignored and absent, so
		// requiring it left the gallery empty with no way to reach the editor and
		// hit Run. With this, every configured sample is openable in the editor and
		// can be generated from there. Folders without a config (e.g. geo, which
		// uses its own generator) are still skipped.
		if (!fs.existsSync(settingsPath)) continue;

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
