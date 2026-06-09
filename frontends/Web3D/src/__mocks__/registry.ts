/**
 * Minimal registry stub for unit tests.
 * Mirrors SHAPE_REGISTRY's type keys (no real React components, to avoid
 * importing @react-three/fiber) and re-implements the pure classifyRep /
 * RepCategory exports so vizLoader's re-export resolves under the test alias.
 * Keep the key list and classifyRep logic in sync with the real registry.ts.
 */
import type { DataRep } from '@/lib/types';

export const SHAPE_REGISTRY: Record<string, null> = {
	sphere: null,
	box: null,
	cylinder: null,
	pyramid: null,
	octahedron: null,
	plus: null,
	cross: null,
	plane: null,
	arc: null,
	surface: null,
	line: null,
	area: null,
};

export type RepCategory = 'shape' | 'panel' | 'encoding' | 'text';

export function classifyRep(rep: DataRep): RepCategory {
	const t = rep.type.toLowerCase();
	if (t === 'encoding') return 'encoding';
	if (t === 'text') return 'text';
	if (t in SHAPE_REGISTRY || t === 'pyramid_down') return 'shape';
	return 'panel';
}
