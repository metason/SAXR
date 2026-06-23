/**
 * @module showcaseTrace
 * Shared types for the editor's Showcase Mode (§6.2.9). A TraceStep is one line in
 * the walkthrough panel that narrates the real pipeline: client-side validation
 * (AJV + Monaco), the server round-trip (syntax check → Python schema re-validation
 * → datarepgen.py), and a readout of the generated datareps.json. The numbers shown
 * are read from real output — only the prose describing each stage is fixed.
 */

export type TraceLevel = 'info' | 'success' | 'error' | 'detail' | 'pending';

/**
 * Stable identifiers for the nodes in the Showcase architecture diagram. A trace
 * step tagged with one of these lights up the matching class/method node.
 */
export type NodeId =
	// client (Web3D editor)
	| 'monaco'
	| 'ajv-client'
	| 'jsonc'
	| 'post'
	// Next.js API route (run-pipeline)
	| 'syntax'
	| 'ajv-server'
	| 'write'
	| 'spawn'
	// Python pipeline (datarepgen.py → DataRepGenerator)
	| 'py-validate'
	| 'py-execute'
	| 'py-panels'
	| 'py-dataviz'
	| 'py-save'
	// Web3D render path
	| 'parseviz'
	| 'dispatch'
	| 'render';

export interface TraceStep {
	/** Short headline for the step, e.g. "Python re-validates against schema". */
	label: string;
	/** Optional second line: concrete detail (counts, messages, captured output). */
	detail?: string;
	level: TraceLevel;
	/** Wall-clock duration of the step in ms, when measured server-side. */
	ms?: number;
	/** Which checkpoint this step belongs to, for the gutter label. */
	stage?: 'client' | 'server' | 'output';
	/** Diagram node this step drives, if any. */
	node?: NodeId;
}

export type NodeState = 'idle' | 'active' | 'done' | 'error';

/** All nodes downstream of the POST — lit as "active" while a run is in flight. */
const IN_FLIGHT_NODES: NodeId[] = [
	'syntax',
	'ajv-server',
	'write',
	'spawn',
	'py-validate',
	'py-execute',
	'py-panels',
	'py-dataviz',
	'py-save',
	'parseviz',
	'dispatch',
	'render',
];

const PYTHON_NODES: NodeId[] = ['py-validate', 'py-execute', 'py-panels', 'py-dataviz', 'py-save'];

function levelToState(level: TraceLevel): NodeState {
	switch (level) {
		case 'error':
			return 'error';
		case 'pending':
			return 'active';
		default:
			return 'done'; // success / info / detail = the step completed
	}
}

/**
 * Derive the visual state of every diagram node from the live client trace, the
 * last run's server trace, and whether a run is currently in flight. Terminal
 * states from real trace steps win; while running, not-yet-reached nodes pulse.
 */
export function computeNodeStates(
	clientTrace: TraceStep[],
	runTrace: TraceStep[],
	isRunning: boolean,
): Record<NodeId, NodeState> {
	const states = {} as Record<NodeId, NodeState>;
	const ids: NodeId[] = [
		'monaco', 'ajv-client', 'jsonc', 'post',
		'syntax', 'ajv-server', 'write', 'spawn',
		'py-validate', 'py-execute', 'py-panels', 'py-dataviz', 'py-save',
		'parseviz', 'dispatch', 'render',
	];
	for (const id of ids) states[id] = 'idle';

	// Monaco is "live" as soon as the editor has produced any validation.
	if (clientTrace.length > 0) states['monaco'] = 'done';

	for (const step of [...clientTrace, ...runTrace]) {
		if (step.node) states[step.node] = levelToState(step.level);
	}

	// The single spawn step stands in for the whole Python pipeline: light the
	// datarepgen.py lane once it returns successfully.
	if (states['spawn'] === 'done') {
		for (const id of PYTHON_NODES) states[id] = 'done';
	} else if (states['spawn'] === 'error') {
		// pipeline crashed mid-run — leave python lane unlit
	}

	// While a run is in flight, pulse everything still waiting downstream.
	if (isRunning) {
		states['post'] = 'active';
		for (const id of IN_FLIGHT_NODES) {
			if (states[id] === 'idle') states[id] = 'active';
		}
	}

	return states;
}

/** Result returned by onRun so the editor can render the full walkthrough. */
export interface RunResult {
	error: string | null;
	trace: TraceStep[];
}

/**
 * A trimmed AJV error object — the fields the AJV explainer surfaces. Mirrors
 * ajv's ErrorObject so the live "your config right now" section shows real data.
 */
export interface AjvErrorLite {
	instancePath: string;
	keyword: string;
	message?: string;
	params?: Record<string, unknown>;
}

/**
 * Summarise a raw datareps.json (DataRep[][]) into trace steps using only real
 * numbers from the file: stage rep count, scene count, total reps, and a type
 * histogram (which SHAPE_REGISTRY / panel branches actually fired).
 */
export function summariseDatareps(raw: unknown): TraceStep[] {
	if (!Array.isArray(raw) || raw.length === 0) {
		return [
			{
				label: 'datareps.json read back',
				detail: 'Empty or unexpected shape',
				level: 'error',
				stage: 'output',
			},
		];
	}

	const arrays = raw as unknown[][];
	const stage = Array.isArray(arrays[0]) ? arrays[0] : [];
	const scenes = arrays.slice(1).filter(Array.isArray);
	const allReps = [stage, ...scenes].flat() as Array<{ type?: string }>;
	const total = allReps.length;

	// Histogram of rep types — what the registry / panel dispatch actually built.
	const histogram = new Map<string, number>();
	for (const rep of allReps) {
		const t = (rep?.type ?? '?').toString().toLowerCase();
		histogram.set(t, (histogram.get(t) ?? 0) + 1);
	}
	const top = [...histogram.entries()]
		.sort((a, b) => b[1] - a[1])
		.map(([t, n]) => `${t}×${n}`)
		.join('  ');

	return [
		{
			label: 'parseViz() split the array',
			detail: `raw[0] → stage (${stage.length} reps) · raw.slice(1) → ${scenes.length} scene${scenes.length === 1 ? '' : 's'}`,
			level: 'detail',
			stage: 'output',
			node: 'parseviz',
		},
		{
			label: 'SHAPE_REGISTRY / panel dispatch',
			detail: top || 'no reps',
			level: 'detail',
			stage: 'output',
			node: 'dispatch',
		},
		{
			label: 'datareps.json generated',
			detail: `${total} data reps total across stage + ${scenes.length} scene${scenes.length === 1 ? '' : 's'} · re-rendered in viewer`,
			level: 'success',
			stage: 'output',
			node: 'render',
		},
	];
}
