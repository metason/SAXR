'use client';
/**
 * @module EditorRunWalkthrough
 * A focused slice of the /learn architecture explorer: the node graph plus the
 * "Editor → Run" sequence stepper, and nothing else. Steps through what happens
 * on a Run — the involved classes light up with arrows, dimming the rest — so it
 * can be embedded 1:1 in the viewer behind a button. Data + layout are reused from
 * architecture.ts so it stays in sync with the full explorer.
 */

import React, { useState } from 'react';
import { nodes, sequences, VIEWBOX, type Group, type ArchNode } from '@/app/learn/architecture';

const GROUP_COLOR: Record<Group, string> = {
	pipeline: '#1D9E75',
	lib: '#EF9F27',
	hook: '#7F77DD',
	component: '#378ADD',
	api: '#D4537E',
};
const GROUP_LABEL: Record<Group, string> = {
	pipeline: 'Pipeline output',
	lib: 'Lib (pure helper)',
	hook: 'Hook (state)',
	component: 'Component (render/UI)',
	api: 'API route (server)',
};

const byId = (id: string) => nodes.find((n) => n.id === id)!;

/** Orthogonal elbow path between two node boxes — copied from the /learn diagram. */
function edgePath(a: ArchNode, b: ArchNode, i: number): string {
	const stagger = ((i % 5) - 2) * 7;
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
	const l2r = b.x + b.w / 2 >= a.x + a.w / 2;
	const sx = l2r ? a.x + a.w : a.x;
	const tx = l2r ? b.x : b.x + b.w;
	const sy = a.y + a.h / 2;
	const ty = b.y + b.h / 2;
	const midX = (sx + tx) / 2;
	return `M ${sx} ${sy} H ${midX} V ${ty} H ${tx}`;
}

export default function EditorRunWalkthrough() {
	const seq = sequences.find((s) => s.id === 'editor-run')!;
	const total = seq.steps.length;
	const [stepIdx, setStepIdx] = useState(0);

	const currentStep = seq.steps[stepIdx];
	const seqNodeIds = new Set(seq.steps.map((s) => s.nodeId));
	const stepNode = byId(currentStep.nodeId);
	const groupsUsed = Array.from(new Set(seq.steps.map((s) => byId(s.nodeId).group)));

	const prev = () => setStepIdx((i) => Math.max(0, i - 1));
	const next = () => setStepIdx((i) => Math.min(total - 1, i + 1));
	// Jump to a node's first appearance in the sequence when clicked.
	const jumpToNode = (id: string) => {
		const idx = seq.steps.findIndex((s) => s.nodeId === id);
		if (idx >= 0) setStepIdx(idx);
	};

	return (
		<div className="flex items-stretch gap-4 h-full w-full p-5 text-white">
			{/* left — diagram */}
			<div className="flex-1 min-w-0 overflow-auto">
				<div className="rounded-xl border border-white/10 bg-black/30 p-2">
					<svg viewBox={`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`} className="w-full h-auto" fontFamily="ui-sans-serif, system-ui, sans-serif">
						<defs>
							<marker id="erw-arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
								<path d="M0,0 L6,3 L0,6" fill="#f59e0b" />
							</marker>
						</defs>

						{/* sequence trail: edges between consecutive visited steps */}
						{seq.steps.slice(1, stepIdx + 1).map((step, i) => {
							const a = byId(seq.steps[i].nodeId);
							const b = byId(step.nodeId);
							if (a.id === b.id) return null;
							const isLatest = i === stepIdx - 1;
							return (
								<path key={i} d={edgePath(a, b, i)} fill="none" stroke="#f59e0b"
									strokeWidth={isLatest ? 2.5 : 1.5} strokeOpacity={isLatest ? 1 : 0.3} markerEnd="url(#erw-arr)" />
							);
						})}

						{/* nodes — only the sequence's classes are lit; the rest fade back */}
						{nodes.map((n) => {
							const isCurrent = n.id === currentStep.nodeId;
							const inSeq = seqNodeIds.has(n.id);
							const opacity = isCurrent ? 1 : inSeq ? 0.45 : 0.06;
							const color = GROUP_COLOR[n.group];
							return (
								<g key={n.id} transform={`translate(${n.x},${n.y})`} opacity={opacity}
									onClick={() => jumpToNode(n.id)} style={{ cursor: inSeq ? 'pointer' : 'default' }}>
									<rect width={n.w} height={n.h} rx={8}
										fill={isCurrent ? '#f59e0b' : color}
										fillOpacity={isCurrent ? 0.22 : 0.13}
										stroke={isCurrent ? '#f59e0b' : color}
										strokeWidth={isCurrent ? 3 : 2}
										strokeDasharray={n.dashed ? '5 5' : undefined} />
									<text x={n.w / 2} y={n.sub ? n.h / 2 - 2 : n.h / 2 + 4} textAnchor="middle" fill="#fff" fontSize={13} fontWeight={700}>{n.label}</text>
									{n.sub && <text x={n.w / 2} y={n.h / 2 + 14} textAnchor="middle" fill="#cbd5e1" fontSize={10}>{n.sub}</text>}
									{inSeq && (() => {
										const num = seq.steps.findIndex((s) => s.nodeId === n.id);
										return (
											<g transform={`translate(${n.w - 10}, -8)`}>
												<circle r={8} fill={isCurrent ? '#f59e0b' : '#27272a'} stroke={isCurrent ? '#f59e0b' : '#52525b'} strokeWidth={1} />
												<text x={0} y={4} textAnchor="middle" fill={isCurrent ? '#1c1917' : '#a1a1aa'} fontSize={9} fontWeight={700}>{num + 1}</text>
											</g>
										);
									})()}
								</g>
							);
						})}
					</svg>
				</div>

				{/* legend — only the groups this sequence touches */}
				<div className="mt-3 flex flex-wrap gap-4 text-xs text-white/60">
					{groupsUsed.map((g) => (
						<span key={g} className="flex items-center gap-1.5">
							<span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: GROUP_COLOR[g] }} />
							{GROUP_LABEL[g]}
						</span>
					))}
				</div>
			</div>

			{/* right — the trace stepper */}
			<div className="w-[340px] shrink-0 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-5">
				<div className="flex items-center justify-between">
					<span className="text-xs text-amber-400 font-semibold tracking-wide uppercase">Trace · {seq.title}</span>
				</div>
				<p className="text-white/60 text-xs mt-1 mb-4 leading-snug">{seq.trigger}</p>

				{/* step dots */}
				<div className="flex items-center gap-1.5 mb-4 flex-wrap">
					{seq.steps.map((_, i) => (
						<button key={i} onClick={() => setStepIdx(i)} className="transition"
							style={{ width: i === stepIdx ? 20 : 8, height: 8, borderRadius: 4,
								background: i <= stepIdx ? '#f59e0b' : 'rgba(255,255,255,0.15)', opacity: i < stepIdx ? 0.5 : 1 }} />
					))}
					<span className="text-white/35 text-xs ml-1">{stepIdx + 1} / {total}</span>
				</div>

				{/* action */}
				<div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 mb-4">
					<p className="text-amber-200 font-semibold text-sm leading-snug">{currentStep.action}</p>
					<p className="text-white/70 text-xs mt-2 leading-relaxed">{currentStep.detail}</p>
				</div>

				{/* module context */}
				<div className="border-t border-white/10 pt-4">
					<span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
						style={{ backgroundColor: `${GROUP_COLOR[stepNode.group]}33`, color: GROUP_COLOR[stepNode.group] }}>
						{GROUP_LABEL[stepNode.group]}
					</span>
					<p className="text-white/80 font-semibold mt-2 text-sm">{stepNode.label}</p>
					<p className="text-white/55 text-xs mt-2 leading-relaxed">{stepNode.detail.eli5}</p>
					{stepNode.detail.file && <p className="mt-3 text-xs font-mono text-white/30">{stepNode.detail.file}</p>}
				</div>

				{/* prev / next */}
				<div className="flex gap-2 mt-5">
					<button onClick={prev} disabled={stepIdx === 0}
						className="flex-1 py-2 rounded-lg border border-white/10 text-sm text-white/70 hover:bg-white/10 transition disabled:opacity-25">
						← Prev
					</button>
					<button onClick={next} disabled={stepIdx === total - 1}
						className="flex-1 py-2 rounded-lg border border-amber-400/40 bg-amber-400/10 text-sm text-amber-200 hover:bg-amber-400/20 transition disabled:opacity-25">
						Next →
					</button>
				</div>
			</div>
		</div>
	);
}
