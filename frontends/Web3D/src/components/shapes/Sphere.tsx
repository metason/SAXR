'use client';
/** @module ShapeSphere — Renders a {@link DataRep} as a `THREE.SphereGeometry` (16×16 segments). */

import React from 'react';
import { DataRep } from '@/lib/types';
import { useColor } from '@/hooks/useColor';

/** Unit radius — scaled to rep dimensions via the mesh `scale` prop. */
const SPHERE_RADIUS = 0.5;
/** Latitude and longitude segment count — 16 gives smooth enough silhouettes at typical scene scales. */
const SPHERE_SEGMENTS = 16;

/** Sphere shape scaled by `rep.w / rep.h / rep.d`. */
export default function ShapeSphere({ rep }: { rep: DataRep }) {
	const { color, opacity } = useColor(rep.color);
	return (
		<mesh position={[rep.x, rep.y, rep.z]} scale={[rep.w, rep.h, rep.d]}>
			<sphereGeometry
				args={[SPHERE_RADIUS, SPHERE_SEGMENTS, SPHERE_SEGMENTS]}
			/>
			<meshStandardMaterial
				color={color}
				transparent={opacity < 1}
				opacity={opacity}
			/>
		</mesh>
	);
}
