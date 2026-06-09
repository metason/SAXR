'use client';
/**
 * @module ShapeArc
 * Renders a {@link DataRep} as a donut-segment (arc) using custom `BufferGeometry`.
 * Parameters are parsed from `rep.asset` as semicolon-separated KV pairs:
 * `ratio` (inner/outer radius), `start` (degrees), `angle` (sweep degrees).
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { DataRep } from '@/lib/types';
import { useColor } from '@/hooks/useColor';
import { parseKV } from '@/lib/vizLoader';

/** Parametric donut segment built from `ratio`, `start`, and `angle` KV params. */
export default function ShapeArc({ rep }: { rep: DataRep }) {
	const { color, opacity } = useColor(rep.color);
	const kvs = parseKV(rep.asset || '');
	const ratio = kvs.ratio ? parseFloat(kvs.ratio) : 0.5;
	const startAngle = kvs.start ? parseFloat(kvs.start) : 0;
	const sweepAngle = kvs.angle ? parseFloat(kvs.angle) : 90;

	const geometry = useMemo(() => {
		if (sweepAngle === 0) return null;
		const outerR = rep.w / 2;
		const innerR = outerR * ratio;
		const height = rep.h ?? 0;

		const startRad = (startAngle * Math.PI) / 180;
		const sweepRad = (sweepAngle * Math.PI) / 180;

		const shape = new THREE.Shape();
		shape.absarc(0, 0, outerR, startRad, startRad + sweepRad, false);
		shape.absarc(0, 0, innerR, startRad + sweepRad, startRad, true);

		const geom = new THREE.ExtrudeGeometry(shape, {
			depth: height,
			bevelEnabled: false,
		});
		geom.rotateX(-Math.PI / 2); // XZ plane → Y-up extrusion
		return geom;
	}, [rep.w, rep.h, ratio, startAngle, sweepAngle]);

	if (!geometry) return null;

	return (
		<mesh
			position={[rep.x, rep.y - (rep.h ?? 0) / 2, rep.z]}
			geometry={geometry}
		>
			<meshStandardMaterial
				color={color}
				transparent={opacity < 1}
				opacity={opacity}
				side={THREE.DoubleSide}
			/>
		</mesh>
	);
}
