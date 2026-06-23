'use client';

/**
 * Visualises the forward/inverse domain map (§6.2.7). Forward = domainLabelForScene
 * (scene index → year). Inverse = useComparativeSelection (year → scene index via
 * Math.round). The two must be exact inverses or the wrong scene shows silently.
 */

import { useState } from 'react';

const DOMAIN: [number, number] = [2000, 2024];
const TOTAL = 9; // scenes 0..8

/** Forward map — domainLabelForScene(): index → rounded year. */
function forward(index: number): number {
	const v = DOMAIN[0] + (index * (DOMAIN[1] - DOMAIN[0])) / Math.max(TOTAL - 1, 1);
	return Math.round(v);
}

/** Inverse map — useComparativeSelection(): year → scene index. */
function inverse(value: number, useRound: boolean): number {
	const raw = ((value - DOMAIN[0]) / (DOMAIN[1] - DOMAIN[0])) * (TOTAL - 1);
	return useRound ? Math.round(raw) : Math.floor(raw); // floor = the buggy variant
}

export default function BijectiveMapDemo() {
	const [value, setValue] = useState(2009);
	const [useRound, setUseRound] = useState(true);

	const idx = inverse(value, useRound);
	const correctIdx = inverse(value, true);
	const landedYear = forward(idx);
	const isBuggyMiss = !useRound && idx !== correctIdx;

	const W = 760, H = 320;
	const pad = 60;
	const trackW = W - pad * 2;
	// x for a continuous domain value
	const valX = pad + ((value - DOMAIN[0]) / (DOMAIN[1] - DOMAIN[0])) * trackW;
	// x for a scene index (0..TOTAL-1)
	const sceneX = (i: number) => pad + (i / (TOTAL - 1)) * trackW;

	const topY = 70, botY = 230;

	return (
		<div style={{ height: '100%', minHeight: 540, background: '#0a0d14', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

			<div style={{ padding: '16px 20px 8px' }}>
				<p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, margin: 0, maxWidth: 640 }}>
					Drag the <strong style={{ color: '#22d3ee' }}>year</strong>. The inverse map snaps it to the nearest <strong style={{ color: '#a78bfa' }}>scene</strong> via <code style={{ fontFamily: 'monospace', color: '#fbbf24' }}>Math.round</code>. The picker labels each scene with the forward map — they must be exact inverses.
				</p>
			</div>

			<div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
				<svg viewBox={`0 0 ${W} ${H}`} style={{ width: '94%', height: 'auto' }}>

					{/* top track: continuous domain */}
					<line x1={pad} y1={topY} x2={W - pad} y2={topY} stroke="#334155" strokeWidth="2" />
					<text x={pad} y={topY - 16} fill="#22d3ee" fontSize="12" fontWeight="700">domain value (year)</text>
					{[2000, 2006, 2012, 2018, 2024].map((yr) => {
						const x = pad + ((yr - DOMAIN[0]) / (DOMAIN[1] - DOMAIN[0])) * trackW;
						return (
							<g key={yr}>
								<line x1={x} y1={topY - 5} x2={x} y2={topY + 5} stroke="#475569" strokeWidth="1" />
								<text x={x} y={topY - 4} fill="#64748b" fontSize="9" textAnchor="middle" fontFamily="monospace">{yr}</text>
							</g>
						);
					})}

					{/* the dragged value marker */}
					<circle cx={valX} cy={topY} r="8" fill="#22d3ee" />
					<text x={valX} y={topY - 26} fill="#22d3ee" fontSize="14" fontWeight="700" textAnchor="middle" fontFamily="monospace">{value}</text>

					{/* mapping arrow */}
					<line x1={valX} y1={topY + 10} x2={sceneX(idx)} y2={botY - 14}
						stroke={isBuggyMiss ? '#f87171' : '#fbbf24'} strokeWidth="2.5" strokeDasharray="5 4" markerEnd="url(#bm-arrow)" />
					<defs>
						<marker id="bm-arrow" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto">
							<path d="M0,0 L6,3 L0,6" fill={isBuggyMiss ? '#f87171' : '#fbbf24'} />
						</marker>
					</defs>
					<text x={(valX + sceneX(idx)) / 2 + 14} y={(topY + botY) / 2} fill={isBuggyMiss ? '#f87171' : '#fbbf24'} fontSize="11" fontFamily="monospace">
						{useRound ? 'round' : 'floor'}({(((value - DOMAIN[0]) / (DOMAIN[1] - DOMAIN[0])) * (TOTAL - 1)).toFixed(2)}) = {idx}
					</text>

					{/* bottom track: discrete scenes */}
					<line x1={pad} y1={botY} x2={W - pad} y2={botY} stroke="#334155" strokeWidth="2" />
					<text x={pad} y={botY + 40} fill="#a78bfa" fontSize="12" fontWeight="700">scenes (labelled by forward map)</text>
					{Array.from({ length: TOTAL }, (_, i) => {
						const x = sceneX(i);
						const isSel = i === idx;
						const isCorrect = i === correctIdx;
						return (
							<g key={i}>
								<circle cx={x} cy={botY} r={isSel ? 9 : 6}
									fill={isSel ? (isBuggyMiss ? '#f87171' : '#a78bfa') : '#1e293b'}
									stroke={isCorrect && isBuggyMiss ? '#4ade80' : (isSel ? '#fff' : '#475569')}
									strokeWidth={isCorrect && isBuggyMiss ? 2.5 : 1} />
								<text x={x} y={botY + 22} fill={isSel ? '#fff' : '#64748b'} fontSize="11" textAnchor="middle" fontFamily="monospace" fontWeight={isSel ? 700 : 400}>
									{forward(i)}
								</text>
								<text x={x} y={botY - 14} fill="#475569" fontSize="9" textAnchor="middle" fontFamily="monospace">#{i}</text>
							</g>
						);
					})}

					{/* correct-target hint when buggy */}
					{isBuggyMiss && (
						<text x={sceneX(correctIdx)} y={botY + 40} fill="#4ade80" fontSize="10" textAnchor="middle" fontFamily="monospace">↑ correct</text>
					)}
				</svg>
			</div>

			{/* controls */}
			<div style={{ padding: '8px 24px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
				<input type="range" min={DOMAIN[0]} max={DOMAIN[1]} step={1} value={value}
					onChange={(e) => setValue(Number(e.target.value))}
					style={{ width: '100%', accentColor: '#22d3ee' }} />

				<div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
					<button onClick={() => setUseRound((v) => !v)} style={{
						padding: '8px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
						background: useRound ? '#14532d33' : '#7f1d1d33',
						border: `1px solid ${useRound ? '#22c55e' : '#ef4444'}`,
						color: useRound ? '#4ade80' : '#f87171',
					}}>
						inverse uses: {useRound ? 'Math.round() ✓' : 'Math.floor() ✗ (mismatched)'}
					</button>

					<div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.7)' }}>
						You picked <span style={{ color: '#22d3ee', fontWeight: 700, fontFamily: 'monospace' }}>{value}</span> →
						shows scene <span style={{ color: isBuggyMiss ? '#f87171' : '#a78bfa', fontWeight: 700, fontFamily: 'monospace' }}>#{idx}</span> →
						labelled <span style={{ color: isBuggyMiss ? '#f87171' : '#4ade80', fontWeight: 700, fontFamily: 'monospace' }}>{landedYear}</span>
						{isBuggyMiss && <span style={{ color: '#f87171', fontWeight: 700 }}> — wrong scene, but the label still reads {value}!</span>}
					</div>
				</div>

				<div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, maxWidth: 680 }}>
					Flip the toggle to <code style={{ fontFamily: 'monospace' }}>floor()</code> and drag: the forward labels say one thing, the inverse lands on a different scene — and nothing visibly errors. That silent mismatch is why the two maps must be exact inverses.
				</div>
			</div>
		</div>
	);
}
