'use client';
/**
 * @module DataVizCanvas
 * Main 3D viewport — R3F `<Canvas>` with OrbitControls, lighting, and scene rendering.
 * Equivalent of the Unity DataVizLoader scene setup.
 */

import React, { Suspense, useMemo, Component, ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Center, Grid, Html } from '@react-three/drei';
import { DataRep } from '@/lib/types';
import type { GapVector } from '@/lib/types';
import { classifyRep } from '@/components/shapes/registry';
import { VizProvider } from '@/context/VizContext';
import DataRepMesh from './DataRepMesh';
import PanelPlane from './PanelPlane';

// ── Scene defaults ──────────────────────────────────────────────────────────
/** Default XYZ gap between comparative scenes (metres): 2 m along X, none on Y/Z. */
const DEFAULT_GAP: GapVector = [2, 0, 0];
/** Y offset (metres) applied to the floating scene label above each comparative group. */
const LABEL_Y_LIFT = 0.5;

// ── Camera ───────────────────────────────────────────────────────────────────
const CAMERA_POSITION: [number, number, number] = [1.2, 0.8, 1.2];
const CAMERA_FOV = 50;
const CAMERA_NEAR = 0.01;
const CAMERA_FAR = 100;

// ── Lighting ─────────────────────────────────────────────────────────────────
const AMBIENT_INTENSITY = 0.6;
const KEY_LIGHT_INTENSITY = 0.8;
const FILL_LIGHT_INTENSITY = 0.3;

// ── Ground grid ──────────────────────────────────────────────────────────────
const GRID_SIZE = 10;
const GRID_CELL_SIZE = 0.1;
const GRID_SECTION_SIZE = 0.5;
const GRID_FADE_DISTANCE = 5;
/** Sink grid slightly below y=0 to avoid z-fighting with flat scene geometry. */
const GRID_Y_OFFSET = -0.01;

// ── Orbit controls ───────────────────────────────────────────────────────────
const ORBIT_DAMPING_FACTOR = 0.1;
const ORBIT_MIN_DISTANCE = 0.3;
const ORBIT_MAX_DISTANCE = 50;

/** Props for the {@link DataVizCanvas} component. */
interface DataVizCanvasProps {
	/** Single scene's DataRep objects — used for all non-comparative arrangements. */
	scene?: DataRep[];
	/** Multiple merged scenes for side-by-side rendering. `null` when not in comparative mode. */
	comparativeScenes?: DataRep[][] | null;
	/** XYZ offset between scenes in comparative mode (e.g. `[2, 0, 0]`). */
	gap?: GapVector;
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
	// gap[1] is reserved for vertical (LOD) stacking — always 0 in current arrangements
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
						<SceneContent scene={scene} />
						{labels?.[i] && (
							<Html center position={[0, LABEL_Y_LIFT, 0]}>
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

/** Partitions reps into shapes and panels, optionally centering the result. */
function SceneContent({
	scene,
	centered = false,
}: {
	scene: DataRep[];
	centered?: boolean;
}) {
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

	const content = (
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

	return centered ? <Center disableY>{content}</Center> : content;
}

/** Catches WebGL / Three.js crashes so the HUD remains usable. */
class CanvasErrorBoundary extends Component<
	{ children: ReactNode },
	{ hasError: boolean }
> {
	constructor(props: { children: ReactNode }) {
		super(props);
		this.state = { hasError: false };
	}
	static getDerivedStateFromError() {
		return { hasError: true };
	}
	render() {
		if (this.state.hasError) {
			return (
				<div className="flex items-center justify-center w-full h-full text-white/50 text-sm">
					3D rendering error — try reloading or selecting another sample.
				</div>
			);
		}
		return this.props.children;
	}
}

/** Main 3D canvas with camera, lighting, grid, and orbit controls. */
export default function DataVizCanvas({
	scene,
	comparativeScenes,
	gap = DEFAULT_GAP,
	sceneLabels,
	assetBasePath,
	columns,
}: DataVizCanvasProps) {
	return (
		<CanvasErrorBoundary>
			<Canvas
				camera={{
					position: CAMERA_POSITION,
					fov: CAMERA_FOV,
					near: CAMERA_NEAR,
					far: CAMERA_FAR,
				}}
				style={{ width: '100%', height: '100%' }}
				gl={{ antialias: true }}
			>
				<VizProvider assetBasePath={assetBasePath || ''}>
					{/* Lighting */}
					<ambientLight intensity={AMBIENT_INTENSITY} />
					<directionalLight
						position={[5, 5, 5]}
						intensity={KEY_LIGHT_INTENSITY}
					/>
					<directionalLight
						position={[-3, 3, -3]}
						intensity={FILL_LIGHT_INTENSITY}
					/>

					{/* Ground grid for spatial reference */}
					<Grid
						args={[GRID_SIZE, GRID_SIZE]}
						cellSize={GRID_CELL_SIZE}
						cellColor="#666666"
						sectionSize={GRID_SECTION_SIZE}
						sectionColor="#888888"
						fadeDistance={GRID_FADE_DISTANCE}
						infiniteGrid
						position={[0, GRID_Y_OFFSET, 0]}
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
							<SceneContent scene={scene ?? []} centered />
						)}
					</Suspense>

					{/* Camera controls */}
					<OrbitControls
						enableDamping
						dampingFactor={ORBIT_DAMPING_FACTOR}
						minDistance={ORBIT_MIN_DISTANCE}
						maxDistance={ORBIT_MAX_DISTANCE}
					/>
				</VizProvider>
			</Canvas>
		</CanvasErrorBoundary>
	);
}
