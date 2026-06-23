'use client';
/**
 * @module ShowcaseDiagram
 * Live architecture diagram for the editor's Showcase Mode (§6.2.9). Each node is a
 * real class/method in the pipeline; nodes light up as the matching trace step fires:
 * client validation (Monaco + AJV) → Next.js API (syntax + AJV re-validation + spawn)
 * → datarepgen.py (DataRepGenerator) → Web3D render path. Node states are derived from
 * the same trace the text panel shows, so the diagram and the log never disagree.
 */

import React from 'react';
import {
	computeNodeStates,
	type NodeId,
	type NodeState,
	type TraceStep,
} from '@/lib/showcaseTrace';

interface Lane {
	key: string;
	label: string;
	color: string;
	nodes: Array<{ id: NodeId; title: string; role: string }>;
}

/** The pipeline laid out as four lanes of real classes/methods. */
const LANES: Lane[] = [
	{
		key: 'client',
		label: 'Web3D · EditorPanel (browser)',
		color: '#a78bfa',
		nodes: [
			{ id: 'monaco', title: 'Monaco + JSON.parse', role: 'syntax gate' },
			{ id: 'ajv-client', title: 'Ajv2020.validate()', role: 'live schema check' },
			{ id: 'jsonc', title: 'jsonc-parser', role: '→ Monaco markers' },
			{ id: 'post', title: 'fetch POST', role: '/api/run-pipeline' },
		],
	},
	{
		key: 'server',
		label: 'Next.js · /api/run-pipeline',
		color: '#22d3ee',
		nodes: [
			{ id: 'syntax', title: 'JSON.parse()', role: 'syntax check' },
			{ id: 'ajv-server', title: 'Ajv.validate()', role: 'trust boundary' },
			{ id: 'write', title: 'fs.writeFile()', role: 'config.json' },
			{ id: 'spawn', title: 'child_process.spawn', role: 'python datarepgen.py' },
		],
	},
	{
		key: 'python',
		label: 'Python · DataRepGenerator.run()',
		color: '#fbbf24',
		nodes: [
			{ id: 'py-validate', title: 'validate_config()', role: 'schema (server-side)' },
			{ id: 'py-execute', title: 'execute()', role: 'load data + encoding' },
			{ id: 'py-panels', title: 'createPanels()', role: 'Matplotlib panels' },
			{ id: 'py-dataviz', title: 'createDataViz()', role: 'build DataReps' },
			{ id: 'py-save', title: 'saveVizRep()', role: '→ datareps.json' },
		],
	},
	{
		key: 'render',
		label: 'Web3D · Viewer (re-render)',
		color: '#34d399',
		nodes: [
			{ id: 'parseviz', title: 'parseViz()', role: 'stage + scenes' },
			{ id: 'dispatch', title: 'SHAPE_REGISTRY', role: 'type → component' },
			{ id: 'render', title: 'DataVizCanvas', role: 'three.js render' },
		],
	},
];

const STATE_GLYPH: Record<NodeState, string> = {
	idle: '○',
	active: '◍',
	done: '✓',
	error: '✗',
};

function nodeStyle(state: NodeState, laneColor: string): React.CSSProperties {
	const base: React.CSSProperties = {
		borderRadius: 8,
		padding: '6px 9px',
		display: 'flex',
		alignItems: 'center',
		gap: 8,
		transition: 'all 220ms ease',
		border: '1px solid',
	};
	switch (state) {
		case 'done':
			return { ...base, background: `${laneColor}1f`, borderColor: laneColor, opacity: 1 };
		case 'active':
			return {
				...base,
				background: '#fbbf2422',
				borderColor: '#fbbf24',
				opacity: 1,
				animation: 'saxrPulse 1s ease-in-out infinite',
			};
		case 'error':
			return { ...base, background: '#7f1d1d33', borderColor: '#ef4444', opacity: 1 };
		default:
			return {
				...base,
				background: 'rgba(255,255,255,0.02)',
				borderColor: 'rgba(255,255,255,0.08)',
				opacity: 0.45,
			};
	}
}

function glyphColor(state: NodeState, laneColor: string): string {
	if (state === 'error') return '#f87171';
	if (state === 'active') return '#fbbf24';
	if (state === 'done') return laneColor;
	return 'rgba(255,255,255,0.3)';
}

/** Nodes that expand into an explainer when clicked. */
const EXPLAINABLE: Partial<Record<NodeId, 'ajv'>> = {
	'ajv-client': 'ajv',
	'ajv-server': 'ajv',
};

export default function ShowcaseDiagram({
	clientTrace,
	runTrace,
	isRunning,
	onSelectNode,
}: {
	clientTrace: TraceStep[];
	runTrace: TraceStep[];
	isRunning: boolean;
	onSelectNode?: (topic: 'ajv') => void;
}) {
	const states = computeNodeStates(clientTrace, runTrace, isRunning);

	return (
		<div style={{ padding: '12px 12px 4px', overflowY: 'auto' }}>
			<style>{`@keyframes saxrPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(251,191,36,0.0);} 50% { box-shadow: 0 0 0 4px rgba(251,191,36,0.18);} }`}</style>

			{LANES.map((lane, li) => (
				<div key={lane.key} style={{ marginBottom: 10 }}>
					{/* lane header */}
					<div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
						<span style={{ width: 8, height: 8, borderRadius: 2, background: lane.color, flexShrink: 0 }} />
						<span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', color: lane.color }}>
							{lane.label}
						</span>
					</div>

					{/* nodes, connected by a coloured spine */}
					<div style={{ borderLeft: `2px solid ${lane.color}33`, marginLeft: 3, paddingLeft: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
						{lane.nodes.map((n) => {
							const st = states[n.id];
							const topic = EXPLAINABLE[n.id];
							const clickable = topic && onSelectNode;
							const style = nodeStyle(st, lane.color);
							return (
								<div
									key={n.id}
									onClick={clickable ? () => onSelectNode!(topic!) : undefined}
									title={clickable ? 'Click to see how AJV works' : undefined}
									style={{ ...style, cursor: clickable ? 'pointer' : 'default' }}
								>
									<span style={{ fontSize: 13, color: glyphColor(st, lane.color), flexShrink: 0, width: 14, textAlign: 'center' }}>
										{STATE_GLYPH[st]}
									</span>
									<span style={{ fontFamily: 'monospace', fontSize: 12, color: st === 'idle' ? 'rgba(255,255,255,0.5)' : '#fff', fontWeight: 600 }}>
										{n.title}
									</span>
									{clickable && (
										<span style={{ fontSize: 11, color: lane.color, flexShrink: 0, marginLeft: 'auto' }} aria-hidden>
											🔍
										</span>
									)}
									<span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.4)', marginLeft: clickable ? 6 : 'auto', textAlign: 'right', flexShrink: 0 }}>
										{n.role}
									</span>
								</div>
							);
						})}
					</div>

					{/* connector arrow between lanes */}
					{li < LANES.length - 1 && (
						<div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 12, marginTop: 4 }}>↓</div>
					)}
				</div>
			))}
		</div>
	);
}
