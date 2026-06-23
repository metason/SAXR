'use client';

/**
 * Visualises the SHAPE_REGISTRY dispatch (§6.2.4): a type string is looked up in
 * the registry and routed to one of four build strategies. Pick a type, watch the
 * matching strategy fire and the real geometry render.
 */

import { useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

type Strategy = 'primitive' | 'composite' | 'procedural' | 'external';

const STRATEGY_META: Record<Strategy, { label: string; blurb: string; color: string }> = {
	primitive:  { label: 'Scaled primitive', blurb: 'One Three.js primitive scaled by w / h / d', color: '#60a5fa' },
	composite:  { label: 'Composite',        blurb: 'Several boxes grouped into one shape',       color: '#34d399' },
	procedural: { label: 'Procedural',        blurb: 'Custom BufferGeometry built in code',        color: '#fbbf24' },
	external:   { label: 'External mesh',     blurb: 'Loaded from a PLY file at runtime',          color: '#f472b6' },
};

const SHAPES: Array<{ type: string; strategy: Strategy }> = [
	{ type: 'sphere',     strategy: 'primitive' },
	{ type: 'box',        strategy: 'primitive' },
	{ type: 'cylinder',   strategy: 'primitive' },
	{ type: 'octahedron', strategy: 'primitive' },
	{ type: 'pyramid',    strategy: 'primitive' },
	{ type: 'plane',      strategy: 'primitive' },
	{ type: 'plus',       strategy: 'composite' },
	{ type: 'cross',      strategy: 'composite' },
	{ type: 'arc',        strategy: 'procedural' },
	{ type: 'line',       strategy: 'procedural' },
	{ type: 'area',       strategy: 'procedural' },
	{ type: 'surface',    strategy: 'external' },
];

const COLOR = '#7c83ff';

/* ── geometry per type (faithful approximations of the real components) ── */
function ShapeGeometry({ type }: { type: string }) {
	// procedural arc — same THREE.Shape + ExtrudeGeometry approach as ShapeArc.tsx
	const arcGeom = useMemo(() => {
		const outerR = 0.6, innerR = 0.6 * 0.5;
		const s = new THREE.Shape();
		s.absarc(0, 0, outerR, 0, (240 * Math.PI) / 180, false);
		s.absarc(0, 0, innerR, (240 * Math.PI) / 180, 0, true);
		const g = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: false });
		g.rotateX(-Math.PI / 2);
		g.center();
		return g;
	}, []);

	const mat = <meshStandardMaterial color={COLOR} />;

	switch (type) {
		case 'sphere':     return <mesh><sphereGeometry args={[0.55, 32, 32]} />{mat}</mesh>;
		case 'box':        return <mesh scale={[0.9, 0.9, 0.9]}><boxGeometry args={[1, 1, 1]} />{mat}</mesh>;
		case 'cylinder':   return <mesh><cylinderGeometry args={[0.5, 0.5, 1, 32]} />{mat}</mesh>;
		case 'octahedron': return <mesh><octahedronGeometry args={[0.7]} />{mat}</mesh>;
		case 'pyramid':    return <mesh><coneGeometry args={[0.6, 1, 4]} />{mat}</mesh>;
		case 'plane':      return <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1.1, 1.1]} /><meshStandardMaterial color={COLOR} side={THREE.DoubleSide} /></mesh>;
		case 'plus':
		case 'cross': {
			// composite: 3 perpendicular boxes (ShapePlus.tsx, PLUS_FACTOR = 0.2)
			const f = 0.2;
			return (
				<group rotation={type === 'cross' ? [0, 0, Math.PI / 4] : [0, 0, 0]}>
					<mesh scale={[1, f, f]}><boxGeometry args={[1, 1, 1]} />{mat}</mesh>
					<mesh scale={[f, 1, f]}><boxGeometry args={[1, 1, 1]} />{mat}</mesh>
					<mesh scale={[f, f, 1]}><boxGeometry args={[1, 1, 1]} />{mat}</mesh>
				</group>
			);
		}
		case 'arc':
		case 'line':
		case 'area':
			return <mesh geometry={arcGeom}><meshStandardMaterial color={COLOR} side={THREE.DoubleSide} /></mesh>;
		case 'surface':
			// external PLY — render a wireframe placeholder (real mesh loads at runtime)
			return (
				<mesh>
					<icosahedronGeometry args={[0.7, 1]} />
					<meshStandardMaterial color={COLOR} wireframe />
				</mesh>
			);
		default:
			return <mesh scale={[0.9, 0.9, 0.9]}><boxGeometry args={[1, 1, 1]} />{mat}</mesh>;
	}
}

export default function ShapeStrategyDemo() {
	const [type, setType] = useState('box');
	const selected = SHAPES.find((s) => s.type === type)!;
	const strat = selected.strategy;
	const meta = STRATEGY_META[strat];

	return (
		<div style={{ display: 'flex', height: '100%', minHeight: 540, background: '#0a0d14', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>

			{/* 3D */}
			<div style={{ flex: 1, position: 'relative' }}>
				<Canvas camera={{ position: [1.8, 1.4, 1.8], fov: 45 }}>
					<ambientLight intensity={0.7} />
					<directionalLight position={[3, 4, 3]} intensity={0.8} />
					<directionalLight position={[-3, 2, -3]} intensity={0.3} />
					<ShapeGeometry type={type} />
					<OrbitControls enablePan={false} minDistance={1.5} maxDistance={5} />
				</Canvas>
				<div style={{ position: 'absolute', top: 12, left: 14, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
					drag to orbit
				</div>
				{/* dispatch readout */}
				<div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', background: 'rgba(10,13,20,0.85)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 14px', fontFamily: 'monospace', fontSize: 13, color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap' }}>
					SHAPE_REGISTRY[<span style={{ color: '#4ade80' }}>&apos;{type}&apos;</span>] → <span style={{ color: meta.color }}>Shape{type.charAt(0).toUpperCase() + type.slice(1)}</span>
				</div>
			</div>

			{/* sidebar */}
			<div style={{ width: 256, background: '#0d1018', borderLeft: '1px solid rgba(255,255,255,0.06)', padding: '16px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>

				<p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0 }}>
					<code style={{ color: '#a78bfa', fontFamily: 'monospace' }}>DataRepMesh</code> looks up <code style={{ color: '#4ade80', fontFamily: 'monospace' }}>rep.type</code> in the registry — no <code style={{ fontFamily: 'monospace' }}>if/else</code>. Each shape uses one of four build strategies.
				</p>

				{/* type picker */}
				<div>
					<div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b', marginBottom: 8 }}>
						12 registered types
					</div>
					<div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
						{SHAPES.map((s) => {
							const sel = s.type === type;
							const c = STRATEGY_META[s.strategy].color;
							return (
								<button key={s.type} onClick={() => setType(s.type)} style={{
									fontFamily: 'monospace', fontSize: 11.5, fontWeight: 600,
									padding: '4px 9px', borderRadius: 6, cursor: 'pointer',
									background: sel ? `${c}22` : 'rgba(255,255,255,0.04)',
									border: `1px solid ${sel ? c : 'rgba(255,255,255,0.1)'}`,
									color: sel ? c : 'rgba(255,255,255,0.6)',
								}}>
									{s.type}
								</button>
							);
						})}
					</div>
				</div>

				{/* strategy cards */}
				<div>
					<div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b', marginBottom: 8 }}>
						build strategy
					</div>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
						{(Object.keys(STRATEGY_META) as Strategy[]).map((k) => {
							const m = STRATEGY_META[k];
							const active = k === strat;
							return (
								<div key={k} style={{
									padding: '8px 10px', borderRadius: 8,
									background: active ? `${m.color}18` : 'rgba(255,255,255,0.02)',
									border: `1px solid ${active ? m.color : 'rgba(255,255,255,0.06)'}`,
									opacity: active ? 1 : 0.5,
								}}>
									<div style={{ fontSize: 12, fontWeight: 700, color: active ? m.color : 'rgba(255,255,255,0.7)' }}>{m.label}</div>
									<div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>{m.blurb}</div>
								</div>
							);
						})}
					</div>
				</div>

				{/* defense point */}
				<div style={{ background: '#0a0d14', borderRadius: 8, padding: 11, fontSize: 11.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55, border: '1px solid rgba(255,255,255,0.05)' }}>
					Adding a shape = one component + one registry line. The dispatcher never changes — <strong style={{ color: '#fff' }}>open for extension, closed for modification</strong> (Strategy pattern).
				</div>
			</div>
		</div>
	);
}
