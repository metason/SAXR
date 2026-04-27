/**
 * @module api/run-pipeline
 * POST /api/run-pipeline — accepts a JSON config, runs the SAXR pipeline, and returns the generated data.
 * This is a simplified example for demonstration;
 */

import { NextResponse } from 'next/server';
import { writeFileSync } from 'fs';
import path from 'path';
import { spawn } from 'child_process';

export async function POST(request: Request) {
	// 1. read the request body -> { "slug": "eco", "configText": "{ ... the edited config.json content ... }" }
	const { slug, configText } = await request.json();

	// 2. save config.json
	const saxrRoot = path.resolve(process.cwd(), '..', '..');
	const filePath = path.resolve(saxrRoot, 'samples', slug, 'config.json');

	writeFileSync(filePath, configText);

	// 3. spawn python

	const errorOutput = await new Promise<string | null>((resolve) => {
		const proc = spawn('python', ['datarepgen.py', `samples/${slug}`], {
			cwd: saxrRoot,
		});

		let stderr = '';
		proc.stderr.on('data', (chunk) => {
			// ? append chunk.toString() to stderr
			stderr += chunk.toString();
		});

		proc.on('close', (code) => {
			// ? if code is 0, resolve(null) — success
			if (code === 0) {
				resolve(null);
			} else {
				resolve(stderr);
			}
			//   otherwise resolve(stderr) — failure
		});
	});
	// 4. return response
	if (errorOutput) {
		return NextResponse.json({ error: errorOutput }, { status: 500 });
	} else {
		return NextResponse.json({ success: true });
	}
}
