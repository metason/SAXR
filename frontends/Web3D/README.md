# SAXR Web3D Viewer

Browser-based 3D data-visualization viewer built with Next.js and React Three Fiber.  
Loads `datareps.json` files produced by the SAXR pipeline and renders interactive WebGL scenes.

## Requirements

| Dependency | Version     |
| ---------- | ----------- |
| Node.js    | 18 or later |
| npm        | 9 or later  |

## Quick Start

```bash
cd frontends/Web3D
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).  
Pick a sample from the dropdown (top-left) and explore the 3D visualization with mouse controls:

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
                         ┌─────────────┴──────────────┐
                         │   page.tsx (state manager)  │
                         │  useSampleLoader            │
                         │  useScenePlayback            │
                         └─────────────┬──────────────┘
                                       │
                            VizProvider (context)
                                       │
                         ┌─────────────┴──────────────┐
                         │      DataVizCanvas          │
                         │  (Canvas, lights, controls) │
                         └─────┬───────────────┬──────┘
                               │               │
                    DataRepMesh            PanelPlane
                  (SHAPE_REGISTRY)     (textured quads)
                        │
          ┌─────┬───────┼───────┬──────┐
        Sphere Box  Cylinder  Arc  Surface …
```

### Data Flow

1. `page.tsx` calls `useSampleLoader` which fetches `/api/samples` to discover available datasets.
2. On sample selection, `useSampleLoader` fetches `datareps.json` and `specs.json`.
3. `useScenePlayback` manages the current scene index and auto-play timer.
4. `mergeSceneWithStage()` merges persistent stage-level reps (scene 0) with the active data scene.
5. `DataVizCanvas` renders 3D shapes via `DataRepMesh` and image panels via `PanelPlane`.
6. `VizProvider` context supplies `assetBasePath` to all nested components without prop drilling.

## Project Structure

```
src/
├── app/
│   ├── page.tsx                       Main page — state management, HUD overlay
│   ├── layout.tsx                     Root layout (metadata, fonts)
│   ├── globals.css                    Global styles
│   └── api/
│       ├── samples/route.ts           GET /api/samples — auto-discovers datasets
│       └── pipeline-file/[...path]/route.ts   Serves files from SAXR/samples/
├── components/
│   ├── DataVizCanvas.tsx              R3F Canvas — lighting, camera, grid, orbit controls
│   ├── DataRepMesh.tsx                Dispatcher: rep.type → shape component
│   ├── PanelPlane.tsx                 Textured image panels with frustum culling
│   ├── SceneNav.tsx                   Scene navigation (adapts per arrangement mode)
│   ├── SamplePicker.tsx               Sample selector dropdown
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
│       └── Surface.tsx               PLY file mesh loader
├── context/
│   └── VizContext.tsx                 React context for assetBasePath
├── hooks/
│   ├── useSampleLoader.ts            Sample discovery & data fetching
│   ├── useScenePlayback.ts           Scene navigation & auto-play timer
│   └── useColor.ts                   Hex color → THREE.Color + opacity
└── lib/
    ├── types.ts                       TypeScript interfaces (DataRep, VizJson, SpecsJson)
    ├── vizLoader.ts                   Fetch/validate datareps.json, parseKV, parseHexColor
    ├── sceneMerge.ts                  Merge stage-level reps into current scene
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
	asset?: string; // Image path (panels) or KV params (arcs), or PLY path (surfaces)
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
	};
	encoding?: Record<string, unknown>; // Encoding metadata
}
```

## Arrangement Modes

The `specs.json` `sequence.arrangement` field controls how scenes are presented. `SceneNav` adapts its UI accordingly:

| Arrangement   | Behavior                                                                 | UI Controls                                   |
| ------------- | ------------------------------------------------------------------------ | --------------------------------------------- |
| `animated`    | Auto-plays through scenes at `interval` seconds. Loops continuously.     | ◀ Prev \| ▶/⏸ Play/Pause \| counter \| Next ▶ |
| `narrative`   | User-driven storytelling. Each scene has a label from `sequence.labels`. | [Label 1] [Label 2] … (top) + ◀ Prev / Next ▶ |
| `comparative` | Side-by-side comparison. Manual navigation.                              | ◀ Prev \| counter \| Next ▶                   |
| `LOD`         | Level-of-detail progression. Manual navigation.                          | ◀ Prev \| counter \| Next ▶                   |
| _(not set)_   | Default manual navigation.                                               | ◀ Prev \| counter \| Next ▶                   |

The scene counter displays domain values (e.g. "2003") when `sequence.domain` is available, otherwise shows "Scene 3 / 25". Navigation is hidden entirely for single-scene datasets.

## Multi-Scene Navigation

A `datareps.json` contains an array of arrays — each inner array is a **scene**.

### Stage vs Scene

- **Scene 0 (Stage)**: Contains stage-level elements — panels, legends, spatial encoding info. These persist across all scenes. Stage-level reps have non-lowercase types (e.g. `XY`, `ZY`) or special types like `image` and `encoding`.
- **Scenes 1+ (Data)**: Contain data-specific shapes that change per scene (bars, spheres, arcs, etc.). These have all-lowercase types.

When navigating to scene _N_, `mergeSceneWithStage()` combines scene _N_'s data reps with the persistent stage reps from scene 0. This ensures panels and legends remain visible while data changes.

### Auto-Play

For `animated` arrangement, `useScenePlayback` starts an interval timer that advances the scene automatically. The interval defaults to 1.5 seconds (overridden by `specs.sequence.interval`). Playback loops from the last scene back to scene 0. The user can pause/resume with the ⏸/▶ button.

## Supported Shape Types

### 3D Geometry Shapes

| Type           | Geometry                   | Notes                                   |
| -------------- | -------------------------- | --------------------------------------- |
| `sphere`       | `THREE.SphereGeometry`     | 16×16 segments                          |
| `box`          | `THREE.BoxGeometry`        | Standard cube scaled by w/h/d           |
| `cylinder`     | `THREE.CylinderGeometry`   | 32 segments                             |
| `pyramid`      | `THREE.ConeGeometry`       | 4 sides, point up                       |
| `pyramid_down` | `THREE.ConeGeometry`       | 4 sides, point down (`upsideDown` prop) |
| `octahedron`   | `THREE.OctahedronGeometry` | 8-sided polyhedron                      |
| `plus`         | 3 perpendicular boxes      | Cross/plus shape                        |
| `cross`        | Rotated plus               | Diagonal cross                          |
| `plane`        | `THREE.PlaneGeometry`      | Flat quad                               |
| `arc`          | Custom `BufferGeometry`    | Donut segment; see arc parameters below |
| `surface`      | PLY mesh loader            | Loads external `.ply` files via `asset` |

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

## API Routes

### GET /api/samples

Discovers available sample datasets by scanning `SAXR/samples/` for subdirectories containing `datareps.json`.

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

### URL Rewriting

`next.config.js` rewrites `/samples/:path*` → `/api/pipeline-file/:path*`, so the viewer can reference assets as `/samples/eco/xy.png` without a manual copy step.

## Sample Discovery

Samples are discovered automatically — no manifest file needed.  
The `/api/samples` route scans `SAXR/samples/` for subdirectories containing `datareps.json`.

## Adding a New Sample

1. Run the SAXR pipeline: `python datarepgen.py samples/mysample`
2. The new sample appears automatically in the dropdown.

## Adding a New Shape

1. Create a component in `src/components/shapes/` (e.g. `Diamond.tsx`).
2. Import it in `src/components/shapes/registry.ts` and add an entry to `SHAPE_REGISTRY`.
3. The dispatcher in `DataRepMesh.tsx` will pick it up automatically via `rep.type.toLowerCase()`.

For shapes that need an extra prop variant (like `pyramid_down`), handle it as a special case in `DataRepMesh.tsx`.

## Deployment

The project includes a `vercel.json` for Vercel deployment:

```json
{
	"buildCommand": "npm run build",
	"outputDirectory": ".next",
	"framework": "nextjs",
	"installCommand": "npm install"
}
```

**Note**: The `/api/pipeline-file` route reads from the local filesystem (`SAXR/samples/`). For Vercel deployment, sample data must be available at build time or served from an external source.

## Technology Stack

| Technology             | Version                         | Purpose                                |
| ---------------------- | ------------------------------- | -------------------------------------- |
| Next.js                | 14                              | Full-stack framework (SSR, API routes) |
| React                  | 18                              | UI component library                   |
| React Three Fiber      | 8                               | React renderer for Three.js            |
| Three.js               | 0.183                           | WebGL 3D graphics                      |
| @react-three/drei      | 9                               | Higher-level R3F helpers               |
| TypeScript             | 5                               | Type safety                            |
| Tailwind CSS           | 3                               | Utility-first styling                  |
| `lc=…`, `lg=…`, `lm=…` | Legend panel (horizontal plane) |

## Deploy on Vercel

The project includes a `vercel.json` for one-click deployment:

```bash
npm i -g vercel
vercel
```

Sample data must be present in `public/samples/` for the deployment.

## Tech Stack

- **Next.js 14** — App Router, API routes, static asset serving
- **React Three Fiber** — Declarative Three.js in React
- **@react-three/drei** — OrbitControls, Grid, Center helpers
- **Tailwind CSS** — Styling
