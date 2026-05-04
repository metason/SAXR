/**
 * @module page
 * SAXR landing page - hero, pipeline, arrangement showcase, and sample gallery.
 */

import { SampleInfo } from '@/lib/types';

async function getSamples(): Promise<SampleInfo[]> {
	const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
	try {
		const res = await fetch(`${baseUrl}/api/samples`, {
			next: { revalidate: 60 },
		});
		if (!res.ok) return [];
		return res.json();
	} catch {
		return [];
	}
}

const IRIS_CONFIG = `{
  "data": { "url": "iris.json" },
  "stage": { "width": 0.8, "height": 0.8, "depth": 0.8 },
  "plot": "scatter",  "mark": "sphere",
  "encoding": {
    "x": { "field": "sepal width" },
    "y": { "field": "petal length" },
    "z": { "field": "petal width" },
    "color": { "field": "class" }
  },
  "panels": ["xy", "-xy", "zy", "-zy", "xz", "lc=_"]
}`;

interface ArrangementEntry {
	key: string;
	label: string;
	slug?: string;
	tagline: string;
	description: string;
	snippet: string;
}

interface VisualEncodingEntry {
	key: string;
	label: string;
	tagline: string;
	description: string;
	slug?: string;
	snippet: string;
}

interface PipelineStep {
	label: string;
	sub: string;
}

const PIPELINE_STEPS: PipelineStep[] = [
	{ label: 'Data', sub: 'CSV / JSON / XLS' },
	{ label: 'config.json', sub: 'Grammar of 3D Graphics' },
	{ label: 'datarepgen.py', sub: 'Visualization generator' },
	{ label: 'datareps.json', sub: 'Data representations' },
	{ label: 'XR Frontend', sub: 'Web3D / Unity / iOS AR' },
];

const PIPELINE_FEATURES: { title: string; body: string }[] = [
	{
		title: 'Grammar of 3D Graphics',
		body: 'A declarative JSON syntax specifies data visualizations as encoded mappings from data fields to 3D marks - no procedural programming required.',
	},
	{
		title: 'Data Stage Metaphor',
		body: 'Instead of a 2D plot area in pixels, visualizations live on a 3D stage measured in meters - designed to be spatially embedded in the physical world via AR.',
	},
	{
		title: 'Scene Sequences',
		body: 'Visualizations span multiple data scenes: animated time-series, comparative side-by-side, narrative storytelling, or proximity-based level of detail.',
	},
];

const ARRANGEMENTS: ArrangementEntry[] = [
	{
		key: 'comparative',
		label: 'Comparative',
		slug: 'eco',
		tagline: 'Side-by-side scenes at configurable spatial gaps.',
		description:
			'Compare data across time periods, categories, or parameters simultaneously. Each scene is offset by a gap vector so you can walk between them in AR.',
		snippet: `"sequence": {
  "arrangement": "comparative",
  "field": "year",
  "domain": [2000, 2024],
  "selection": [2000, 2012, 2024],
  "gap": [0, 0, 2],
  "columns": 1
}`,
	},
	{
		key: 'animated',
		label: 'Animated',
		slug: 'eco',
		tagline: 'Auto-play through scenes at a configurable interval.',
		description:
			'Ideal for temporal data - the scene index advances automatically. Users can pause, scrub, or let it run. Open the eco sample and change "comparative" to "animated" to try it.',
		snippet: `"sequence": {
  "arrangement": "animated",
  "field": "year",
  "domain": [2000, 2024],
  "interval": 1.5
}`,
	},
	{
		key: 'narrative',
		label: 'Narrative',
		slug: 'eco',
		tagline: 'Data-driven storytelling progressing on interaction.',
		description:
			'Each scene reveals more complexity. Labels appear as nav buttons so the viewer can advance at their own pace. Open the eco sample and change "comparative" to "narrative" to try it.',
		snippet: `"sequence": {
  "arrangement": "narrative",
  "labels": [
    "Overview",
    "2D Focus",
    "3D Detail"
  ]
}`,
	},
	{
		key: 'lod',
		label: 'Level of Detail',
		slug: 'eco',
		tagline: 'Scene selected in response to user proximity.',
		description:
			'As the user walks towards the data stage, a richer scene is loaded. Designed for AR. Open the eco sample and change "comparative" to "LOD" to try it.',
		snippet: `"sequence": {
  "arrangement": "LOD"
}
// Scene 1: overview marks
// Scene 2: detailed marks
// Scene 3: full annotation`,
	},
];

const VISUAL_ENCODING: VisualEncodingEntry[] = [
	{
		key: 'shape',
		label: 'Shape encoding',
		tagline: 'Map a categorical field to 3D geometry',
		slug: 'burnout',
		description:
			'Unique to 3D — each category gets a different shape. In the burnout sample, Female maps to spheres and Male to boxes. Try swapping the shapes or adding a third category.',
		snippet: `"shape": {
  "field": "Sex",
  "scale": {
    "domain": ["Female", "Male"],
    "range": ["sphere", "box"]
  }
}`,
	},
	{
		key: 'mark',
		label: 'Mark & plot types',
		tagline: 'The full vocabulary of 3D mark types',
		slug: 'iris',
		description:
			'Each combination of plot and mark produces a different chart type. Try changing "sphere" to "box" or "cone" in the iris sample.',
		snippet: `// scatter + sphere  → 3D scatter plot
// bar    + box      → 3D bar chart
// pie    + arc      → 3D pie chart
// stick  + box      → stacked bar chart

"plot": "scatter",
"mark": "sphere"`,
	},
	{
		key: 'color-ranges',
		label: 'Color ranges',
		tagline: 'Explicit per-category color assignment',
		slug: 'ingredients',
		description:
			'Override the default palette with exact colors per category. Any CSS color name or hex value works. Open the ingredients sample and swap any color to see it rebuild instantly.',
		snippet: `"color": {
  "field": "ingredient",
  "scale": {
    "range": ["green", "pink", "yellow", "red", "blue"]
  }
}`,
	},
	{
		key: 'palette',
		label: 'Custom palette',
		tagline: 'Matplotlib colormaps for metrical channels',
		slug: 'energy',
		description:
			'For continuous color channels, a Matplotlib colormap name maps the data domain to a gradient. The energy sample uses seismic for outdoor temperature — blue cold, red hot. Try viridis or plasma.',
		snippet: `"palette": {
  "metrical": "seismic"
},
"encoding": {
  "color": {
    "field": "temp",
    "scale": { "domain": [-12, 12] }
  }
}`,
	},
	{
		key: 'stage',
		label: 'Stage dimensions',
		tagline: 'Physical size in meters, not pixels',
		slug: 'ingredients',
		description:
			'The stage defines a bounding box in meters. The ingredients sample is 8×18×7 cm — sized to sit on a milk carton. The burnout sample is 2.2×2.2×2.2 m — sized to fill a room. This is the physical AR design decision.',
		snippet: `// milk carton scale
"stage": { "width": 0.08, "height": 0.18, "depth": 0.07 }

// room scale
"stage": { "width": 2.2, "height": 2.2, "depth": 2.2 }`,
	},
	{
		key: 'inline',
		label: 'Inline data',
		tagline: 'Self-contained config with no external file',
		slug: 'fruits',
		description:
			'Data can be embedded directly in config.json as a values array instead of a URL. Open the fruits sample and add a new row — the pipeline re-runs with no file upload needed.',
		snippet: `"data": {
  "values": [
    { "category": "apples",  "sales": 431, "weight": 112 },
    { "category": "pears",   "sales": 1100, "weight": 150 },
    { "category": "oranges", "sales": 740,  "weight": 160 }
  ]
}`,
	},
];

export default async function HomePage() {
	const samples = await getSamples();
	const sampleMap = Object.fromEntries(samples.map((s) => [s.slug, s]));

	return (
		<div className="min-h-screen bg-gradient-to-b from-gray-950 to-black text-white">
			{/* Hero */}
			<section className="max-w-5xl mx-auto px-6 pt-20 pb-16">
				<div className="inline-block text-xs font-mono uppercase tracking-widest text-white/30 border border-white/10 rounded px-2 py-0.5 mb-6">
					Situated Analytics in eXtended Reality
				</div>
				<h1 className="text-5xl font-bold tracking-tight leading-tight mb-6">
					SAXR
					<span className="block text-2xl font-normal text-white/50 mt-2">
						A data-driven 3D visualization toolkit
					</span>
				</h1>
				<p className="text-white/60 text-lg max-w-2xl leading-relaxed mb-8">
					SAXR separates the{' '}
					<span className="text-white/80 font-medium">declaration</span> from
					the <span className="text-white/80 font-medium">implementation</span>{' '}
					and the <span className="text-white/80 font-medium">generation</span>{' '}
					from the <span className="text-white/80 font-medium">rendering</span>{' '}
					of 3D data visualizations - providing great flexibility across XR, VR,
					and AR frontends.
				</p>
				<div className="flex gap-3 flex-wrap">
					<a
						href="#arrangements"
						className="px-5 py-2.5 rounded-lg bg-white text-black font-semibold text-sm hover:bg-white/90 transition-colors"
					>
						Explore arrangements
					</a>
					<a
						href="#examples"
						className="px-5 py-2.5 rounded-lg border border-white/20 text-white/70 font-semibold text-sm hover:bg-white/5 transition-colors"
					>
						Browse all examples
					</a>
					<a
						href="https://github.com/metason/SAXR"
						target="_blank"
						rel="noopener noreferrer"
						className="px-5 py-2.5 rounded-lg border border-white/10 text-white/40 font-semibold text-sm hover:bg-white/5 transition-colors"
					>
						GitHub
					</a>
				</div>
			</section>

			{/* Pipeline */}
			<section className="border-t border-white/5 bg-white/[0.02]">
				<div className="max-w-5xl mx-auto px-6 py-16">
					<h2 className="text-xs font-mono uppercase tracking-widest text-white/30 mb-10">
						How it works
					</h2>
					<div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-sm font-mono text-white/50 mb-14 flex-wrap">
						{PIPELINE_STEPS.map((step, i) => (
							<>
								{i > 0 && (
									<span
										key={`arrow-${i}`}
										className="text-white/20 text-xl hidden sm:block"
									>
										&gt;
									</span>
								)}
								<div key={step.label} className="flex flex-col">
									<span className="text-white/80 font-semibold">
										{step.label}
									</span>
									{step.sub && (
										<span className="text-white/30 text-xs mt-0.5">
											{step.sub}
										</span>
									)}
								</div>
							</>
						))}
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
						{PIPELINE_FEATURES.map(({ title, body }) => (
							<div
								key={title}
								className="rounded-xl border border-white/10 bg-white/[0.03] p-6"
							>
								<div className="text-white/30 text-xs font-mono uppercase tracking-widest mb-3">
									{title}
								</div>
								<p className="text-white/60 text-sm leading-relaxed">{body}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Config snippet */}
			<section className="border-t border-white/5">
				<div className="max-w-5xl mx-auto px-6 py-16 grid grid-cols-1 sm:grid-cols-2 gap-10 items-start">
					<div>
						<h2 className="text-xs font-mono uppercase tracking-widest text-white/30 mb-4">
							Declarative config.json
						</h2>
						<p className="text-white/60 text-sm leading-relaxed mb-4">
							Describe your visualization as a JSON grammar. SAXR maps data
							fields to 3D shapes, colors, and stage boundaries - then generates{' '}
							<code className="text-white/80 font-mono text-xs bg-white/10 px-1 rounded">
								datareps.json
							</code>{' '}
							ready for any XR frontend.
						</p>
						<p className="text-white/40 text-xs leading-relaxed mb-6">
							Panels like{' '}
							<code className="font-mono bg-white/10 px-1 rounded">
								&quot;xy&quot;
							</code>{' '}
							and{' '}
							<code className="font-mono bg-white/10 px-1 rounded">
								&quot;lc=_&quot;
							</code>{' '}
							are textured image planes generated by Matplotlib - axes, grids,
							and color legends without any 3D font rendering.
						</p>
						{sampleMap['iris'] && (
							<a
								href="/viewer?sample=iris&editor=open"
								className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 transition-colors text-sm font-mono font-medium"
							>
								{'</>'} Open Iris in editor
							</a>
						)}
					</div>
					<pre className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-xs font-mono text-white/60 overflow-x-auto leading-relaxed">
						{IRIS_CONFIG}
					</pre>
				</div>
			</section>

			{/* Scene Arrangements */}
			<section
				id="arrangements"
				className="border-t border-white/5 bg-white/[0.02]"
			>
				<div className="max-w-5xl mx-auto px-6 py-16">
					<h2 className="text-xs font-mono uppercase tracking-widest text-white/30 mb-2">
						Scene Arrangements
					</h2>
					<p className="text-white/40 text-sm mb-10 max-w-2xl">
						The{' '}
						<code className="font-mono bg-white/10 px-1 rounded text-white/60">
							sequence
						</code>{' '}
						field in{' '}
						<code className="font-mono bg-white/10 px-1 rounded text-white/60">
							config.json
						</code>{' '}
						controls how multiple data scenes are presented - side-by-side,
						animated, narrative, or by proximity.
					</p>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
						{ARRANGEMENTS.map((arr) => {
							const sample = arr.slug ? sampleMap[arr.slug] : null;
							return (
								<div
									key={arr.key}
									className="rounded-xl border border-white/10 bg-black/40 overflow-hidden flex flex-col"
								>
									<div className="px-6 pt-6 pb-4 border-b border-white/5">
										<div className="flex items-start justify-between gap-4">
											<div>
												<h3 className="font-semibold text-base">{arr.label}</h3>
												<p className="text-white/40 text-xs mt-0.5">
													{arr.tagline}
												</p>
											</div>
											{sample ? (
												<a
													href={`/viewer?sample=${arr.slug}&editor=open`}
													className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-mono font-medium border border-white/20 bg-black/60 hover:bg-white/10 transition-colors whitespace-nowrap"
												>
													{'</>'} Edit
												</a>
											) : (
												<span className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-mono font-medium border border-white/5 text-white/20 whitespace-nowrap">
													no sample yet
												</span>
											)}
										</div>
										<p className="text-white/50 text-sm mt-3 leading-relaxed">
											{arr.description}
										</p>
									</div>
									<pre className="px-6 py-4 text-xs font-mono text-white/40 overflow-x-auto leading-relaxed bg-black/20 flex-1">
										{arr.snippet}
									</pre>
								</div>
							);
						})}
					</div>
				</div>
			</section>

			{/* Visual Encoding */}
			<section className="border-t border-white/5">
				<div className="max-w-5xl mx-auto px-6 py-16">
					<h2 className="text-xs font-mono uppercase tracking-widest text-white/30 mb-2">
						Visual Encoding
					</h2>
					<p className="text-white/40 text-sm mb-10 max-w-2xl">
						Each encoding channel maps a data field to a visual property of the
						3D mark. Open any sample in the editor to change these fields live.
					</p>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
						{VISUAL_ENCODING.map((enc) => {
							const sample = enc.slug ? sampleMap[enc.slug] : null;
							return (
								<div
									key={enc.key}
									className="rounded-xl border border-white/10 bg-black/40 overflow-hidden flex flex-col"
								>
									<div className="px-6 pt-6 pb-4 border-b border-white/5">
										<div className="flex items-start justify-between gap-4">
											<div>
												<h3 className="font-semibold text-base">{enc.label}</h3>
												<p className="text-white/40 text-xs mt-0.5">
													{enc.tagline}
												</p>
											</div>
											{sample && (
												<a
													href={`/viewer?sample=${enc.slug}&editor=open`}
													className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-mono font-medium border border-white/20 bg-black/60 hover:bg-white/10 transition-colors whitespace-nowrap"
												>
													{'</>'} Edit
												</a>
											)}
										</div>
										<p className="text-white/50 text-sm mt-3 leading-relaxed">
											{enc.description}
										</p>
									</div>
									<pre className="px-6 py-4 text-xs font-mono text-white/40 overflow-x-auto leading-relaxed bg-black/20 flex-1">
										{enc.snippet}
									</pre>
								</div>
							);
						})}
					</div>
				</div>
			</section>

			{/* All examples */}
			<section id="examples" className="border-t border-white/5">
				<div className="max-w-5xl mx-auto px-6 py-16">
					<h2 className="text-xs font-mono uppercase tracking-widest text-white/30 mb-2">
						All examples
					</h2>
					<p className="text-white/40 text-sm mb-10">
						Click <span className="font-mono text-white/60">{'</>'} Edit</span>{' '}
						to open the config editor and re-run the pipeline live in the
						browser.
					</p>
					{samples.length === 0 ? (
						<p className="text-white/30 text-sm">
							No samples found - run the pipeline first.
						</p>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
							{samples.map((sample) => (
								<div
									key={sample.slug}
									className="rounded-xl border border-white/10 bg-black/40 p-5 flex flex-col gap-3 hover:border-white/20 transition-colors"
								>
									<div>
										<h3 className="font-semibold text-base leading-snug">
											{sample.name}
										</h3>
										{sample.description && (
											<p className="text-white/40 text-sm mt-1 leading-relaxed">
												{sample.description}
											</p>
										)}
									</div>
									<div className="mt-auto pt-2">
										<a
											href={`/viewer?sample=${sample.slug}&editor=open`}
											className="block text-center px-3 py-1.5 rounded-lg text-sm font-medium border border-white/20 bg-black/60 hover:bg-white/10 transition-colors font-mono"
										>
											{'</>'} Edit
										</a>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</section>

			{/* Footer */}
			<footer className="border-t border-white/5 max-w-5xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-white/20 text-xs">
				<span>
					SAXR - Philipp Ackermann, ZHAW Zurich University of Applied Sciences
				</span>
				<a
					href="https://github.com/metason/SAXR"
					target="_blank"
					rel="noopener noreferrer"
					className="hover:text-white/40 transition-colors"
				>
					github.com/metason/SAXR
				</a>
			</footer>
		</div>
	);
}
