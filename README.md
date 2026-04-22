# SAXR: Situated Analytics in eXtended Reality

![systemarchitecture](docu/images/systemarch.jpg)

## Features

- **Situated Analytics in XR/AR/VR**: Immersive data exploration in eXtended Reality
- **2D and 3D Plots**: Mix of 2D and 3D data plots in combined charts
- **2D Plot → 3D Stage**: Spatial domain-range scaling aligned in 2D and 3D
- **Image Panels**: Panels for stage boundaries and legends
- **Data Reps**: List of simple data representations for visual XR frontends
- **Grammar of 3D Graphics**: Generation of aligned 2D/3D plots controlled by declarative JSON specification
- **Data Prep**: Use of Numpy, Pandas and GeoPandas as most common tools for data processing
- **Python-based**: Scripts for generation of data reps using Matplotlib for chart layouting
- **Data Import**: Inline data specification or loading of data files in json/xlsx/csv format
- **3D Export**: Generation of 3D files of data viz in usdz/gltf/glb/fbx format
- **3D Viz Frontends**: Interactive data viz components for Web3D and Unity


## 3D Plot Layouts

Supported 3D plot types using `datarepgen.py`:

- 3D **bar** chart as in [samples/eco/config.json](samples/eco/config.json) or in [samples/energy/config.json](samples/energy/config.json)
- 3D **scatter** plot as in [samples/iris/config.json](samples/iris/config.json) or in [samples/burnout/config.json](samples/burnout/config.json)
- 3D **cluster**: min-max cluster per category with median
- 3D **pie** chart: mixed 2D/3D pie/donut chart as in [samples/fruits/config.json](samples/fruits/config.json)
- 3D **stack**: stacked bar chart as in [samples/ingredients/config.json](samples/ingredients/config.json)
- 3D **line** plot: line chart as in [samples/line/config.json](samples/line/config.json)
- 3D **area** plot: area chart as in [samples/area/config.json](samples/area/config.json)
- 3D **surface** plot as in [samples/mesh/config.json](samples/mesh/config.json)
- 3D **map**: grouped bar chart on map as in [samples/geo/config.json](samples/geo/config.json) using `georepgen.py`

<img src="docu/images/bar.png" height="176"/> <img src="docu/images/scatter.png" height="176"/> <img src="docu/images/cluster.png" height="176"/> <img src="docu/images/fruits.jpg" height="176"/> <img src="docu/images/ingredients.png" height="176"/> <img src="docu/images/line.png" height="176"/> <img src="docu/images/area.png" height="176"/> <img src="docu/images/surface.png" height="176"/> <img src="docu/images/geo.jpg" height="176"/>

## Data Scenery

In SAXR 2D and 3D elements are arranged in a Data _Scenery_ consisting of:

- Data _Stage_ with consistent dimensions in 2D and 3D
  - Stage _Set_ with global panels and spatial encodings
- Data _Scenes_ as indexed sequence of:
  - Data _Scene_ with local panels and encodings
  - Data _Reps_ as visual representations of data

## Behavior of Situated Analytics in AR/XR Frontend

List of scenes (containing DataReps) are interpreted as level of details, time series, or sequence in narrative 3D data viz. They become interactive by embedding SAXR data visualization into dynamic AR experiences controlled by declarative scripts.

See declarations of behavior and screen recoding videos run within the [ARchi VR](https://archi.metason.net) app. The behavior of SAXR data viz in the ARchi VR App is documented as Event-Condition-Action (ECA) diagrams:

- [**Auto-Placing**](ARchi/Placing/) of geo chart using _Spatial Reasoning_: https://youtube.com/shorts/6w4DJwMHewY
- [**Level of Detail**](ARchi/Proximity/) (LOD) controlled by _Proximity_: https://youtu.be/UL8XRe5luu8
- [**Time Series**](ARchi/Animation/) controlled by _Animation_: https://youtube.com/shorts/PjelVMMz4Dk
- [**Narrative Data Storytelling**](ARchi/Storytelling/) using _Interaction_: https://youtube.com/shorts/85cTH27r540

[<img src="docu/images/geoplacing.jpg" height="256"/>](https://youtube.com/shorts/6w4DJwMHewY) [<img src="docu/images/irislod.jpg" height="256"/>](https://youtu.be/UL8XRe5luu8) [<img src="docu/images/ecoanim.jpg" height="256"/>](https://youtube.com/shorts/PjelVMMz4Dk) [<img src="docu/images/salesstory.jpg" height="256"/>](https://youtube.com/shorts/85cTH27r540)

## Declarative Specification with Grammar of Graphics

SAXR is supporting a high-level grammar of graphics to define 2D and 3D sceneries in a JSON settings file. It is heavily inspired by [Vega-Lite](https://github.com/vega/vega-lite) and [Optomancy](https://github.com/Wizualization/optomancy). The specifications in the JSON settings file serves as input to the `datarepgen.py`script that generates data reps and corresponding images used as assets for panels.

Example of a config.json file:

```json
{
	"description": "3D data viz of Iris data set.",
	"title": "Iris",
	"stage": {
		"width": 0.8,
		"height": 0.8,
		"depth": 0.8
	},
	"data": {
		"url": "../data/iris.json"
	},
	"assetURL": "$SERVER/run/vis/",
	"output": "datareps.json",
	"background": "#FFFFFF",
	"gridColor": "#DDDE00",
	"plot": "scatter",
	"mark": "sphere",
	"encoding": {
		"x": {
			"field": "sepal width"
		},
		"y": {
			"field": "petal length"
		},
		"z": {
			"field": "petal width"
		},
		"size": {
			"value": 0.022
		},
		"color": {
			"field": "class",
			"title": "Iris Classes"
		}
	},
	"panels": ["xy", "-xy", "zy", "-zy", "xz", "lc=_"]
}
```

## Data Reps

Data Reps are a collection of simple representations of data elements that will be visualized in the XR frontend application. They are encoded as JSON file, such as:

```json
[
	{
		"type": "-XY",
		"x": 0.0,
		"y": -0.014,
		"z": 0.319,
		"w": 1.193,
		"d": 0,
		"h": 0.567,
		"asset": "$SERVER/run/vis/-xy.png"
	},
	{
		"type": "cylinder",
		"x": 0.0707,
		"y": 0.0834,
		"z": -0.2028,
		"w": 0.0151,
		"h": 0.1669,
		"d": 0.015,
		"color": "blue"
	}
]
```

The data fields of Data Reps are:

- **type**: visual shape or panel type
  - shape of markers: 3D representation and equivalent 2D mark, with the goal of being recognizable view-independent in 3D and in 2D
    - 3D: sphere, box, pyramid, pyramid_down, octahedron, plus, cross
    - 2D: circle, square, triangle_up, triangle_down, diamond, plus, cross
    - plt: `o, s, ^, v, D, P, X` (Matplotlib symbols for 2D marks)
  - shape of chart elements
    - cylinder: for bar plots (instead of box)
    - arc: arc bow for pie charts
    - plane: for flat overlays, e.g. as transparent plane infront of panels
    - line: line segment from bottom-front-left to top-back-right corner of bbox
    - area: area segmemt (quad analog to line going down to ground level of data stage)  
    - image: for placing any icon or image defined as asset in PNG or JPG format
    - surface: mesh provided as asset in PLY format
    - text: for labels
  - panel type (see next chapter)
- **x,y,z**: position
- **w,h,d**: bbox size of shape
  - if h == 0 and d > 0 then shape is flat
  - if d == 0 and h > 0 then shape is upright
- **color**: color of shape
  - hex-encoded RGB color (e.g., "#FF0000"), with support for transparency (e.g.,"#FF0000AA")
  - color name (e..g., "blue")
- **asset**: type-specific resources
  - URL to file (e.g., to image file)
  - text (for labels)
  - attributes (e.g, `"angle:45;start:90"` for arc)

## Panels

Panel types are encoded by their name. If panel name is uppercase it will be presented as stage element, if lowercase as scene element.

- Data Stage Panels
  - `xy`: xy grid and axes
  - `-xy`: opposite xy plane with inverse x axis
  - `zy`: zy grid and axes
  - `-zy`: opposite zy plane with inverse z axis
  - `xz`: floor grid and axes
- Data Stage Panels + plotting
  - `+s`: scatter plot
  - `+p`: pie/donut chart
- Examples of Data Stage Panel specifications:
  - `"xy", "-xy", "xy+s", "XY", "ZY", "XZ+p"...`
- Samples of generated image plots (from the [samples/iris](samples/iris/) project):
  - [xz+s](https://service.metason.net/ar/content/viz/irisLOD/xz+s.png), [xy.png](https://service.metason.net/ar/content/viz/irisLOD/xy.png), [-xy.png](https://service.metason.net/ar/content/viz/irisLOD/-xy.png), [zy.png](https://service.metason.net/ar/content/viz/irisLOD/zy.png), [-zy.png](https://service.metason.net/ar/content/viz/irisLOD/-zy.png)

Legends are panels as well. The legend name additionally encodes its pose and position.

- Legend Panels
  - `lc`: color legend
  - `lm`: marker legend (shape categories)
  - `ls`: size legend (size categories)
  - `lg`: group legend (group fields mapped to colors)
- Legend Panels pose
  - `=` flat
  - `|` upright
  - `!` upright and billboarding
- Legend Panels position
  - x position:
    - `<` leftside
    - `>` rightside
    - default: mid
  - y position:
    - `v` bottom
    - `^` top
    - default: mid
  - z position:
    - `_` front
    - `-` mid
- Examples of Legend Panel specifications:
  - `"lc", "lc=_", "lc=_<", "LC", "LC=_", "lg=_>", ...`
- Samples of generated legend images:
  - discrete [lc.png](https://service.metason.net/ar/content/viz/irisLOD/lc.png), continuous [lc.png](https://service.metason.net/ar/content/viz/salesSTORY/lc.png), [lg.png](https://service.metason.net/ar/content/viz/geoSPATIAL/lg.png), [lm.png](docu/images/lm.png)

## Color Palettes

Predefined Color Palettes:

- **nominal**: categorial color palette without ranking; default: `tab10`
- **quantitative**: quantitative and interpolatable color palette; default: `Oranges`
- **temporal**: quantitative and interpolatable color palette; default: `Greys`

The color palettes may be overwritten in the `config.json` file.
All [colormaps](https://matplotlib.org/stable/gallery/color/colormap_reference.html) defined by Matplotlib can be used in SAXR settings.

```json
    "palette": {
        "nominal": "tab10",
        "quantitative": "Oranges",
        "temporal": "Greys"
    },
```

## Basic Installation

- Download repository
- Prerequisite: Python 3.11
  - Hint: Check available precompiled bpy version for Blender and setup pyenv with corresponding version
- Install Numpy, Pandas and Matplotlib (and optionally GeoPandas)
- In project folder run: `python datarepgen.py samples/iris`
  - the python script reads the `samples/iris/config.json` file as input
- Find generated output in `samples/iris` folder:
  - several 2D images in png format (used for panels)
  - specification of interactive behavior in specs.json (used as input for XR viewer)
  - a list of data reps in datareps.json (used as input for XR viewer)
- Sample to data viz with geo maps:
  - In `samples/geo` folder run: `python georepgen.py`
  - This will generate the map panel and the `config.json` file
  - Go up two directories and run `python datarepgen.py samples/geo`

## Setup for export3D.py

- Install Blender 5.X: [blender.org](https://www.blender.org)
- Install Blender as a Python module: https://docs.blender.org/api/current/info_advanced_blender_as_bpy.html
- In project folder run: `python export3D.py samples/iris`
  - the python script reads the `samples/iris/datareps.json` file as input
  - generates a blender file as output (with .blend file ending)
- Export standard 3D file formats by adding corresponding file ending
  - USDZ: `python export3D.py samples/iris usdz`
  - USDC: `python export3D.py samples/iris usdc`
  - GLB: `python export3D.py samples/iris glb`
  - GLTF: `python export3D.py samples/iris gltf`
  - FBX: `python export3D.py samples/iris fbx`

## SAXR Frontends

The presentation of SAXR data reps is supported by:

- [Blender](export3D.py): Python programm using Blender in head-less mode to create 3D files
  - USDZ 3D samples: [iris.usdz](samples/iris/result3D/iris.usdz), [eco.usdz](samples/eco/result3D/eco.usdz), [fruits.usdz](samples/fruits/result3D/fruits.usdz), [geo.usdz](samples/geo/result3D/health.usdz)
  - glTF 3D samples: [iris.glb](samples/iris/result3D/iris.glb), [eco.glb](samples/eco/result3D/eco.glb), [fruits.glb](samples/fruits/result3D/fruits.glb), [geo.glb](samples/geo/result3D/health.glb)
- [Unity](frontends/Unity/): SAXR frontend package for Unity game engine
- [Web3D](frontends/Web3D/): Browser-based 3D JavaScript frontend built with Next.js and React-Three-Fiber
- [ARchi VR App](frontends/ARchi): iOS AR application
- [ARchi Composer](frontends/ARchi): macOS AR editor

## Setup for Deployment

- Copy all generated files to your Web server
- In `datareps.json` replace all asset file names with absolute URLs
- Access `datareps.json` from within your XR frontend

## Screen Recording Videos

- geoSPATIAL: https://youtube.com/shorts/6w4DJwMHewY
- irisLOD: https://youtu.be/UL8XRe5luu8
- ecoANIM: https://youtube.com/shorts/PjelVMMz4Dk
- salesSTORY: https://youtube.com/shorts/85cTH27r540

## References

- Optomancy: https://github.com/Wizualization/optomancy
- Vega-lite: https://github.com/vega/vega-lite
- Datasets: https://github.com/vega/vega-datasets
- Colormaps: https://matplotlib.org/stable/gallery/color/colormap_reference.html
- ARchi VR App: https://archi.metason.net

## Contact

Philipp Ackermann, philipp@metason.net

## Acknowledgments

- [Alexander Frank](https://github.com/Palmaco) and [Emilio Lilie de Leon](https://github.com/EmilioLilie) for refactoring the Python code and for the development of Unity and Web3D frontends
- [Peter Butcher](https://github.com/PButcher) for the discussions on situated analytics

## License

Released under the [Creative Commons CC0 License](LICENSE).
