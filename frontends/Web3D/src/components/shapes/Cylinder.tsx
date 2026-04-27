'use client';
/** @module ShapeCylinder — Renders a {@link DataRep} as a `THREE.CylinderGeometry` (16 segments). */

import React from 'react';
import { DataRep } from '@/lib/types';
import { useColor } from '@/hooks/useColor';

/** Cylinder shape. Height is halved in scale to match SAXR coordinate conventions. */
export default function ShapeCylinder({ rep }: { rep: DataRep }) {
	const { color, opacity } = useColor(rep.color);
	return (
		<mesh position={[rep.x, rep.y, rep.z]} scale={[rep.w, rep.h / 2, rep.d]}>
			<cylinderGeometry args={[0.5, 0.5, 2, 16]} />
			<meshStandardMaterial
				color={color}
				transparent={opacity < 1}
				opacity={opacity}
			/>
		</mesh>
	);
}
