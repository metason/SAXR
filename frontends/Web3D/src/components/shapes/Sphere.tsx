'use client';
/** @module ShapeSphere — Renders a {@link DataRep} as a `THREE.SphereGeometry` (16×16 segments). */

import React from 'react';
import { DataRep } from '@/lib/types';
import { useColor } from '@/hooks/useColor';

/** Sphere shape scaled by `rep.w / rep.h / rep.d`. */
export default function ShapeSphere({ rep }: { rep: DataRep }) {
	const { color, opacity } = useColor(rep.color);
	return (
		<mesh position={[rep.x, rep.y, rep.z]} scale={[rep.w, rep.h, rep.d]}>
			<sphereGeometry args={[0.5, 16, 16]} />
			<meshStandardMaterial
				color={color}
				transparent={opacity < 1}
				opacity={opacity}
			/>
		</mesh>
	);
}
