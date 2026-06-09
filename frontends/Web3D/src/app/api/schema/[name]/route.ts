/**
 * @module api/schema
 * GET /api/schema/:name — serves a JSON Schema (config, datareps, specs) from the
 * repository's schemas/ directory through the app's own origin.
 * EditorPanel.tsx loads the config schema from here (SCHEMA_URL = '/api/schema/config')
 * to avoid a cross-origin fetch to service.metason.net. This proxy can be removed only
 * once EditorPanel fetches the schema directly, which requires metason to serve
 * /saxr/schemas/* with `Access-Control-Allow-Origin: *`.
 */
import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import path from 'path';

const ALLOWED = new Set(['config', 'datareps', 'specs']);

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ name: string }> },
) {
	const { name } = await params;
	if (!ALLOWED.has(name)) {
		return NextResponse.json({ error: 'Not found' }, { status: 404 });
	}

	const schemaPath = path.resolve(
		process.cwd(),
		'..',
		'..',
		'schemas',
		`${name}.json`,
	);

	try {
		const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
		return NextResponse.json(schema, {
			headers: { 'Cache-Control': 'public, max-age=60' },
		});
	} catch (err) {
		console.error(`[schema] Failed to read ${name}.json:`, err);
		return NextResponse.json({ error: 'Schema not found' }, { status: 500 });
	}
}
