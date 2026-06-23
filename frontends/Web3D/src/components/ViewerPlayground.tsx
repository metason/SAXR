'use client';
/**
 * @module ViewerPlayground
 * Live grid controls overlaid on the real 3D viewer (§6.2.7.2). In comparative mode
 * the sliders override the grid layout — columns, gap.x, gap.y, gap.z — and the
 * spacing math re-lays the real scenes in real time. The axis gizmo maps each slider
 * to the world axis it drives: x = column spacing, y = vertical lift (LOD), z = rows.
 */

import React from 'react';

function Slider({ label, min, max, step = 1, value, onChange, accent }: {
	label: string; min: number; max: number; step?: number; value: number; onChange: (v: number) => void; accent: string;
}) {
	return (
		<label className="flex flex-col gap-1">
			<span className="text-xs font-mono text-white/60">{label}</span>
			<input
				type="range" min={min} max={max} step={step} value={value}
				onChange={(e) => onChange(Number(e.target.value))}
				className="w-full" style={{ accentColor: accent }}
			/>
		</label>
	);
}

const X = '#22d3ee'; // cyan — column spacing
const Y = '#a78bfa'; // violet — vertical lift
const Z = '#34d399'; // emerald — row spacing

/** Mini axis gizmo: one arrow per world axis, labelled with its live gap value. */
function AxisGizmo({ gapX, gapY, gapZ }: { gapX: number; gapY: number; gapZ: number }) {
	const ox = 62, oy = 78; // origin
	return (
		<svg viewBox="0 0 170 120" className="w-full h-[110px]">
			<defs>
				<marker id="ah-x" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
					<polygon points="0,0 6,3 0,6" fill={X} />
				</marker>
				<marker id="ah-y" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
					<polygon points="0,0 6,3 0,6" fill={Y} />
				</marker>
				<marker id="ah-z" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
					<polygon points="0,0 6,3 0,6" fill={Z} />
				</marker>
			</defs>

			{/* X — right (column spacing) */}
			<line x1={ox} y1={oy} x2={ox + 70} y2={oy} stroke={X} strokeWidth="2.5" markerEnd="url(#ah-x)" />
			<text x={ox + 76} y={oy + 4} fontSize="11" fill={X} fontFamily="monospace">x</text>
			<text x={ox + 30} y={oy - 6} fontSize="10" fill={X} fontFamily="monospace" textAnchor="middle">{gapX}</text>

			{/* Y — up (vertical lift / LOD) */}
			<line x1={ox} y1={oy} x2={ox} y2={oy - 62} stroke={Y} strokeWidth="2.5" markerEnd="url(#ah-y)" />
			<text x={ox + 5} y={oy - 64} fontSize="11" fill={Y} fontFamily="monospace">y</text>
			<text x={ox + 9} y={oy - 32} fontSize="10" fill={Y} fontFamily="monospace">{gapY}</text>

			{/* Z — toward viewer / down-left (row spacing) */}
			<line x1={ox} y1={oy} x2={ox - 42} y2={oy + 32} stroke={Z} strokeWidth="2.5" markerEnd="url(#ah-z)" />
			<text x={ox - 52} y={oy + 42} fontSize="11" fill={Z} fontFamily="monospace">z</text>
			<text x={ox - 30} y={oy + 16} fontSize="10" fill={Z} fontFamily="monospace">{gapZ}</text>

			<circle cx={ox} cy={oy} r="2.5" fill="#ffffff" />
		</svg>
	);
}

export default function ViewerPlayground({
	isComparative,
	cols,
	gapX,
	gapY,
	gapZ,
	onCols,
	onGapX,
	onGapY,
	onGapZ,
	n,
	onClose,
}: {
	isComparative: boolean;
	cols: number;
	gapX: number;
	gapY: number;
	gapZ: number;
	onCols: (v: number) => void;
	onGapX: (v: number) => void;
	onGapY: (v: number) => void;
	onGapZ: (v: number) => void;
	n: number;
	onClose: () => void;
}) {
	const rows = Math.ceil(n / Math.max(cols, 1));
	const collapsed = isComparative && rows > 1 && gapZ === 0;

	return (
		<div className="w-[300px] rounded-xl border border-white/10 bg-black/80 backdrop-blur p-4 text-white shadow-2xl">
			<div className="flex items-center justify-between mb-3">
				<span className="text-xs font-semibold tracking-widest uppercase text-cyan-300">Grid</span>
				<button onClick={onClose} className="text-white/40 hover:text-white/80 text-sm">✕</button>
			</div>

			{isComparative ? (
				<div className="flex flex-col gap-2.5">
					<AxisGizmo gapX={gapX} gapY={gapY} gapZ={gapZ} />

					<Slider label={`columns = ${cols}`} min={1} max={Math.max(1, n)} value={cols} onChange={onCols} accent="#ffffff" />
					<Slider label={`gap.x = ${gapX}  ·  column spacing`} min={0.5} max={4} step={0.5} value={gapX} onChange={onGapX} accent={X} />
					<Slider label={`gap.y = ${gapY}  ·  vertical lift`} min={0} max={4} step={0.5} value={gapY} onChange={onGapY} accent={Y} />
					<Slider label={`gap.z = ${gapZ}  ·  row spacing`} min={0} max={4} step={0.5} value={gapZ} onChange={onGapZ} accent={Z} />

					<div className="text-[11px] font-mono text-white/55 mt-1">
						{n} scenes → <span style={{ color: X }}>{cols}</span> cols × <span style={{ color: Z }}>{rows}</span> rows
					</div>
					{collapsed && (
						<div className="text-[11px] font-mono text-red-300 bg-red-500/10 border border-red-400/30 rounded-lg px-2.5 py-1.5 leading-snug">
							⚠ gap.z = 0 → all {rows} rows collapse onto z = 0 → renders as a line, not a grid.
						</div>
					)}
				</div>
			) : (
				<p className="text-[11px] text-white/35 italic">Grid controls appear in comparative samples.</p>
			)}
		</div>
	);
}
