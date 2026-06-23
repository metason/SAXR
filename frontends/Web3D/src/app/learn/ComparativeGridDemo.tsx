'use client';

/**
 * Visualises the comparative grid layout (§6.2.7.2). Top-down (XZ plane) view of
 * the exact ComparativeContent math: cols = columns ?? ⌈√n⌉, rows = ⌈n/cols⌉, and
 * each scene placed at x = col·gap.x − totalWidth/2, z = row·gap.z − totalDepth/2,
 * centred on the origin. Drag the sliders to watch it go line ↔ grid — in particular
 * gap.z = 0 collapses every row onto z = 0, which is why a default gap renders a line.
 */

import { useState } from 'react';

const COLORS = ['#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#a78bfa', '#22d3ee'];

interface Preset {
	label: string;
	n: number;
	auto: boolean;
	columns: number;
	gapX: number;
	gapZ: number;
}
const PRESETS: Preset[] = [
	{ label: 'eco (cols 2, gap [2,0,2])', n: 5, auto: false, columns: 2, gapX: 2, gapZ: 2 },
	{ label: 'default gap [2,0,0] → line', n: 5, auto: true, columns: 3, gapX: 2, gapZ: 0 },
	{ label: 'auto square (9 scenes)', n: 9, auto: true, columns: 3, gapX: 2, gapZ: 2 },
];

export default function ComparativeGridDemo() {
	const [n, setN] = useState(5);
	const [auto, setAuto] = useState(false);
	const [manualCols, setManualCols] = useState(2);
	const [gapX, setGapX] = useState(2);
	const [gapZ, setGapZ] = useState(2);
	const [sel, setSel] = useState<number | null>(null);

	// ── the real ComparativeContent math ──
	const cols = auto ? Math.ceil(Math.sqrt(n)) : Math.min(manualCols, n);
	const rows = Math.ceil(n / cols);
	const totalWidth = (cols - 1) * gapX;
	const totalDepth = (rows - 1) * gapZ;

	const cells = Array.from({ length: n }, (_, i) => {
		const col = i % cols;
		const row = Math.floor(i / cols);
		return { i, col, row, x: col * gapX - totalWidth / 2, z: row * gapZ - totalDepth / 2 };
	});

	const collapsed = rows > 1 && gapZ === 0;

	// ── world → screen mapping (top-down, X right, Z down) ──
	const W = 720, H = 380;
	const cx = W / 2, cy = H / 2;
	const halfW = Math.max(...cells.map((c) => Math.abs(c.x)), 0.0001);
	const halfD = Math.max(...cells.map((c) => Math.abs(c.z)), 0.0001);
	const scale = Math.min((W / 2 - 70) / halfW, (H / 2 - 60) / halfD, 64);
	const sx = (x: number) => cx + x * scale;
	const sz = (z: number) => cy + z * scale;
	const CELL = 40;

	const applyPreset = (p: Preset) => {
		setN(p.n); setAuto(p.auto); setManualCols(p.columns); setGapX(p.gapX); setGapZ(p.gapZ); setSel(null);
	};

	const selCell = sel !== null ? cells[sel] : null;

	return (
		<div style={{ height: '100%', minHeight: 540, background: '#0a0d14', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

			<div style={{ padding: '14px 18px 6px' }}>
				<p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, margin: 0, maxWidth: 640 }}>
					Top-down view (looking down the <strong style={{ color: '#22d3ee' }}>Y</strong> axis) of the comparative layout. The renderer offsets each scene by <code style={{ fontFamily: 'monospace', color: '#fbbf24' }}>gap.x</code> across and <code style={{ fontFamily: 'monospace', color: '#fbbf24' }}>gap.z</code> in depth, centred on the origin.
				</p>
			</div>

			{/* presets */}
			<div style={{ padding: '4px 18px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
				{PRESETS.map((p) => (
					<button key={p.label} onClick={() => applyPreset(p)} style={{
						fontSize: 11, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
						background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)',
					}}>{p.label}</button>
				))}
			</div>

			<div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
				<svg viewBox={`0 0 ${W} ${H}`} style={{ width: '92%', height: 'auto' }}>
					{/* origin crosshair + axes */}
					<line x1={cx - 16} y1={cy} x2={cx + 16} y2={cy} stroke="#475569" strokeWidth="1" />
					<line x1={cx} y1={cy - 16} x2={cx} y2={cy + 16} stroke="#475569" strokeWidth="1" />
					<text x={cx + 6} y={cy + 16} fill="#64748b" fontSize="10" fontFamily="monospace">origin (0,0)</text>
					<text x={W - 60} y={cy - 6} fill="#334155" fontSize="11" fontFamily="monospace">+X →</text>
					<text x={cx + 6} y={H - 10} fill="#334155" fontSize="11" fontFamily="monospace">+Z (depth) ↓</text>

					{/* bounding box (totalWidth × totalDepth) */}
					{(totalWidth > 0 || totalDepth > 0) && (
						<rect x={sx(-totalWidth / 2) - CELL / 2} y={sz(-totalDepth / 2) - CELL / 2}
							width={totalWidth * scale + CELL} height={totalDepth * scale + CELL}
							fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" rx="6" />
					)}

					{/* gap.x arrow between col0 and col1 of row0 */}
					{cols > 1 && (() => {
						const a = cells.find((c) => c.col === 0 && c.row === 0)!;
						const b = cells.find((c) => c.col === 1 && c.row === 0);
						if (!b) return null;
						const y = sz(a.z) - CELL / 2 - 12;
						return (
							<g>
								<line x1={sx(a.x)} y1={y} x2={sx(b.x)} y2={y} stroke="#22d3ee" strokeWidth="1.5" markerStart="url(#cg-a)" markerEnd="url(#cg-a)" />
								<text x={(sx(a.x) + sx(b.x)) / 2} y={y - 5} fill="#22d3ee" fontSize="11" fontFamily="monospace" textAnchor="middle">gap.x = {gapX}</text>
							</g>
						);
					})()}

					{/* gap.z arrow between row0 and row1 of col0 */}
					{rows > 1 && gapZ > 0 && (() => {
						const a = cells.find((c) => c.col === 0 && c.row === 0)!;
						const b = cells.find((c) => c.col === 0 && c.row === 1);
						if (!b) return null;
						const x = sx(a.x) - CELL / 2 - 12;
						return (
							<g>
								<line x1={x} y1={sz(a.z)} x2={x} y2={sz(b.z)} stroke="#34d399" strokeWidth="1.5" markerStart="url(#cg-ag)" markerEnd="url(#cg-ag)" />
								<text x={x - 6} y={(sz(a.z) + sz(b.z)) / 2} fill="#34d399" fontSize="11" fontFamily="monospace" textAnchor="end">gap.z = {gapZ}</text>
							</g>
						);
					})()}

					<defs>
						<marker id="cg-a" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M6,1 L2,4 L6,7" fill="none" stroke="#22d3ee" strokeWidth="1.3" /></marker>
						<marker id="cg-ag" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M6,1 L2,4 L6,7" fill="none" stroke="#34d399" strokeWidth="1.3" /></marker>
					</defs>

					{/* scene cells */}
					{cells.map((c) => {
						const isSel = c.i === sel;
						const col = COLORS[c.i % COLORS.length];
						return (
							<g key={c.i} onClick={() => setSel(isSel ? null : c.i)} style={{ cursor: 'pointer' }}>
								<rect x={sx(c.x) - CELL / 2} y={sz(c.z) - CELL / 2} width={CELL} height={CELL} rx="6"
									fill={`${col}${isSel ? '44' : '22'}`} stroke={col} strokeWidth={isSel ? 2.5 : 1.5} />
								<text x={sx(c.x)} y={sz(c.z) + 5} fill="#fff" fontSize="15" fontWeight="700" textAnchor="middle" fontFamily="monospace">{c.i}</text>
							</g>
						);
					})}
				</svg>
			</div>

			{/* controls */}
			<div style={{ padding: '6px 22px 10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 28px' }}>
				<Slider label={`scenes (n) = ${n}`} min={1} max={12} value={n} onChange={(v) => { setN(v); setSel(null); }} accent="#fff" />
				<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
					<button onClick={() => setAuto((a) => !a)} style={{
						fontSize: 11.5, padding: '5px 10px', borderRadius: 7, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
						background: auto ? '#7f77dd22' : 'rgba(255,255,255,0.05)',
						border: `1px solid ${auto ? '#7f77dd' : 'rgba(255,255,255,0.15)'}`,
						color: auto ? '#a78bfa' : 'rgba(255,255,255,0.7)',
					}}>columns: {auto ? 'auto ⌈√n⌉' : 'manual'}</button>
					{!auto && <div style={{ flex: 1 }}><Slider label={`cols = ${cols}`} min={1} max={Math.max(1, n)} value={manualCols} onChange={(v) => { setManualCols(v); setSel(null); }} accent="#a78bfa" /></div>}
				</div>
				<Slider label={`gap.x = ${gapX}`} min={0.5} max={4} step={0.5} value={gapX} onChange={setGapX} accent="#22d3ee" />
				<Slider label={`gap.z = ${gapZ}`} min={0} max={4} step={0.5} value={gapZ} onChange={setGapZ} accent="#34d399" />
			</div>

			{/* formula readout */}
			<div style={{ padding: '0 22px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
				<div style={{ fontFamily: 'monospace', fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7 }}>
					<span style={{ color: '#a78bfa' }}>cols</span> = {auto ? `⌈√${n}⌉` : 'columns'} = <strong style={{ color: '#fff' }}>{cols}</strong>{'   '}
					<span style={{ color: '#34d399' }}>rows</span> = ⌈{n}/{cols}⌉ = <strong style={{ color: '#fff' }}>{rows}</strong>{'   '}
					totalWidth = ({cols}−1)·{gapX} = <strong style={{ color: '#fff' }}>{totalWidth}</strong>{'   '}
					totalDepth = ({rows}−1)·{gapZ} = <strong style={{ color: '#fff' }}>{totalDepth}</strong>
				</div>
				{selCell ? (
					<div style={{ fontFamily: 'monospace', fontSize: 12, color: '#fbbf24' }}>
						scene #{selCell.i} → col {selCell.col}, row {selCell.row} → x = {selCell.col}·{gapX} − {totalWidth / 2} = <strong>{selCell.x}</strong>, z = {selCell.row}·{gapZ} − {totalDepth / 2} = <strong>{selCell.z}</strong>
					</div>
				) : (
					<div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>click a scene to see its x / z computed</div>
				)}
				{collapsed && (
					<div style={{ fontFamily: 'monospace', fontSize: 12, color: '#f87171', background: '#7f1d1d22', border: '1px solid #ef444455', borderRadius: 8, padding: '7px 10px' }}>
						⚠ gap.z = 0 → every row lands on z = 0 → the {rows} rows overlap and it renders as a <strong>line</strong>, not a grid.
					</div>
				)}
			</div>
		</div>
	);
}

function Slider({ label, min, max, step = 1, value, onChange, accent }: {
	label: string; min: number; max: number; step?: number; value: number; onChange: (v: number) => void; accent: string;
}) {
	return (
		<label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
			<span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>{label}</span>
			<input type="range" min={min} max={max} step={step} value={value}
				onChange={(e) => onChange(Number(e.target.value))}
				style={{ width: '100%', accentColor: accent }} />
		</label>
	);
}
