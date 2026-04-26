'use client';
/** @module ShapeCross — Renders a {@link DataRep} as a rotated plus (diagonal cross). */

import React from 'react';
import { DataRep } from '@/lib/types';
import { useColor } from '@/hooks/useColor';

/** Thickness factor for the cross arms. */
const CROSS_FACTOR = 0.15;
/** Fixed rotation matching SceneKit coordinates: `[π/6, π/5, -π/4]`. */
const CROSS_ROTATION: [number, number, number] = [
	Math.PI / 6,
	Math.PI / 5,
	-Math.PI / 4,
];

/** Diagonal cross shape — a rotated {@link ShapePlus}. */
export default function ShapeCross({ rep }: { rep: DataRep }) {
	const { color, opacity } = useColor(rep.color);
	const pos: [number, number, number] = [rep.x, rep.y, rep.z];
	const mat = (
		<meshStandardMaterial
			color={color}
			transparent={opacity < 1}
			opacity={opacity}
		/>
	);
	return (
		<group position={pos} rotation={CROSS_ROTATION}>
			<mesh scale={[rep.w, rep.h * CROSS_FACTOR, rep.d * CROSS_FACTOR]}>
				<boxGeometry args={[1, 1, 1]} />
				{mat}
			</mesh>
			<mesh scale={[rep.w * CROSS_FACTOR, rep.h, rep.d * CROSS_FACTOR]}>
				<boxGeometry args={[1, 1, 1]} />
				{mat}
			</mesh>
			<mesh scale={[rep.w * CROSS_FACTOR, rep.h * CROSS_FACTOR, rep.d]}>
				<boxGeometry args={[1, 1, 1]} />
				{mat}
			</mesh>
		</group>
	);
}
