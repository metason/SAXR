'use client';
/** @module ShapeTorus — Renders a {@link DataRep} as a `THREE.TorusGeometry`. */

import React from 'react';
import { DataRep } from '@/lib/types';
import { useColor } from '@/hooks/useColor';

/** Outer radius of the torus ring — scaled by rep dimensions via the mesh `scale` prop. */
const TORUS_RADIUS = 0.4;
/** Radius of the tube cross-section. */
const TORUS_TUBE = 0.15;
/** Number of segments around the main ring. */
const TORUS_RADIAL_SEGMENTS = 16;
/** Number of segments around the tube cross-section. */
const TORUS_TUBULAR_SEGMENTS = 32;

/** Torus (ring/donut) shape scaled by `rep.w / rep.h / rep.d`. */
export default function ShapeTorus({ rep }: { rep: DataRep }) {
	const { color, opacity } = useColor(rep.color);
	return (
		<mesh position={[rep.x, rep.y, rep.z]} scale={[rep.w, rep.h, rep.d]}>
			<torusGeometry
				args={[
					TORUS_RADIUS,
					TORUS_TUBE,
					TORUS_RADIAL_SEGMENTS,
					TORUS_TUBULAR_SEGMENTS,
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
