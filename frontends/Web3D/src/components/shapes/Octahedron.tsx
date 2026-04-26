'use client';
/** @module ShapeOctahedron — Renders a {@link DataRep} as a `THREE.OctahedronGeometry`. */

import React from 'react';
import { DataRep } from '@/lib/types';
import { useColor } from '@/hooks/useColor';

/** Eight-sided polyhedron scaled by `rep.w / rep.h / rep.d`. */
export default function ShapeOctahedron({ rep }: { rep: DataRep }) {
	const { color, opacity } = useColor(rep.color);
	return (
		<mesh position={[rep.x, rep.y, rep.z]} scale={[rep.w, rep.h, rep.d]}>
			<octahedronGeometry args={[0.5]} />
			<meshStandardMaterial
				color={color}
				transparent={opacity < 1}
				opacity={opacity}
			/>
		</mesh>
	);
}
