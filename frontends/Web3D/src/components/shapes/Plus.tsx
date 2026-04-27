'use client';
/** @module ShapePlus — Renders a {@link DataRep} as three perpendicular boxes forming a “+” shape. */

import React from 'react';
import { DataRep } from '@/lib/types';
import { useColor } from '@/hooks/useColor';

/** Thickness factor for the cross arms relative to the main dimensions. */
const PLUS_FACTOR = 0.2;

/** Plus/cross shape built from 3 overlapping boxes. */
export default function ShapePlus({ rep }: { rep: DataRep }) {
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
		<group position={pos}>
			<mesh scale={[rep.w, rep.h * PLUS_FACTOR, rep.d * PLUS_FACTOR]}>
				<boxGeometry args={[1, 1, 1]} />
				{mat}
			</mesh>
			<mesh scale={[rep.w * PLUS_FACTOR, rep.h, rep.d * PLUS_FACTOR]}>
				<boxGeometry args={[1, 1, 1]} />
				{mat}
			</mesh>
			<mesh scale={[rep.w * PLUS_FACTOR, rep.h * PLUS_FACTOR, rep.d]}>
				<boxGeometry args={[1, 1, 1]} />
				{mat}
			</mesh>
		</group>
	);
}
