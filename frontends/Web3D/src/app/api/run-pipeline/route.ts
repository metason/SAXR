/**
 * @module api/run-pipeline
 * POST /api/run-pipeline — validates and saves a config.json, then runs the SAXR pipeline.
 * Returns 409 if a run is already in progress for the given sample slug.
 */

import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import Ajv from 'ajv/dist/2020';
import type { TraceStep, NodeId } from '@/lib/showcaseTrace';

/** Tracks which sample slugs currently have a pipeline run in progress. */
const running = new Set<string>();

/** Append a server-side step to the walkthrough trace with a measured duration. */
function step(
	trace: TraceStep[],
	node: NodeId,
	label: string,
	level: TraceStep['level'],
	since: number,
	detail?: string,
): void {
	trace.push({ label, level, detail, stage: 'server', ms: Date.now() - since, node });
}

const SCHEMA_PATH = path.resolve(
	process.cwd(),
	'..',
	'..',
	'schemas',
	'config.json',
);

/** AJV validator for config.json, lazily initialised on first POST. */
const ajv = new Ajv({ strict: false });
let validateConfig: ReturnType<typeof ajv.compile> | null = null;

async function getValidator(): Promise<ReturnType<typeof ajv.compile> | null> {
	if (validateConfig) return validateConfig;
	try {
		const schema = JSON.parse(await fs.readFile(SCHEMA_PATH, 'utf-8'));
		validateConfig = ajv.compile(schema);
		return validateConfig;
	} catch (err) {
		console.error(
			'[run-pipeline] Failed to read config schema — validation disabled:',
			err,
		);
		return null;
	}
}

export async function POST(request: Request) {
	const { slug, configText } = await request.json();

	// The walkthrough trace, returned alongside the result so Showcase Mode can
	// narrate what the server actually did (and prove the client AJV check is not
	// the trust boundary — the server re-validates independently).
	const trace: TraceStep[] = [];

	// Validate slug — only allow safe directory names (letters, digits, hyphens, underscores)
	if (!slug || !/^[a-z0-9_-]+$/.test(slug)) {
		return NextResponse.json({ error: 'Invalid sample name', trace }, { status: 400 });
	}

	// Reject concurrent runs on the same sample to prevent race conditions
	if (running.has(slug)) {
		return NextResponse.json(
			{ error: 'Pipeline already running for this sample — please wait', trace },
			{ status: 409 },
		);
	}

	running.add(slug);
	try {
		const saxrRoot = path.resolve(process.cwd(), '..', '..');
		const filePath = path.resolve(saxrRoot, 'samples', slug, 'config.json');

		// Validate JSON syntax before writing — prevents corrupting the file on disk
		let t = Date.now();
		let parsed: unknown;
		try {
			parsed = JSON.parse(configText);
		} catch {
			step(trace, 'syntax', 'JSON syntax check', 'error', t, 'Invalid JSON — refused to write to disk');
			return NextResponse.json({ error: 'Invalid JSON in config', trace }, { status: 400 });
		}
		step(trace, 'syntax', 'JSON syntax check', 'success', t, `${configText.length} chars parsed`);

		// Validate against schema — the real trust boundary. Independent of the
		// editor's client-side AJV: a crafted request that skipped the browser
		// still fails here against the same config schema.
		t = Date.now();
		const validate = await getValidator();
		if (validate) {
			const valid = validate(parsed);
			if (!valid) {
				const messages = (validate.errors ?? [])
					.map((e) => `${e.instancePath || '/'} ${e.message}`)
					.join('; ');
				step(trace, 'ajv-server', 'Server schema re-validation (AJV)', 'error', t, messages);
				return NextResponse.json(
					{ error: `Config schema validation failed: ${messages}`, trace },
					{ status: 400 },
				);
			}
			step(trace, 'ajv-server', 'Server schema re-validation (AJV)', 'success', t, 'Independent of browser — the real trust boundary');
		} else {
			step(trace, 'ajv-server', 'Server schema re-validation (AJV)', 'detail', t, 'Schema unavailable — validation skipped');
		}

		// Write asynchronously so the server thread is not blocked during the file write
		t = Date.now();
		await fs.writeFile(filePath, configText, 'utf-8');
		step(trace, 'write', 'Wrote config.json', 'success', t, `samples/${slug}/config.json`);

		t = Date.now();
		const result = await new Promise<{ code: number | null; stdout: string; stderr: string }>(
			(resolve) => {
				const proc = spawn('python', ['datarepgen.py', `samples/${slug}`], {
					cwd: saxrRoot,
				});

				let stdout = '';
				let stderr = '';
				proc.stdout.on('data', (chunk) => {
					stdout += chunk.toString();
				});
				proc.stderr.on('data', (chunk) => {
					stderr += chunk.toString();
				});
				proc.on('close', (code) => resolve({ code, stdout, stderr }));
			},
		);

		if (result.code !== 0) {
			const errorOutput = result.stderr.trim() || `Process exited with code ${result.code}`;
			step(trace, 'spawn', 'datarepgen.py', 'error', t, errorOutput);
			return NextResponse.json({ error: errorOutput, trace }, { status: 500 });
		}

		// Surface the last meaningful line of Python stdout (resolved path etc.).
		const lastLine = result.stdout.trim().split('\n').filter(Boolean).pop();
		step(
			trace,
			'spawn',
			'datarepgen.py',
			'success',
			t,
			`validate_config → execute → createPanels → createDataViz → saveVizRep${lastLine ? `\n${lastLine}` : ''}`,
		);
		return NextResponse.json({ success: true, trace });
	} finally {
		// Always release the lock, even if Python crashes or throws
		running.delete(slug);
	}
}
