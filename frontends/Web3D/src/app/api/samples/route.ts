import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Force dynamic rendering — samples directory may change between deploys
export const dynamic = 'force-dynamic';

/**
 * GET /api/samples
 *
 * Auto-discovers sample datasets by scanning the pipeline output directory
 * (SAXR/samples/). Each subfolder that contains datareps.json is returned
 * as an available sample. The title comes from config.json.
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
		if (fs.existsSync(settingsPath)) {
			try {
				const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
				if (settings.title) title = settings.title;
			} catch {
				// keep default title
			}
		}

		samples.push({
			name: title,
			slug: entry.name,
			vizJsonPath: `/samples/${entry.name}/datareps.json`,
			assetBasePath: `/samples/${entry.name}`,
		});
	}

	samples.sort((a, b) => a.slug.localeCompare(b.slug));

	return NextResponse.json(samples);
}
