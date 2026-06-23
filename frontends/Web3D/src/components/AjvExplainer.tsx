'use client';
/**
 * @module AjvExplainer
 * Opened by clicking the AJV node in the Showcase diagram (§6.2.9). Visualises what
 * `validate(data)` actually does: it WALKS the data field-by-field, checks each value
 * against the matching schema keyword, and collects an error object for every miss.
 * An animated pointer steps through a real scene object; passes turn green, misses
 * turn red and drop into the errors[] tray. A live section lists the editor's REAL
 * current AJV errors so the mechanism is grounded in what is on screen.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { AjvErrorLite } from '@/lib/showcaseTrace';
import TokenResolution from '@/components/TokenResolution';

/** Source text matching FIELDS, so the canned instancePaths resolve to real offsets. */
const CANNED_TEXT = `{
  "scenes": [
    {
      "type": "cube",
      "x": 0,
      "y": 0,
      "z": 0,
      "w": "3",
      "h": 1,
      "d": 1,
      "colour": "red"
    }
  ]
}`;

interface Field {
	path: string;
	value: string;
	rule: string;
	ok: boolean;
	error?: AjvErrorLite;
}

/** A representative scene object with three deliberate violations to watch AJV catch. */
const FIELDS: Field[] = [
	{ path: 'type', value: '"cube"', rule: 'enum: box│sphere│arc…', ok: false, error: { instancePath: '/scenes/0/type', keyword: 'enum', message: 'must be equal to one of the allowed values', params: { allowedValues: ['box', 'sphere', 'arc'] } } },
	{ path: 'x', value: '0', rule: 'type: number', ok: true },
	{ path: 'y', value: '0', rule: 'type: number', ok: true },
	{ path: 'z', value: '0', rule: 'type: number', ok: true },
	{ path: 'w', value: '"3"', rule: 'type: number', ok: false, error: { instancePath: '/scenes/0/w', keyword: 'type', message: 'must be number', params: { type: 'number' } } },
	{ path: 'h', value: '1', rule: 'type: number', ok: true },
	{ path: 'd', value: '1', rule: 'type: number', ok: true },
	{ path: 'colour', value: '"red"', rule: 'additionalProperties: false', ok: false, error: { instancePath: '/scenes/0', keyword: 'additionalProperties', message: 'must NOT have additional properties', params: { additionalProperty: 'colour' } } },
];

/** Walk a JSON-pointer path (already split into segments) down a parsed object. */
function resolvePointer(root: unknown, segs: string[]): unknown {
	let cur: unknown = root;
	for (const s of segs) {
		if (cur == null || typeof cur !== 'object') return undefined;
		cur = (cur as Record<string, unknown>)[s];
	}
	return cur;
}

/** Human-readable schema rule for a failing field, derived from the real AJV error. */
function ruleText(e: AjvErrorLite): string {
	switch (e.keyword) {
		case 'type':
			return `type: ${e.params?.type ?? ''}`;
		case 'enum': {
			const av = (e.params?.allowedValues as unknown[]) ?? [];
			return `enum: ${av.slice(0, 3).join('│')}${av.length > 3 ? '…' : ''}`;
		}
		case 'additionalProperties':
			return 'additionalProperties: false';
		case 'required':
			return `required: ${e.params?.missingProperty ?? ''}`;
		default:
			return e.keyword;
	}
}

/** Compact one-line preview of a field value for the walk row. */
function previewValue(v: unknown): string {
	if (Array.isArray(v)) {
		const s = JSON.stringify(v);
		return s.length <= 22 ? s : `[ ${v.length} items ]`;
	}
	if (v && typeof v === 'object') return `{ ${Object.keys(v).length} keys }`;
	return JSON.stringify(v);
}

type Walk = { fields: Field[]; label: string; live: boolean; parseError: boolean };

/**
 * Build the field-by-field walk from the editor's REAL config. It always reflects
 * what is on screen: by default it walks the `sequence` object (the most edited /
 * error-prone part); the moment you introduce an error it follows that error to its
 * object and marks the offending field red. Returns a parseError flag while the JSON
 * is mid-edit and unparseable, and null only before any config has loaded.
 */
function buildWalk(configText: string, ajvErrors: AjvErrorLite[]): Walk | null {
	if (!configText.trim()) return null;
	let root: unknown;
	try {
		root = JSON.parse(configText);
	} catch {
		return { fields: [], label: '', live: true, parseError: true };
	}

	// Pick the object to walk: the one an error implicates, else `sequence`, else root.
	let objSegs: string[];
	if (ajvErrors.length > 0) {
		const e0 = ajvErrors[0];
		const segs0 = e0.instancePath.split('/').filter(Boolean);
		const pointsAtSelf = e0.keyword === 'additionalProperties' || e0.keyword === 'required';
		objSegs = pointsAtSelf ? segs0 : segs0.slice(0, -1);
	} else {
		const seq = resolvePointer(root, ['sequence']);
		objSegs = seq && typeof seq === 'object' && !Array.isArray(seq) ? ['sequence'] : [];
	}
	// Never target an array (or a scalar) — climb to the nearest enclosing object.
	let obj = resolvePointer(root, objSegs);
	while (objSegs.length > 0 && (obj == null || typeof obj !== 'object' || Array.isArray(obj))) {
		objSegs = objSegs.slice(0, -1);
		obj = resolvePointer(root, objSegs);
	}
	if (obj == null || typeof obj !== 'object' || Array.isArray(obj)) return null;
	const objPath = '/' + objSegs.join('/');

	// Map each error to the key within this object it implicates.
	const errByKey = new Map<string, AjvErrorLite>();
	for (const e of ajvErrors) {
		const segs = e.instancePath.split('/').filter(Boolean);
		const here = '/' + segs.join('/');
		if (e.keyword === 'additionalProperties' && here === objPath) {
			const k = String(e.params?.additionalProperty ?? '');
			if (k) errByKey.set(k, e);
		} else if (e.keyword === 'required' && here === objPath) {
			const k = String(e.params?.missingProperty ?? '');
			if (k) errByKey.set('(missing) ' + k, e);
		} else {
			const parent = '/' + segs.slice(0, -1).join('/');
			if (parent === objPath) errByKey.set(segs[segs.length - 1], e);
		}
	}

	const fields: Field[] = [];
	for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
		const err = errByKey.get(key);
		fields.push({ path: key, value: previewValue(val), rule: err ? ruleText(err) : 'ok', ok: !err, error: err });
	}
	for (const [k, e] of errByKey) {
		if (k.startsWith('(missing) ')) fields.push({ path: k, value: '—', rule: ruleText(e), ok: false, error: e });
	}

	return { fields, label: objPath || '(root)', live: true, parseError: false };
}

const STEP_MS = 750;

function ErrorCard({ e }: { e: AjvErrorLite }) {
	return (
		<div style={{ background: '#0a0d14', border: '1px solid rgba(248,113,113,0.35)', borderRadius: 8, padding: '7px 9px', fontFamily: 'monospace', fontSize: 10.5, lineHeight: 1.7 }}>
			<div><span style={{ color: '#64748b' }}>instancePath </span><span style={{ color: '#22d3ee' }}>{e.instancePath || '(root)'}</span></div>
			<div><span style={{ color: '#64748b' }}>keyword </span><span style={{ color: '#fbbf24' }}>{e.keyword}</span></div>
			{e.params && Object.keys(e.params).length > 0 && (
				<div><span style={{ color: '#64748b' }}>params </span><span style={{ color: '#a78bfa' }}>{JSON.stringify(e.params)}</span></div>
			)}
			<div><span style={{ color: '#64748b' }}>message </span><span style={{ color: '#f87171' }}>{e.message}</span></div>
		</div>
	);
}

export default function AjvExplainer({
	ajvErrors,
	configText,
	onBack,
}: {
	ajvErrors: AjvErrorLite[];
	configText: string;
	onBack: () => void;
}) {
	// step = how many fields AJV has visited so far (0..FIELDS.length). The field at
	// index `step` is the one currently being checked.
	const [step, setStep] = useState(0);
	const [playing, setPlaying] = useState(true);
	const [selected, setSelected] = useState<number | null>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Always walk the editor's REAL config; fall back to the canned example only
	// before any config has loaded (walk === null).
	const walk = useMemo(() => buildWalk(configText, ajvErrors), [configText, ajvErrors]);
	const parseError = walk?.parseError ?? false;
	const usingLive = walk !== null && !parseError && walk.fields.length > 0;
	const fields = usingLive ? walk!.fields : FIELDS;
	const walkText = usingLive ? configText : CANNED_TEXT;
	const walkLabel = usingLive ? walk!.label : 'scenes[0]';
	// Restart the walk whenever the underlying field set changes (e.g. you edit).
	// React's "adjust state during render" pattern — resets without an extra effect.
	const sig = fields.map((f) => `${f.path}:${f.ok ? 1 : 0}`).join(',');
	const [prevSig, setPrevSig] = useState(sig);
	if (sig !== prevSig) {
		setPrevSig(sig);
		setStep(0);
		setSelected(null);
		setPlaying(true);
	}

	useEffect(() => {
		// Stop scheduling once every field has been walked.
		if (!playing || step >= fields.length) return;
		timer.current = setTimeout(() => setStep((s) => s + 1), STEP_MS);
		return () => {
			if (timer.current) clearTimeout(timer.current);
		};
	}, [playing, step, fields.length]);

	const restart = () => {
		setStep(0);
		setSelected(null);
		setPlaying(true);
	};

	const collected = fields.slice(0, step).filter((f) => !f.ok);
	const done = step >= fields.length;

	return (
		<div style={{ padding: '12px', overflowY: 'auto', height: '100%' }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
				<button onClick={onBack} style={{ fontSize: 11, color: '#a78bfa', background: 'transparent', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}>
					← pipeline
				</button>
				<div style={{ display: 'flex', gap: 6 }}>
					<button onClick={() => setPlaying((p) => !p)} disabled={done} style={{ fontSize: 11, color: '#fff', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '3px 10px', cursor: done ? 'default' : 'pointer', opacity: done ? 0.4 : 1 }}>
						{done ? '✓ done' : playing ? '⏸ pause' : '▶ play'}
					</button>
					<button onClick={restart} style={{ fontSize: 11, color: '#fff', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}>
						↺
					</button>
				</div>
			</div>

			<div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
				validate() walks the data ↓
			</div>
			<div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.45)', marginBottom: 10 }}>
				each field is checked against its schema keyword · misses drop into <span style={{ fontFamily: 'monospace', color: '#f87171' }}>errors[]</span>
			</div>

			{parseError && (
				<div style={{ background: '#7f1d1d2e', border: '1px solid #ef444466', borderRadius: 8, padding: '8px 10px', fontFamily: 'monospace', fontSize: 11, color: '#fca5a5', marginTop: 4 }}>
					⚠ JSON syntax invalid — fix it, then validate() runs against your config.
				</div>
			)}

			{!parseError && (<>
			{/* the walk — header shows whether this is your live config or the example */}
			<div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
				<span style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{walkLabel} = {'{'}</span>
				<span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.06em', padding: '1px 6px', borderRadius: 999, background: usingLive ? '#7c3aed33' : 'rgba(255,255,255,0.06)', color: usingLive ? '#c4b5fd' : 'rgba(255,255,255,0.4)', border: `1px solid ${usingLive ? '#a78bfa55' : 'rgba(255,255,255,0.12)'}` }}>
					{usingLive ? 'YOUR CONFIG' : 'EXAMPLE'}
				</span>
			</div>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginLeft: 4 }}>
				{fields.map((f, i) => {
					const visited = i < step;
					const current = i === step;
					const verdict = visited ? (f.ok ? 'pass' : 'fail') : current ? 'now' : 'wait';
					const bg =
						verdict === 'fail' ? '#7f1d1d2e' : verdict === 'pass' ? '#14532d22' : current ? '#fbbf2418' : 'transparent';
					const border =
						verdict === 'fail' ? '#ef4444' : verdict === 'pass' ? '#22c55e66' : current ? '#fbbf24' : 'transparent';
					const glyph = verdict === 'fail' ? '✗' : verdict === 'pass' ? '✓' : current ? '◍' : '·';
					const glyphColor = verdict === 'fail' ? '#f87171' : verdict === 'pass' ? '#4ade80' : current ? '#fbbf24' : 'rgba(255,255,255,0.2)';
					const clickable = !f.ok && visited;
					return (
						<div
							key={f.path}
							onClick={clickable ? () => setSelected(selected === i ? null : i) : undefined}
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: 7,
								padding: '4px 7px',
								borderRadius: 6,
								background: bg,
								border: `1px solid ${border}`,
								borderLeftWidth: current || verdict === 'fail' ? 3 : 1,
								transition: 'all 200ms ease',
								cursor: clickable ? 'pointer' : 'default',
								animation: current ? 'ajvPulse 0.9s ease-in-out infinite' : undefined,
								opacity: verdict === 'wait' ? 0.45 : 1,
							}}
						>
							<span style={{ width: 12, textAlign: 'center', color: glyphColor, fontSize: 12, flexShrink: 0 }}>{glyph}</span>
							<span style={{ fontFamily: 'monospace', fontSize: 11.5, color: '#fff' }}>{f.path}:</span>
							<span style={{ fontFamily: 'monospace', fontSize: 11.5, color: f.ok ? 'rgba(255,255,255,0.7)' : '#fca5a5' }}>{f.value}</span>
							<span style={{ marginLeft: 'auto', fontSize: 9.5, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', textAlign: 'right' }}>
								{visited || current ? f.rule : ''}
							</span>
						</div>
					);
				})}
			</div>
			<div style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{'}'}</div>

			{/* selected field: full error object + how its path maps to characters */}
			{selected !== null && fields[selected]?.error && (
				<div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
					<ErrorCard e={fields[selected].error!} />
					<TokenResolution key={`walk-${usingLive ? 'live' : 'canned'}-${selected}`} text={walkText} error={fields[selected].error!} />
				</div>
			)}
			{done && selected === null && collected.length > 0 && (
				<div style={{ marginTop: 6, fontSize: 10.5, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
					click a red row ↑ to see how its path maps to the exact characters
				</div>
			)}

			{/* errors[] tray fills as the walk finds misses */}
			<div style={{ marginTop: 12 }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
					<span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: collected.length ? '#f87171' : '#4ade80' }}>
						errors[{collected.length}]
					</span>
					{done && (
						<span style={{ fontSize: 11, fontFamily: 'monospace', color: collected.length ? '#f87171' : '#4ade80' }}>
							→ validate() returned {collected.length ? 'false' : 'true'}
						</span>
					)}
				</div>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
					{collected.map((f, i) => (
						<div key={i} style={{ display: 'flex', gap: 7, alignItems: 'center', fontFamily: 'monospace', fontSize: 10.5, background: '#0a0d14', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 6, padding: '4px 8px' }}>
							<span style={{ color: '#f87171' }}>✗</span>
							<span style={{ color: '#22d3ee' }}>{f.error?.instancePath}</span>
							<span style={{ color: '#64748b' }}>—</span>
							<span style={{ color: '#fbbf24' }}>{f.error?.keyword}</span>
						</div>
					))}
					{collected.length === 0 && (
						<div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>nothing yet…</div>
					)}
				</div>
			</div>

			</>)}

			<style>{`@keyframes ajvPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(251,191,36,0); } 50% { box-shadow: 0 0 0 3px rgba(251,191,36,0.22); } }`}</style>
		</div>
	);
}
