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
};

/**
 * Pyramid-down is the same component with an extra prop.
 * Handled as a special case in the dispatcher rather than here,
 * because it needs the `upsideDown` prop.
 */
