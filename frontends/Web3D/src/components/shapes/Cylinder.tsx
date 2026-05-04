'use client';
/** @module ShapeCylinder — Renders a {@link DataRep} as a `THREE.CylinderGeometry` (16 segments). */

import React from 'react';
import { DataRep } from '@/lib/types';
import { useColor } from '@/hooks/useColor';

/** Unit radius for top and bottom caps — scaled to rep dimensions via the mesh `scale` prop. */
const CYLINDER_RADIUS = 0.5;
/** Canonical height of the unit cylinder — halved in `scale` to match SAXR coordinate conventions. */
const CYLINDER_HEIGHT = 2;
/** Radial segment count — 16 gives a smooth silhouette at typical scene scales. */
const CYLINDER_SEGMENTS = 16;

/** Cylinder shape. Height is halved in scale to match SAXR coordinate conventions. */
export default function ShapeCylinder({ rep }: { rep: DataRep }) {
	const { color, opacity } = useColor(rep.color);
	return (
		<mesh position={[rep.x, rep.y, rep.z]} scale={[rep.w, rep.h / 2, rep.d]}>
			<cylinderGeometry
				args={[
					CYLINDER_RADIUS,
					CYLINDER_RADIUS,
					CYLINDER_HEIGHT,
					CYLINDER_SEGMENTS,
				]}
			/>
			<meshStandardMaterial
				color={color}
				transparent={opacity < 1}
				opacity={opacity}
			/>
		</mesh>
	);
}
