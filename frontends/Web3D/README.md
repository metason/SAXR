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

## How It Works

```
config.json  ─►  datarepgen.py  ─►  datareps.json + panel PNGs
                                           │
                                  Next.js loads file
                                           │
                              ┌────────────┴─────────────┐
                              │    page.tsx (state mgmt)     │
                              └────────────┬─────────────┘
                                           │
                      ┌───────────────┴───────────────┐
                      ▼                               ▼
               DataRepMesh                      PanelPlane
          (spheres, boxes, arcs …)           (xy.png, lc.png …)
```

1. The app fetches `/api/samples` which auto-discovers sample directories in `public/samples/`.
2. Each sample directory needs a `datareps.json` (required) and optionally a `config.json` (provides the title).
3. The viewer loads the JSON array-of-arrays, renders 3D shapes via React Three Fiber, and applies panel textures.

## Project Structure

```
src/
├── app/
│   ├── page.tsx                Main page — state management, sample loading, scene navigation
│   └── api/samples/route.ts   GET /api/samples — auto-discovers available sample datasets
├── components/
│   ├── DataVizCanvas.tsx       R3F Canvas — lighting, camera, grid, orbit controls
│   ├── DataRepMesh.tsx         Renders 3D shapes (sphere, box, pyramid, arc, etc.)
│   ├── PanelPlane.tsx          Loads and renders textured image panels
│   ├── SceneNav.tsx            Scene navigation bar (Prev / Next)
│   └── SamplePicker.tsx        Sample selector dropdown
├── lib/
│   ├── types.ts                TypeScript interfaces matching datareps.json format
│   └── vizLoader.ts            Fetch and validate datareps.json files
scripts/
└── copy-samples.mjs            Prebuild hook — copies sample data into public/
```

## Sample Discovery

Samples are discovered automatically — no manifest file needed.  
The `/api/samples` route scans `public/samples/` for subdirectories containing `datareps.json`.

For local development, samples are either:

- Symlinked from the repo root `samples/` folder, or
- Copied by the `copy-samples.mjs` prebuild script

## Adding a New Sample

1. Run the SAXR pipeline: `python datarepgen.py samples/mysample`
2. Rebuild `public/samples`: `npm run copy-samples`
3. The new sample appears automatically in the dropdown.

## Multi-Scene Navigation

A `datareps.json` contains an array of arrays — each inner array is a **scene**.  
Scene 0 typically holds stage-level elements (panels, legends) that persist across all scenes.  
Use the Prev / Next buttons in the navigation bar to step through scenes.

## Supported Shape Types

| Type                           | Geometry                              |
| ------------------------------ | ------------------------------------- |
| `sphere`                       | THREE.SphereGeometry                  |
| `box`                          | THREE.BoxGeometry                     |
| `cylinder`                     | THREE.CylinderGeometry                |
| `pyramid` / `pyramid_down`     | THREE.ConeGeometry (4 sides)          |
| `octahedron`                   | THREE.OctahedronGeometry              |
| `arc`                          | Custom BufferGeometry — donut segment |
| `plus`                         | 3 perpendicular boxes                 |
| `cross`                        | Rotated plus                          |
| `plane`                        | THREE.PlaneGeometry                   |
| `xy`, `-xy`, `zy`, `-zy`, `xz` | Image panel (textured plane)          |
| `lc=…`, `lg=…`, `lm=…`         | Legend panel (horizontal plane)       |

## Deploy on Vercel

The project includes a `vercel.json` for one-click deployment:

```bash
npm i -g vercel
vercel
```

The `prebuild` hook runs `copy-samples.mjs` automatically, so sample data is included in the deployment.

## Tech Stack

- **Next.js 14** — App Router, API routes, static asset serving
- **React Three Fiber** — Declarative Three.js in React
- **@react-three/drei** — OrbitControls, Grid, Center helpers
- **Tailwind CSS** — Styling
