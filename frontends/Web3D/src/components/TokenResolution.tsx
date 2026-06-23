'use client';
/**
 * @module TokenResolution
 * Shows how an AJV error's logical path becomes a squiggle on exact characters
 * (§6.2.9), visually: the highlight zooms from the whole document → the `scenes`
 * array → the indexed object → the single value, exactly as findNodeAtLocation
 * narrows the node region. The final token gets the red wavy underline a Monaco
 * marker would draw. Runs the real {@link resolvePath} / {@link resolveToken}.
 */

import React, { useEffect, useRef, useState } from 'react';
import type { AjvErrorLite } from '@/lib/showcaseTrace';
import { resolvePath, resolveToken } from '@/lib/tokenResolution';

const STEP_MS = 950;

export default function TokenResolution({
	text,
	error,
}: {
	text: string;
	error: AjvErrorLite;
}) {
	const steps = resolvePath(text, error.instancePath);
	const final = resolveToken(text, error.instancePath, error.params?.missingProperty as string | undefined);
	const markRef = useRef<HTMLSpanElement | null>(null);

	// depth = which zoom level is currently shown (0 = whole document). The parent
	// passes a `key` so a new error/text remounts this and restarts at 0.
	const [depth, setDepth] = useState(0);
	const last = (steps?.length ?? 1) - 1;

	useEffect(() => {
		if (!steps || depth >= last) return;
		const id = setTimeout(() => setDepth((d) => d + 1), STEP_MS);
		return () => clearTimeout(id);
	}, [steps, depth, last]);

	useEffect(() => {
		if (depth === last) markRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
	}, [depth, last]);

	if (!steps || !final) {
		return <div style={{ fontSize: 11, color: '#f87171', fontFamily: 'monospace' }}>Source not parseable.</div>;
	}

	const region = steps[depth];
	const atToken = depth === last;
	const before = text.slice(0, region.offset);
	const inside = text.slice(region.offset, region.offset + region.length);
	const after = text.slice(region.offset + region.length);

	// Breadcrumb of the path being walked (skip the root step).
	const crumbs = steps.slice(1).map((s) => (typeof s.segment === 'number' ? `[${s.segment}]` : String(s.segment)));
	const activeCrumb = depth - 1; // depth 1 → first crumb

	return (
		<div style={{ background: '#0a0d14', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 10, padding: '10px 11px' }}>
			{/* breadcrumb: which part of the path we've drilled into */}
			<div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
				<span style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>root</span>
				{crumbs.map((c, i) => {
					const active = i === activeCrumb;
					const reached = i <= activeCrumb;
					return (
						<React.Fragment key={i}>
							<span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>▸</span>
							<span
								style={{
									fontFamily: 'monospace',
									fontSize: 11.5,
									fontWeight: active ? 700 : 600,
									padding: '1px 6px',
									borderRadius: 5,
									color: active ? '#0a0d14' : reached ? '#fff' : 'rgba(255,255,255,0.35)',
									background: active ? '#fbbf24' : reached ? 'rgba(255,255,255,0.08)' : 'transparent',
									transition: 'all 200ms ease',
								}}
							>
								{c}
							</span>
						</React.Fragment>
					);
				})}
			</div>

			{/* the actual source — highlight zooms in to the token */}
			<pre
				style={{
					margin: 0,
					maxHeight: 190,
					overflow: 'auto',
					background: '#05070c',
					border: '1px solid rgba(255,255,255,0.08)',
					borderRadius: 8,
					padding: '9px 11px',
					fontFamily: 'monospace',
					fontSize: 11.5,
					lineHeight: 1.6,
					color: 'rgba(255,255,255,0.35)',
					whiteSpace: 'pre',
				}}
			>
				{before}
				<span
					ref={markRef}
					style={{
						color: '#fff',
						background: atToken ? 'rgba(248,113,113,0.20)' : 'rgba(251,191,36,0.16)',
						boxShadow: atToken
							? 'inset 0 0 0 1px rgba(248,113,113,0.5)'
							: 'inset 0 0 0 1px rgba(251,191,36,0.45)',
						textDecoration: atToken ? 'underline wavy #f87171' : 'none',
						textUnderlineOffset: 3,
						borderRadius: 3,
						transition: 'background 250ms ease',
					}}
				>
					{inside}
				</span>
				{after}
			</pre>

			{/* one-line caption with the real numbers, revealed at the token */}
			<div style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.55)', minHeight: 18 }}>
				{atToken ? (
					<>
						<span style={{ color: '#34d399' }}>offset {final.offset}</span>
						<span style={{ color: '#64748b' }}> = chars from start → </span>
						<span style={{ color: '#f472b6' }}>line {final.start.line}, col {final.start.column}</span>
						<span style={{ color: '#64748b' }}> → squiggle on </span>
						<span style={{ color: '#f87171' }}>{final.matched}</span>
					</>
				) : (
					<span style={{ color: '#fbbf24' }}>
						findNodeAtLocation narrowing… {typeof region.segment === 'number' ? `[${region.segment}]` : region.segment ?? 'root'}
					</span>
				)}
			</div>
		</div>
	);
}
