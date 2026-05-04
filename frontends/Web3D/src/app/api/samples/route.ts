/**
 * @module api/samples
 * GET /api/samples — auto-discovers sample datasets from the SAXR pipeline output directory.
 */

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/** Force dynamic rendering — samples directory may change between deploys. */
export const dynamic = 'force-dynamic';

/**
 * Scans `SAXR/samples/` for subdirectories containing `datareps.json`.
 * Returns a JSON array of {@link SampleInfo}-shaped objects sorted alphabetically.
 * The display name comes from `config.json` `title` (falls back to capitalized dir name).
 * @returns `NextResponse` with JSON array of discovered samples.
 */
export async function GET() {
	const samplesDir = path.resolve(process.cwd(), '..', '..', 'samples');

	if (!fs.existsSync(samplesDir)) {
		return NextResponse.json([]);
	}

	const entries = fs.readdirSync(samplesDir, { withFileTypes: true });
	const samples = [];

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

	return NextResponse.json(samples);
}
