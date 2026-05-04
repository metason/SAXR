'use client';
/**
 * @module PanelPlane
 * Renders a SAXR panel (`xy`, `-xy`, `zy`, `-zy`, `xz`, `lc=…`) as a textured quad.
 * Wall panels use camera-based frustum culling to hide back-facing sides.
 * Equivalent of DataViz.CreatePanel() in DataViz.cs.
 */

import React, { useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { DataRep } from '@/lib/types';
import { resolveAssetUrl } from '@/lib/assetUrl';
import { getPanelOrientation } from '@/lib/panelOrientation';
import { useVizContext } from '@/context/VizContext';

/** Inner component that loads a texture and renders the oriented panel mesh. */
function PanelWithTexture({
	rep,
	textureUrl,
}: {
	rep: DataRep;
	textureUrl: string;
}) {
	const meshRef = useRef<THREE.Mesh>(null);
	const typeLower = rep.type.toLowerCase();

	// Is this a wall panel that needs camera-based visibility?
	const isWall =
		typeLower.startsWith('xy') ||
		typeLower.startsWith('-xy') ||
		typeLower.startsWith('zy') ||
		typeLower.startsWith('-zy');

	const { rotationY: rotY, horizontal } = getPanelOrientation(
		typeLower,
		rep.h,
		rep.d,
	);

	let scale: [number, number, number];
	let rotation: [number, number, number];
	const pos: [number, number, number] = [rep.x, rep.y + rep.h / 2, rep.z];

	if (horizontal) {
		scale = [rep.w, rep.d, 1];
		rotation = [-Math.PI / 2, 0, 0];
	} else {
		const h = rep.h > rep.d ? rep.h : rep.d;
		scale = [rep.w, h, 1];
		rotation = [0, rotY, 0];
	}

	// Pre-allocated vectors (avoids garbage collection pressure)
	const _normal = useMemo(() => new THREE.Vector3(), []);
	const _toCamera = useMemo(() => new THREE.Vector3(), []);

	// Wall panels: show only when the camera sees the front face.
	useFrame(({ camera }) => {
		if (!meshRef.current || !isWall) return;
		_normal.set(0, 0, 1).applyQuaternion(meshRef.current.quaternion);
		_toCamera.copy(camera.position).sub(meshRef.current.position);
		meshRef.current.visible = _toCamera.dot(_normal) > 0;
	});

	// Load texture manually to handle errors gracefully
	const [texture, setTexture] = useState<THREE.Texture | null>(null);
	const loader = useMemo(() => new THREE.TextureLoader(), []);

	useEffect(() => {
		if (!textureUrl) return;
		let loaded: THREE.Texture | null = null;
		loader.load(
			textureUrl,
			(tex) => {
				loaded = tex;
				setTexture(tex);
			},
			undefined,
			(err) => {
				console.warn(`[PanelPlane] Failed to load texture: ${textureUrl}`, err);
				setTexture(null);
			},
		);
		return () => {
			loaded?.dispose();
		};
	}, [textureUrl, loader]);

	return (
		<mesh ref={meshRef} position={pos} scale={scale} rotation={rotation}>
			<planeGeometry args={[1, 1]} />
			{texture ? (
				<meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} />
			) : (
				<meshBasicMaterial
					color="#cccccc"
					transparent
					opacity={0.3}
					side={THREE.DoubleSide}
				/>
			)}
		</mesh>
	);
}

/**
 * Panel component that resolves the asset URL and delegates to
 * {@link PanelWithTexture}. Returns `null` if the panel has no valid image asset.
 */
export default function PanelPlane({ rep }: { rep: DataRep }) {
	const { assetBasePath } = useVizContext();

	if (!rep.asset) {
		return null;
	}

	const url = resolveAssetUrl(rep.asset, assetBasePath);
	if (!url) return null;

	return <PanelWithTexture rep={rep} textureUrl={url} />;
}
