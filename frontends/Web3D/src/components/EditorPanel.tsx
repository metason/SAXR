'use client';
/**
 * @module EditorPanel
 */

import React from 'react';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import Ajv2020, { type ErrorObject } from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { parseTree, findNodeAtLocation, type Node } from 'jsonc-parser';
import configSchema from '../../../../schemas/config.json';

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
	onRun: (configText: string) => Promise<string | null>;
}

const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);
const validateConfig = ajv.compile(configSchema);

/**
 * Convert an AJV instancePath (RFC 6901 JSON Pointer) into a path array
 * suitable for jsonc-parser's findNodeAtLocation.
 */
function instancePathToSegments(instancePath: string): (string | number)[] {
	if (!instancePath) return [];
	return instancePath
		.split('/')
		.slice(1)
		.map((seg) => {
			const decoded = seg.replace(/~1/g, '/').replace(/~0/g, '~');
			return /^\d+$/.test(decoded) ? Number(decoded) : decoded;
		});
}

/**
 * Convert a character offset in `text` to a Monaco {line, column} position.
 * Both line and column are 1-based, matching Monaco's API.
 */
function offsetToPosition(text: string, offset: number): { line: number; column: number } {
	let line = 1;
	let column = 1;
	const limit = Math.min(offset, text.length);
	for (let i = 0; i < limit; i++) {
		if (text.charCodeAt(i) === 10) {
			line++;
			column = 1;
		} else {
			column++;
		}
	}
	return { line, column };
}

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
			const missing = (err.params as { missingProperty?: string }).missingProperty;
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
}: EditorPanelProps) {
	const [specsText, setSpecsText] = useState('');
	const [hasError, setHasError] = useState(false);
	const [schemaError, setSchemaError] = useState(false);
	const [isRunning, setIsRunning] = useState(false);
	const [runError, setRunError] = useState<string | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [editorReady, setEditorReady] = useState(false);
	const monacoRef = useRef<any>(null);
	const editorRef = useRef<any>(null);

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
			const valid = validateConfig(parsed);
			const markers = valid
				? []
				: toMarkers(validateConfig.errors ?? [], value, monaco);
			monaco.editor.setModelMarkers(model, 'ajv', markers);
			setSchemaError(!valid);
		} catch {
			setHasError(true);
			setSchemaError(false);
			monaco.editor.setModelMarkers(model, 'ajv', []);
		}
	};

	// Validate as soon as both the editor is mounted and content is loaded,
	// so freshly opened samples show squiggles without requiring a keystroke.
	useEffect(() => {
		if (!editorReady || !specsText) return;
		runValidation(specsText);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [editorReady, specsText]);

	return (
		<div className="h-full w-full flex flex-col">
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
				className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
				onClick={async () => {
					setIsRunning(true);
					setRunError(null);
					const error = await onRun(specsText);
					setIsRunning(false);
					if (error) setRunError(error);
				}}
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
