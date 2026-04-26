'use client';
/** @module ShapePlane — Renders a {@link DataRep} as a flat `THREE.PlaneGeometry` quad. */

import React from 'react';
import * as THREE from 'three';
import { DataRep } from '@/lib/types';
import { useColor } from '@/hooks/useColor';

/** Flat quad that auto-orients horizontally when `rep.d > rep.h`. */
export default function ShapePlane({ rep }: { rep: DataRep }) {
	const { color, opacity } = useColor(rep.color);
	const isHorizontal = rep.d > rep.h;
	const scale: [number, number, number] = isHorizontal
		? [rep.w, rep.d, 1]
		: [rep.w, rep.h, 1];
	const rotation: [number, number, number] = isHorizontal
		? [-Math.PI / 2, 0, 0]
		: [0, 0, 0];
	return (
		<mesh
			position={[rep.x, rep.y + rep.h / 2, rep.z]}
			scale={scale}
			rotation={rotation}
		>
			<planeGeometry args={[1, 1]} />
			<meshStandardMaterial
				color={color}
				transparent={opacity < 1}
				opacity={opacity}
				side={THREE.DoubleSide}
			/>
		</mesh>
	);
}
