import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * GET /api/pipeline-file/:path*
 *
 * Serves static assets directly from the pipeline output directory
 * (SAXR/samples/). This is used as a fallback rewrite so the dev server
 * can read freshly-generated files without a manual copy step.
 *
 * Security:
 *  - Resolved path must stay inside SAMPLES_ROOT (no path traversal).
 *  - Only whitelisted file extensions are served.
 */

const SAMPLES_ROOT = path.resolve(process.cwd(), '..', '..', 'samples');

const MIME: Record<string, string> = {
	'.json': 'application/json',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.svg': 'image/svg+xml',
	'.ply': 'application/octet-stream',
};

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ path: string[] }> },
) {
	const segments = (await params).path;
	const filePath = path.resolve(SAMPLES_ROOT, ...segments);

	// Block path traversal
	if (!filePath.startsWith(SAMPLES_ROOT + path.sep)) {
		return new NextResponse('Forbidden', { status: 403 });
	}

	// Extension whitelist
	const ext = path.extname(filePath).toLowerCase();
	if (!MIME[ext]) {
		return new NextResponse('Not Found', { status: 404 });
	}

	if (!fs.existsSync(filePath)) {
		return new NextResponse('Not Found', { status: 404 });
	}

	const content = fs.readFileSync(filePath);
	return new NextResponse(content, {
		headers: { 'Content-Type': MIME[ext] },
	});
}
