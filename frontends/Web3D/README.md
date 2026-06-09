# SAXR Web3D Viewer

Browser-based 3D data-visualization viewer built with Next.js and React Three Fiber.  
Loads `datareps.json` files produced by the SAXR pipeline and renders interactive WebGL scenes.

## Requirements

| Dependency | Version     | Required for                       |
| ---------- | ----------- | ---------------------------------- |
| Node.js    | 18 or later | Viewer (always)                    |
| npm        | 9 or later  | Viewer (always)                    |
| Python     | 3.11+       | In-browser pipeline execution only |

All JavaScript dependencies (Monaco Editor, AJV, Three.js, etc.) are listed in `package.json` and installed by `npm install` — no separate installs needed.

Python is only required if you use the in-browser **Run** button in the config editor. Install the pipeline dependencies from the repository root:

```bash
pip install -e .        # numpy, pandas, matplotlib, jsonschema
pip install -e ".[geo]" # + geopandas (for geo/map samples)
```

## Quick Start

```bash
cd frontends/Web3D
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).  
The landing page lists available samples and links to the viewer. Navigate directly to a sample with:

```
http://localhost:3000/viewer?sample=eco
```

Mouse controls in the 3D viewer:

| Action | Control          |
| ------ | ---------------- |
| Rotate | Left-click drag  |
| Zoom   | Scroll wheel     |
| Pan    | Right-click drag |

## Architecture

```
SAXR Pipeline                         Web3D Viewer
─────────────                         ────────────

config.json ─► datarepgen.py ─► datareps.json + panel PNGs
                                       │
                               GET /api/samples
                                       │
                    ┌──────────────────┴────────────────────┐
                    │          app/page.tsx                  │
                    │     Landing page — sample gallery,     │
                    │     arrangement showcase, editor demo  │
                    └──────────────────┬────────────────────┘
                                       │ links to /viewer?sample=…
                    ┌──────────────────┴────────────────────┐
                    │        app/viewer/page.tsx             │
                    │   useViewerState (composite hook)      │
                    │   ├─ useSampleLoader                   │
                    │   ├─ useScenePlayback                  │
                    │   └─ useComparativeSelection           │
                    └──────────────────┬────────────────────┘
                                       │
                          VizProvider (context)
                                       │
                    ┌──────────────────┴────────────────────┐
                    │           DataVizCanvas                │
                    │    (Canvas, lights, controls)          │
                    └──────────┬────────────────┬───────────┘
                               │                │
                    DataRepMesh             PanelPlane
                  (SHAPE_REGISTRY)      (textured quads)
                        │
          ┌──────┬──────┼──────┬───────┬───────┐
        Sphere  Box  Cylinder  Arc  Surface  Line/Area …
```

### Data Flow

1. `viewer/page.tsx` calls `useViewerState`, which composes the individual domain hooks.
2. `useSampleLoader` fetches `/api/samples` to discover available datasets and loads the selected sample's `datareps.json` and `specs.json`.
3. `useScenePlayback` manages the current scene index and auto-play timer.
4. `useComparativeSelection` tracks which scenes are shown side-by-side in `comparative` mode.
5. `mergeSceneWithStage()` / `mergeMultipleScenesWithStage()` combines persistent stage-level reps (scene 0) with the active data scene(s).
6. `DataVizCanvas` renders 3D shapes via `DataRepMesh` and image panels via `PanelPlane`.
7. `VizContext` supplies `assetBasePath` to all nested components without prop drilling.

## Project Structure

```
src/
├── app/
│   ├── page.tsx                       Landing page — sample gallery, arrangement showcase
│   ├── layout.tsx                     Root layout (metadata, fonts)
│   ├── globals.css                    Global styles
│   ├── viewer/
│   │   └── page.tsx                   3D viewer — HUD overlay, state orchestration
│   └── api/
│       ├── samples/route.ts           GET /api/samples — auto-discovers datasets
│       ├── pipeline-file/[...path]/route.ts   Serves files from SAXR/samples/
│       └── run-pipeline/route.ts      POST /api/run-pipeline — saves config, runs pipeline
├── components/
│   ├── DataVizCanvas.tsx              R3F Canvas — lighting, camera, grid, orbit controls
│   ├── DataRepMesh.tsx                Dispatcher: rep.type → shape component
│   ├── PanelPlane.tsx                 Textured image panels with frustum culling
│   ├── SceneNav.tsx                   Scene navigation (adapts per arrangement mode)
│   ├── ComparativeScenePicker.tsx     Toggle buttons for comparative scene selection
│   ├── EditorPanel.tsx                In-browser config editor (Monaco + schema validation)
│   └── shapes/                        3D geometry components
│       ├── registry.ts                Type → component mapping (SHAPE_REGISTRY)
│       ├── Sphere.tsx                 THREE.SphereGeometry
│       ├── Box.tsx                    THREE.BoxGeometry
│       ├── Cylinder.tsx               THREE.CylinderGeometry
│       ├── Pyramid.tsx                THREE.ConeGeometry (+ upsideDown prop)
│       ├── Octahedron.tsx             THREE.OctahedronGeometry
│       ├── Plus.tsx                   3 perpendicular boxes
│       ├── Cross.tsx                  Rotated plus
│       ├── Plane.tsx                  THREE.PlaneGeometry
│       ├── Arc.tsx                    Custom BufferGeometry (donut segment)
│       ├── Area.tsx                   Flat colored quad (area segment)
│       ├── Line.tsx                   Thin oriented cylinder (line segment)
│       └── Surface.tsx               PLY file mesh loader
├── context/
│   └── VizContext.tsx                 React context for assetBasePath
├── hooks/
│   ├── useViewerState.ts              Composite hook — assembles all viewer state
│   ├── useSampleLoader.ts             Sample discovery & data fetching
│   ├── useScenePlayback.ts            Scene navigation & auto-play timer
│   ├── useComparativeSelection.ts     Multi-scene selection for comparative mode
│   └── useColor.ts                    Hex color → THREE.Color + opacity
└── lib/
    ├── types.ts                       TypeScript interfaces (DataRep, VizJson, SpecsJson…)
    ├── vizLoader.ts                   Fetch/validate datareps.json, parseKV, parseHexColor
    ├── sceneMerge.ts                  Merge stage-level reps into current scene(s)
    ├── listSamples.ts                 Server-only: scan SAXR/samples/ for available datasets
    ├── assetUrl.ts                    Resolve $SERVER/run/vis/ → local asset paths
    └── panelOrientation.ts            Compute panel rotation/orientation from type
```

## Data Format

The viewer consumes JSON files produced by the SAXR pipeline. See `src/lib/types.ts` for the canonical TypeScript definitions.

### DataRep

Each element in the visualization is a `DataRep` — a positioned, scaled, colored 3D primitive:

```typescript
interface DataRep {
	type: string; // Shape type: 'sphere', 'box', 'arc', 'xy', 'pyramid_down', etc.
	x: number; // Position X
	y: number; // Position Y
	z: number; // Position Z
	w: number; // Width (scale X)
	h: number; // Height (scale Y)
	d: number; // Depth (scale Z)
	color?: string; // Hex color: '#RRGGBB' or '#RRGGBBAA'
	asset?: string; // Image path (panels), KV params (arcs), or PLY path (surfaces)
}
```

### VizJson (datareps.json)

```typescript
type VizJson = DataRep[][]; // Array of scenes, each scene is an array of DataRep
```

The outer array represents **scenes**. Scene 0 holds **stage-level** elements (panels, legends, encoding info) that persist across all scenes. Scenes 1+ contain the data-specific geometry that changes per scene.

### SpecsJson (specs.json)

```typescript
interface SpecsJson {
	sequence?: {
		field?: string; // Data field driving the sequence
		domain?: number[]; // [min, max] value range (e.g. [2000, 2020])
		arrangement?: 'animated' | 'narrative' | 'comparative' | 'LOD';
		interval?: number; // Auto-play interval in seconds (default: 1.5)
		labels?: string[]; // Scene labels for narrative mode
		gap?: [number, number, number]; // XYZ spacing between scenes in comparative mode
		selection?: number[]; // Initial domain values to show in comparative mode
		columns?: number; // Column count for comparative grid layout
	};
	encoding?: Record<string, unknown>; // Encoding metadata
}
```

## Arrangement Modes

The `specs.json` `sequence.arrangement` field controls how scenes are presented. `SceneNav` adapts its UI accordingly:

| Arrangement   | Behavior                                                                 | UI Controls                                       |
| ------------- | ------------------------------------------------------------------------ | ------------------------------------------------- |
| `animated`    | Auto-plays through scenes at `interval` seconds. Loops continuously.     | ◀ Prev \| ▶/⏸ Play/Pause \| counter \| Next ▶     |
| `narrative`   | User-driven storytelling. Each scene has a label from `sequence.labels`. | [Label 1] [Label 2] … (top) + ◀ Prev / Next ▶     |
| `comparative` | Side-by-side scenes in a grid. Users toggle which scenes are shown.      | Scene toggle buttons via `ComparativeScenePicker` |
| `LOD`         | Level-of-detail progression. Manual navigation.                          | ◀ Prev \| counter \| Next ▶                       |
| _(not set)_   | Default manual navigation.                                               | ◀ Prev \| counter \| Next ▶                       |

The scene counter displays domain values (e.g. "2003") when `sequence.domain` is available, otherwise shows "Scene 3 / 25". Navigation is hidden entirely for single-scene datasets.

## Multi-Scene Navigation

A `datareps.json` contains an array of arrays — each inner array is a **scene**.

### Stage vs Scene

- **Scene 0 (Stage)**: Contains stage-level elements — panels, legends, spatial encoding info. These persist across all scenes. Stage-level reps have non-lowercase types (e.g. `XY`, `ZY`) or special types like `image` and `encoding`.
- **Scenes 1+ (Data)**: Contain data-specific shapes that change per scene (bars, spheres, arcs, etc.). These have all-lowercase types.

When navigating to scene _N_, `mergeSceneWithStage()` combines scene _N_'s data reps with the persistent stage reps from scene 0. In comparative mode, `mergeMultipleScenesWithStage()` offsets and merges several scenes simultaneously using the `gap` vector.

### Auto-Play

For `animated` arrangement, `useScenePlayback` starts an interval timer that advances the scene automatically. The interval defaults to 1.5 seconds (overridden by `specs.sequence.interval`). Playback loops from the last scene back to scene 0. The user can pause/resume with the ⏸/▶ button.

### Comparative Mode

For `comparative` arrangement, `useComparativeSelection` tracks which scenes are shown side-by-side. The initial selection is driven by `specs.sequence.selection` (domain values mapped to scene indices). Users can toggle scenes on/off with the `ComparativeScenePicker` HUD buttons. `mergeMultipleScenesWithStage()` places each selected scene offset by the `gap` vector and organises them into a grid with `columns` columns.

## Supported Shape Types

### 3D Geometry Shapes

| Type           | Geometry                   | Notes                                               |
| -------------- | -------------------------- | --------------------------------------------------- |
| `sphere`       | `THREE.SphereGeometry`     | 16×16 segments                                      |
| `box`          | `THREE.BoxGeometry`        | Standard cube scaled by w/h/d                       |
| `cylinder`     | `THREE.CylinderGeometry`   | 16 segments; height halved to match SAXR units      |
| `pyramid`      | `THREE.ConeGeometry`       | 4 sides, point up                                   |
| `pyramid_down` | `THREE.ConeGeometry`       | 4 sides, point down (`upsideDown` prop)             |
| `octahedron`   | `THREE.OctahedronGeometry` | 8-sided polyhedron                                  |
| `plus`         | 3 perpendicular boxes      | Cross/plus shape                                    |
| `cross`        | Rotated plus               | Diagonal cross                                      |
| `plane`        | `THREE.PlaneGeometry`      | Flat quad                                           |
| `arc`          | Custom `BufferGeometry`    | Donut segment; see arc parameters below             |
| `area`         | `THREE.BoxGeometry`        | Flat colored quad; minimum thickness enforced       |
| `line`         | `THREE.CylinderGeometry`   | Thin oriented cylinder; (w,h,d) is direction vector |
| `surface`      | PLY mesh loader            | Loads external `.ply` files via `asset`             |

#### Arc Parameters

Arcs use semicolon-separated key:value pairs in the `asset` field:

```
"ratio:0.5;start:0;angle:120"
```

| Key     | Default | Description                              |
| ------- | ------- | ---------------------------------------- |
| `ratio` | `0.5`   | Inner radius as fraction of outer radius |
| `start` | `0`     | Start angle in degrees                   |
| `angle` | `90`    | Sweep angle in degrees                   |

#### Surface (PLY) Meshes

The `surface` type loads a `.ply` file specified in the `asset` field. Supports vertex colors from the PLY file or falls back to `rep.color`.

### Image Panels

Panels are textured quads rendered from PNG images generated by the SAXR pipeline.

| Type     | Orientation         | Description          |
| -------- | ------------------- | -------------------- |
| `xy`     | Vertical, facing +Z | Front wall panel     |
| `-xy`    | Vertical, facing −Z | Back wall panel      |
| `zy`     | Vertical, facing −X | Right wall panel     |
| `-zy`    | Vertical, facing +X | Left wall panel      |
| `xz`     | Horizontal          | Floor/ground panel   |
| `lc=...` | Horizontal          | Legend/caption panel |

**Frustum culling**: Wall panels (`xy`, `-xy`, `zy`, `-zy`) are only visible when the camera faces their front side. This uses a per-frame dot-product check between the panel normal and the camera direction, hiding back-facing panels to prevent visual clutter.

**Asset URL resolution**: Panel textures in `datareps.json` use `$SERVER/run/vis/xy.png` style paths. The viewer replaces `$SERVER/run/vis/` with the actual `assetBasePath` (e.g. `/samples/eco/xy.png`). Absolute HTTP(S) URLs are passed through unchanged.

## In-Browser Config Editor

The `EditorPanel` component provides a Monaco-based editor for `config.json` files directly in the browser. Open it by appending `?editor=open` to any viewer URL:

```
http://localhost:3000/viewer?sample=eco&editor=open
```

Features:

- **Schema validation**: `config.json` is validated against `schemas/config.json` (draft-2020-12) using AJV as you type, with error markers surfaced in the editor gutter.
- **JSONC support**: Comments are allowed and stripped before validation via `jsonc-parser`.
- **Run pipeline**: Clicking "Run" saves the edited config and triggers `POST /api/run-pipeline`, which executes `datarepgen.py` for the sample. The viewer reloads the output automatically on completion. Requires Python 3.11+ with the pipeline dependencies installed (see [Requirements](#requirements)).

## API Routes

### GET /api/samples

Discovers available sample datasets by scanning `SAXR/samples/` for subdirectories containing `datareps.json`. Delegates to the shared `listSamples()` utility, which is also used by the server-rendered landing page.

**Response** — JSON array sorted alphabetically by slug:

```json
[
	{
		"name": "Eco",
		"slug": "eco",
		"vizJsonPath": "/samples/eco/datareps.json",
		"assetBasePath": "/samples/eco"
	}
]
```

The `name` comes from `config.json` `title` field (falls back to capitalized directory name).

### GET /api/pipeline-file/[...path]

Serves static assets (JSON, PNG, JPG, SVG, PLY) directly from the pipeline output directory `SAXR/samples/`. Only whitelisted file extensions are served. Path traversal is blocked — resolved paths must stay inside the samples root.

### POST /api/run-pipeline

Validates and saves a `config.json` for the given sample slug, then spawns `datarepgen.py` as a subprocess. Returns `409 Conflict` if a run is already in progress for that slug. Used by `EditorPanel` to trigger pipeline re-execution from the browser.

**Request body**:

```json
{ "slug": "eco", "configText": "{ ... }" }
```

**Response**: `200 OK` on success, `409` if busy, `400` if the config is invalid (bad JSON or schema violation), `500` on pipeline error.

### URL Rewriting

`next.config.js` rewrites `/samples/:path*` → `/api/pipeline-file/:path*`, so the viewer can reference assets as `/samples/eco/xy.png` without a manual copy step.

## Sample Discovery

Samples are discovered automatically — no manifest file needed.  
Both `GET /api/samples` and the landing page use `listSamples()` from `src/lib/listSamples.ts`, which scans `SAXR/samples/` for subdirectories containing `datareps.json`.

## Adding a New Sample

1. Run the SAXR pipeline: `python datarepgen.py samples/mysample`
2. The new sample appears automatically in the dropdown and on the landing page.

## Adding a New Shape

1. Create a component in `src/components/shapes/` (e.g. `Diamond.tsx`).
2. Import it in `src/components/shapes/registry.ts` and add an entry to `SHAPE_REGISTRY`.
3. The dispatcher in `DataRepMesh.tsx` will pick it up automatically via `rep.type.toLowerCase()`.

For shapes that need an extra prop variant (like `pyramid_down`), handle it as a special case in `DataRepMesh.tsx`.

## Testing

```bash
npm test            # run all tests (vitest)
npm run test:watch  # watch mode
npm run test:coverage
```

Unit tests live alongside the modules they test (`*.test.ts`) or under `src/app/api/` (`route.test.ts`).

## Deployment

The viewer currently runs locally (`npm run dev`). The `/api/pipeline-file` route reads from the local filesystem (`SAXR/samples/`) and `/api/run-pipeline` spawns a Python subprocess, so the full authoring loop needs a server environment with filesystem access and Python installed. A static export can render pre-generated `datareps.json` but cannot run the in-browser pipeline. Hosting the viewer (and the pipeline) behind a long-running service is left as future work.

## Technology Stack

| Technology        | Version | Purpose                                       |
| ----------------- | ------- | --------------------------------------------- |
| Next.js           | 14      | Full-stack framework (App Router, API routes) |
| React             | 18      | UI component library                          |
| React Three Fiber | 8       | React renderer for Three.js                   |
| Three.js          | 0.183   | WebGL 3D graphics                             |
| @react-three/drei | 9       | OrbitControls, Grid, Center helpers           |
| TypeScript        | 5       | Type safety                                   |
| Tailwind CSS      | 3       | Utility-first styling                         |
| Monaco Editor     | 4       | In-browser JSON config editor                 |
| AJV               | 8       | JSON Schema validation (draft-2020-12)        |
| jsonc-parser      | 3       | JSONC parsing (comments allowed in config)    |
| Vitest            | 2       | Unit testing                                  |
