/**
 * copy-samples.mjs
 *
 * Copies pipeline output (datareps.json + PNGs) from samples/
 * into web/public/samples/ so Next.js can serve them as static assets.
 *
 * Locally this is a no-op when the junction/symlink already exists.
 * On Vercel (or any CI), it copies the real files.
 */
import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const webDir = resolve(__dirname, '..');
const dest = join(webDir, 'public', 'samples');
const src = resolve(webDir, '..', '..', 'samples');

// If dest is already a symlink/junction (local dev), skip
if (existsSync(dest)) {
	try {
		const stat = lstatSync(dest);
		if (stat.isSymbolicLink() || stat.isDirectory()) {
			// Check if it's a junction (Windows) or symlink
			if (stat.isSymbolicLink()) {
				console.log('✓ public/samples is a symlink — skipping copy');
				process.exit(0);
			}
			// On Windows, junctions show as directories, check if samples are there
			const items = readdirSync(dest);
			if (items.length > 0) {
				console.log(
					`✓ public/samples already has ${items.length} items — skipping copy`,
				);
				process.exit(0);
			}
		}
	} catch {
		/* continue to copy */
	}
}

if (!existsSync(src)) {
	console.warn(
		`⚠ Source not found: ${src} — skipping copy (samples must exist in public/samples/)`,
	);
	process.exit(0);
}

console.log(`Copying samples: ${src} → ${dest}`);
mkdirSync(dest, { recursive: true });

// Copy each sample folder, but only datareps.json + *.png + config.json
for (const entry of readdirSync(src, { withFileTypes: true })) {
	if (!entry.isDirectory()) continue;

	const sampleSrc = join(src, entry.name);
	const sampleDest = join(dest, entry.name);
	mkdirSync(sampleDest, { recursive: true });

	for (const file of readdirSync(sampleSrc)) {
		if (
			file === 'datareps.json' ||
			file === 'config.json' ||
			file.endsWith('.png')
		) {
			cpSync(join(sampleSrc, file), join(sampleDest, file));
		}
	}
}

console.log('✓ Samples copied');
