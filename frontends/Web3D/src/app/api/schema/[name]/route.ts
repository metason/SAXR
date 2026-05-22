// TODO: this route can be deleted once service.metason.net adds
// `Access-Control-Allow-Origin: *` for /saxr/schemas/* — EditorPanel.tsx
// already fetches directly from there and nothing else calls this route.
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
