'use client';

import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

type V3 = [number, number, number];

/* Mirrors the real PanelPlane: each wall is a quad rotated around Y by rotationY.
   Its local +Z face is the textured front. Only the 4 vertical walls are culled;
   the floor (xz) is never culled — exactly like getPanelOrientation(). */
const WALLS: Array<{ id: string; name: string; type: string; rotY: number; pos: V3 }> = [
	{ id: 'xy',  name: 'Back wall',  type: 'xy',  rotY: 0,          pos: [0, 0, -0.75] },
	{ id: '-xy', name: 'Front wall', type: '-xy', rotY: Math.PI,    pos: [0, 0, 0.75]  },
	{ id: '-zy', name: 'Left wall',  type: '-zy', rotY: Math.PI/2,  pos: [-0.75, 0, 0] },
	{ id: 'zy',  name: 'Right wall', type: 'zy',  rotY: -Math.PI/2, pos: [0.75, 0, 0]  },
];

/** Static world-space front normal of a wall = local (0,0,1) rotated by rotY. */
function wallNormal(rotY: number): THREE.Vector3 {
	const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY, 0));
	return new THREE.Vector3(0, 0, 1).applyQuaternion(q);
}

const FLOOR_POS: V3 = [0, -0.75, 0];

const BARS: Array<{ pos: V3; h: number; color: string }> = [
	{ pos: [-0.3, -0.75, -0.15], h: 0.55, color: '#3b82f6' },
	{ pos: [ 0.0, -0.75, -0.15], h: 0.85, color: '#3b82f6' },
	{ pos: [ 0.3, -0.75, -0.15], h: 0.40, color: '#3b82f6' },
	{ pos: [-0.3, -0.75,  0.15], h: 0.70, color: '#f97316' },
	{ pos: [ 0.0, -0.75,  0.15], h: 0.45, color: '#f97316' },
	{ pos: [ 0.3, -0.75,  0.15], h: 1.00, color: '#f97316' },
];

type PanelInfo = { visible: boolean; dot: number; cos: number; angle: number };

/* One vertical wall — culling logic copied verbatim from PanelPlane.tsx */
function Wall({ wall, cullEnabled, selected, onInfo }: {
	wall: typeof WALLS[0];
	cullEnabled: boolean;
	selected: boolean;
	onInfo: (id: string, info: PanelInfo) => void;
}) {
	const meshRef = useRef<THREE.Mesh>(null!);
	const matRef  = useRef<THREE.MeshBasicMaterial>(null!);

	// pre-allocated — avoids GC pressure (same as the real component)
	const _normal   = useMemo(() => new THREE.Vector3(), []);
	const _toCamera = useMemo(() => new THREE.Vector3(), []);

	useFrame(({ camera }) => {
		if (!meshRef.current || !matRef.current) return;
		_normal.set(0, 0, 1).applyQuaternion(meshRef.current.quaternion);
		_toCamera.copy(camera.position).sub(meshRef.current.position);
		const dot = _toCamera.dot(_normal);
		const visible = dot > 0;
		const len = _toCamera.length();
		const cos = len > 0 ? dot / len : 0; // _normal is unit length
		const angle = Math.acos(THREE.MathUtils.clamp(cos, -1, 1)) * 180 / Math.PI;

		if (cullEnabled) {
			meshRef.current.visible = visible;
			matRef.current.color.set(selected ? '#a78bfa' : '#cbd5e1');
			matRef.current.opacity = selected ? 0.6 : 0.5;
		} else {
			meshRef.current.visible = true;
			matRef.current.color.set(visible ? (selected ? '#a78bfa' : '#cbd5e1') : '#ef4444');
			matRef.current.opacity = visible ? (selected ? 0.6 : 0.5) : 0.92;
		}
		onInfo(wall.id, { visible, dot, cos, angle });
	});

	return (
		<mesh ref={meshRef} position={wall.pos} rotation={[0, wall.rotY, 0]}>
			<planeGeometry args={[1.5, 1.5]} />
			<meshBasicMaterial ref={matRef} color="#cbd5e1" transparent opacity={0.5} side={THREE.DoubleSide} />
			<lineSegments>
				<edgesGeometry args={[new THREE.PlaneGeometry(1.5, 1.5)]} />
				<lineBasicMaterial color={selected ? '#a78bfa' : '#64748b'} transparent opacity={selected ? 0.9 : 0.6} />
			</lineSegments>
		</mesh>
	);
}

/* Two arrows on the selected wall: its normal (green) and toCamera (cyan). */
function SelectedVectors({ wall }: { wall: typeof WALLS[0] }) {
	const origin = useMemo(() => new THREE.Vector3(...wall.pos), [wall]);
	const normal = useMemo(() => wallNormal(wall.rotY), [wall]);

	const normalArrow = useMemo(
		() => new THREE.ArrowHelper(normal, origin, 1.0, 0x4ade80, 0.18, 0.1),
		[normal, origin],
	);
	const camArrow = useMemo(
		() => new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), origin, 1.0, 0x22d3ee, 0.18, 0.1),
		[origin],
	);

	const _dir = useMemo(() => new THREE.Vector3(), []);
	useFrame(({ camera }) => {
		_dir.copy(camera.position).sub(origin);
		const len = _dir.length();
		_dir.normalize();
		camArrow.setDirection(_dir);
		camArrow.setLength(Math.min(len, 1.4), 0.18, 0.1);
	});

	return (
		<>
			<primitive object={normalArrow} />
			<primitive object={camArrow} />
		</>
	);
}

function Scene({ cullEnabled, selectedId, onStates }: {
	cullEnabled: boolean;
	selectedId: string;
	onStates: (s: Record<string, PanelInfo>) => void;
}) {
	const buf  = useRef<Record<string, PanelInfo>>({});
	const tick = useRef(0);
	const selectedWall = WALLS.find((w) => w.id === selectedId)!;

	useFrame(() => {
		tick.current++;
		if (tick.current % 3 === 0) onStates({ ...buf.current });
	});

	return (
		<>
			<ambientLight intensity={0.85} />
			<directionalLight position={[3, 5, 3]} intensity={0.6} />

			{/* floor — never culled (xz panel), always visible */}
			<mesh position={FLOOR_POS} rotation={[-Math.PI / 2, 0, 0]}>
				<planeGeometry args={[1.5, 1.5]} />
				<meshBasicMaterial color="#1e293b" transparent opacity={0.6} side={THREE.DoubleSide} />
				<lineSegments>
					<edgesGeometry args={[new THREE.PlaneGeometry(1.5, 1.5)]} />
					<lineBasicMaterial color="#475569" transparent opacity={0.6} />
				</lineSegments>
			</mesh>

			{/* data bars */}
			{BARS.map((b, i) => (
				<mesh key={i} position={[b.pos[0], b.pos[1] + b.h / 2, b.pos[2]]}>
					<boxGeometry args={[0.2, b.h, 0.2]} />
					<meshStandardMaterial color={b.color} />
				</mesh>
			))}

			{WALLS.map((w) => (
				<Wall key={w.id} wall={w} cullEnabled={cullEnabled} selected={w.id === selectedId}
					onInfo={(id, info) => { buf.current[id] = info; }} />
			))}

			<SelectedVectors wall={selectedWall} />

			<OrbitControls enablePan={false} minDistance={2.5} maxDistance={6} />
		</>
	);
}

/* 2D gauge: normal fixed pointing right, toCamera at angle θ, 90° threshold line. */
function AngleGauge({ angle, cos }: { angle: number; cos: number }) {
	const cx = 90, cy = 70, r = 52;
	const rad = (angle * Math.PI) / 180;
	// normal points right (+x); toCamera rotated up by θ
	const nx = cx + r, ny = cy;
	const tx = cx + r * Math.cos(rad), ty = cy - r * Math.sin(rad);
	const pass = cos > 0;
	const col = pass ? '#4ade80' : '#f87171';

	// arc path for the angle
	const arcR = 22;
	const ax = cx + arcR, ay = cy;
	const bx = cx + arcR * Math.cos(rad), by = cy - arcR * Math.sin(rad);
	const largeArc = angle > 180 ? 1 : 0;

	return (
		<svg viewBox="0 0 180 140" style={{ width: '100%', height: 'auto' }}>
			{/* 90° threshold (perpendicular to normal) */}
			<line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />
			<text x={cx + 3} y={cy - r + 2} fill="#475569" fontSize="8" fontFamily="monospace">90°</text>

			{/* angle arc */}
			<path d={`M ${ax} ${ay} A ${arcR} ${arcR} 0 ${largeArc} 0 ${bx} ${by}`} fill="none" stroke={col} strokeWidth="1.5" />

			{/* normal arrow (green) — fixed, pointing right */}
			<line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#4ade80" strokeWidth="2.5" />
			<polygon points={`${nx},${ny} ${nx-7},${ny-4} ${nx-7},${ny+4}`} fill="#4ade80" />
			<text x={nx - 4} y={ny + 14} fill="#4ade80" fontSize="9" fontFamily="monospace">normal</text>

			{/* toCamera arrow (cyan) — rotated by θ */}
			<line x1={cx} y1={cy} x2={tx} y2={ty} stroke="#22d3ee" strokeWidth="2.5" />
			<polygon points={`${tx},${ty} ${tx - 7*Math.cos(rad-0.5)},${ty + 7*Math.sin(rad-0.5)} ${tx - 7*Math.cos(rad+0.5)},${ty + 7*Math.sin(rad+0.5)}`} fill="#22d3ee" />
			<text x={tx - 6} y={ty - 6} fill="#22d3ee" fontSize="9" fontFamily="monospace">toCamera</text>

			{/* angle + cos readout */}
			<text x={cx} y={cy + r + 18} fill={col} fontSize="11" fontFamily="monospace" fontWeight="700" textAnchor="middle">
				θ = {angle.toFixed(0)}°  ·  cos = {cos.toFixed(2)}
			</text>
		</svg>
	);
}

function CullingView() {
	const [cullEnabled, setCullEnabled] = useState(true);
	const [selectedId, setSelectedId] = useState('xy');
	const [panelStates, setPanelStates] = useState<Record<string, PanelInfo>>({});

	const hiddenCount = WALLS.filter((w) => panelStates[w.id] && !panelStates[w.id].visible).length;
	const sel = panelStates[selectedId];

	return (
		<div style={{ display: 'flex', height: '100%', minHeight: 540, background: '#0a0d14', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>

			<div style={{ flex: 1, position: 'relative' }}>
				<Canvas camera={{ position: [2.6, 2.0, 2.8], fov: 40 }}>
					<Scene cullEnabled={cullEnabled} selectedId={selectedId} onStates={setPanelStates} />
				</Canvas>
				<div style={{ position: 'absolute', top: 12, left: 14, fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'system-ui' }}>
					drag to orbit · <span style={{ color: '#4ade80' }}>green = normal</span> · <span style={{ color: '#22d3ee' }}>cyan = toCamera</span>
				</div>
			</div>

			<div style={{ width: 256, background: '#0d1018', borderLeft: '1px solid rgba(255,255,255,0.06)', padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>

				{/* angle gauge for the selected wall */}
				<div style={{ background: '#0a0d14', borderRadius: 8, padding: '10px 8px 4px', border: '1px solid rgba(255,255,255,0.05)' }}>
					<div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#a78bfa', marginBottom: 2, paddingLeft: 6 }}>
						{WALLS.find((w) => w.id === selectedId)!.name} — angle
					</div>
					<AngleGauge angle={sel?.angle ?? 0} cos={sel?.cos ?? 1} />
					<div style={{ fontSize: 11, color: sel && sel.cos > 0 ? '#4ade80' : '#f87171', fontWeight: 700, textAlign: 'center', padding: '2px 0 6px' }}>
						{sel && sel.cos > 0 ? 'θ < 90° → cos > 0 → SHOW' : 'θ > 90° → cos ≤ 0 → HIDE'}
					</div>
				</div>

				<button onClick={() => setCullEnabled((v) => !v)} style={{
					background: cullEnabled ? '#14532d33' : '#7f1d1d33',
					border: `1px solid ${cullEnabled ? '#22c55e' : '#ef4444'}`,
					color: cullEnabled ? '#4ade80' : '#f87171',
					padding: '10px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 700, textAlign: 'left',
				}}>
					{cullEnabled ? 'Culling: ON' : 'Culling: OFF'}
					<div style={{ fontWeight: 400, fontSize: 11, opacity: 0.85, marginTop: 3, lineHeight: 1.4 }}>
						{cullEnabled
							? `${hiddenCount} near wall${hiddenCount !== 1 ? 's' : ''} hidden`
							: 'red walls cover the bars'}
					</div>
				</button>

				<div>
					<div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b', marginBottom: 6 }}>
						click a wall to inspect
					</div>
					{WALLS.map((w) => {
						const info = panelStates[w.id];
						const visible = info?.visible ?? true;
						const isSel = w.id === selectedId;
						return (
							<button key={w.id} onClick={() => setSelectedId(w.id)} style={{
								display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
								padding: '7px 8px', borderRadius: 6, marginBottom: 3, cursor: 'pointer',
								background: isSel ? 'rgba(167,139,250,0.12)' : 'transparent',
								border: `1px solid ${isSel ? '#a78bfa66' : 'rgba(255,255,255,0.05)'}`,
							}}>
								<div style={{ flex: 1 }}>
									<div style={{ fontSize: 12, fontWeight: 600, color: visible ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)' }}>
										{w.name} <span style={{ fontFamily: 'monospace', fontWeight: 400, fontSize: 10, opacity: 0.5 }}>{w.type}</span>
									</div>
									<div style={{ fontSize: 11, fontFamily: 'monospace', color: visible ? '#4ade80' : '#f87171', fontWeight: 700 }}>
										dot {(info?.dot ?? 0).toFixed(2)}
									</div>
								</div>
								<div style={{ fontSize: 11, fontWeight: 700, color: visible ? '#4ade80' : '#f87171' }}>
									{visible ? 'show' : 'hide'}
								</div>
							</button>
						);
					})}
					<div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.3)', marginTop: 6, lineHeight: 1.5 }}>
						Floor (xz) is never culled — always visible.
					</div>
				</div>

			</div>
		</div>
	);
}

/* ─────────────────────────────────────────────────────────────
   ORIENTATION VIEW — visualises getPanelOrientation():
   a type string → { rotationY, horizontal }. One quad snaps to the
   orientation the pure function returns; position comes from the data.
   ───────────────────────────────────────────────────────────── */

const ORIENT_TYPES: Array<{ type: string; rotY: number; horizontal: boolean; wall: string; pos: V3 }> = [
	{ type: 'xy',         rotY: 0,          horizontal: false, wall: 'Back wall',  pos: [0, 0, -0.75] },
	{ type: '-xy',        rotY: Math.PI,    horizontal: false, wall: 'Front wall', pos: [0, 0, 0.75]  },
	{ type: 'zy',         rotY: -Math.PI/2, horizontal: false, wall: 'Right wall', pos: [0.75, 0, 0]  },
	{ type: '-zy',        rotY: Math.PI/2,  horizontal: false, wall: 'Left wall',  pos: [-0.75, 0, 0] },
	{ type: 'xz',         rotY: 0,          horizontal: true,  wall: 'Floor',      pos: [0, -0.75, 0] },
	{ type: 'lc=legend',  rotY: 0,          horizontal: true,  wall: 'Legend',     pos: [0, -0.74, 0.4] },
];

function OrientedQuad({ target }: { target: typeof ORIENT_TYPES[0] }) {
	const meshRef = useRef<THREE.Mesh>(null!);
	const arrowRef = useRef<THREE.ArrowHelper>(null!);
	const targetQuat = useMemo(() => {
		const e = target.horizontal
			? new THREE.Euler(-Math.PI / 2, 0, 0)
			: new THREE.Euler(0, target.rotY, 0);
		return new THREE.Quaternion().setFromEuler(e);
	}, [target]);
	const targetPos = useMemo(() => new THREE.Vector3(...target.pos), [target]);

	const arrow = useMemo(
		() => new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(), 0.7, 0x4ade80, 0.16, 0.09),
		[],
	);
	const _n = useMemo(() => new THREE.Vector3(), []);

	// smoothly slerp/lerp toward the orientation the function returns
	useFrame(() => {
		if (!meshRef.current) return;
		meshRef.current.quaternion.slerp(targetQuat, 0.18);
		meshRef.current.position.lerp(targetPos, 0.18);
		// normal arrow follows the quad's front face
		_n.set(0, 0, 1).applyQuaternion(meshRef.current.quaternion);
		arrow.position.copy(meshRef.current.position);
		arrow.setDirection(_n);
	});

	return (
		<>
			<mesh ref={meshRef} position={target.pos}>
				<planeGeometry args={[1.4, 1.4]} />
				<meshBasicMaterial color="#a78bfa" transparent opacity={0.55} side={THREE.DoubleSide} />
				<lineSegments>
					<edgesGeometry args={[new THREE.PlaneGeometry(1.4, 1.4)]} />
					<lineBasicMaterial color="#c4b5fd" transparent opacity={0.9} />
				</lineSegments>
			</mesh>
			<primitive ref={arrowRef} object={arrow} />
		</>
	);
}

function OrientScene({ target }: { target: typeof ORIENT_TYPES[0] }) {
	return (
		<>
			<ambientLight intensity={0.85} />
			<directionalLight position={[3, 5, 3]} intensity={0.6} />

			{/* faint box for spatial reference */}
			<lineSegments>
				<edgesGeometry args={[new THREE.BoxGeometry(1.5, 1.5, 1.5)]} />
				<lineBasicMaterial color="#1e293b" transparent opacity={0.5} />
			</lineSegments>

			{/* axes */}
			{([
				{ from: [-0.75, -0.75, -0.75] as V3, to: [1.0, -0.75, -0.75] as V3, color: '#f87171' },
				{ from: [-0.75, -0.75, -0.75] as V3, to: [-0.75, 1.0, -0.75] as V3, color: '#4ade80' },
				{ from: [-0.75, -0.75, -0.75] as V3, to: [-0.75, -0.75, 1.0] as V3, color: '#60a5fa' },
			]).map(({ from, to, color }) => (
				<line key={color}>
					<bufferGeometry>
						<bufferAttribute attach="attributes-position" args={[new Float32Array([...from, ...to]), 3]} />
					</bufferGeometry>
					<lineBasicMaterial color={color} />
				</line>
			))}

			<OrientedQuad target={target} />
			<OrbitControls enablePan={false} minDistance={2.5} maxDistance={6} />
		</>
	);
}

function OrientationView() {
	const [typeStr, setTypeStr] = useState('xy');
	const target = ORIENT_TYPES.find((t) => t.type === typeStr)!;

	return (
		<div style={{ display: 'flex', height: '100%', minHeight: 540, background: '#0a0d14', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
			<div style={{ flex: 1, position: 'relative' }}>
				<Canvas camera={{ position: [2.6, 2.0, 2.8], fov: 40 }}>
					<OrientScene target={target} />
				</Canvas>
				<div style={{ position: 'absolute', top: 12, left: 14, fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'system-ui' }}>
					drag to orbit · <span style={{ color: '#4ade80' }}>green = front-face normal</span>
				</div>
			</div>

			<div style={{ width: 256, background: '#0d1018', borderLeft: '1px solid rgba(255,255,255,0.06)', padding: '16px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
				<p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0 }}>
					Pick a panel <strong style={{ color: '#fff' }}>type string</strong>. <code style={{ color: '#a78bfa', fontFamily: 'monospace' }}>getPanelOrientation()</code> maps it to a rotation — watch the quad snap into place.
				</p>

				{/* type picker */}
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
					{ORIENT_TYPES.map((t) => (
						<button key={t.type} onClick={() => setTypeStr(t.type)} style={{
							fontFamily: 'monospace', fontSize: 12, fontWeight: 700,
							padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
							background: typeStr === t.type ? 'rgba(167,139,250,0.18)' : 'rgba(255,255,255,0.04)',
							border: `1px solid ${typeStr === t.type ? '#a78bfa' : 'rgba(255,255,255,0.1)'}`,
							color: typeStr === t.type ? '#c4b5fd' : 'rgba(255,255,255,0.6)',
						}}>
							{t.type}
						</button>
					))}
				</div>

				{/* lookup result */}
				<div style={{ background: '#0a0d14', borderRadius: 8, padding: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
					<div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#a78bfa', marginBottom: 8 }}>
						returns
					</div>
					<div style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 1.9, color: 'rgba(255,255,255,0.75)' }}>
						<div>rotationY: <span style={{ color: '#fbbf24' }}>{target.horizontal ? '0' : fmtRad(target.rotY)}</span></div>
						<div>horizontal: <span style={{ color: target.horizontal ? '#4ade80' : '#f87171' }}>{String(target.horizontal)}</span></div>
					</div>
					<div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 8, paddingTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
						→ {target.wall}
						{target.horizontal && <span style={{ color: 'rgba(255,255,255,0.4)' }}> (flat on ground)</span>}
					</div>
				</div>

				{/* notes */}
				<div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
					{target.type === 'xz' && 'The floor lies flat — rotated −90° about X, never culled.'}
					{target.type === 'lc=legend' && 'Legend images (lc=…) are also horizontal and never culled.'}
					{!target.horizontal && 'Vertical wall — its front-face normal (green) is what the dot-product cull tests.'}
				</div>

				<div style={{ background: '#0a0d14', borderRadius: 8, padding: 11, fontFamily: 'monospace', fontSize: 10.5, lineHeight: 1.7, color: '#64748b', border: '1px solid rgba(255,255,255,0.05)' }}>
					<span style={{ color: '#a78bfa' }}>if</span> (t.startsWith(<span style={{ color: '#4ade80' }}>&apos;-xy&apos;</span>)) rotY = π<br />
					<span style={{ color: '#a78bfa' }}>else if</span> (t.startsWith(<span style={{ color: '#4ade80' }}>&apos;-zy&apos;</span>)) rotY = π/2<br />
					<span style={{ color: '#a78bfa' }}>else if</span> (t.startsWith(<span style={{ color: '#4ade80' }}>&apos;zy&apos;</span>)) rotY = -π/2<br />
					<span style={{ color: '#a78bfa' }}>else if</span> (t.startsWith(<span style={{ color: '#4ade80' }}>&apos;xz&apos;</span>)) horizontal = true<br />
					<span style={{ color: '#64748b' }}>// xy → rotY stays 0</span>
				</div>
			</div>
		</div>
	);
}

function fmtRad(r: number): string {
	if (Math.abs(r) < 1e-6) return '0';
	if (Math.abs(r - Math.PI) < 1e-6) return 'π';
	if (Math.abs(r - Math.PI / 2) < 1e-6) return 'π/2';
	if (Math.abs(r + Math.PI / 2) < 1e-6) return '-π/2';
	return r.toFixed(2);
}

/* ── exported wrapper with mode toggle ───────────────────── */
export default function PanelCullingDemo() {
	const [mode, setMode] = useState<'culling' | 'orientation'>('culling');

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
			<div style={{ display: 'flex', gap: 8 }}>
				{([
					{ id: 'culling', label: 'Back-face culling' },
					{ id: 'orientation', label: 'Orientation lookup' },
				] as const).map((m) => (
					<button key={m.id} onClick={() => setMode(m.id)} style={{
						padding: '7px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600,
						background: mode === m.id ? 'rgba(167,139,250,0.18)' : 'rgba(255,255,255,0.04)',
						border: `1px solid ${mode === m.id ? '#a78bfa' : 'rgba(255,255,255,0.1)'}`,
						color: mode === m.id ? '#c4b5fd' : 'rgba(255,255,255,0.6)',
					}}>
						{m.label}
					</button>
				))}
			</div>
			<div style={{ flex: 1, minHeight: 540 }}>
				{mode === 'culling' ? <CullingView /> : <OrientationView />}
			</div>
		</div>
	);
}
