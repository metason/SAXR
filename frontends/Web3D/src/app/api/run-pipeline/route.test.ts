/**
 * Tests for POST /api/run-pipeline
 *
 * Covers: slug validation, JSON syntax check, ajv schema validation,
 * successful pipeline run, and pipeline stderr surfaced as error.
 */
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { EventEmitter } from 'events';

// Mock child_process — spawn must be intercepted before the route module loads
vi.mock('child_process', () => ({ spawn: vi.fn() }));

// Mock fs.promises.writeFile but keep readFileSync intact so the
// module-level schema loader can still read schemas/config.json from disk.
vi.mock('fs', async () => {
	const actual = await vi.importActual<typeof import('fs')>('fs');
	return {
		...actual,
		promises: {
			...(actual as any).promises,
			writeFile: vi.fn().mockResolvedValue(undefined),
		},
	};
});

import { POST } from './route';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Make a fake child process that exits with the given code after emitting stderr. */
function mockSpawn(exitCode: number, stderrOutput = '') {
	const proc = new EventEmitter() as any;
	proc.stderr = new EventEmitter();
	setImmediate(() => {
		if (stderrOutput) proc.stderr.emit('data', Buffer.from(stderrOutput));
		proc.emit('close', exitCode);
	});
	(spawn as ReturnType<typeof vi.fn>).mockReturnValue(proc);
}

/** Minimal config that satisfies the schema's required fields. */
const VALID_CONFIG = JSON.stringify({
	data: { url: 'test.csv' },
	stage: { width: 0.7, height: 0.55, depth: 0.55 },
	plot: 'scatter',
	panels: ['XY'],
	encoding: { x: { field: 'a' }, y: { field: 'b' } },
});

function makeRequest(body: object) {
	return new Request('http://localhost/api/run-pipeline', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
}

beforeAll(async () => {
	// Allow the module-level import('fs').then(...) to resolve so validateConfig
	// is compiled before schema-validation tests run.
	await new Promise((resolve) => setImmediate(resolve));
});

afterEach(() => {
	vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Slug validation
// ---------------------------------------------------------------------------
describe('slug validation', () => {
	it('rejects missing slug', async () => {
		const res = await POST(makeRequest({ configText: VALID_CONFIG }));
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toMatch(/invalid sample name/i);
	});

	it('rejects slug with path traversal characters', async () => {
		const res = await POST(
			makeRequest({ slug: '../etc/passwd', configText: VALID_CONFIG }),
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toMatch(/invalid sample name/i);
	});

	it('rejects slug with uppercase letters', async () => {
		const res = await POST(
			makeRequest({ slug: 'MySlug', configText: VALID_CONFIG }),
		);
		expect(res.status).toBe(400);
	});

	it('rejects slug with spaces', async () => {
		const res = await POST(
			makeRequest({ slug: 'my sample', configText: VALID_CONFIG }),
		);
		expect(res.status).toBe(400);
	});

	it('accepts slug with letters, digits, hyphens, underscores', async () => {
		mockSpawn(0);
		const res = await POST(
			makeRequest({ slug: 'my-sample_01', configText: VALID_CONFIG }),
		);
		expect(res.status).toBe(200);
	});
});

// ---------------------------------------------------------------------------
// JSON syntax validation
// ---------------------------------------------------------------------------
describe('JSON syntax validation', () => {
	it('rejects malformed JSON', async () => {
		const res = await POST(
			makeRequest({ slug: 'eco', configText: '{bad json' }),
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toMatch(/invalid json/i);
	});
});

// ---------------------------------------------------------------------------
// Schema validation (ajv)
// ---------------------------------------------------------------------------
describe('schema validation', () => {
	it('rejects invalid arrangement enum value', async () => {
		const cfg = JSON.stringify({
			...JSON.parse(VALID_CONFIG),
			sequence: { field: 'year', domain: [2000, 2024], arrangement: 'amated' },
		});
		const res = await POST(makeRequest({ slug: 'eco', configText: cfg }));
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toMatch(/schema validation failed/i);
		expect(body.error).toMatch(/arrangement/i);
	});

	it('rejects missing required field (plot)', async () => {
		const cfg = JSON.parse(VALID_CONFIG);
		delete cfg.plot;
		const res = await POST(
			makeRequest({ slug: 'eco', configText: JSON.stringify(cfg) }),
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toMatch(/schema validation failed/i);
	});

	it('rejects wrong type for stage.width', async () => {
		const cfg = {
			...JSON.parse(VALID_CONFIG),
			stage: { width: 'wide', height: 1, depth: 1 },
		};
		const res = await POST(
			makeRequest({ slug: 'eco', configText: JSON.stringify(cfg) }),
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toMatch(/schema validation failed/i);
	});

	it('passes valid config through to writeFile', async () => {
		mockSpawn(0);
		const res = await POST(
			makeRequest({ slug: 'eco', configText: VALID_CONFIG }),
		);
		expect(res.status).toBe(200);
		expect(fs.writeFile).toHaveBeenCalledOnce();
	});
});

// ---------------------------------------------------------------------------
// Pipeline execution
// ---------------------------------------------------------------------------
describe('pipeline execution', () => {
	it('returns success when Python exits 0', async () => {
		mockSpawn(0);
		const res = await POST(
			makeRequest({ slug: 'eco', configText: VALID_CONFIG }),
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
	});

	it('returns pipeline stderr when Python exits non-zero', async () => {
		mockSpawn(1, 'ValueError: something went wrong');
		const res = await POST(
			makeRequest({ slug: 'eco', configText: VALID_CONFIG }),
		);
		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.error).toContain('ValueError: something went wrong');
	});

	it('does not write to disk if schema validation fails', async () => {
		const cfg = JSON.stringify({
			...JSON.parse(VALID_CONFIG),
			sequence: { field: 'year', domain: [2000, 2024], arrangement: 'bad' },
		});
		await POST(makeRequest({ slug: 'eco', configText: cfg }));
		expect(fs.writeFile).not.toHaveBeenCalled();
	});
});
