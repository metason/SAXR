// registry.ts
// Shape component registry — maps type strings to React components.
// To add a new shape: import it and add a single entry here.

import { ComponentType } from 'react';
import { DataRep } from '@/lib/types';

import ShapeSphere from './Sphere';
import ShapeBox from './Box';
import ShapeCylinder from './Cylinder';
import ShapePyramid from './Pyramid';
import ShapeOctahedron from './Octahedron';
import ShapePlus from './Plus';
import ShapeCross from './Cross';
import ShapePlane from './Plane';
import ShapeArc from './Arc';
import ShapeSurface from './Surface';
import ShapeLine from './Line';
import ShapeArea from './Area';

export interface ShapeProps {
	rep: DataRep;
	assetBasePath?: string;
}

/**
 * Registry of shape type → component.
 * The dispatcher looks up rep.type.toLowerCase() in this map.
 */
export const SHAPE_REGISTRY: Record<string, ComponentType<ShapeProps>> = {
	sphere: ShapeSphere,
	box: ShapeBox,
	cylinder: ShapeCylinder,
	pyramid: ShapePyramid,
	octahedron: ShapeOctahedron,
	plus: ShapePlus,
	cross: ShapeCross,
	plane: ShapePlane,
	arc: ShapeArc,
	surface: ShapeSurface,
	line: ShapeLine,
	area: ShapeArea,
};

/**
 * Pyramid-down is the same component with an extra prop.
 * Handled as a special case in the dispatcher rather than here,
 * because it needs the `upsideDown` prop.
 */

/**
 * Category for routing a DataRep to the correct renderer.
 * - `'shape'` — 3D geometry (sphere, box, arc, etc.)
 * - `'panel'` — textured image quad (xy, zy, xz, lc=…)
 * - `'encoding'` — encoding metadata (not rendered)
 * - `'text'` — text element
 */
export type RepCategory = 'shape' | 'panel' | 'encoding' | 'text';

/**
 * Classify a DataRep type for rendering dispatch.
 * Uses SHAPE_REGISTRY as the authoritative list of shape types.
 */
export function classifyRep(rep: DataRep): RepCategory {
	const t = rep.type.toLowerCase();
	if (t === 'encoding') return 'encoding';
	if (t === 'text') return 'text';
	if (t in SHAPE_REGISTRY || t === 'pyramid_down') return 'shape';
	return 'panel';
}
