'use client';
/** @module ShapeLine — Renders a {@link DataRep} of type `line` as a thin oriented cylinder. */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { DataRep } from '@/lib/types';
import { useColor } from '@/hooks/useColor';

/** Radius of the line cylinder in metres — thin enough to read as a line at typical viewing distances. */
const LINE_RADIUS = 0.0025;
/** Radial segments for the line cylinder — 6 gives a hexagonal cross-section, cheap and visually fine. */
const LINE_RADIAL_SEGMENTS = 6;

/**
 * Line segment.
 * The DataRep center `(x, y, z)` is the midpoint; `(w, h, d)` is the direction vector.
 * Renders as a thin cylinder oriented from `center - dir/2` to `center + dir/2`.
 */
export default function ShapeLine({ rep }: { rep: DataRep }) {
	const { color, opacity } = useColor(rep.color);

	const { length, quaternion } = useMemo(() => {
		const dir = new THREE.Vector3(rep.w, rep.h, rep.d);
		const len = dir.length();
		const q = new THREE.Quaternion().setFromUnitVectors(
			new THREE.Vector3(0, 1, 0),
			len > 0 ? dir.normalize() : new THREE.Vector3(0, 1, 0),
		);
		return { length: len, quaternion: q };
	}, [rep.w, rep.h, rep.d]);

	if (length === 0) return null;

	return (
		<mesh position={[rep.x, rep.y, rep.z]} quaternion={quaternion}>
			<cylinderGeometry
				args={[LINE_RADIUS, LINE_RADIUS, length, LINE_RADIAL_SEGMENTS]}
			/>
			<meshStandardMaterial
				color={color}
				transparent={opacity < 1}
				opacity={opacity}
			/>
		</mesh>
	);
}
