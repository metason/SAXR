/**
 * @module api/pipeline-file
 * GET /api/pipeline-file/:path* — serves static assets from the SAXR pipeline output directory.
 * Used via URL rewrite: `/samples/:path*` → `/api/pipeline-file/:path*`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Serves static assets directly from `SAXR/samples/`.
 * This lets the dev server read freshly-generated files without a manual copy step.
 *
 * **Security:**
 * - Resolved path must stay inside `SAMPLES_ROOT` (no path traversal).
 * - Only whitelisted file extensions are served.
 *
 * @param _req - Incoming request (unused).
 * @param params.path - URL path segments after `/api/pipeline-file/`.
 * @returns File content with appropriate MIME type, or 403/404 error.
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

	const content = await fs.readFile(filePath).catch(() => null);
	if (!content) {
		return new NextResponse('Not Found', { status: 404 });
	}
	return new NextResponse(content, {
		headers: { 'Content-Type': MIME[ext] },
	});
}
