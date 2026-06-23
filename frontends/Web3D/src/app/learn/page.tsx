'use client';
/**
 * @module learn/page
 * Interactive Web3D architecture explorer. The whole module is drawn as a
 * diagram (a shared trunk that forks into the arrangement modes). Pick a flow
 * to light up the classes on its path; click any box to drill into its real
 * file, code, ELI5, and design rationale. Content lives in architecture.ts.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
	nodes,
	edges,
	flows,
	sequences,
	patterns,
	adrs,
	glossary,
	VIEWBOX,
	type Group,
	type ArchNode,
} from './architecture';

// dynamic imports — these use an R3F Canvas which can't SSR
const PanelCullingDemo = dynamic(() => import('./PanelCullingDemo'), { ssr: false });
const ShapeStrategyDemo = dynamic(() => import('./ShapeStrategyDemo'), { ssr: false });
const BijectiveMapDemo = dynamic(() => import('./BijectiveMapDemo'), { ssr: false });
const ComparativeGridDemo = dynamic(() => import('./ComparativeGridDemo'), { ssr: false });

type DemoId = 'panel' | 'shapes' | 'map' | 'grid';

// precomputed — static per module load
const degreeMap = new Map<string, { inn: number; out: number }>();
nodes.forEach((n) => degreeMap.set(n.id, { inn: 0, out: 0 }));
edges.forEach((e) => {
	degreeMap.get(e.from)!.out++;
	degreeMap.get(e.to)!.inn++;
});

function heatColor(id: string): string {
	const d = degreeMap.get(id)!;
	const total = d.inn + d.out;
	if (total <= 1) return '#93c5fd'; // blue  — leaf
	if (total <= 3) return '#34d399'; // green — minor
	if (total <= 5) return '#f59e0b'; // amber — moderate
	return '#f87171';                  // red   — central
}

const GROUP_COLOR: Record<Group, string> = {
	pipeline: '#1D9E75', // emerald
	lib: '#EF9F27', // amber
	hook: '#7F77DD', // violet
	component: '#378ADD', // sky
	api: '#D4537E', // pink
};
const GROUP_LABEL: Record<Group, string> = {
	pipeline: 'Pipeline output',
	lib: 'Lib (pure helper)',
	hook: 'Hook (state)',
	component: 'Component (render/UI)',
	api: 'API route (server)',
};

const byId = (id: string) => nodes.find((n) => n.id === id)!

function BlockDiagram({ node }: { node: ArchNode }) {
	const b = node.detail.block;
	if (!b) return null;
	const color = GROUP_COLOR[node.group];
	const box: React.CSSProperties = {
		border: '1px solid rgba(255,255,255,0.10)',
		borderRadius: 8,
		padding: '10px 12px',
		background: 'rgba(255,255,255,0.04)',
		minWidth: 0,
	};
	const label: React.CSSProperties = {
		fontSize: 9,
		fontWeight: 600,
		letterSpacing: '0.10em',
		textTransform: 'uppercase',
		color: 'rgba(255,255,255,0.30)',
		marginBottom: 6,
	};
	const item: React.CSSProperties = {
		fontSize: 11,
		fontFamily: 'ui-monospace, monospace',
		color: 'rgba(255,255,255,0.60)',
		marginBottom: 3,
		lineHeight: 1.4,
	};
	const dot: React.CSSProperties = { color, marginRight: 4 };

	return (
		<div style={{ margin: '18px 0 14px' }}>
			{/* three-column block: receives → core → produces */}
			<div style={{ display: 'grid', gridTemplateColumns: '1fr 20px 1.3fr 20px 1fr', gap: 6, alignItems: 'stretch' }}>
				{/* receives */}
				<div style={box}>
					<div style={label}>receives</div>
					{(b.inputs ?? ['—']).map((s, i) => <div key={i} style={item}>{s}</div>)}
				</div>

				{/* arrow */}
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.20)', fontSize: 16 }}>›</div>

				{/* core / internals */}
				<div style={{ border: `1.5px solid ${color}`, borderRadius: 8, padding: '10px 12px', background: `${color}18`, minWidth: 0 }}>
					<div style={{ fontSize: 11, fontWeight: 600, color, marginBottom: 8, letterSpacing: '0.02em' }}>{node.label}</div>
					{(b.internals ?? []).map((s, i) => (
						<div key={i} style={{ ...item, display: 'flex' }}>
							<span style={dot}>·</span><span>{s}</span>
						</div>
					))}
				</div>

				{/* arrow */}
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.20)', fontSize: 16 }}>›</div>

				{/* produces */}
				<div style={box}>
					<div style={label}>produces</div>
					{(b.outputs ?? ['—']).map((s, i) => <div key={i} style={item}>{s}</div>)}
				</div>
			</div>

			{/* exports row */}
			{b.exports && b.exports.length > 0 && (
				<div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 10 }}>
					<span style={{ ...label, marginBottom: 0 }}>exports</span>
					{b.exports.map((e, i) => (
						<span key={i} style={{
							fontSize: 11,
							fontFamily: 'ui-monospace, monospace',
							padding: '2px 8px',
							borderRadius: 20,
							border: `1px solid ${color}55`,
							color,
							background: `${color}18`,
						}}>{e}</span>
					))}
				</div>
			)}
		</div>
	);
};

/** Orthogonal (elbow) routing so edges don't cut diagonally across the diagram. */
function edgePath(a: ArchNode, b: ArchNode, i: number): string {
	const stagger = ((i % 5) - 2) * 7; // spread parallel lanes apart
	const below = b.y > a.y + a.h + 6;
	const above = b.y + b.h + 6 < a.y;
	if (below || above) {
		const sx = a.x + a.w / 2;
		const sy = below ? a.y + a.h : a.y;
		const tx = b.x + b.w / 2;
		const ty = below ? b.y : b.y + b.h;
		const midY = (sy + ty) / 2 + stagger;
		return `M ${sx} ${sy} V ${midY} H ${tx} V ${ty}`;
	}
	// same band — connect the sides with a horizontal elbow
	const l2r = b.x + b.w / 2 >= a.x + a.w / 2;
	const sx = l2r ? a.x + a.w : a.x;
	const tx = l2r ? b.x : b.x + b.w;
	const sy = a.y + a.h / 2;
	const ty = b.y + b.h / 2;
	const midX = (sx + tx) / 2;
	return `M ${sx} ${sy} H ${midX} V ${ty} H ${tx}`;
}

export default function LearnPage() {
	const [activeFlowId, setActiveFlowId] = useState<string | null>(null);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [activeSeqId, setActiveSeqId] = useState<string | null>(null);
	const [stepIdx, setStepIdx] = useState(0);
	const [activePatternId, setActivePatternId] = useState<string | null>(null);
	const [activeAdrId, setActiveAdrId] = useState<string | null>(null);
	const [heatmap, setHeatmap] = useState(false);
	const [glossaryOpen, setGlossaryOpen] = useState(false);
	const [demo, setDemo] = useState<DemoId | null>(null);

	const activeFlow = flows.find((f) => f.id === activeFlowId) ?? null;
	const activeSet = activeFlow ? new Set(activeFlow.path) : null;
	const selected = selectedId ? byId(selectedId) : null;
	const activeSeq = sequences.find((s) => s.id === activeSeqId) ?? null;
	const currentStep = activeSeq ? activeSeq.steps[stepIdx] : null;
	const seqNodeIds = activeSeq ? new Set(activeSeq.steps.map((s) => s.nodeId)) : null;
	const activePattern = patterns.find((p) => p.id === activePatternId) ?? null;
	const patternNodeIds = activePattern ? new Set(activePattern.nodes) : null;
	const activeAdr = adrs.find((a) => a.id === activeAdrId) ?? null;
	const adrNodeIds = activeAdr ? new Set(activeAdr.nodes) : null;

	const isActive = (id: string) => !activeSet || activeSet.has(id);

	function clearOverlays() {
		setActiveSeqId(null); setStepIdx(0);
		setActivePatternId(null);
		setActiveAdrId(null);
		setGlossaryOpen(false);
		setHeatmap(false);
		setDemo(null);
	}
	function startSeq(id: string) {
		clearOverlays();
		setActiveSeqId(id);
		setSelectedId(null);
		setActiveFlowId(null);
	}
	function exitSeq() {
		setActiveSeqId(null);
		setStepIdx(0);
	}
	function startPattern(id: string) {
		clearOverlays();
		setActivePatternId(id);
		setSelectedId(null);
		setActiveFlowId(null);
	}
	function exitPattern() { setActivePatternId(null); }
	function startAdr(id: string) {
		clearOverlays();
		setActiveAdrId(id);
		setSelectedId(null);
		setActiveFlowId(null);
	}
	function exitAdr() { setActiveAdrId(null); }
	function prevStep() { setStepIdx((i) => Math.max(0, i - 1)); }
	function nextStep() { setStepIdx((i) => Math.min(activeSeq!.steps.length - 1, i + 1)); }

	return (
		<div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
			{/* top bar */}
			<div className="px-6 pt-8 pb-4">
				<Link href="/" className="text-sm text-white/50 hover:text-white transition">
					← Examples
				</Link>
				<h1 className="text-2xl font-bold mt-4">Web3D — full architecture</h1>
				<p className="text-white/60 mt-2 max-w-3xl">
					Every Web3D class, laid out in layers (pages → hooks → components →
					shapes → lib → server). Pick a flow or trace a runtime sequence. Click
					any box to drill into its module breakdown.
				</p>

				{/* Flow selector */}
				<div className="mt-4 flex flex-wrap gap-2 items-center">
					<span className="text-xs text-white/35 w-14 shrink-0">Flows</span>
					<button
						onClick={() => { clearOverlays(); setActiveFlowId(null); }}
						className={`px-3 py-1.5 rounded-lg text-sm border transition ${
							activeFlowId === null && !activeSeq && !activePattern && !activeAdr
								? 'border-white/40 bg-white/15'
								: 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
						}`}
					>
						Show all
					</button>
					{flows.map((f) => (
						<button
							key={f.id}
							onClick={() => { clearOverlays(); setActiveFlowId(f.id); }}
							className={`px-3 py-1.5 rounded-lg text-sm border transition ${
								activeFlowId === f.id
									? 'border-violet-400 bg-violet-400/15'
									: 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
							}`}
						>
							{f.title}
						</button>
					))}
				</div>

				{/* Sequence selector */}
				<div className="mt-2 flex flex-wrap gap-2 items-center">
					<span className="text-xs text-white/35 w-14 shrink-0">Traces</span>
					{sequences.map((s) => (
						<button
							key={s.id}
							onClick={() => startSeq(s.id)}
							className={`px-3 py-1.5 rounded-lg text-sm border transition ${
								activeSeqId === s.id
									? 'border-amber-400 bg-amber-400/15 text-amber-200'
									: 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
							}`}
						>
							▶ {s.title}
						</button>
					))}
				</div>

				{/* Pattern selector */}
				<div className="mt-2 flex flex-wrap gap-2 items-center">
					<span className="text-xs text-white/35 w-14 shrink-0">Patterns</span>
					{patterns.map((p) => (
						<button
							key={p.id}
							onClick={() => startPattern(p.id)}
							className={`px-3 py-1.5 rounded-lg text-sm border transition ${
								activePatternId === p.id
									? 'border-emerald-400 bg-emerald-400/15 text-emerald-200'
									: 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
							}`}
						>
							{p.name}
						</button>
					))}
				</div>

				{/* ADR selector */}
				<div className="mt-2 flex flex-wrap gap-2 items-center">
					<span className="text-xs text-white/35 w-14 shrink-0">ADRs</span>
					{adrs.map((a) => (
						<button
							key={a.id}
							onClick={() => startAdr(a.id)}
							className={`px-3 py-1.5 rounded-lg text-sm border transition ${
								activeAdrId === a.id
									? 'border-sky-400 bg-sky-400/15 text-sky-200'
									: 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
							}`}
						>
							{a.title.replace(/^Use /, '').replace(/^Implement /, '').replace(/^Serve /, '')}
						</button>
					))}
				</div>

				{/* View tools */}
				<div className="mt-2 flex flex-wrap gap-2 items-center">
					<span className="text-xs text-white/35 w-14 shrink-0">View</span>
					<button
						onClick={() => { setHeatmap((v) => !v); if (!heatmap) { setGlossaryOpen(false); } }}
						className={`px-3 py-1.5 rounded-lg text-sm border transition ${
							heatmap
								? 'border-rose-400 bg-rose-400/15 text-rose-200'
								: 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
						}`}
					>
						Heatmap
					</button>
					<button
						onClick={() => { setGlossaryOpen((v) => !v); if (!glossaryOpen) setHeatmap(false); }}
						className={`px-3 py-1.5 rounded-lg text-sm border transition ${
							glossaryOpen
								? 'border-fuchsia-400 bg-fuchsia-400/15 text-fuchsia-200'
								: 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
						}`}
					>
						Glossary
					</button>
					{([
						{ id: 'panel', label: 'Panel Demo' },
						{ id: 'shapes', label: 'Shapes Demo' },
						{ id: 'map', label: 'Scene Map' },
						{ id: 'grid', label: 'Grid Layout' },
					] as const).map((d) => (
						<button
							key={d.id}
							onClick={() => { const on = demo === d.id; clearOverlays(); setDemo(on ? null : d.id); }}
							className={`px-3 py-1.5 rounded-lg text-sm border transition ${
								demo === d.id
									? 'border-cyan-400 bg-cyan-400/15 text-cyan-200'
									: 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
							}`}
						>
							{d.label}
						</button>
					))}
				</div>

				{activeFlow?.note && !activeSeq && !activeAdr && (
					<p className="mt-3 text-sm text-violet-200/90 bg-violet-400/10 border border-violet-400/30 rounded-lg px-4 py-2 max-w-3xl">
						{activeFlow.note}
					</p>
				)}
			</div>

			{/* 75 / 25 split */}
			<div className="flex items-start gap-4 px-6 pb-10">

				{/* left — diagram or an interactive demo */}
				<div className="w-3/4 min-w-0">
					{demo ? (
						<div style={{ height: 560 }}>
							{demo === 'panel' && <PanelCullingDemo />}
							{demo === 'shapes' && <ShapeStrategyDemo />}
							{demo === 'map' && <BijectiveMapDemo />}
							{demo === 'grid' && <ComparativeGridDemo />}
						</div>
					) : null}
					<div className={demo ? 'hidden' : 'rounded-xl border border-white/10 bg-black/30 p-2'}>
						<svg
							viewBox={`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`}
							className="w-full h-auto"
							fontFamily="ui-sans-serif, system-ui, sans-serif"
						>
							<defs>
								<marker id="arr-on" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
									<path d="M0,0 L6,3 L0,6" fill="#cbd5e1" />
								</marker>
								<marker id="arr-seq" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
									<path d="M0,0 L6,3 L0,6" fill="#f59e0b" />
								</marker>
							</defs>

							{/* normal edges — visible when a node is selected and no sequence active */}
							{!activeSeq && selectedId &&
								edges.map((e, i) => {
									if (e.from !== selectedId && e.to !== selectedId) return null;
									return (
										<path key={i} d={edgePath(byId(e.from), byId(e.to), i)}
											fill="none" stroke="#cbd5e1" strokeWidth={2} markerEnd="url(#arr-on)" />
									);
								})}

							{/* sequence: visited trail (dim amber) */}
							{activeSeq && activeSeq.steps.slice(1, stepIdx + 1).map((step, i) => {
								const prev = byId(activeSeq.steps[i].nodeId);
								const curr = byId(step.nodeId);
								if (prev.id === curr.id) return null;
								const isLatest = i === stepIdx - 1;
								return (
									<path key={i} d={edgePath(prev, curr, i)}
										fill="none"
										stroke="#f59e0b"
										strokeWidth={isLatest ? 2.5 : 1.5}
										strokeOpacity={isLatest ? 1 : 0.3}
										markerEnd="url(#arr-seq)" />
								);
							})}

							{/* nodes */}
							{nodes.map((n) => {
								const color = GROUP_COLOR[n.group];
								const isCurrent = activeSeq && n.id === currentStep?.nodeId;
								const inSeq = seqNodeIds?.has(n.id);
								const inPattern = patternNodeIds?.has(n.id);
								const inAdr = adrNodeIds?.has(n.id);
								const opacity = activeSeq
									? (isCurrent ? 1 : inSeq ? 0.4 : 0.07)
									: activePattern
										? (inPattern ? 1 : 0.07)
										: activeAdr
											? (inAdr ? 1 : 0.07)
											: heatmap
												? 1
												: (isActive(n.id) ? 1 : 0.22);
								const isSel = activeSeq ? isCurrent
									: activePattern ? inPattern
									: activeAdr ? inAdr
									: selectedId === n.id;
								const nodeColor = heatmap ? heatColor(n.id) : color;

								return (
									<g key={n.id}
										transform={`translate(${n.x},${n.y})`}
										onClick={() => { exitSeq(); exitPattern(); exitAdr(); setGlossaryOpen(false); setSelectedId(n.id); }}
										style={{ cursor: 'pointer' }}
										opacity={opacity}
									>
										<rect
											width={n.w} height={n.h} rx={8}
											fill={isCurrent ? '#f59e0b' : inPattern ? '#34d399' : inAdr ? '#38bdf8' : nodeColor}
											fillOpacity={isCurrent ? 0.22 : (inPattern || inAdr) ? 0.18 : isSel ? 0.28 : heatmap ? 0.20 : 0.13}
											stroke={isCurrent ? '#f59e0b' : inPattern ? '#34d399' : inAdr ? '#38bdf8' : isSel ? '#ffffff' : nodeColor}
											strokeWidth={isCurrent ? 3 : (inPattern || inAdr) ? 2.5 : isSel ? 3 : 2}
											strokeDasharray={n.dashed ? '5 5' : undefined}
										/>
										<text x={n.w / 2} y={n.sub ? n.h / 2 - 2 : n.h / 2 + 4}
											textAnchor="middle" fill="#ffffff" fontSize={13} fontWeight={700}>
											{n.label}
										</text>
										{n.sub && (
											<text x={n.w / 2} y={n.h / 2 + 14}
												textAnchor="middle" fill="#cbd5e1" fontSize={10}>
												{n.sub}
											</text>
										)}
										{/* step number badge */}
										{activeSeq && inSeq && (() => {
											const num = activeSeq.steps.findIndex((s) => s.nodeId === n.id);
											if (num < 0) return null;
											return (
												<g transform={`translate(${n.w - 10}, -8)`}>
													<circle r={8} fill={isCurrent ? '#f59e0b' : '#27272a'} stroke={isCurrent ? '#f59e0b' : '#52525b'} strokeWidth={1} />
													<text x={0} y={4} textAnchor="middle" fill={isCurrent ? '#1c1917' : '#a1a1aa'} fontSize={9} fontWeight={700}>
														{num + 1}
													</text>
												</g>
											);
										})()}
									</g>
								);
							})}
						</svg>
					</div>

					{/* legend */}
					{!heatmap && (
						<div className="mt-3 flex flex-wrap gap-4 text-xs text-white/60">
							{(Object.keys(GROUP_COLOR) as Group[]).map((g) => (
								<span key={g} className="flex items-center gap-1.5">
									<span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: GROUP_COLOR[g] }} />
									{GROUP_LABEL[g]}
								</span>
							))}
							<span className="text-white/40">· dashed = not implemented</span>
						</div>
					)}
					{heatmap && (
						<div className="mt-3 flex flex-wrap gap-4 text-xs text-white/60">
							{[
								{ color: '#93c5fd', label: '1 connection (leaf)' },
								{ color: '#34d399', label: '2–3 connections' },
								{ color: '#f59e0b', label: '4–5 connections' },
								{ color: '#f87171', label: '6+ connections (central)' },
							].map(({ color, label }) => (
								<span key={label} className="flex items-center gap-1.5">
									<span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
									{label}
								</span>
							))}
						</div>
					)}
				</div>

				{/* right — detail panel (sticky) */}
				<div className="w-1/4 min-w-0 sticky top-6 max-h-[calc(100vh-5rem)] overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-5">

					{/* ── Sequence step view ── */}
					{activeSeq && currentStep ? (() => {
						const stepNode = byId(currentStep.nodeId);
						const total = activeSeq.steps.length;
						return (
							<>
								{/* header */}
								<div className="flex items-center justify-between">
									<span className="text-xs text-amber-400 font-semibold tracking-wide uppercase">
										Trace
									</span>
									<button onClick={exitSeq} className="text-white/30 hover:text-white/70 text-sm transition">✕</button>
								</div>
								<p className="text-white/60 text-xs mt-1 mb-4 leading-snug">{activeSeq.trigger}</p>

								{/* step dots */}
								<div className="flex items-center gap-1.5 mb-4 flex-wrap">
									{activeSeq.steps.map((_, i) => (
										<button key={i} onClick={() => setStepIdx(i)}
											className="transition"
											style={{
												width: i === stepIdx ? 20 : 8, height: 8,
												borderRadius: 4,
												background: i < stepIdx ? '#f59e0b' : i === stepIdx ? '#f59e0b' : 'rgba(255,255,255,0.15)',
												opacity: i < stepIdx ? 0.5 : 1,
											}} />
									))}
									<span className="text-white/35 text-xs ml-1">{stepIdx + 1} / {total}</span>
								</div>

								{/* step action */}
								<div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 mb-4">
									<p className="text-amber-200 font-semibold text-sm leading-snug">{currentStep.action}</p>
									<p className="text-white/70 text-xs mt-2 leading-relaxed">{currentStep.detail}</p>
								</div>

								{/* module context */}
								<div className="border-t border-white/8 pt-4">
									<span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
										style={{ backgroundColor: `${GROUP_COLOR[stepNode.group]}33`, color: GROUP_COLOR[stepNode.group] }}>
										{GROUP_LABEL[stepNode.group]}
									</span>
									<p className="text-white/80 font-semibold mt-2 text-sm">{stepNode.label}</p>
									<p className="text-white/55 text-xs mt-2 leading-relaxed">{stepNode.detail.eli5}</p>
									{stepNode.detail.file && (
										<p className="mt-3 text-xs font-mono text-white/30">{stepNode.detail.file}</p>
									)}
								</div>

								{/* prev / next */}
								<div className="flex gap-2 mt-5">
									<button onClick={prevStep} disabled={stepIdx === 0}
										className="flex-1 py-2 rounded-lg border border-white/10 text-sm text-white/70 hover:bg-white/10 transition disabled:opacity-25">
										← Prev
									</button>
									<button onClick={nextStep} disabled={stepIdx === total - 1}
										className="flex-1 py-2 rounded-lg border border-amber-400/40 bg-amber-400/10 text-sm text-amber-200 hover:bg-amber-400/20 transition disabled:opacity-25">
										Next →
									</button>
								</div>
							</>
						);
					})() : null}

					{/* ── Glossary view ── */}
					{!activeSeq && !activePattern && !activeAdr && glossaryOpen && (
						<>
							<div className="flex items-center justify-between mb-4">
								<span className="text-xs font-semibold text-fuchsia-300 uppercase tracking-widest">Glossary</span>
								<button onClick={() => setGlossaryOpen(false)} className="text-white/30 hover:text-white/70 text-sm transition">✕</button>
							</div>
							<div className="flex flex-col gap-4">
								{glossary.map((g) => (
									<div key={g.term}>
										<div className="flex items-baseline gap-2 mb-1">
											<span className="text-white/90 text-sm font-semibold font-mono">{g.term}</span>
											<span className="text-white/35 text-xs italic">{g.short}</span>
										</div>
										<p className="text-white/60 text-xs leading-relaxed">{g.definition}</p>
										{g.relatedNodes && (
											<div className="flex flex-wrap gap-1 mt-2">
												{g.relatedNodes.map((nid) => {
													const n = byId(nid);
													return (
														<button key={nid}
															onClick={() => { setGlossaryOpen(false); setSelectedId(nid); }}
															className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-white/10 hover:border-white/30 transition"
															style={{ color: GROUP_COLOR[n.group] }}>
															{n.label}
														</button>
													);
												})}
											</div>
										)}
									</div>
								))}
							</div>
						</>
					)}

					{/* ── Heatmap detail (shows when a node is clicked in heatmap mode) ── */}
					{!activeSeq && !activePattern && !activeAdr && !glossaryOpen && heatmap && selected && (
						<>
							<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-400/15 text-rose-300">Heatmap</span>
							<h2 className="text-lg font-bold mt-3 leading-snug">{selected.label}</h2>
							{(() => {
								const d = degreeMap.get(selected.id)!;
								const total = d.inn + d.out;
								return (
									<div className="mt-4 grid grid-cols-3 gap-2 text-center">
										{[
											{ label: 'Fan-in', value: d.inn, note: 'modules that call this' },
											{ label: 'Fan-out', value: d.out, note: 'modules this calls' },
											{ label: 'Total', value: total, color: heatColor(selected.id) },
										].map(({ label, value, note, color }) => (
											<div key={label} className="rounded-lg border border-white/10 bg-white/5 py-3">
												<div className="text-lg font-bold" style={{ color: color ?? 'rgba(255,255,255,0.85)' }}>{value}</div>
												<div className="text-[10px] text-white/40 mt-0.5">{label}</div>
												{note && <div className="text-[9px] text-white/25 mt-0.5 leading-tight px-1">{note}</div>}
											</div>
										))}
									</div>
								);
							})()}
							<p className="text-white/60 text-xs mt-4 leading-relaxed">{selected.detail.eli5}</p>
							{selected.detail.file && <p className="mt-3 text-xs font-mono text-white/35">{selected.detail.file}</p>}
						</>
					)}

					{/* ── Pattern view ── */}
					{!activeSeq && activePattern && (
						<>
							<div className="flex items-start justify-between gap-2">
								<div>
									<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-400/15 text-emerald-300">
										{activePattern.category}
									</span>
									<h2 className="text-lg font-bold mt-2 leading-snug text-white">{activePattern.name}</h2>
									<p className="text-white/45 text-xs mt-1 italic">{activePattern.tagline}</p>
								</div>
								<button onClick={exitPattern} className="text-white/30 hover:text-white/70 text-sm transition mt-1 shrink-0">✕</button>
							</div>

							<p className="text-white/70 text-sm leading-relaxed mt-4">{activePattern.description}</p>

							<div className="mt-4 rounded-lg border border-emerald-400/25 bg-emerald-400/8 p-4">
								<div className="text-[10px] uppercase tracking-widest text-emerald-400/70 font-semibold mb-2">In this codebase</div>
								<p className="text-white/75 text-sm leading-relaxed">{activePattern.application}</p>
							</div>

							<div className="mt-4">
								<div className="text-[10px] uppercase tracking-widest text-white/30 font-semibold mb-2">Participating modules</div>
								<div className="flex flex-col gap-1">
									{activePattern.nodes.map((nid) => {
										const n = byId(nid);
										return (
											<button key={nid}
												onClick={() => { exitPattern(); setSelectedId(nid); }}
												className="flex items-center gap-2 text-left px-3 py-2 rounded-lg border border-white/8 bg-white/3 hover:bg-white/8 transition">
												<span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: GROUP_COLOR[n.group] }} />
												<span className="text-white/80 text-xs font-mono">{n.label}</span>
											</button>
										);
									})}
								</div>
							</div>

							<div className="mt-4 rounded-lg border border-violet-400/40 bg-violet-400/10 p-4">
								<div className="text-[10px] uppercase tracking-widest text-violet-300/70 font-semibold mb-2">Defense question</div>
								<p className="text-violet-100 text-sm font-medium leading-snug mb-3">"{activePattern.examQuestion}"</p>
								<p className="text-white/65 text-xs leading-relaxed">{activePattern.examAnswer}</p>
							</div>
						</>
					)}

				{/* ── ADR view ── */}
					{!activeSeq && !activePattern && activeAdr && (() => {
						const statusColor = activeAdr.status === 'accepted' ? '#34d399' : activeAdr.status === 'proposed' ? '#f59e0b' : '#f87171';
						return (
							<>
								<div className="flex items-start justify-between gap-2">
									<div>
										<span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
											style={{ background: `${statusColor}20`, color: statusColor }}>
											{activeAdr.status}
										</span>
										<h2 className="text-base font-bold mt-2 leading-snug text-white">{activeAdr.title}</h2>
									</div>
									<button onClick={exitAdr} className="text-white/30 hover:text-white/70 text-sm transition mt-1 shrink-0">✕</button>
								</div>

								<div className="mt-4">
									<div className="text-[10px] uppercase tracking-widest text-white/30 font-semibold mb-1">Context</div>
									<p className="text-white/65 text-xs leading-relaxed">{activeAdr.context}</p>
								</div>

								<div className="mt-4">
									<div className="text-[10px] uppercase tracking-widest text-white/30 font-semibold mb-2">Options considered</div>
									<div className="flex flex-col gap-2">
										{activeAdr.options.map((opt, i) => (
											<div key={i} className="rounded-lg p-3 text-xs leading-relaxed"
												style={{
													border: opt.chosen ? `1px solid ${statusColor}55` : '1px solid rgba(255,255,255,0.08)',
													background: opt.chosen ? `${statusColor}10` : 'rgba(255,255,255,0.03)',
												}}>
												<div className="flex items-center gap-1.5 mb-1">
													{opt.chosen && <span style={{ color: statusColor }}>✓</span>}
													<span className="font-semibold" style={{ color: opt.chosen ? statusColor : 'rgba(255,255,255,0.70)' }}>
														{opt.label}
													</span>
												</div>
												<p className="text-white/45">{opt.note}</p>
											</div>
										))}
									</div>
								</div>

								<div className="mt-4 rounded-lg border border-sky-400/25 bg-sky-400/8 p-4">
									<div className="text-[10px] uppercase tracking-widest text-sky-400/70 font-semibold mb-2">Decision</div>
									<p className="text-white/75 text-xs leading-relaxed">{activeAdr.decision}</p>
								</div>

								<div className="mt-3">
									<div className="text-[10px] uppercase tracking-widest text-white/30 font-semibold mb-1">Consequences</div>
									<p className="text-white/55 text-xs leading-relaxed">{activeAdr.consequences}</p>
								</div>

								<div className="mt-4">
									<div className="text-[10px] uppercase tracking-widest text-white/30 font-semibold mb-2">Affected modules</div>
									<div className="flex flex-col gap-1">
										{activeAdr.nodes.map((nid) => {
											const n = byId(nid);
											return (
												<button key={nid}
													onClick={() => { exitAdr(); setSelectedId(nid); }}
													className="flex items-center gap-2 text-left px-3 py-2 rounded-lg border border-white/8 bg-white/3 hover:bg-white/8 transition">
													<span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: GROUP_COLOR[n.group] }} />
													<span className="text-white/80 text-xs font-mono">{n.label}</span>
												</button>
											);
										})}
									</div>
								</div>
							</>
						);
					})()}

				{/* ── Normal node detail view ── */}
					{!activeSeq && !activePattern && !activeAdr && !glossaryOpen && !heatmap && (
						!selected ? (
							<p className="text-white/40 italic text-sm">
								Click any box to see its module breakdown, or pick a flow, trace, pattern, ADR, or view tool above.
							</p>
						) : (
							<>
								<span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
									style={{ backgroundColor: `${GROUP_COLOR[selected.group]}33`, color: GROUP_COLOR[selected.group] }}>
									{GROUP_LABEL[selected.group]}
								</span>
								<h2 className="text-lg font-bold mt-3 leading-snug">{selected.label}</h2>

								<BlockDiagram node={selected} />

								<p className="text-white/75 text-sm leading-relaxed">{selected.detail.eli5}</p>
								{selected.detail.file && (
									<p className="mt-4 text-xs font-mono text-white/40">{selected.detail.file}</p>
								)}
								{selected.detail.code && (
									<pre className="mt-2 rounded-lg bg-black/50 border border-white/10 p-3 overflow-x-auto text-xs font-mono text-white/90 leading-relaxed">
										{selected.detail.code}
									</pre>
								)}
								{selected.detail.why && (
									<div className="mt-4 rounded-lg border border-violet-400/40 bg-violet-400/10 p-4">
										<p className="text-white/80 text-sm leading-relaxed">{selected.detail.why}</p>
									</div>
								)}
							</>
						)
					)}
				</div>

			</div>
		</div>
	);
}
