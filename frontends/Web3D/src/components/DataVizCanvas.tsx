'use client';
/**
 * @module DataVizCanvas
 * Main 3D viewport — R3F `<Canvas>` with OrbitControls, lighting, and scene rendering.
 * Equivalent of the Unity DataVizLoader scene setup.
 */

import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Center, Grid, Html } from '@react-three/drei';
import { DataRep } from '@/lib/types';
import { classifyRep } from '@/lib/vizLoader';
import { VizProvider } from '@/context/VizContext';
import DataRepMesh from './DataRepMesh';
import PanelPlane from './PanelPlane';

/** Props for the {@link DataVizCanvas} component. */
interface DataVizCanvasProps {
	/** Single scene's DataRep objects — used for all non-comparative arrangements. */
	scene?: DataRep[];
	/** Multiple merged scenes for side-by-side rendering. `null` when not in comparative mode. */
	comparativeScenes?: DataRep[][] | null;
	/** XYZ offset between scenes in comparative mode (e.g. `[2, 0, 0]`). */
	gap?: number[];
	/** Per-scene labels shown floating above each scene in comparative mode (e.g. year strings). */
	sceneLabels?: string[];
	/** Base path for resolving panel image assets. */
	assetBasePath?: string;
	/** Number of columns in the comparative grid. If omitted, computed from scene count. */
	columns?: number;
}

/**
 * Renders scenes in a centered grid along X and Z axes.
 * Column count is driven by `columns` prop (from `specs.sequence.columns`) or computed
 * automatically as `ceil(sqrt(n))` so the grid stays roughly square.
 * `gap[0]` = column spacing (X axis), `gap[2]` = row spacing (Z axis).
 * Each scene is positioned so the whole grid is centered at the origin.
 */
function ComparativeContent({
	scenes,
	gap,
	labels,
	columns,
}: {
	scenes: DataRep[][];
	gap: number[];
	labels?: string[];
	columns?: number;
}) {
	const n = scenes.length;
	const cols = columns ?? Math.ceil(Math.sqrt(n));
	const rows = Math.ceil(n / cols);
	const totalWidth = (cols - 1) * gap[0];
	const totalDepth = (rows - 1) * (gap[2] ?? 0);
	const totalHeight = (rows - 1) * (gap[1] ?? 0);

	return (
		<>
			{scenes.map((scene, i) => {
				// Converts a flat index i into a 2D grid position
				const col = i % cols;
				const row = Math.floor(i / cols);
				const x = col * gap[0] - totalWidth / 2;
				const y = row * (gap[1] ?? 0) - totalHeight / 2;
				const z = row * (gap[2] ?? 0) - totalDepth / 2;
				return (
					<group key={i} position={[x, y, z]}>
						<SceneContentRaw scene={scene} />
						{labels?.[i] && (
							<Html center position={[0, 0.5, 0]}>
								<div
									style={{
										color: 'white',
										fontSize: '13px',
										fontWeight: 600,
										whiteSpace: 'nowrap',
										textShadow: '0 1px 6px rgba(0,0,0,1)',
										pointerEvents: 'none',
									}}
								>
									{labels[i]}
								</div>
							</Html>
						)}
					</group>
				);
			})}
		</>
	);
}

/** Renders shapes and panels without any centering — used inside comparative groups. */
function SceneContentRaw({ scene }: { scene: DataRep[] }) {
	const { shapes, panels } = useMemo(() => {
		const shapes: DataRep[] = [];
		const panels: DataRep[] = [];
		for (const rep of scene) {
			const cat = classifyRep(rep);
			if (cat === 'shape') shapes.push(rep);
			else if (cat === 'panel') panels.push(rep);
		}
		return { shapes, panels };
	}, [scene]);

	return (
		<>
			{shapes.map((rep, i) => (
				<DataRepMesh
					key={`shape-${rep.type}-${rep.x}-${rep.y}-${rep.z}-${i}`}
					rep={rep}
				/>
			))}
			{panels.map((rep, i) => (
				<PanelPlane key={`panel-${rep.x}-${rep.y}-${rep.z}-${i}`} rep={rep} />
			))}
		</>
	);
}

/** Inner scene renderer that partitions reps into shapes and panels. */
function SceneContent({ scene }: { scene: DataRep[] }) {
	const { shapes, panels } = useMemo(() => {
		const shapes: DataRep[] = [];
		const panels: DataRep[] = [];
		for (const rep of scene) {
			const cat = classifyRep(rep);
			if (cat === 'shape') shapes.push(rep);
			else if (cat === 'panel') panels.push(rep);
		}
		return { shapes, panels };
	}, [scene]);

	return (
		<Center disableY>
			{shapes.map((rep, i) => (
				<DataRepMesh
					key={`shape-${rep.type}-${rep.x}-${rep.y}-${rep.z}-${i}`}
					rep={rep}
				/>
			))}
			{panels.map((rep, i) => (
				<PanelPlane key={`panel-${rep.x}-${rep.y}-${rep.z}-${i}`} rep={rep} />
			))}
		</Center>
	);
}

/** Main 3D canvas with camera, lighting, grid, and orbit controls. */
export default function DataVizCanvas({
	scene,
	comparativeScenes,
	gap = [2, 0, 0],
	sceneLabels,
	assetBasePath,
	columns,
}: DataVizCanvasProps) {
	return (
		<Canvas
			camera={{ position: [1.2, 0.8, 1.2], fov: 50, near: 0.01, far: 100 }}
			style={{ width: '100%', height: '100%' }}
			gl={{ antialias: true }}
		>
			<VizProvider assetBasePath={assetBasePath || ''}>
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
					{comparativeScenes ? (
						<ComparativeContent
							scenes={comparativeScenes}
							gap={gap}
							labels={sceneLabels}
							columns={columns}
						/>
					) : (
						<SceneContent scene={scene ?? []} />
					)}
				</Suspense>

				{/* Camera controls */}
				<OrbitControls
					enableDamping
					dampingFactor={0.1}
					minDistance={0.3}
					maxDistance={50}
				/>
			</VizProvider>
		</Canvas>
	);
}
