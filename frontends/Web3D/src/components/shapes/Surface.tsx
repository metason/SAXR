'use client';
/**
 * @module ShapeSurface
 * Renders a {@link DataRep} by loading an external `.ply` mesh file.
 * Supports vertex colors from the PLY or falls back to `rep.color`.
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { DataRep } from '@/lib/types';
import { useColor } from '@/hooks/useColor';

/**
 * PLY mesh loader. Resolves the `.ply` path from `rep.asset` relative to `assetBasePath`.
 * Returns `null` when `rep.asset` is missing (avoids loading an invalid URL).
 * @param props.rep - The DataRep (position, scale, color, asset path).
 * @param props.assetBasePath - URL base path for the current sample.
 */
export default function ShapeSurface({
	rep,
	assetBasePath,
	assetVersion,
}: {
	rep: DataRep;
	assetBasePath?: string;
	assetVersion?: number;
}) {
	if (!rep.asset) return null;
	return (
		<SurfaceInner
			rep={rep}
			assetBasePath={assetBasePath}
			assetVersion={assetVersion}
		/>
	);
}

/** Inner component that calls `useLoader` unconditionally (React hook rules). */
function SurfaceInner({
	rep,
	assetBasePath,
	assetVersion,
}: {
	rep: DataRep;
	assetBasePath?: string;
	assetVersion?: number;
}) {
	const { color, opacity } = useColor(rep.color);

	// Build the URL: strip $SERVER/ prefix, then resolve relative to assetBasePath.
	// rep.asset is guaranteed by the ShapeSurface guard above; `?? ''` satisfies the type.
	let assetFile = rep.asset ?? '';
	if (assetFile.startsWith('$SERVER/'))
		assetFile = assetFile.split('/').pop() || '';
	let url = `${assetBasePath || ''}/${assetFile}`;
	// Cache-bust so a re-run's regenerated mesh replaces the cached geometry.
	if (assetVersion) url += (url.includes('?') ? '&' : '?') + `v=${assetVersion}`;

	// useLoader fetches the .ply file and parses it into a BufferGeometry
	const geometry = useLoader(PLYLoader, url);

	// Check if the PLY has vertex colors and compute normals for proper lighting
	const hasVertexColors = useMemo(() => {
		geometry.computeVertexNormals();
		return !!geometry.attributes.color;
	}, [geometry]);

	return (
		<mesh>
			<primitive object={geometry} attach="geometry" />
			<meshStandardMaterial
				color={hasVertexColors ? undefined : color}
				vertexColors={hasVertexColors}
				transparent={opacity < 1}
				opacity={opacity}
				side={THREE.DoubleSide}
			/>
		</mesh>
	);
}
