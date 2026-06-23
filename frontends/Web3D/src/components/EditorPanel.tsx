'use client';
/**
 * @module EditorPanel
 * In-browser config.json editor with live schema validation (Monaco + AJV + jsonc-parser).
 * Validates the document against the config schema on every change, maps each schema
 * error to its exact source token, and runs the SAXR pipeline via POST /api/run-pipeline
 * once the configuration is valid.
 */

import React from 'react';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import Ajv2020, {
	type ErrorObject,
	type ValidateFunction,
} from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { parseTree, findNodeAtLocation, type Node } from 'jsonc-parser';
import type { RunResult, TraceStep, AjvErrorLite } from '@/lib/showcaseTrace';
import { instancePathToSegments, offsetToPosition } from '@/lib/tokenResolution';

/**
 * Lazily loaded Monaco editor component.
 * SSR is disabled because Monaco Editor requires the browser's APIs,
 * which do not exist on the server. `dynamic()` delays rendering to the client.
 */
const MonacoEditor = dynamic(
	() => import('@monaco-editor/react').then((m) => m.Editor),
	{
		ssr: false,
		loading: () => (
			<div className="flex items-center justify-center h-full text-white/50">
				Loading editor…
			</div>
		),
	},
);

interface EditorPanelProps {
	assetBasePath: string;
	onRun: (configText: string) => Promise<RunResult>;
	/** Reports live + run traces up so the parent can drive the diagram. */
	onTrace: (s: {
		clientTrace: TraceStep[];
		runTrace: TraceStep[];
		isRunning: boolean;
		ajvErrors: AjvErrorLite[];
		configText: string;
	}) => void;
}

/**
 * URL the editor loads the config schema from.
 * Uses the same-origin proxy route (app/api/schema/[name]/route.ts) to avoid a
 * cross-origin fetch to service.metason.net, which does not send CORS headers.
 */
const SCHEMA_URL = '/api/schema/config';
// Direct metason URL — usable only once /saxr/schemas/* serves
// `Access-Control-Allow-Origin: *`:
// const SCHEMA_URL = 'https://service.metason.net/saxr/schemas/config.json';

/**
 * Convert AJV errors to Monaco markers using a real JSON parse tree
 * (jsonc-parser) so the squiggle lands exactly on the offending node —
 * including disambiguating duplicate keys nested at different paths.
 */
function toMarkers(errors: ErrorObject[], text: string, monaco: any): any[] {
	const tree = parseTree(text);
	if (!tree) return [];

	return errors.map((err) => {
		const segments = instancePathToSegments(err.instancePath);

		// For 'required' errors AJV reports the parent object's path; we
		// look up the missing key inside that object so the marker lands on
		// the closest visible token (the object's opening brace if the key
		// itself is absent).
		let target: Node | undefined = findNodeAtLocation(tree, segments);
		if (err.keyword === 'required') {
			const missing = (err.params as { missingProperty?: string })
				.missingProperty;
			if (missing && target) {
				const child = findNodeAtLocation(tree, [...segments, missing]);
				if (child) target = child;
			}
		}

		const offset = target?.offset ?? 0;
		const length = target?.length ?? 1;
		const start = offsetToPosition(text, offset);
		const end = offsetToPosition(text, offset + length);

		return {
			severity: monaco.MarkerSeverity.Error,
			message: `${err.instancePath || '(root)'}: ${err.message}`,
			startLineNumber: start.line,
			startColumn: start.column,
			endLineNumber: end.line,
			endColumn: end.column,
		};
	});
}

export default function EditorPanel({
	assetBasePath,
	onRun,
	onTrace,
}: EditorPanelProps) {
	const [specsText, setSpecsText] = useState('');
	const [hasError, setHasError] = useState(false);
	const [schemaError, setSchemaError] = useState(false);
	const [isRunning, setIsRunning] = useState(false);
	const [runError, setRunError] = useState<string | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [editorReady, setEditorReady] = useState(false);
	const [validatorReady, setValidatorReady] = useState(false);
	// Checkpoints 1+2 — live client validation (AJV + Monaco), updated per keystroke.
	const [clientTrace, setClientTrace] = useState<TraceStep[]>([]);
	// Checkpoint 3 + output — server round-trip, set on each Run.
	const [runTrace, setRunTrace] = useState<TraceStep[]>([]);
	// Real AJV errors from the latest validation, for the AJV explainer.
	const [ajvErrors, setAjvErrors] = useState<AjvErrorLite[]>([]);
	const monacoRef = useRef<any>(null);
	const editorRef = useRef<any>(null);
	const validateFnRef = useRef<ValidateFunction | null>(null);

	// Load the config schema once on mount and compile the AJV validator.
	// Without this, validateFnRef stays null, validatorReady stays false,
	// and the schema-validation effect below would never run.
	useEffect(() => {
		let cancelled = false;
		const ajv = new Ajv2020({ allErrors: true });
		addFormats(ajv);

		fetch(SCHEMA_URL)
			.then((r) => {
				if (!r.ok) throw new Error(`Schema fetch failed: ${r.status}`);
				return r.json();
			})
			.then((schema) => {
				if (cancelled) return;
				validateFnRef.current = ajv.compile(schema);
				setValidatorReady(true);
			})
			.catch((err) => {
				if (cancelled) return;
				console.error('Failed to load schema:', err);
				setLoadError('Failed to load schema — live validation disabled');
			});

		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (!assetBasePath) return;
		setHasError(false);
		setRunError(null);
		setLoadError(null);
		fetch(assetBasePath + '/config.json')
			.then((r) => r.text())
			.then((text) => setSpecsText(JSON.stringify(JSON.parse(text), null, 2)))
			.catch(() => setLoadError('Failed to load config.json'));
	}, [assetBasePath]);

	const runValidation = (value: string) => {
		const monaco = monacoRef.current;
		const editor = editorRef.current;
		if (!monaco || !editor) return;
		const model = editor.getModel();
		if (!model) return;

		try {
			const parsed = JSON.parse(value);
			setHasError(false);
			setSpecsText(value);
			const validate = validateFnRef.current;
			if (!validate) {
				monaco.editor.setModelMarkers(model, 'ajv', []);
				setSchemaError(false);
				setAjvErrors([]);
				setClientTrace([
					{ label: 'JSON syntax valid', level: 'success', stage: 'client' },
					{
						label: 'Schema unavailable',
						detail: 'Live validation disabled',
						level: 'detail',
						stage: 'client',
					},
				]);
				return;
			}
			const valid = validate(parsed);
			const errors = validate.errors ?? [];
			const markers = valid ? [] : toMarkers(errors, value, monaco);
			monaco.editor.setModelMarkers(model, 'ajv', markers);
			setSchemaError(!valid);
			setAjvErrors(
				errors.map((e) => ({
					instancePath: e.instancePath,
					keyword: e.keyword,
					message: e.message,
					params: e.params as Record<string, unknown>,
				})),
			);
			setClientTrace([
				{ label: 'JSON syntax valid', level: 'success', stage: 'client', node: 'monaco' },
				valid
					? {
							label: 'AJV: valid against config schema',
							detail: 'Run enabled',
							level: 'success',
							stage: 'client',
							node: 'ajv-client',
						}
					: {
							label: `AJV: ${errors.length} schema error${errors.length === 1 ? '' : 's'} → Run disabled`,
							detail: errors
								.slice(0, 4)
								.map((e) => `${e.instancePath || '(root)'}: ${e.message}`)
								.join('\n'),
							level: 'error',
							stage: 'client',
							node: 'ajv-client',
						},
				{
					label: 'jsonc-parser → Monaco markers',
					detail: valid
						? 'No squiggles'
						: `${markers.length} squiggle${markers.length === 1 ? '' : 's'} placed on the exact offending token`,
					level: 'detail',
					stage: 'client',
					node: 'jsonc',
				},
			]);
		} catch {
			setHasError(true);
			setSchemaError(false);
			setAjvErrors([]);
			monaco.editor.setModelMarkers(model, 'ajv', []);
			setClientTrace([
				{
					label: 'JSON.parse() failed → Run disabled',
					detail: 'Not valid JSON syntax — AJV never runs',
					level: 'error',
					stage: 'client',
					node: 'monaco',
				},
			]);
		}
	};

	// Validate as soon as both the editor is mounted and content is loaded,
	// so freshly opened samples show squiggles without requiring a keystroke.
	useEffect(() => {
		if (!editorReady || !specsText || !validatorReady) return;
		runValidation(specsText);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [editorReady, specsText, validatorReady]);

	// Push the live + run traces up so the parent can drive the diagram window.
	useEffect(() => {
		onTrace({ clientTrace, runTrace, isRunning, ajvErrors, configText: specsText });
	}, [clientTrace, runTrace, isRunning, ajvErrors, specsText, onTrace]);

	const handleRun = async () => {
		setIsRunning(true);
		setRunError(null);
		// Seed the walkthrough with the client-side POST step before awaiting.
		const posting: TraceStep = {
			label: 'POST /api/run-pipeline',
			detail: `{ slug, configText } · ${specsText.length} chars`,
			level: 'pending',
			stage: 'client',
		};
		setRunTrace([posting]);
		const { error, trace } = await onRun(specsText);
		setIsRunning(false);
		setRunTrace([{ ...posting, level: 'success' }, ...trace]);
		if (error) setRunError(error);
	};

	return (
		<div className="h-full w-full flex flex-col bg-[#1e1e1e]">
			{/* Header */}
			<div className="flex items-center px-3 py-1.5 border-b border-white/10 bg-black/40">
				<span className="text-xs text-white/50 font-mono">config.json</span>
			</div>

			<div className="flex-1 min-h-0">
				<MonacoEditor
					key={assetBasePath}
					height="100%"
					defaultLanguage="json"
					value={specsText}
					theme="vs-dark"
					onMount={(editor, monaco) => {
						editorRef.current = editor;
						monacoRef.current = monaco;
						setEditorReady(true);
					}}
					onChange={(value) => {
						if (!value) return;
						runValidation(value);
					}}
				/>
			</div>

			<button
				className="mt-2 mx-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
				onClick={handleRun}
				disabled={hasError || schemaError || isRunning}
			>
				{isRunning ? 'Running…' : 'Run'}
			</button>

			{hasError && (
				<div className="flex-shrink-0 px-3 py-1.5 bg-red-900/80 text-red-300 text-xs">
					Invalid JSON — fix syntax errors before running
				</div>
			)}
			{!hasError && schemaError && (
				<div className="flex-shrink-0 px-3 py-1.5 bg-yellow-900/80 text-yellow-300 text-xs">
					Schema validation errors — fix highlighted fields before running
				</div>
			)}
			{runError && (
				<div className="flex-shrink-0 px-3 py-1.5 bg-red-900/80 text-red-300 text-xs">
					Pipeline error: {runError}
				</div>
			)}
			{loadError && (
				<div className="flex-shrink-0 px-3 py-1.5 bg-red-900/80 text-red-300 text-xs">
					{loadError}
				</div>
			)}
		</div>
	);
}
