'use client';
/**
 * @module ShowcaseWindow
 * The right-hand window for Showcase Mode (§6.2.9): the live architecture diagram
 * on top (real classes/methods lighting up) and the detailed text trace below
 * (real durations, schema messages, captured Python output). Clicking the AJV node
 * swaps the diagram for the AJV explainer. All driven by the trace reported up from
 * {@link EditorPanel}.
 */

import React, { useState } from 'react';
import ShowcaseDiagram from '@/components/ShowcaseDiagram';
import AjvExplainer from '@/components/AjvExplainer';
import TracePanel from '@/components/TracePanel';
import type { TraceStep, AjvErrorLite } from '@/lib/showcaseTrace';

export default function ShowcaseWindow({
	clientTrace,
	runTrace,
	isRunning,
	ajvErrors,
	configText,
}: {
	clientTrace: TraceStep[];
	runTrace: TraceStep[];
	isRunning: boolean;
	ajvErrors: AjvErrorLite[];
	configText: string;
}) {
	const [topic, setTopic] = useState<'ajv' | null>(null);

	return (
		<div className="h-full w-full flex flex-col bg-[#0a0d14]">
			<div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 bg-black/40 flex-shrink-0">
				<span className="text-xs font-mono text-violet-300/80">
					{topic === 'ajv' ? 'AJV explainer' : 'pipeline walkthrough'}
				</span>
				<span className="text-[10px] text-white/35">
					{topic === 'ajv' ? 'real validation, real errors' : 'classes light up · 🔍 = clickable'}
				</span>
			</div>

			{/* top: diagram, or the AJV explainer when its node is clicked */}
			<div className="flex-[1.25] min-h-0 overflow-hidden">
				{topic === 'ajv' ? (
					<AjvExplainer ajvErrors={ajvErrors} configText={configText} onBack={() => setTopic(null)} />
				) : (
					<div className="h-full overflow-y-auto">
						<ShowcaseDiagram
							clientTrace={clientTrace}
							runTrace={runTrace}
							isRunning={isRunning}
							onSelectNode={setTopic}
						/>
					</div>
				)}
			</div>

			{/* bottom: detailed text trace */}
			<TracePanel clientTrace={clientTrace} runTrace={runTrace} />
		</div>
	);
}
