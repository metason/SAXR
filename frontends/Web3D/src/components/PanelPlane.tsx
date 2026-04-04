'use client';
// PanelPlane.tsx
// Renders a SAXR panel (xy, -xy, zy, -zy, xz, lc=...) as a textured quad.
// Equivalent of DataViz.CreatePanel() in DataViz.cs.

import React, { useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { DataRep } from '@/lib/types';

interface PanelPlaneProps {
	rep: DataRep;
	/** Base URL/path for resolving panel image assets */
	assetBasePath: string;
}

/**
 * Resolve the asset URL for a panel.
 * datareps.json uses "$SERVER/run/vis/xy.png" style paths — we replace $SERVER
 * with the actual base path.
 */
function resolveAssetUrl(asset: string, basePath: string): string {
	if (!asset) return '';
	// Skip non-image assets (e.g. specs.json)
	if (!asset.match(/\.(png|jpg|jpeg|webp)$/i)) return '';
	// Replace $SERVER/run/vis/ prefix — keep just the filename
	if (asset.startsWith('$SERVER/')) {
		const filename = asset.split('/').pop() || '';
		return basePath + '/' + filename;
	}
	// Already absolute URL
	if (
		asset.startsWith('http://') ||
		asset.startsWith('https://') ||
		asset.startsWith('/')
	) {
		return asset;
	}
	return basePath + '/' + asset;
}

function PanelWithTexture({
	rep,
	textureUrl,
}: {
	rep: DataRep;
	textureUrl: string;
}) {
	const typeLower = rep.type.toLowerCase();

	// Determine orientation
	let rotY = 0;
	let horizontal = false;

	if (typeLower.startsWith('-xy')) rotY = Math.PI;
	else if (typeLower.startsWith('-zy')) rotY = Math.PI / 2;
	else if (typeLower.startsWith('zy')) rotY = -Math.PI / 2;
	else if (typeLower.startsWith('xz')) horizontal = true;
	else if (typeLower.startsWith('l') && typeLower.includes('='))
		horizontal = true;

	// Generic flat-panel detection: h==0 with non-zero d means
	// the panel lies on the XZ ground plane (e.g. flag images in eco).
	if (!horizontal && rep.h === 0 && rep.d > 0) horizontal = true;

	let scale: [number, number, number];
	let rotation: [number, number, number];
	const pos: [number, number, number] = [rep.x, rep.y + rep.h / 2, rep.z];

	if (horizontal) {
		scale = [rep.w, rep.d, 1];
		rotation = [-Math.PI / 2, 0, 0];
	} else {
		const h = rep.h > rep.d ? rep.h : rep.d;
		scale = [rep.w, h, 1];
		// Three.js is right-handed like SceneKit — use rotation directly
		rotation = [0, rotY, 0];
	}

	// Load texture manually to handle errors gracefully
	const [texture, setTexture] = useState<THREE.Texture | null>(null);
	const loader = useMemo(() => new THREE.TextureLoader(), []);

	useEffect(() => {
		if (!textureUrl) return;
		loader.load(
			textureUrl,
			(tex) => setTexture(tex),
			undefined,
			() => setTexture(null), // silently ignore load errors
		);
		return () => {
			if (texture) texture.dispose();
		};
	}, [textureUrl, loader]);

	return (
		<mesh position={pos} scale={scale} rotation={rotation}>
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
 * Wrapper that only renders if the panel has a valid asset URL.
 * For browser viewing, skip vertical wall panels (xy, -xy, zy, -zy)
 * that would obstruct the view — only keep floor (xz) and legend panels.
 * In VR (Swift/Unity) all walls are needed since the user is inside the cube,
 * but in a browser you look in from outside.
 */
export default function PanelPlane({ rep, assetBasePath }: PanelPlaneProps) {
	if (!rep.asset) {
		return null;
	}

	// Skip vertical wall panels — they block the 3D scatter plot in browser view
	const t = rep.type.toLowerCase();
	if (t === '-xy' || t === '-zy') {
		return null;
	}

	const url = resolveAssetUrl(rep.asset, assetBasePath);
	if (!url) return null;

	return <PanelWithTexture rep={rep} textureUrl={url} />;
}
