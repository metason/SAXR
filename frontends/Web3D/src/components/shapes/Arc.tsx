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
		const segments = 32;
		const outerR = rep.w / 2;
		const innerR = outerR * ratio;

		const vertices: number[] = [];
		const indices: number[] = [];

		const startRad = (startAngle * Math.PI) / 180;
		const sweepRad = (sweepAngle * Math.PI) / 180;

		for (let i = 0; i <= segments; i++) {
			const t = i / segments;
			const angle = startRad + t * sweepRad;
			const cos = Math.cos(angle);
			const sin = Math.sin(angle);

			// Inner vertex
			vertices.push(innerR * cos, 0, innerR * sin);
			// Outer vertex
			vertices.push(outerR * cos, 0, outerR * sin);
		}

		for (let i = 0; i < segments; i++) {
			const v = i * 2;
			indices.push(v, v + 2, v + 1);
			indices.push(v + 1, v + 2, v + 3);
		}

		const geom = new THREE.BufferGeometry();
		geom.setAttribute(
			'position',
			new THREE.Float32BufferAttribute(vertices, 3),
		);
		geom.setIndex(indices);
		geom.computeVertexNormals();
		return geom;
	}, [rep.w, ratio, startAngle, sweepAngle]);

	if (!geometry) return null;

	return (
		<mesh position={[rep.x, rep.y, rep.z]} geometry={geometry}>
			<meshStandardMaterial
				color={color}
				transparent={opacity < 1}
				opacity={opacity}
				side={THREE.DoubleSide}
			/>
		</mesh>
	);
}
