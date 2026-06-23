/**
 * Full Web3D architecture model for the /learn explorer.
 * Nodes are the real classes/files laid out in horizontal layer bands
 * (entry → hooks → components → shapes/context → lib → server). Edges are the
 * meaningful structural relationships. A flow is a SUBSET of node ids that gets
 * highlighted (the rest dims), so "comparative" lights only the classes it uses.
 * Hover/click a node to drill into its file, code, ELI5, and defense point.
 */

export type Group = 'pipeline' | 'hook' | 'component' | 'lib' | 'api';

export interface ArchNode {
	id: string;
	label: string;
	sub?: string;
	x: number;
	y: number;
	w: number;
	h: number;
	group: Group;
	dashed?: boolean;
	detail: {
		eli5: string;
		file?: string;
		code?: string;
		why?: string;
		block?: {
			inputs?: string[];
			outputs?: string[];
			exports?: string[];
			internals?: string[];
		};
	};
}

export interface ArchEdge {
	from: string;
	to: string;
}

export interface ArchFlow {
	id: string;
	title: string;
	note?: string;
	path: string[];
}

export const VIEWBOX = { w: 1120, h: 650 };

export const nodes: ArchNode[] = [
	// ── Pipeline output (the frontend's input) ────────────────────────
	{
		id: 'pipeline',
		label: 'datareps.json + specs.json',
		sub: 'pipeline output',
		x: 450,
		y: 14,
		w: 220,
		h: 40,
		group: 'pipeline',
		detail: {
			eli5: 'The pipeline output the whole frontend consumes: datareps (stage + scenes) and optional specs (arrangement metadata).',
			file: 'samples/<name>/datareps.json',
			why: 'Platform-neutral contract — Web3D, Unity, ARchi all read the same datareps.json.',
			block: {
				inputs: ['config.json', 'datarepgen.py'],
				outputs: ['datareps.json', 'specs.json'],
				internals: ['Python pipeline', 'schema validation', 'stage + scene split'],
			},
		},
	},

	// ── Entry / pages ─────────────────────────────────────────────────
	{
		id: 'landing',
		label: 'app/page.tsx',
		sub: 'landing gallery',
		x: 150,
		y: 74,
		w: 180,
		h: 44,
		group: 'component',
		detail: {
			eli5: 'Server-rendered landing page: the sample gallery + showcase cards.',
			file: 'src/app/page.tsx',
			why: 'Uses listSamples() directly (server component), so no internal HTTP round-trip to populate the gallery.',
			block: {
				inputs: ['(server component — no props)'],
				outputs: ['gallery HTML'],
				exports: ['default (page component)'],
				internals: ['listSamples() direct call', 'static render'],
			},
		},
	},
	{
		id: 'viewer',
		label: 'viewer/page.tsx',
		sub: 'orchestrator',
		x: 560,
		y: 74,
		w: 210,
		h: 44,
		group: 'component',
		detail: {
			eli5: 'The viewer page. It wires the hooks together and renders the Canvas + HUD overlay.',
			file: 'src/app/viewer/page.tsx',
			why: 'Thin: it holds no state logic of its own — everything comes from useViewerState.',
			block: {
				inputs: ['?sample=…', '?config=…'],
				outputs: ['Canvas + HUD overlay JSX'],
				exports: ['default (page component)'],
				internals: ['mounts useViewerState', 'distributes state to children', 'no own state'],
			},
		},
	},

	// ── Hooks (state) ─────────────────────────────────────────────────
	{
		id: 'viewerState',
		label: 'useViewerState',
		sub: '◆ composite / fork',
		x: 470,
		y: 150,
		w: 210,
		h: 46,
		group: 'hook',
		detail: {
			eli5: 'The state hub. Composes the domain hooks, derives everything, and forks on the arrangement mode.',
			file: 'src/hooks/useViewerState.ts',
			code: `const isComparative =
  specs?.sequence?.arrangement === 'comparative';`,
			why: 'One place assembles all derived state, so every component sees one consistent interpretation of the spec.',
			block: {
				inputs: ['(no args — composes internal hooks)'],
				outputs: ['datareps', 'specs', 'sceneIdx', 'selectedIndices', 'mergedReps', 'isComparative'],
				exports: ['useViewerState()'],
				internals: ['useSampleLoader', 'useScenePlayback', 'useComparativeSelection', 'sceneMerge()', 'arrangement fork'],
			},
		},
	},
	{
		id: 'sampleLoader',
		label: 'useSampleLoader',
		sub: 'load data',
		x: 40,
		y: 150,
		w: 180,
		h: 46,
		group: 'hook',
		detail: {
			eli5: 'Discovers samples and loads the selected datareps.json + specs.json.',
			file: 'src/hooks/useSampleLoader.ts',
			why: 'Fetches /api/samples, then loads the chosen dataset whenever the selection changes.',
			block: {
				inputs: ['(no args)'],
				outputs: ['samples[]', 'selectedSample', 'datareps', 'specs', 'setSample()'],
				exports: ['useSampleLoader()'],
				internals: ['fetch /api/samples', 'load datareps.json + specs.json on change'],
			},
		},
	},
	{
		id: 'scenePlayback',
		label: 'useScenePlayback',
		sub: 'temporal',
		x: 240,
		y: 150,
		w: 180,
		h: 46,
		group: 'hook',
		detail: {
			eli5: 'Temporal modes: tracks the current scene index and, for animated, runs the auto-play timer.',
			file: 'src/hooks/useScenePlayback.ts',
			code: `isPlaying = (arrangement === 'animated'); // the one switch
// animated: scene = (prev + 1) % n  (loops)`,
			why: 'Animated and narrative are the same engine; this one boolean is the only difference.',
			block: {
				inputs: ['totalScenes: number', 'arrangement: string'],
				outputs: ['sceneIdx', 'setSceneIdx()', 'isPlaying', 'togglePlay()'],
				exports: ['useScenePlayback()'],
				internals: ['setInterval (animated)', 'no timer (narrative)', 'scene index clamp'],
			},
		},
	},
	{
		id: 'compSelection',
		label: 'useComparativeSelection',
		sub: 'spatial · inverse map',
		x: 720,
		y: 150,
		w: 220,
		h: 46,
		group: 'hook',
		detail: {
			eli5: 'Comparative: converts the requested data values into the nearest scene indices.',
			file: 'src/hooks/useComparativeSelection.ts',
			code: `const indices = seq.selection.map((v) =>
  Math.round(((v - dMin) / (dMax - dMin)) * (totalData - 1))
); // [2000,2006,2009] -> [0,6,9]`,
			why: 'round() snaps in-between values to the nearest real scene; this INVERSE map must be the exact inverse of the picker\'s forward labels.',
			block: {
				inputs: ['specs.sequence.selection[]', 'datareps domain range'],
				outputs: ['selectedIndices: number[]'],
				exports: ['useComparativeSelection()'],
				internals: ['inverse map: value → Math.round(normalized × (n−1))', 'must mirror domainLabelForScene forward map'],
			},
		},
	},
	{
		id: 'useColor',
		label: 'useColor',
		sub: 'color',
		x: 960,
		y: 150,
		w: 130,
		h: 46,
		group: 'hook',
		detail: {
			eli5: 'Turns a hex/CSS color string into a THREE.Color + opacity, memoized.',
			file: 'src/hooks/useColor.ts',
			why: 'Centralized so every shape parses color identically; recomputes only when the string changes.',
			block: {
				inputs: ['hex: string', 'opacity?: number'],
				outputs: ['color: THREE.Color', 'opacity: number'],
				exports: ['useColor()'],
				internals: ['useMemo over new THREE.Color(hex)', 'opacity fallback to 1'],
			},
		},
	},
	{
		id: 'lod',
		label: 'LOD',
		sub: 'planned',
		x: 720,
		y: 210,
		w: 150,
		h: 34,
		group: 'hook',
		dashed: true,
		detail: {
			eli5: 'Planned 4th arrangement: swap to a richer scene as the viewer approaches in AR.',
			file: 'schema only (not implemented)',
			why: 'No natural proximity trigger in a browser; the gap vector\'s Y is reserved for it. Future work (§7.3).',
			block: {
				inputs: ['(AR proximity — not implemented)'],
				outputs: ['(planned: scene swap on approach)'],
				exports: ['(not yet implemented)'],
				internals: ['gap vector Y reserved', 'future work §7.3'],
			},
		},
	},

	// ── Components (render / UI) ───────────────────────────────────────
	{
		id: 'canvas',
		label: 'DataVizCanvas',
		sub: 'render (R3F)',
		x: 450,
		y: 256,
		w: 210,
		h: 46,
		group: 'component',
		detail: {
			eli5: 'The single React Three Fiber Canvas: camera, lights, grid, controls, and the scene content.',
			file: 'src/components/DataVizCanvas.tsx',
			code: `<Canvas camera={{ fov: 50, near: 0.01, far: 100 }}>
  ...lights, <Grid/>, <SceneContent/>, <OrbitControls/>`,
			why: 'Declarative: SceneContent splits each rep into shapes (DataRepMesh) and panels (PanelPlane). ComparativeContent (inside) lays out the grid.',
			block: {
				inputs: ['mergedReps: DataRep[]', 'assetBasePath: string', 'viewer state props'],
				outputs: ['R3F Canvas JSX'],
				exports: ['DataVizCanvas'],
				internals: ['SceneContent', 'ComparativeContent', 'OrbitControls', 'Grid', 'lights', 'fov 50'],
			},
		},
	},
	{
		id: 'sceneNav',
		label: 'SceneNav',
		sub: 'nav UI',
		x: 40,
		y: 256,
		w: 160,
		h: 46,
		group: 'component',
		detail: {
			eli5: 'The nav bar; adapts to the mode (play/pause + counter for animated, labels for narrative).',
			file: 'src/components/SceneNav.tsx',
			code: `onClick={() => onSceneChange(index)} // narrative: jump by array index`,
			why: 'Narrative labels are positional, so no value→index map needed; the counter (when shown) uses the forward map.',
			block: {
				inputs: ['scenes[]', 'sceneIdx', 'onSceneChange()', 'arrangement'],
				outputs: ['nav bar JSX'],
				exports: ['SceneNav'],
				internals: ['play/pause + counter (animated)', 'label buttons (narrative)', 'positional index (no inverse map)'],
			},
		},
	},
	{
		id: 'compPicker',
		label: 'ComparativeScenePicker',
		sub: 'toggle UI',
		x: 220,
		y: 256,
		w: 200,
		h: 46,
		group: 'component',
		detail: {
			eli5: 'HUD buttons to toggle which scenes are shown side by side.',
			file: 'src/components/ComparativeScenePicker.tsx',
			why: 'Labels its buttons with the FORWARD map (index→value); selection resolves with the inverse — they must match.',
			block: {
				inputs: ['specs', 'selectedIndices: number[]', 'onToggle()'],
				outputs: ['toggle buttons JSX'],
				exports: ['ComparativeScenePicker'],
				internals: ['forward map: index → domainLabelForScene()', 'multi-select toggle logic'],
			},
		},
	},
	{
		id: 'editor',
		label: 'EditorPanel',
		sub: '★ authoring loop',
		x: 700,
		y: 256,
		w: 180,
		h: 46,
		group: 'component',
		detail: {
			eli5: 'In-browser config editor: edit in Monaco, validate live with AJV, Run, re-render.',
			file: 'src/components/EditorPanel.tsx',
			code: `const SCHEMA_URL = '/api/schema/config'; // same-origin proxy
// AJV compiled once; jsonc-parser maps errors to exact tokens`,
			why: 'AJV (same lib as the server) + jsonc-parser token mapping; Run disabled on any error so a bad config never reaches the pipeline.',
			block: {
				inputs: ['sample: string', 'config: string', 'onReload()'],
				outputs: ['Monaco editor JSX', 'run button'],
				exports: ['EditorPanel'],
				internals: ['Monaco editor', 'AJV live validation', 'jsonc-parser error mapping', 'POST /api/run-pipeline'],
			},
		},
	},

	// ── Render leaves + dispatch + context ────────────────────────────
	{
		id: 'dataRepMesh',
		label: 'DataRepMesh',
		sub: 'shape dispatch',
		x: 360,
		y: 340,
		w: 170,
		h: 44,
		group: 'component',
		detail: {
			eli5: 'Maps a DataRep to its shape component via SHAPE_REGISTRY.',
			file: 'src/components/DataRepMesh.tsx',
			code: `const Shape = SHAPE_REGISTRY[rep.type.toLowerCase()];`,
			why: 'Registry dispatch (Strategy pattern); pyramid_down is the one special case.',
			block: {
				inputs: ['rep: DataRep'],
				outputs: ['shape component JSX'],
				exports: ['DataRepMesh'],
				internals: ['SHAPE_REGISTRY[rep.type.toLowerCase()]', 'pyramid_down special case'],
			},
		},
	},
	{
		id: 'panelPlane',
		label: 'PanelPlane',
		sub: 'panels + culling',
		x: 550,
		y: 340,
		w: 160,
		h: 44,
		group: 'component',
		detail: {
			eli5: 'Renders axis-wall panels as textured quads; hides walls that face away each frame.',
			file: 'src/components/PanelPlane.tsx',
			code: `useFrame: visible = toCamera.dot(normal) > 0; // back-face culling`,
			why: 'Per-frame dot product; pre-allocated vectors avoid GC churn during orbit.',
			block: {
				inputs: ['panel: DataRep', 'assetBasePath: string'],
				outputs: ['textured quad JSX'],
				exports: ['PanelPlane'],
				internals: ['useFrame back-face culling', 'panelOrientation()', 'assetUrl()', 'pre-allocated Vector3 (no GC)'],
			},
		},
	},
	{
		id: 'registry',
		label: 'SHAPE_REGISTRY',
		sub: 'dispatch map',
		x: 150,
		y: 340,
		w: 170,
		h: 44,
		group: 'component',
		detail: {
			eli5: 'A map from type string → shape component.',
			file: 'src/components/shapes/registry.ts',
			why: 'Adding a shape = one component + one entry; the dispatcher never changes. Mirrors the Python dict / Unity switch.',
			block: {
				inputs: ['type: string (key lookup)'],
				outputs: ['ComponentType'],
				exports: ['SHAPE_REGISTRY'],
				internals: ['static Record<string, ComponentType>', '12 entries', 'Strategy pattern'],
			},
		},
	},
	{
		id: 'vizContext',
		label: 'VizContext',
		sub: 'context',
		x: 880,
		y: 340,
		w: 150,
		h: 44,
		group: 'component',
		detail: {
			eli5: 'Supplies assetBasePath to deeply nested shape/panel components.',
			file: 'src/context/VizContext.tsx',
			why: 'Avoids prop-drilling the asset path through the whole tree.',
			block: {
				inputs: ['assetBasePath: string'],
				outputs: ['Context.Provider JSX'],
				exports: ['VizContext', 'useVizContext()'],
				internals: ['React.createContext', 'single value: assetBasePath'],
			},
		},
	},

	// ── Shapes ────────────────────────────────────────────────────────
	{
		id: 'shapes',
		label: 'shape components ×12',
		sub: 'Sphere · Box · Arc · Surface …',
		x: 150,
		y: 406,
		w: 230,
		h: 40,
		group: 'component',
		detail: {
			eli5: 'One component per geometry type that turns a DataRep into 3D.',
			file: 'src/components/shapes/*.tsx',
			why: 'Four build strategies: scaled primitive, composite (grouped boxes), procedural (arc), external mesh (PLY surface).',
			block: {
				inputs: ['rep: DataRep', 'color: THREE.Color', 'opacity: number', 'position / scale'],
				outputs: ['Three.js geometry JSX'],
				exports: ['Sphere', 'Box', 'Arc', 'Surface', 'Cylinder', 'Cone', 'Pyramid', '… ×12'],
				internals: ['scaled primitive', 'composite grouped boxes', 'procedural (arc)', 'external PLY mesh'],
			},
		},
	},

	// ── Lib (pure, tested) ────────────────────────────────────────────
	{
		id: 'vizLoader',
		label: 'vizLoader',
		sub: 'parse + maps',
		x: 40,
		y: 466,
		w: 150,
		h: 46,
		group: 'lib',
		detail: {
			eli5: 'Parses datareps; also holds parseKV, parseHexColor, classifyRep, and domainLabelForScene (the forward map).',
			file: 'src/lib/vizLoader.ts',
			code: `return { stage: raw[0] ?? [], scenes: raw.slice(1) };`,
			why: 'Pure functions, unit-tested without a browser; domainLabelForScene is the FORWARD direction of the value↔index map.',
			block: {
				inputs: ['raw VizJson array (from datareps.json)'],
				outputs: ['{ stage: DataRep[], scenes: DataRep[][] }'],
				exports: ['parseViz()', 'parseKV()', 'parseHexColor()', 'classifyRep()', 'domainLabelForScene()'],
				internals: ['raw[0] = stage', 'raw.slice(1) = scenes', 'FORWARD value↔index map'],
			},
		},
	},
	{
		id: 'sceneMerge',
		label: 'sceneMerge',
		sub: 'stage + scene',
		x: 210,
		y: 466,
		w: 150,
		h: 46,
		group: 'lib',
		detail: {
			eli5: 'Merges persistent stage reps with the active scene(s).',
			file: 'src/lib/sceneMerge.ts',
			code: `mergeSceneWithStage / mergeMultipleScenesWithStage`,
			why: 'Pure + memoized upstream → single source of derived render data.',
			block: {
				inputs: ['stage: DataRep[]', 'scene(s): DataRep[]'],
				outputs: ['merged: DataRep[]'],
				exports: ['mergeSceneWithStage()', 'mergeMultipleScenesWithStage()'],
				internals: ['spread + override by id', 'pure function — memoized upstream'],
			},
		},
	},
	{
		id: 'panelOrientation',
		label: 'panelOrientation',
		sub: 'panel rotation',
		x: 380,
		y: 466,
		w: 170,
		h: 46,
		group: 'lib',
		detail: {
			eli5: 'Computes a panel\'s rotation/orientation from its type string.',
			file: 'src/lib/panelOrientation.ts',
			why: 'Extracted as a pure function so it\'s unit-testable without a 3D scene.',
			block: {
				inputs: ["panelType: 'xy' | 'xz' | 'yz' | …"],
				outputs: ['[rx, ry, rz]: Euler rotation'],
				exports: ['panelOrientation()'],
				internals: ['lookup table', 'pure function — unit-testable without 3D'],
			},
		},
	},
	{
		id: 'assetUrl',
		label: 'assetUrl',
		sub: '$SERVER → path',
		x: 570,
		y: 466,
		w: 140,
		h: 46,
		group: 'lib',
		detail: {
			eli5: 'Resolves $SERVER/run/vis/ asset paths to the real sample path.',
			file: 'src/lib/assetUrl.ts',
			why: 'Centralized so PanelPlane and ShapeSurface resolve URLs the same way.',
			block: {
				inputs: ['path: string', 'assetBasePath: string'],
				outputs: ['resolved URL string'],
				exports: ['assetUrl()'],
				internals: ["replace '$SERVER/run/vis/' prefix", 'used by PanelPlane + ShapeSurface'],
			},
		},
	},
	{
		id: 'types',
		label: 'types',
		sub: 'TS interfaces',
		x: 730,
		y: 466,
		w: 110,
		h: 46,
		group: 'lib',
		detail: {
			eli5: 'DataRep, VizJson, ParsedVizData, SpecsJson.',
			file: 'src/lib/types.ts',
			why: 'Hand-written to mirror the JSON schema, turning fieldname/type mistakes into compile-time errors.',
			block: {
				inputs: ['(compile-time only — no runtime args)'],
				outputs: ['TypeScript type definitions'],
				exports: ['DataRep', 'VizJson', 'ParsedVizData', 'SpecsJson'],
				internals: ['hand-written to mirror JSON schema', 'compile-time validation only'],
			},
		},
	},
	{
		id: 'listSamples',
		label: 'listSamples',
		sub: 'scan samples/',
		x: 860,
		y: 466,
		w: 170,
		h: 46,
		group: 'lib',
		detail: {
			eli5: 'Server-only: scans samples/ for configured datasets.',
			file: 'src/lib/listSamples.ts',
			why: 'Shared by the gallery and /api/samples so discovery logic lives in one place.',
			block: {
				inputs: ['(server-only: reads filesystem)'],
				outputs: ['SampleInfo[]'],
				exports: ['listSamples()'],
				internals: ['fs.readdir(samples/)', 'filter by config.json presence'],
			},
		},
	},

	// ── Server / API routes ───────────────────────────────────────────
	{
		id: 'apiSamples',
		label: '/api/samples',
		sub: 'discover',
		x: 40,
		y: 556,
		w: 160,
		h: 44,
		group: 'api',
		detail: {
			eli5: 'Returns the discovered sample datasets.',
			file: 'src/app/api/samples/route.ts',
			why: 'Thin wrapper over listSamples().',
			block: {
				inputs: ['GET /api/samples'],
				outputs: ['JSON: SampleInfo[]'],
				exports: ['GET handler'],
				internals: ['thin wrapper over listSamples()'],
			},
		},
	},
	{
		id: 'apiPipelineFile',
		label: '/api/pipeline-file',
		sub: 'serve files',
		x: 220,
		y: 556,
		w: 190,
		h: 44,
		group: 'api',
		detail: {
			eli5: 'Serves generated files (PNG/JSON/PLY) straight from disk.',
			file: 'src/app/api/pipeline-file/[...path]/route.ts',
			why: 'Reached via the /samples/* rewrite; extension whitelist + path-traversal guard.',
			block: {
				inputs: ['GET /api/pipeline-file/[…path]'],
				outputs: ['file bytes (PNG / JSON / PLY)'],
				exports: ['GET handler'],
				internals: ['extension whitelist', 'path-traversal guard', 'fs.readFile'],
			},
		},
	},
	{
		id: 'apiRunPipeline',
		label: '/api/run-pipeline',
		sub: 'run',
		x: 430,
		y: 556,
		w: 190,
		h: 44,
		group: 'api',
		detail: {
			eli5: 'Validates + saves the config, then spawns datarepgen.py.',
			file: 'src/app/api/run-pipeline/route.ts',
			code: `guards: slug whitelist · 409 lock · re-validate schema`,
			why: 'The real trust boundary — the server re-validates before writing/running; a crafted request can\'t bypass it.',
			block: {
				inputs: ['POST { slug: string, configText: string }'],
				outputs: ['JSON: { ok } | { error, details }'],
				exports: ['POST handler'],
				internals: ['slug whitelist', '409 concurrency lock', 'AJV re-validate', 'spawn datarepgen.py'],
			},
		},
	},
	{
		id: 'apiSchema',
		label: '/api/schema',
		sub: 'proxy',
		x: 640,
		y: 556,
		w: 150,
		h: 44,
		group: 'api',
		detail: {
			eli5: 'Serves the JSON schema to the editor from the same origin.',
			file: 'src/app/api/schema/[name]/route.ts',
			why: 'Avoids a cross-origin fetch to metason; the editor loads the schema from here.',
			block: {
				inputs: ['GET /api/schema/[name]'],
				outputs: ['JSON schema'],
				exports: ['GET handler'],
				internals: ['proxy fetch to metason server', 'same-origin wrapper for editor'],
			},
		},
	},
];

export const edges: ArchEdge[] = [
	{ from: 'pipeline', to: 'vizLoader' },
	{ from: 'landing', to: 'listSamples' },
	{ from: 'viewer', to: 'viewerState' },
	{ from: 'viewer', to: 'canvas' },
	{ from: 'viewer', to: 'sceneNav' },
	{ from: 'viewer', to: 'compPicker' },
	{ from: 'viewer', to: 'editor' },
	{ from: 'viewerState', to: 'sampleLoader' },
	{ from: 'viewerState', to: 'scenePlayback' },
	{ from: 'viewerState', to: 'compSelection' },
	{ from: 'viewerState', to: 'sceneMerge' },
	{ from: 'viewerState', to: 'lod' },
	{ from: 'sampleLoader', to: 'vizLoader' },
	{ from: 'sampleLoader', to: 'apiSamples' },
	{ from: 'canvas', to: 'dataRepMesh' },
	{ from: 'canvas', to: 'panelPlane' },
	{ from: 'canvas', to: 'vizContext' },
	{ from: 'dataRepMesh', to: 'registry' },
	{ from: 'registry', to: 'shapes' },
	{ from: 'shapes', to: 'useColor' },
	{ from: 'panelPlane', to: 'panelOrientation' },
	{ from: 'panelPlane', to: 'assetUrl' },
	{ from: 'sceneNav', to: 'vizLoader' },
	{ from: 'compPicker', to: 'vizLoader' },
	{ from: 'editor', to: 'apiRunPipeline' },
	{ from: 'editor', to: 'apiSchema' },
	{ from: 'apiSamples', to: 'listSamples' },
	{ from: 'apiPipelineFile', to: 'pipeline' },
];

const RENDER = [
	'canvas',
	'dataRepMesh',
	'panelPlane',
	'registry',
	'shapes',
	'useColor',
	'vizContext',
];
const TRUNK = ['pipeline', 'viewer', 'viewerState', 'vizLoader'];

export interface GlossaryTerm {
	term: string;
	short: string;
	definition: string;
	relatedNodes?: string[];
}

export const glossary: GlossaryTerm[] = [
	{
		term: 'DataRep',
		short: 'A single visual element descriptor',
		definition:
			'The fundamental data unit in Web3D. A plain JSON object that describes one visual element — its geometry type (sphere, box, arc…), position, scale, color, and optional asset path. Every entry in datareps.json is a DataRep. The pipeline produces them; every frontend (Web3D, Unity, ARchi) reads them.',
		relatedNodes: ['types', 'vizLoader', 'shapes', 'dataRepMesh'],
	},
	{
		term: 'stage',
		short: 'Persistent DataReps shown in every scene',
		definition:
			'The first element of datareps.json — an array of DataReps that appear in every scene unchanged (axes, grid labels, reference markers). sceneMerge always starts with the stage and then applies the active scene on top. If a scene DataRep shares an id with a stage DataRep, the scene value wins.',
		relatedNodes: ['vizLoader', 'sceneMerge', 'viewerState'],
	},
	{
		term: 'scene',
		short: 'One time-step or state snapshot',
		definition:
			'Elements 1..n of datareps.json. Each scene is a DataRep array representing one point in time or one dataset state. Scenes are merged with the stage before rendering — the merge result is what DataVizCanvas actually draws.',
		relatedNodes: ['vizLoader', 'sceneMerge', 'scenePlayback', 'canvas'],
	},
	{
		term: 'arrangement',
		short: 'How scenes are presented to the viewer',
		definition:
			'Defined in specs.json as specs.sequence.arrangement. Four values exist: "animated" (auto-play on a timer), "narrative" (user-paced with labels), "comparative" (multiple scenes side by side), and "lod" (proximity swap — planned). The arrangement drives which hooks are active and how DataVizCanvas lays out the scene.',
		relatedNodes: ['viewerState', 'scenePlayback', 'compSelection', 'lod'],
	},
	{
		term: 'comparative',
		short: 'Show multiple scenes simultaneously, side by side',
		definition:
			'An arrangement where N scenes are rendered at once in a grid. The viewer selects which scenes to show via ComparativeScenePicker. useComparativeSelection converts the selected domain values to scene indices (inverse map). sceneMerge runs once per selected scene; DataVizCanvas renders them offset along the X axis.',
		relatedNodes: ['compPicker', 'compSelection', 'sceneMerge', 'canvas'],
	},
	{
		term: 'animated',
		short: 'Scenes auto-advance on a looping timer',
		definition:
			'An arrangement where useScenePlayback starts a setInterval that increments the scene index modulo the total count. The only difference from narrative is the isPlaying boolean — the same hook handles both. Pressing Play/Pause toggles the interval.',
		relatedNodes: ['scenePlayback', 'sceneNav'],
	},
	{
		term: 'narrative',
		short: 'User steps through scenes manually via labels',
		definition:
			'An arrangement where SceneNav renders a clickable label for each scene; clicking jumps directly to that index. No timer runs. Labels are positional (index → label), so no value→index inverse map is needed — unlike comparative.',
		relatedNodes: ['scenePlayback', 'sceneNav', 'vizLoader'],
	},
	{
		term: 'LOD',
		short: 'Planned: swap scenes on AR proximity',
		definition:
			'A planned fourth arrangement: as the viewer physically approaches the AR display, the scene transitions to a richer detail level. The gap vector\'s Y component is reserved for the proximity offset. Defined in the JSON Schema but not yet implemented in Web3D — the path stops at the fork in useViewerState.',
		relatedNodes: ['lod', 'viewerState'],
	},
	{
		term: 'datareps.json',
		short: 'Primary pipeline output — array of DataRep arrays',
		definition:
			'A JSON array where index 0 is the stage DataRep array and indices 1..n are per-scene DataRep arrays. This is the platform-neutral contract: Web3D, Unity, and ARchi all read the same file. The JSON Schema validates it on both the pipeline write side and the frontend read side.',
		relatedNodes: ['pipeline', 'vizLoader', 'sampleLoader'],
	},
	{
		term: 'specs.json',
		short: 'Optional arrangement metadata',
		definition:
			'A companion JSON file produced by the pipeline when the config defines a sequence. Contains specs.sequence: { arrangement, selection (comparative), labels (narrative), gap (between scenes), … }. If absent, the viewer falls back to a single static scene.',
		relatedNodes: ['pipeline', 'sampleLoader', 'viewerState', 'compSelection'],
	},
	{
		term: 'selection',
		short: 'The domain values chosen in comparative mode',
		definition:
			'An array of raw data values in specs.sequence.selection (e.g. [2000, 2006, 2009]). useComparativeSelection maps each value to a scene index via the inverse map. ComparativeScenePicker displays them as toggle buttons using the forward map (domainLabelForScene).',
		relatedNodes: ['compSelection', 'compPicker', 'vizLoader'],
	},
	{
		term: 'forward map',
		short: 'Scene index → human-readable domain value',
		definition:
			'domainLabelForScene(index, specs, datareps) — converts a scene index to the domain value it represents (e.g. 6 → "2006"). Used by ComparativeScenePicker to label its buttons. Must be the exact inverse of the inverse map in useComparativeSelection.',
		relatedNodes: ['vizLoader', 'compPicker'],
	},
	{
		term: 'inverse map',
		short: 'Domain value → scene index',
		definition:
			'Math.round(((v − min) / (max − min)) × (n − 1)) — converts a raw domain value from specs.selection back to a scene index. Used by useComparativeSelection. Must mirror the forward map exactly or the wrong scene is silently shown.',
		relatedNodes: ['compSelection', 'vizLoader'],
	},
	{
		term: 'gap vector',
		short: '[dx, dy, dz] offset between scenes in comparative layout',
		definition:
			'Defined in specs.sequence.gap. Controls how far apart scenes are placed along each axis in comparative and LOD modes. The Y component is reserved for LOD proximity (future). Web3D uses it to offset each scene grid along X so they sit side by side without overlapping.',
		relatedNodes: ['canvas', 'lod'],
	},
	{
		term: 'assetBasePath',
		short: 'Base URL for resolving $SERVER asset paths',
		definition:
			'The URL prefix injected by the viewer into DataVizCanvas and supplied via VizContext. DataRep fields that reference textures or meshes use $SERVER/run/vis/ as a placeholder; assetUrl() replaces that prefix with assetBasePath at runtime, resolving to /api/pipeline-file/samples/<name>/…',
		relatedNodes: ['vizContext', 'assetUrl', 'panelPlane', 'shapes'],
	},
	{
		term: 'SHAPE_REGISTRY',
		short: 'Map from type string to shape component',
		definition:
			'A static Record<string, ComponentType> in registry.ts. DataRepMesh looks up rep.type.toLowerCase() in this map to find the component that should render it. Adding a new geometry = one new component + one new entry. The registry is the Strategy pattern\'s lookup table.',
		relatedNodes: ['registry', 'dataRepMesh', 'shapes'],
	},
];

export type ADRStatus = 'accepted' | 'proposed' | 'deprecated';

export interface ADROption {
	label: string;
	note: string;
	chosen?: boolean;
}

export interface ADR {
	id: string;
	title: string;
	status: ADRStatus;
	context: string;
	options: ADROption[];
	decision: string;
	consequences: string;
	nodes: string[];
}

export const adrs: ADR[] = [
	{
		id: 'r3f',
		title: 'Use React Three Fiber over raw Three.js',
		status: 'accepted',
		context:
			'Web3D needs real-time 3D rendering deeply integrated with React state. The data (DataRep[]) changes on every scene tick, every sample switch, and every comparative toggle — the 3D scene must stay in sync with React without manual bookkeeping.',
		options: [
			{
				label: 'Raw Three.js + useEffect',
				note: 'Full control, but scene management fights React: manual disposal, imperative refs everywhere, no hooks for per-frame updates.',
			},
			{
				label: 'Babylon.js',
				note: 'Feature-rich engine, but heavier bundle and React integration is unofficial/community-maintained.',
			},
			{
				label: 'A-Frame',
				note: 'Declarative and easy, but HTML-attribute-driven API does not compose well with React state and TypeScript.',
			},
			{
				label: 'React Three Fiber (R3F)',
				note: 'Declarative JSX for Three.js objects, hooks-first (useFrame, useThree), automatic disposal on unmount, typed via @types/three.',
				chosen: true,
			},
		],
		decision:
			'R3F lets every shape be a plain React component: <mesh>, <boxGeometry/>, <meshStandardMaterial/>. useFrame gives per-render hooks without breaking out of React. When a DataRep changes, React re-renders the relevant component — no manual scene diffing.',
		consequences:
			'DataVizCanvas and all 12 shape components are pure R3F. Three.js objects never outlive their React lifecycle. The tradeoff: R3F adds an abstraction layer that can be surprising when debugging raw Three.js behaviour (e.g. disposing geometries vs materials).',
		nodes: ['canvas', 'shapes', 'panelPlane', 'dataRepMesh', 'vizContext', 'useColor'],
	},
	{
		id: 'nextjs',
		title: 'Use Next.js App Router over a Vite + React SPA',
		status: 'accepted',
		context:
			'The application needs: (1) a server-rendered sample gallery, (2) API routes to run the Python pipeline and serve generated files, (3) a same-origin schema proxy for the editor. A pure SPA would require a separate backend.',
		options: [
			{
				label: 'Vite + React SPA + separate Express server',
				note: 'Two processes to start, two deploy targets, CORS to manage between them.',
			},
			{
				label: 'Remix',
				note: 'Strong server/client model, but loader-based routing is more coupling than needed for this mostly-client-side app.',
			},
			{
				label: 'Next.js Pages Router',
				note: 'Familiar, but getServerSideProps is more ceremony than App Router server components for a simple gallery.',
			},
			{
				label: 'Next.js App Router',
				note: 'Server components for the gallery (no round-trip), API routes for pipeline + file serving, one process, one deploy target.',
				chosen: true,
			},
		],
		decision:
			'App Router server components let the landing page call listSamples() directly — no fetch, no API route, no client state. The /api/* routes handle pipeline execution and file serving in the same process. The editor schema proxy is two lines of fetch.',
		consequences:
			'The server/client boundary is explicit (\'use client\' directive). listSamples() is server-only and never ships to the browser. The tradeoff: App Router\'s caching model (fetch deduplication, revalidation) adds conceptual overhead for team members new to Next.js 13+.',
		nodes: ['landing', 'viewer', 'apiSamples', 'apiPipelineFile', 'apiRunPipeline', 'apiSchema', 'listSamples'],
	},
	{
		id: 'ajv',
		title: 'Use AJV for config validation on both client and server',
		status: 'accepted',
		context:
			'The editor must give live feedback on invalid configs (UX), and the server must independently reject invalid configs before writing or running (security). Both checks must agree on what is valid.',
		options: [
			{
				label: 'Zod',
				note: 'TypeScript-first, great DX, but schema is defined in TS code — harder to share with the Python pipeline and the metason server which use JSON Schema.',
			},
			{
				label: 'Yup',
				note: 'Fluent API, but also code-defined schemas, same portability problem.',
			},
			{
				label: 'Manual validation',
				note: 'Fragile, duplicated, and diverges between client and server over time.',
			},
			{
				label: 'AJV with the shared JSON Schema',
				note: 'JSON Schema is the format the metason server already publishes. AJV compiles it once and validates in microseconds. Same library, same schema, same errors on both sides.',
				chosen: true,
			},
		],
		decision:
			'AJV is compiled once from the schema fetched via /api/schema/config. The client uses it for live error highlighting (jsonc-parser maps AJV errors to token positions). The server re-runs the same AJV instance independently on the raw POST body before writing or executing anything.',
		consequences:
			'Client and server errors are identical — no "it validates in the editor but fails on the server" surprises. The Python pipeline also validates against the same JSON Schema, completing the three-way agreement. Tradeoff: AJV\'s JSON Schema dialect (draft-07) is less ergonomic than Zod for TypeScript-heavy code.',
		nodes: ['editor', 'apiRunPipeline', 'apiSchema'],
	},
	{
		id: 'datareps-contract',
		title: 'Use datareps.json as a static, platform-neutral contract',
		status: 'accepted',
		context:
			'Three frontends (Web3D, Unity, ARchi) must visualise the same pipeline output. The pipeline is Python; the frontends are TypeScript, C#, and Swift. A live REST API from the pipeline would couple all frontends to the pipeline\'s runtime.',
		options: [
			{
				label: 'Live REST API from the pipeline',
				note: 'Tight coupling: all frontends depend on the pipeline being running. Harder to work offline or with pre-generated data.',
			},
			{
				label: 'Shared TypeScript types only',
				note: 'Only works for Web3D; Unity and ARchi need a language-neutral format.',
			},
			{
				label: 'Protobuf / MessagePack',
				note: 'Efficient binary format, but adds a code-gen step and tooling complexity for a thesis project.',
			},
			{
				label: 'Static datareps.json validated by JSON Schema',
				note: 'Language-neutral, human-readable, diffable in git, validated by the same schema on all three sides.',
				chosen: true,
			},
		],
		decision:
			'The pipeline writes datareps.json once. Web3D, Unity, and ARchi each read it independently. The JSON Schema is the contract — any frontend that passes schema validation is guaranteed to receive well-formed data. No pipeline process needs to be running while the frontend is in use.',
		consequences:
			'Frontends are fully decoupled from the pipeline runtime. Pre-generated samples ship with the repository. The tradeoff: the schema must be kept in sync manually across Python, TypeScript, and any future frontend. Breaking schema changes require coordinated updates.',
		nodes: ['pipeline', 'vizLoader', 'viewer', 'apiPipelineFile'],
	},
	{
		id: 'jsonc-parser',
		title: 'Use jsonc-parser for editor error-to-token mapping',
		status: 'accepted',
		context:
			'AJV validation errors contain a JSON Pointer (e.g. /sequence/arrangement) pointing to the invalid field. Monaco editor needs a character-level range to draw the red underline in the right place. Standard JSON.parse gives no token positions.',
		options: [
			{
				label: 'Standard JSON.parse',
				note: 'Returns no token positions. AJV errors would appear as a list, not as inline highlights in the editor.',
			},
			{
				label: 'Hand-rolled tokeniser',
				note: 'Error-prone, does not handle JSONC (JSON with comments) which Monaco supports by default.',
			},
			{
				label: 'json5',
				note: 'Parses extended JSON, but does not expose token positions.',
			},
			{
				label: 'jsonc-parser (VS Code\'s own library)',
				note: 'Parses JSON/JSONC and exposes the offset of every token. JSON Pointer → token range → Monaco decoration in ~10 lines.',
				chosen: true,
			},
		],
		decision:
			'jsonc-parser.parseTree() gives a full AST with character offsets. Given an AJV error at /sequence/arrangement, we walk the AST to find the node at that pointer and read its offset + length — exactly what Monaco needs for a MarkerData.',
		consequences:
			'Error decorations appear on the exact field that failed validation, not just at the top of the file. jsonc-parser is the same library Monaco itself uses internally, so the token model is guaranteed to match. Bundle cost is minimal (~15 kB).',
		nodes: ['editor'],
	},
	{
		id: 'api-file-serving',
		title: 'Serve pipeline output via /api/pipeline-file, not from public/',
		status: 'accepted',
		context:
			'Generated files (PNG textures, PLY meshes, datareps.json) are written to samples/ inside the project. They need to be served to the browser. Next.js serves static files from public/ automatically, which would be the simplest path.',
		options: [
			{
				label: 'Copy generated files into public/',
				note: 'Simple, but conflates source-controlled static assets with generated artefacts. public/ is not gitignored and would accumulate generated files.',
			},
			{
				label: 'Separate static file server (e.g. Nginx)',
				note: 'Adds infrastructure complexity; two origins means CORS headers everywhere.',
			},
			{
				label: '/api/pipeline-file route with guards',
				note: 'Same-origin, extension whitelist prevents serving .py/.env files, path-traversal guard prevents ../../etc/passwd attacks.',
				chosen: true,
			},
		],
		decision:
			'The route validates the path (no .. segments), checks the extension against an allowlist (json, png, ply, jpg), then streams the file from disk. Reached via a Next.js rewrite (/samples/* → /api/pipeline-file/*) so client code uses clean URLs.',
		consequences:
			'Generated files stay in samples/ (gitignored). The extension whitelist means even if a path-traversal were somehow possible, only whitelisted types could be served. Tradeoff: every asset request goes through Node.js instead of a static file server — acceptable at thesis-project scale.',
		nodes: ['apiPipelineFile', 'pipeline', 'panelPlane', 'shapes'],
	},
	{
		id: 'pure-scene-merge',
		title: 'Implement sceneMerge as a pure function, not inside the hook',
		status: 'accepted',
		context:
			'The merge of stage reps + scene reps is the most critical derived value in the viewer — every render depends on it. It could live inline in useViewerState (simpler) or in a separate pure function (testable).',
		options: [
			{
				label: 'Inline merge inside useViewerState with useMemo',
				note: 'Fewer files, but the logic is locked inside a hook and cannot be tested without rendering a React component.',
			},
			{
				label: 'Pure function in lib/, called from useViewerState',
				note: 'Testable with plain Node (no jsdom, no React test renderer). The hook becomes a thin caller.',
				chosen: true,
			},
		],
		decision:
			'sceneMerge.ts exports mergeSceneWithStage() and mergeMultipleScenesWithStage() as plain functions. useViewerState calls them inside useMemo. The tests for sceneMerge run in ~1 ms with no browser environment.',
		consequences:
			'The merge logic is covered by unit tests that catch regressions before a browser is involved. The hook stays thin — it composes pure functions rather than containing logic. This pattern is replicated across the lib/ layer (vizLoader, panelOrientation, assetUrl).',
		nodes: ['sceneMerge', 'viewerState', 'vizLoader', 'panelOrientation', 'assetUrl'],
	},
];

export type PatternCategory =
	| 'GoF Behavioral'
	| 'GoF Structural'
	| 'React'
	| 'Architectural'
	| 'Security';

export interface ArchPattern {
	id: string;
	name: string;
	category: PatternCategory;
	tagline: string;
	description: string;
	application: string;
	nodes: string[];
	examQuestion: string;
	examAnswer: string;
}

export const patterns: ArchPattern[] = [
	{
		id: 'strategy',
		name: 'Strategy',
		category: 'GoF Behavioral',
		tagline: 'Swap algorithms behind a stable interface',
		description:
			'Define a family of algorithms, encapsulate each one, and make them interchangeable. The client (DataRepMesh) is decoupled from the concrete implementations (shape components).',
		application:
			'SHAPE_REGISTRY is a plain object mapping type strings to React components. DataRepMesh looks up the type and delegates — it never contains a switch/if chain. Adding a new geometry = one component + one registry entry; DataRepMesh is untouched.',
		nodes: ['registry', 'dataRepMesh', 'shapes'],
		examQuestion: 'How would you add a new shape type to Web3D?',
		examAnswer:
			'Create a new component in shapes/ that accepts a DataRep prop, then add one entry to SHAPE_REGISTRY. No other file changes. The dispatcher (DataRepMesh) is open for extension, closed for modification — the classic OCP benefit of Strategy.',
	},
	{
		id: 'composite-hook',
		name: 'Composite Hook / Facade',
		category: 'React',
		tagline: 'One hook that owns all viewer state',
		description:
			'A Facade provides a simplified interface to a complex subsystem. In React, this maps naturally to a "composite hook" that calls several domain hooks and returns one flat object.',
		application:
			'useViewerState composes useSampleLoader, useScenePlayback, useComparativeSelection, and sceneMerge. The viewer page calls one hook and receives everything it needs — it has no knowledge of the four underlying hooks or how they interact.',
		nodes: ['viewerState', 'sampleLoader', 'scenePlayback', 'compSelection', 'sceneMerge'],
		examQuestion: 'Why does the viewer page hold so little logic of its own?',
		examAnswer:
			'All state logic is inside useViewerState (Facade). The page is intentionally thin — it mounts the hook and distributes the result to child components. This keeps the page testable without rendering, and makes the state portable if the UI changes.',
	},
	{
		id: 'context',
		name: 'Context / Provider',
		category: 'React',
		tagline: 'Inject shared values without prop-drilling',
		description:
			'React Context lets you broadcast a value to any descendant without threading it through intermediate components as props.',
		application:
			'VizContext supplies assetBasePath to the entire shape/panel tree. Without it, DataVizCanvas → SceneContent → DataRepMesh → every shape component would all need an assetBasePath prop. Context cuts that chain.',
		nodes: ['vizContext', 'canvas', 'panelPlane', 'shapes'],
		examQuestion: 'Why use Context for assetBasePath instead of just passing it as a prop?',
		examAnswer:
			'The value is needed 4–5 levels deep (Canvas → SceneContent → DataRepMesh → shape → texture loader). Prop-drilling that far makes every intermediate component aware of a value it does not use. Context is the right tool when a value is truly cross-cutting to a subtree.',
	},
	{
		id: 'bijective-map',
		name: 'Bijective Map',
		category: 'Architectural',
		tagline: 'Forward and inverse maps must be exact inverses',
		description:
			'A bijection is a one-to-one correspondence between two sets. When a UI must convert between display values and internal indices in both directions, the two conversion functions must be strict inverses or users see the wrong scene.',
		application:
			'domainLabelForScene() (in vizLoader) is the FORWARD map: scene index → human value (e.g. 6 → "2006"). useComparativeSelection is the INVERSE: "2006" → Math.round(normalized × (n−1)) → 6. ComparativeScenePicker labels buttons with the forward map; the inverse must produce the exact same index the label came from.',
		nodes: ['compPicker', 'compSelection', 'vizLoader'],
		examQuestion: 'What breaks if the forward and inverse maps are not exact inverses?',
		examAnswer:
			'The user clicks "2006" (forward label), the inverse rounds to index 5 instead of 6, and the wrong scene is shown — silently. The bug is invisible because the label stays "2006" even though the wrong data is displayed. The Math.round() in the inverse must mirror the floor/round used in the forward labelling exactly.',
	},
	{
		id: 'proxy',
		name: 'Proxy',
		category: 'GoF Structural',
		tagline: 'Same-origin wrapper for a remote resource',
		description:
			'A Proxy provides a surrogate or placeholder for another object to control access to it. Here the motivation is cross-origin isolation, not lazy loading.',
		application:
			'/api/schema proxies the JSON schema from the metason server. The editor fetches /api/schema/config (same-origin) instead of the upstream URL. This avoids a CORS preflight, hides the upstream server address from the client, and lets the server cache or transform the schema in future.',
		nodes: ['apiSchema', 'editor'],
		examQuestion: 'Why not fetch the JSON schema directly from the metason server in the browser?',
		examAnswer:
			"Cross-origin fetch would require CORS headers on the metason server. A same-origin proxy gives the application full control: the upstream URL is never exposed to the client, the server can add caching, and a future schema transformation (e.g. stripping $defs the editor doesn't need) lives in one place.",
	},
	{
		id: 'double-validation',
		name: 'Double Validation',
		category: 'Security',
		tagline: 'Client validates for UX; server validates for trust',
		description:
			'Never trust the client. Client-side validation is fast feedback for the user; server-side validation is the real security boundary. Both use the same schema library (AJV) so they agree on what is valid.',
		application:
			'EditorPanel runs AJV live on every keystroke and disables Run on any error — this is UX. /api/run-pipeline re-validates independently before writing or executing anything. A crafted HTTP request that bypasses the editor entirely still fails server-side validation. The two checks use the same schema and the same AJV version.',
		nodes: ['editor', 'apiRunPipeline'],
		examQuestion: 'Could a malicious user bypass EditorPanel and send an invalid config directly to /api/run-pipeline?',
		examAnswer:
			'Not successfully. The server re-validates the config with AJV independently of the client. It also checks the sample slug against a whitelist and holds a 409 lock during pipeline execution. The client-side check is UX, not a security control — the server enforces the actual boundary.',
	},
	{
		id: 'neutral-contract',
		name: 'Platform-neutral Contract',
		category: 'Architectural',
		tagline: 'One JSON format consumed by all frontends',
		description:
			'Publish a stable, format-level contract so multiple consumers (Web3D, Unity, ARchi) can evolve independently. No consumer directly touches the pipeline — they all read the same output file.',
		application:
			'datareps.json is produced by the Python pipeline and consumed identically by Web3D (vizLoader), Unity, and ARchi. Changing the frontend rendering tech does not require changes to the pipeline, and vice versa. The JSON schema validates the contract on both sides.',
		nodes: ['pipeline', 'vizLoader', 'viewer'],
		examQuestion: 'How would you add a fourth frontend (e.g. a mobile AR app)?',
		examAnswer:
			'The app reads datareps.json using the same JSON schema — no pipeline changes needed. The contract is the schema, not the consumer. Web3D, Unity, and ARchi already demonstrate this separation: the pipeline is unaware of any of them.',
	},
	{
		id: 'pure-core',
		name: 'Pure Functional Core',
		category: 'Architectural',
		tagline: 'Side-effect-free lib layer — testable without a browser',
		description:
			'Separate pure logic (data transformations, computations) from impure shell (I/O, React state, Three.js). The pure core can be unit-tested with plain Node; the shell is tested via integration or manual testing.',
		application:
			'vizLoader, sceneMerge, panelOrientation, and assetUrl are pure functions with no React imports, no Three.js, and no browser globals. They take data in, return data out. The hook layer (useSampleLoader, useViewerState) is the impure shell that wires them to React state.',
		nodes: ['vizLoader', 'sceneMerge', 'panelOrientation', 'assetUrl', 'types'],
		examQuestion: 'How do you unit-test functions that are part of a 3D rendering pipeline?',
		examAnswer:
			'Extract the logic into pure functions (vizLoader, sceneMerge, etc.) that have no browser or Three.js dependencies. These run in plain Node — no jsdom, no canvas mock. The React and Three.js boundary is the impure shell, tested separately via integration tests or manual verification.',
	},
];

export interface SequenceStep {
	nodeId: string;
	action: string;
	detail: string;
}

export interface Sequence {
	id: string;
	title: string;
	trigger: string;
	steps: SequenceStep[];
}

export const sequences: Sequence[] = [
	{
		id: 'animated-play',
		title: 'Click Play',
		trigger: 'User clicks the Play button in animated mode',
		steps: [
			{
				nodeId: 'sceneNav',
				action: 'User clicks Play',
				detail: 'SceneNav renders the play/pause button. onClick fires togglePlay() from useScenePlayback.',
			},
			{
				nodeId: 'scenePlayback',
				action: 'togglePlay() → setInterval starts',
				detail: 'useScenePlayback flips isPlaying = true and starts a setInterval. The animated/narrative split happens here — animated is the only arrangement that starts the timer.',
			},
			{
				nodeId: 'scenePlayback',
				action: 'Tick: sceneIdx = (prev + 1) % n',
				detail: 'Each interval tick increments the scene index modulo the total number of scenes, so playback loops seamlessly.',
			},
			{
				nodeId: 'viewerState',
				action: 'New sceneIdx propagates up',
				detail: 'useViewerState receives the updated sceneIdx from useScenePlayback and passes it to sceneMerge.',
			},
			{
				nodeId: 'sceneMerge',
				action: 'mergeSceneWithStage(stage, scenes[idx])',
				detail: 'Pure function: spreads the persistent stage reps, then overrides with active scene reps by id. Returns one flat DataRep[].',
			},
			{
				nodeId: 'canvas',
				action: 'DataVizCanvas re-renders',
				detail: 'React re-renders the Canvas with the new mergedReps prop. Three.js only updates objects whose geometry actually changed.',
			},
			{
				nodeId: 'dataRepMesh',
				action: 'SHAPE_REGISTRY dispatch per rep',
				detail: 'Each DataRep in the merged array is dispatched to its shape component via SHAPE_REGISTRY[rep.type.toLowerCase()].',
			},
			{
				nodeId: 'shapes',
				action: 'Geometry updates in Three.js',
				detail: 'Shape components update scale, position, and color on their Three.js meshes. Only changed props trigger a geometry rebuild.',
			},
		],
	},
	{
		id: 'sample-select',
		title: 'Select sample',
		trigger: 'User picks a different dataset',
		steps: [
			{
				nodeId: 'landing',
				action: 'User clicks a sample card',
				detail: 'The landing gallery links to /viewer?sample=<name>. The viewer also exposes a dropdown that calls setSample() directly.',
			},
			{
				nodeId: 'sampleLoader',
				action: 'setSample() → fetch triggered',
				detail: 'useSampleLoader reacts to the new selection and fires two fetches: one for /api/samples (discovery) and one for the data files.',
			},
			{
				nodeId: 'apiSamples',
				action: 'GET /api/samples',
				detail: 'Server returns the list of known sample datasets (thin wrapper over listSamples()). Confirms the selected sample is valid.',
			},
			{
				nodeId: 'sampleLoader',
				action: 'Fetch datareps.json + specs.json',
				detail: 'Both files are fetched via /api/pipeline-file/samples/<name>/... The hook waits for both before updating state.',
			},
			{
				nodeId: 'vizLoader',
				action: 'parseViz() → stage + scenes',
				detail: 'Raw JSON array split: raw[0] = stage reps, raw.slice(1) = per-scene reps. parseKV() and classifyRep() run on each entry.',
			},
			{
				nodeId: 'viewerState',
				action: 'datareps + specs propagate up',
				detail: 'useViewerState receives the new data, resets sceneIdx to 0, re-derives the arrangement type from specs.sequence.arrangement.',
			},
			{
				nodeId: 'sceneMerge',
				action: 'Initial merge: stage + scene[0]',
				detail: 'First frame merges the stage with scene index 0 to produce the initial render data.',
			},
			{
				nodeId: 'canvas',
				action: 'DataVizCanvas renders new dataset',
				detail: 'Fresh geometry is built for every rep in the merged result. Old meshes are disposed by R3F.',
			},
		],
	},
	{
		id: 'editor-run',
		title: 'Editor → Run',
		trigger: 'User edits config in EditorPanel and clicks Run',
		steps: [
			{
				nodeId: 'editor',
				action: 'User types in Monaco',
				detail: 'Monaco fires onChange on every keystroke. jsonc-parser tokenises the text so AJV errors can be mapped to exact character positions.',
			},
			{
				nodeId: 'apiSchema',
				action: 'Schema fetched from /api/schema/config',
				detail: 'AJV compiles the schema once on first load from the same-origin proxy. This avoids a cross-origin fetch to the metason schema server.',
			},
			{
				nodeId: 'editor',
				action: 'AJV validates live — Run enabled only if clean',
				detail: 'AJV runs on every change. The Run button stays disabled while any error exists, so a malformed config can never reach the pipeline.',
			},
			{
				nodeId: 'apiRunPipeline',
				action: 'POST { slug, configText }',
				detail: 'EditorPanel POSTs the validated JSON. The server re-validates independently (slug whitelist, 409 concurrency lock, AJV again) — the client check is UX, not a security boundary.',
			},
			{
				nodeId: 'pipeline',
				action: 'datarepgen.py spawned',
				detail: 'The server writes the config and spawns the Python pipeline. New datareps.json and specs.json are written to disk.',
			},
			{
				nodeId: 'sampleLoader',
				action: 'onReload() → re-fetch triggered',
				detail: 'EditorPanel calls the onReload() callback on a 200 response. useSampleLoader re-fetches the updated files from disk.',
			},
			{
				nodeId: 'vizLoader',
				action: 'parseViz() on fresh data',
				detail: 'The new datareps.json is parsed. Stage and scenes now reflect the updated config.',
			},
			{
				nodeId: 'canvas',
				action: 'DataVizCanvas re-renders with new data',
				detail: 'The viewer reflects the regenerated dataset without a page reload. The full edit → validate → run → reload cycle completes in the browser.',
			},
		],
	},
	{
		id: 'comparative-toggle',
		title: 'Toggle scene (comparative)',
		trigger: 'User toggles a scene in comparative mode',
		steps: [
			{
				nodeId: 'compPicker',
				action: 'User clicks a scene toggle button',
				detail: 'ComparativeScenePicker labels each button using the FORWARD map: domainLabelForScene(index) → human-readable value (e.g. "2006").',
			},
			{
				nodeId: 'compSelection',
				action: 'Inverse map: value → scene index',
				detail: 'useComparativeSelection converts the selected value back to an index: Math.round(((v − min) / (max − min)) × (n − 1)). This is the exact inverse of the forward map.',
			},
			{
				nodeId: 'viewerState',
				action: 'selectedIndices updated',
				detail: 'useViewerState receives the new set of selected indices and passes them to sceneMerge, along with the full scenes array.',
			},
			{
				nodeId: 'sceneMerge',
				action: 'mergeMultipleScenesWithStage()',
				detail: 'Each selected scene is merged with the stage separately, producing N independent DataRep[] arrays — one per column in the grid.',
			},
			{
				nodeId: 'canvas',
				action: 'ComparativeContent lays out the grid',
				detail: 'DataVizCanvas switches to ComparativeContent, which renders N sub-scenes side by side, offset along the X axis.',
			},
			{
				nodeId: 'dataRepMesh',
				action: 'Dispatch per rep per scene',
				detail: "Each scene's reps go through SHAPE_REGISTRY dispatch independently, so N grids of shapes are rendered in parallel.",
			},
			{
				nodeId: 'vizContext',
				action: 'assetBasePath supplied to all shapes',
				detail: 'VizContext ensures every shape in every grid column resolves asset paths (textures, PLY files) consistently via useVizContext().',
			},
		],
	},
];

export const flows: ArchFlow[] = [
	{
		id: 'comparative',
		title: 'Comparative',
		note: 'Several scenes at once: inverse map picks scenes, sceneMerge combines them, ComparativeContent (inside DataVizCanvas) lays out the grid.',
		path: [...TRUNK, 'compSelection', 'sceneMerge', 'compPicker', ...RENDER],
	},
	{
		id: 'animated',
		title: 'Animated',
		note: 'One scene at a time, auto-played on a looping timer. Same path as narrative — the difference is one boolean in useScenePlayback.',
		path: [...TRUNK, 'scenePlayback', 'sceneMerge', 'sceneNav', ...RENDER],
	},
	{
		id: 'narrative',
		title: 'Narrative',
		note: 'One scene at a time, viewer-paced via clickable labels (positional, no value→index map). Same classes as animated.',
		path: [...TRUNK, 'scenePlayback', 'sceneMerge', 'sceneNav', ...RENDER],
	},
	{
		id: 'lod',
		title: 'LOD (planned)',
		note: 'Defined in the schema, not implemented — the path stops at the fork.',
		path: [...TRUNK, 'lod'],
	},
	{
		id: 'editor',
		title: 'Editor loop',
		note: 'Edit → validate → Run → regenerate → reload → re-render, all in the browser.',
		path: [
			'viewer',
			'editor',
			'apiSchema',
			'apiRunPipeline',
			'pipeline',
			'sampleLoader',
			'apiSamples',
			'apiPipelineFile',
			'vizLoader',
			'viewerState',
			...RENDER,
		],
	},
];
