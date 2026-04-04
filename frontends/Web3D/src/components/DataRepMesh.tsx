'use client';
// DataRepMesh.tsx
// Renders a single DataRep as a Three.js mesh.
// Equivalent of DataViz.CreateDataRep() in DataViz.cs / createDataRep() in DataViz.swift.

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { DataRep } from '@/lib/types';
import { parseHexColor, parseKV } from '@/lib/vizLoader';

interface DataRepMeshProps {
	rep: DataRep;
}

/** Convert hex color to Three.js color + opacity */
function useColor(hex?: string) {
	return useMemo(() => {
		if (!hex) return { color: new THREE.Color(0.8, 0.8, 0.8), opacity: 1 };
		const { r, g, b, opacity } = parseHexColor(hex);
		return { color: new THREE.Color(r, g, b), opacity };
	}, [hex]);
}

// ── Shape Components ────────────────────────────────────

function ShapeSphere({ rep }: DataRepMeshProps) {
	const { color, opacity } = useColor(rep.color);
	return (
		<mesh position={[rep.x, rep.y, rep.z]} scale={[rep.w, rep.h, rep.d]}>
			<sphereGeometry args={[0.5, 16, 16]} />
			<meshStandardMaterial
				color={color}
				transparent={opacity < 1}
				opacity={opacity}
			/>
		</mesh>
	);
}

function ShapeBox({ rep }: DataRepMeshProps) {
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

function ShapeCylinder({ rep }: DataRepMeshProps) {
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

function ShapePyramid({
	rep,
	upsideDown,
}: DataRepMeshProps & { upsideDown?: boolean }) {
	const { color, opacity } = useColor(rep.color);
	// ConeGeometry(radius, height, segments)
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

function ShapeOctahedron({ rep }: DataRepMeshProps) {
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

function ShapePlus({ rep }: DataRepMeshProps) {
	const { color, opacity } = useColor(rep.color);
	const factor = 0.2;
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
			<mesh scale={[rep.w, rep.h * factor, rep.d * factor]}>
				<boxGeometry args={[1, 1, 1]} />
				{mat}
			</mesh>
			<mesh scale={[rep.w * factor, rep.h, rep.d * factor]}>
				<boxGeometry args={[1, 1, 1]} />
				{mat}
			</mesh>
			<mesh scale={[rep.w * factor, rep.h * factor, rep.d]}>
				<boxGeometry args={[1, 1, 1]} />
				{mat}
			</mesh>
		</group>
	);
}

function ShapeCross({ rep }: DataRepMeshProps) {
	const { color, opacity } = useColor(rep.color);
	const factor = 0.15;
	const pos: [number, number, number] = [rep.x, rep.y, rep.z];
	// Rotation from Swift: pi/6, pi/5, -pi/4 — same coords as SceneKit
	const rot: [number, number, number] = [
		Math.PI / 6,
		Math.PI / 5,
		-Math.PI / 4,
	];
	const mat = (
		<meshStandardMaterial
			color={color}
			transparent={opacity < 1}
			opacity={opacity}
		/>
	);
	return (
		<group position={pos} rotation={rot}>
			<mesh scale={[rep.w, rep.h * factor, rep.d * factor]}>
				<boxGeometry args={[1, 1, 1]} />
				{mat}
			</mesh>
			<mesh scale={[rep.w * factor, rep.h, rep.d * factor]}>
				<boxGeometry args={[1, 1, 1]} />
				{mat}
			</mesh>
			<mesh scale={[rep.w * factor, rep.h * factor, rep.d]}>
				<boxGeometry args={[1, 1, 1]} />
				{mat}
			</mesh>
		</group>
	);
}

function ShapePlane({ rep }: DataRepMeshProps) {
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

function ShapeArc({ rep }: DataRepMeshProps) {
	const { color, opacity } = useColor(rep.color);
	const kvs = parseKV(rep.asset || '');
	const ratio = kvs.ratio ? parseFloat(kvs.ratio) : 0.5;
	const startAngle = kvs.start ? parseFloat(kvs.start) : 0;
	const sweepAngle = kvs.angle ? parseFloat(kvs.angle) : 90;

	const geometry = useMemo(() => {
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

// ── Main DataRepMesh dispatcher ─────────────────────────

export default function DataRepMesh({ rep }: DataRepMeshProps) {
	const t = rep.type.toLowerCase();

	switch (t) {
		case 'sphere':
			return <ShapeSphere rep={rep} />;
		case 'box':
			return <ShapeBox rep={rep} />;
		case 'cylinder':
			return <ShapeCylinder rep={rep} />;
		case 'pyramid':
			return <ShapePyramid rep={rep} />;
		case 'pyramid_down':
			return <ShapePyramid rep={rep} upsideDown />;
		case 'octahedron':
			return <ShapeOctahedron rep={rep} />;
		case 'plus':
			return <ShapePlus rep={rep} />;
		case 'cross':
			return <ShapeCross rep={rep} />;
		case 'plane':
			return <ShapePlane rep={rep} />;
		case 'arc':
			return <ShapeArc rep={rep} />;
		case 'encoding':
			return null; // metadata only, not rendered
		case 'text':
			return null; // TODO: implement 3D text with troika-three-text or drei <Text>
		default:
			return null; // Panels handled by PanelPlane
	}
}
