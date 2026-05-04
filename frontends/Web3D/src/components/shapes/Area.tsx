'use client';
/** @module ShapeArea — Renders a {@link DataRep} of type `area` as a flat colored quad. */

import React from 'react';
import * as THREE from 'three';
import { DataRep } from '@/lib/types';
import { useColor } from '@/hooks/useColor';

/** Minimum scale on any axis to keep the mesh visible — prevents zero-thickness quads from disappearing. */
const MIN_THICKNESS = 0.001;

/**
 * Area segment.
 * The DataRep center `(x, y, z)` is the midpoint; `(w, h, d)` are the
 * extents along each axis.  `d` is 0 for segments within one z-layer, so a
 * minimum thickness is enforced to keep the mesh visible.
 */
export default function ShapeArea({ rep }: { rep: DataRep }) {
	const { color, opacity } = useColor(rep.color);

	const sx = Math.abs(rep.w) || MIN_THICKNESS;
	const sy = Math.abs(rep.h) || MIN_THICKNESS;
	const sz = Math.max(Math.abs(rep.d), MIN_THICKNESS);

	return (
		<mesh position={[rep.x, rep.y, rep.z]} scale={[sx, sy, sz]}>
			<boxGeometry args={[1, 1, 1]} />
			<meshStandardMaterial
				color={color}
				transparent={opacity < 1}
				opacity={opacity}
				side={THREE.DoubleSide}
			/>
		</mesh>
	);
}
