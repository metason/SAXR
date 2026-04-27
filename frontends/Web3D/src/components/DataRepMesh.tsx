'use client';
/**
 * @module DataRepMesh
 * Renders a single DataRep as a Three.js mesh using the shape registry.
 * Equivalent of DataViz.CreateDataRep() in DataViz.cs / createDataRep() in DataViz.swift.
 */

import React from 'react';
import { DataRep } from '@/lib/types';
import { useVizContext } from '@/context/VizContext';
import { SHAPE_REGISTRY } from './shapes/registry';
import ShapePyramid from './shapes/Pyramid';

/**
 * Dispatcher component that maps a {@link DataRep} to its shape component
 * via {@link SHAPE_REGISTRY}. Handles `pyramid_down` as a special case.
 */
export default function DataRepMesh({ rep }: { rep: DataRep }) {
	const { assetBasePath } = useVizContext();
	const t = rep.type.toLowerCase();

	// pyramid_down is a special case: same component with upsideDown prop
	if (t === 'pyramid_down') return <ShapePyramid rep={rep} upsideDown />;

	const Shape = SHAPE_REGISTRY[t];
	if (!Shape) return null; // encoding, text, panels — not rendered here

	return <Shape rep={rep} assetBasePath={assetBasePath} />;
}
