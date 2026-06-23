'use client';
/**
 * @module TracePanel
 * The walkthrough surface for the editor's Showcase Mode (§6.2.9). Renders two
 * groups of TraceSteps: the live client validation (AJV + Monaco, checkpoints 1+2,
 * updated per keystroke) and the last Run's server round-trip (Python re-validation
 * + datarepgen.py + datareps.json readout, checkpoint 3 + output). Every number it
 * shows comes from real validation/pipeline output; only the stage prose is fixed.
 */

import React from 'react';
import type { TraceStep, TraceLevel } from '@/lib/showcaseTrace';

const LEVEL_COLOR: Record<TraceLevel, string> = {
	success: '#4ade80',
	error: '#f87171',
	info: '#60a5fa',
	detail: 'rgba(255,255,255,0.45)',
	pending: '#fbbf24',
};

const LEVEL_GLYPH: Record<TraceLevel, string> = {
	success: '✓',
	error: '✗',
	info: '•',
	detail: '↳',
	pending: '…',
};

const STAGE_LABEL: Record<NonNullable<TraceStep['stage']>, string> = {
	client: 'CLIENT',
	server: 'SERVER',
	output: 'OUTPUT',
};

const STAGE_COLOR: Record<NonNullable<TraceStep['stage']>, string> = {
	client: '#a78bfa',
	server: '#22d3ee',
	output: '#34d399',
};

function TraceLine({ step }: { step: TraceStep }) {
	const color = LEVEL_COLOR[step.level];
	return (
		<div style={{ display: 'flex', gap: 8, padding: '3px 0', alignItems: 'baseline' }}>
			{step.stage && (
				<span
					style={{
						flexShrink: 0,
						width: 50,
						fontSize: 9,
						fontWeight: 700,
						letterSpacing: '0.05em',
						color: STAGE_COLOR[step.stage],
						fontFamily: 'monospace',
						opacity: 0.8,
					}}
				>
					{STAGE_LABEL[step.stage]}
				</span>
			)}
			<span style={{ flexShrink: 0, color, fontFamily: 'monospace', fontSize: 12 }}>
				{LEVEL_GLYPH[step.level]}
			</span>
			<div style={{ minWidth: 0, flex: 1 }}>
				<div style={{ fontSize: 12, color: color === LEVEL_COLOR.detail ? 'rgba(255,255,255,0.7)' : color, fontWeight: 600 }}>
					{step.label}
					{typeof step.ms === 'number' && (
						<span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400, marginLeft: 6, fontFamily: 'monospace' }}>
							{step.ms}ms
						</span>
					)}
				</div>
				{step.detail && (
					<div
						style={{
							fontSize: 11,
							color: 'rgba(255,255,255,0.4)',
							fontFamily: 'monospace',
							whiteSpace: 'pre-wrap',
							wordBreak: 'break-word',
							marginTop: 1,
						}}
					>
						{step.detail}
					</div>
				)}
			</div>
		</div>
	);
}

function Section({ title, steps, empty }: { title: string; steps: TraceStep[]; empty: string }) {
	return (
		<div style={{ marginBottom: 10 }}>
			<div
				style={{
					fontSize: 9.5,
					fontWeight: 700,
					letterSpacing: '0.1em',
					textTransform: 'uppercase',
					color: '#64748b',
					marginBottom: 4,
				}}
			>
				{title}
			</div>
			{steps.length === 0 ? (
				<div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>{empty}</div>
			) : (
				steps.map((s, i) => <TraceLine key={i} step={s} />)
			)}
		</div>
	);
}

export default function TracePanel({
	clientTrace,
	runTrace,
}: {
	clientTrace: TraceStep[];
	runTrace: TraceStep[];
}) {
	return (
		<div
			style={{
				flex: 1,
				minHeight: 0,
				overflowY: 'auto',
				background: '#0a0d14',
				borderTop: '1px solid rgba(255,255,255,0.1)',
				padding: '10px 12px',
			}}
		>
			<Section
				title="Live validation — AJV + Monaco (per keystroke)"
				steps={clientTrace}
				empty="Start typing to see live schema validation…"
			/>
			<Section
				title="Run walkthrough — server + pipeline"
				steps={runTrace}
				empty="Hit Run to trace the pipeline end-to-end…"
			/>
		</div>
	);
}
