/**
 * @module api/samples
 * GET /api/samples — auto-discovers sample datasets from the SAXR pipeline output directory.
 */

import { NextResponse } from 'next/server';
import { listSamples } from '@/lib/listSamples';

/** Force dynamic rendering — samples directory may change between deploys. */
export const dynamic = 'force-dynamic';

export async function GET() {
	return NextResponse.json(listSamples());
}
