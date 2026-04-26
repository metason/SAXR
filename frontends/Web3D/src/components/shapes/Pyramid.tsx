'use client';
/** @module ShapePyramid — Renders a {@link DataRep} as a 4-sided `THREE.ConeGeometry`. */

import React from 'react';
import { DataRep } from '@/lib/types';
import { useColor } from '@/hooks/useColor';

/**
 * Pyramid (4-sided cone). Set `upsideDown` to flip for `pyramid_down` type.
 * @param props.rep - The DataRep to render.
 * @param props.upsideDown - If `true`, rotates 180° around X to invert the pyramid.
 */
export default function ShapePyramid({
	rep,
	upsideDown,
}: {
	rep: DataRep;
	upsideDown?: boolean;
}) {
	const { color, opacity } = useColor(rep.color);
	const rotation: [number, number, number] = upsideDown
		? [Math.PI, 0, 0]
		: [0, 0, 0];
	return (
		<mesh
			position={[rep.x, rep.y, rep.z]}
			scale={[rep.w, rep.h, rep.d]}
			rotation={rotation}
		>
			<coneGeometry args={[0.5, 1, 4]} />
			<meshStandardMaterial
				color={color}
				transparent={opacity < 1}
				opacity={opacity}
			/>
		</mesh>
	);
}
