'use client';
/**
 * @module EditorPanel
 */

import React from 'react';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

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

export default function EditorPanel({
	assetBasePath,
	onRun,
}: EditorPanelProps) {
	const [specsText, setSpecsText] = useState('');
	const [hasError, setHasError] = useState(false);
	const [isRunning, setIsRunning] = useState(false);
	const [runError, setRunError] = useState<string | null>(null);

	useEffect(() => {
		if (!assetBasePath) return;

		fetch(assetBasePath + '/config.json') // Fetch /config.json from the current sample's asset base path instead of the root
			.then((r) => r.text())
			.then((text) => setSpecsText(JSON.stringify(JSON.parse(text), null, 2)))
			.catch(() => {});
	}, [assetBasePath]);

	return (
		<div className="h-full w-full flex flex-col">
			<div className="flex-1 min-h-0">
				<MonacoEditor
					height="100%"
					defaultLanguage="json"
					value={specsText}
					theme="vs-dark"
					onChange={(value) => {
						if (value) {
							try {
								JSON.parse(value); // Validate JSON before applying
								setHasError(false);
								setSpecsText(value);
							} catch {
								setHasError(true);
							}
						}
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
				disabled={hasError || isRunning}
			>
				{isRunning ? 'Running…' : 'Run'}
			</button>

			{hasError && (
				<div className="flex-shrink-0 px-3 py-1.5 bg-red-900/80 text-red-300 text-xs">
					Invalid JSON — changes not applied
				</div>
			)}
			{runError && (
				<div className="flex-shrink-0 px-3 py-1.5 bg-red-900/80 text-red-300 text-xs">
					Pipeline error: {runError}
				</div>
			)}
		</div>
	);
}
