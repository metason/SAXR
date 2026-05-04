/**
 * @module api/run-pipeline
 * POST /api/run-pipeline — validates and saves a config.json, then runs the SAXR pipeline.
 * Returns 409 if a run is already in progress for the given sample slug.
 */

import { NextResponse } from 'next/server';
import { promises as fs, readFileSync } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import Ajv from 'ajv/dist/2020';

/** Tracks which sample slugs currently have a pipeline run in progress. */
const running = new Set<string>();

/** AJV validator for config.json, compiled once at module load against the draft-2020-12 schema. */
const ajv = new Ajv({ strict: false });
const schemaPath = path.resolve(
	process.cwd(),
	'..',
	'..',
	'schemas',
	'config.json',
);
let validateConfig: ReturnType<typeof ajv.compile> | null = null;
try {
	const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
	validateConfig = ajv.compile(schema);
} catch (err) {
	console.error(
		'[run-pipeline] Failed to load config schema — validation disabled:',
		err,
	);
}

export async function POST(request: Request) {
	const { slug, configText } = await request.json();

	// Validate slug — only allow safe directory names (letters, digits, hyphens, underscores)
	if (!slug || !/^[a-z0-9_-]+$/.test(slug)) {
		return NextResponse.json({ error: 'Invalid sample name' }, { status: 400 });
	}

	// Reject concurrent runs on the same sample to prevent race conditions
	if (running.has(slug)) {
		return NextResponse.json(
			{ error: 'Pipeline already running for this sample — please wait' },
			{ status: 409 },
		);
	}

	running.add(slug);
	try {
		const saxrRoot = path.resolve(process.cwd(), '..', '..');
		const filePath = path.resolve(saxrRoot, 'samples', slug, 'config.json');

		// Validate JSON syntax before writing — prevents corrupting the file on disk
		let parsed: unknown;
		try {
			parsed = JSON.parse(configText);
		} catch {
			return NextResponse.json(
				{ error: 'Invalid JSON in config' },
				{ status: 400 },
			);
		}

		// Validate against schema — rejects unknown enum values, wrong types, path traversal attempts, etc.
		if (validateConfig) {
			const valid = validateConfig(parsed);
			if (!valid) {
				const messages = (validateConfig.errors ?? [])
					.map((e) => `${e.instancePath || '/'} ${e.message}`)
					.join('; ');
				return NextResponse.json(
					{ error: `Config schema validation failed: ${messages}` },
					{ status: 400 },
				);
			}
		}

		// Write asynchronously so the server thread is not blocked during the file write
		await fs.writeFile(filePath, configText, 'utf-8');

		const errorOutput = await new Promise<string | null>((resolve) => {
			const proc = spawn('python', ['datarepgen.py', `samples/${slug}`], {
				cwd: saxrRoot,
			});

			let stderr = '';
			proc.stderr.on('data', (chunk) => {
				stderr += chunk.toString();
			});

			proc.on('close', (code) => {
				if (code === 0) {
					resolve(null);
					return;
				}
				resolve(stderr.trim() || `Process exited with code ${code}`);
			});
		});

		if (errorOutput) {
			return NextResponse.json({ error: errorOutput }, { status: 500 });
		}
		return NextResponse.json({ success: true });
	} finally {
		// Always release the lock, even if Python crashes or throws
		running.delete(slug);
	}
}
