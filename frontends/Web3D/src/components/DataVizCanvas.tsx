'use client';
// DataVizCanvas.tsx
// Main 3D viewport — R3F <Canvas> with OrbitControls, lighting, and scene rendering.
// Equivalent of the Unity DataVizLoader scene setup.

import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Center, Grid } from '@react-three/drei';
import { DataRep } from '@/lib/types';
import { classifyRep } from '@/lib/vizLoader';
import DataRepMesh from './DataRepMesh';
import PanelPlane from './PanelPlane';

interface DataVizCanvasProps {
	/** One scene's worth of DataRep objects */
	scene: DataRep[];
	/** Base path for resolving panel image assets */
	assetBasePath?: string;
}

function SceneContent({ scene, assetBasePath }: DataVizCanvasProps) {
	const { shapes, panels } = useMemo(() => {
		const shapes: DataRep[] = [];
		const panels: DataRep[] = [];
		for (const rep of scene) {
			const cat = classifyRep(rep);
			if (cat === 'shape') shapes.push(rep);
			else if (cat === 'panel') panels.push(rep);
			// encoding & text: skip for now
		}
		return { shapes, panels };
	}, [scene]);

	return (
		<Center disableY>
			{shapes.map((rep, i) => (
				<DataRepMesh key={`shape-${i}`} rep={rep} />
			))}
			{panels.map((rep, i) => (
				<PanelPlane
					key={`panel-${i}`}
					rep={rep}
					assetBasePath={assetBasePath || ''}
				/>
			))}
		</Center>
	);
}

export default function DataVizCanvas({
	scene,
	assetBasePath,
}: DataVizCanvasProps) {
	return (
		<Canvas
			camera={{ position: [1.2, 0.8, 1.2], fov: 50, near: 0.01, far: 100 }}
			style={{ width: '100%', height: '100%' }}
			gl={{ antialias: true }}
		>
			{/* Lighting */}
			<ambientLight intensity={0.6} />
			<directionalLight position={[5, 5, 5]} intensity={0.8} />
			<directionalLight position={[-3, 3, -3]} intensity={0.3} />

			{/* Ground grid for spatial reference */}
			<Grid
				args={[10, 10]}
				cellSize={0.1}
				cellColor="#666666"
				sectionSize={0.5}
				sectionColor="#888888"
				fadeDistance={5}
				infiniteGrid
				position={[0, -0.01, 0]}
			/>

			{/* Data visualization */}
			<Suspense fallback={null}>
				<SceneContent scene={scene} assetBasePath={assetBasePath} />
			</Suspense>

			{/* Camera controls */}
			<OrbitControls
				enableDamping
				dampingFactor={0.1}
				minDistance={0.3}
				maxDistance={50}
			/>
		</Canvas>
	);
}
