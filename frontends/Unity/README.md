# SAXR Unity Viewer

Interactive 3D data-visualization viewer for Unity.  
Loads `datareps.json` files produced by the SAXR pipeline and renders them as explorable 3D scenes.

<img src="../../docu/images/scatter.png" height="200"/>

## Requirements

| Dependency      | Version                         |
| --------------- | ------------------------------- |
| Unity           | **6.0 LTS** (6.0.0f1 or later)  |
| Render pipeline | Universal Render Pipeline (URP) |
| Input system    | Unity Input System package      |

All packages are declared in `Packages/manifest.json` and resolve automatically when you open the project.

## Quick Start

1. **Open the project** in Unity Hub → _Add project from disk_ → select `frontends/Unity`.
2. **Open the scene** `Assets/Scenes/SampleScene.unity`.
3. In the Inspector, find the **DataVizLoader** component on the root GameObject.
4. Pick a sample from the **Sample** dropdown (e.g. _iris_, _eco_, _burnout_).
5. Press **Play ▶** — the 3D visualization appears.
6. To switch samples at runtime, change the dropdown and click **Reload**.

## How It Works

```
config.json  ─►  datarepgen.py  ─►  datareps.json + panel PNGs
                                           │
                                    Unity loads file
                                           │
                              ┌─────────────┴──────────────┐
                              │  DataVizLoader (MonoBehaviour) │
                              └─────────────┬──────────────┘
                                  parses JSON
                                      │
                      ┌───────────────┴───────────────┐
                      ▼                               ▼
               DataRepMesh                      Panel textures
          (spheres, boxes, arcs …)           (xy.png, lc.png …)
```

1. **DataVizLoader** discovers samples by scanning `samples/*/datareps.json` relative to the repo root.
2. A custom Editor inspector provides a dropdown of available samples plus a _Custom…_ option for arbitrary paths or URLs.
3. On Play, the loader reads the JSON, parses the array-of-arrays structure, and delegates to **DataViz** which creates GameObjects for every data representation.
4. Panel images (`.png`) are fetched asynchronously and applied as textures on quads.

## Project Structure

```
Assets/Scripts/DataViz/
├── DataVizLoader.cs          Main MonoBehaviour — sample discovery, JSON loading, scene management
├── DataViz.cs                Static factory — converts DataRep → GameObject (14+ shape types)
├── DataRep.cs                Serializable data model (position, size, color, asset, type)
├── MeshFactory.cs            Procedural meshes — pyramid, octahedron, arc (donut segments)
├── ColorHelper.cs            Hex color parser — #RRGGBB, #RRGGBBAA, named colors
└── Editor/
    └── DataVizLoaderEditor.cs   Custom inspector — sample dropdown, scene selector, Reload button
```

## Supported Shape Types

| Type                           | Geometry                                          |
| ------------------------------ | ------------------------------------------------- |
| `sphere`                       | UV sphere                                         |
| `box`                          | Cube scaled to (w, h, d)                          |
| `cylinder`                     | Cylinder                                          |
| `pyramid`                      | 4-sided cone                                      |
| `pyramid_down`                 | Inverted pyramid                                  |
| `octahedron`                   | 8-face polyhedron                                 |
| `arc`                          | Donut segment — params: `ratio`, `start`, `angle` |
| `plus`                         | 3 perpendicular thin boxes                        |
| `cross`                        | Rotated plus                                      |
| `plane`                        | Flat quad                                         |
| `text`                         | TextMesh                                          |
| `xy`, `-xy`, `zy`, `-zy`, `xz` | Image panel (textured quad)                       |
| `lc=…`, `lg=…`, `lm=…`         | Legend panel (horizontal quad)                    |

## Multi-Scene Navigation

A `datareps.json` is an array of arrays — each inner array is a **scene**.  
Scene 0 typically contains stage-level elements (panels, legends).  
Use the **Scene** field in the Inspector to pick which scene index to display.

## Loading Custom Data

Select **Custom…** in the sample dropdown, then enter:

- A relative path from the repo root: `samples/iris/datareps.json`
- An absolute file path
- A URL: `https://service.metason.net/ar/content/viz/irisLOD/datareps.json`

## Coordinate System

Unity uses a left-handed coordinate system (Z away from the viewer).  
The loader negates Z once on import so that SAXR coordinates render correctly.
