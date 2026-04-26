'use client';
/** @module ShapeBox — Renders a {@link DataRep} as a `THREE.BoxGeometry`. */

import React from 'react';
import { DataRep } from '@/lib/types';
import { useColor } from '@/hooks/useColor';

/** Axis-aligned box scaled by `rep.w / rep.h / rep.d`. */
export default function ShapeBox({ rep }: { rep: DataRep }) {
	const { color, opacity } = useColor(rep.color);
	return (
		<mesh position={[rep.x, rep.y, rep.z]} scale={[rep.w, rep.h, rep.d]}>
			<boxGeometry args={[1, 1, 1]} />
			<meshStandardMaterial
				color={color}
				transparent={opacity < 1}
				opacity={opacity}
			/>
		</mesh>
	);
}
