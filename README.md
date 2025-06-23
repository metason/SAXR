# SAXR: Situated Analytics in eXtended Reality

## TODO

- encoding / dimensions def

## Data Viz Scenery

- Data Viz *Stage* (stage : Bühne)
- Data Viz *Scenes*: indexed sequence based on same data
  - Data Viz *Scene*: own panels and own encodings
    - Stage *Set*: with panels (stage set : Bühnenbild, Legenden)
    - Data *Rep*: visual representation of data
- Panels
  - uppercase: on stage
  - lowercase: in scene
- auxreps

## Settings

### Color Palette

- palette
  - nominal: categorial color palette without ranking; default: 'tab10'
  - ordinal: categorial and sortable color palette; default: 'Oranges'
  - quantitative: numerical and interpolatable color palette; default: 'Blues'
  - temporal: quantitative and interpolatable color palette; default: 'Greys'

### DataRep

- shape: visual shape / mark?
  - shape of marker: 3D representation and equivalent 2D mark, with the goal of being recognizable view-independent in 3D and in 2D
    - 3D: sphere, box, pyramid, pyramid_down, octahedron, plus, cross
    - 2D: circle, square, triangle_up, triangle_down, diamond, plus, cross
    - plt: o, s, ^, v, D, P, X (Matplotlib symbols for 2D marks)
    - [star, dodecahedron, *]
  - shape of chart element
    - text: 
    - plane:
    - panel: see Panels
- x,y,z: position
- w,h,d: bbox size of shape
- size: bbox size with equal w, h, and d
- color: color of shape
- [label: text label ]
- [focus: content of focus panel, "tooltip" (text or rich text)]
- [link: URL link ]
- [rx,ry,rz: rotation --> not used due to not being view-independent for markers]

### Panels

- Data Stage Panels
  - xy: xy grid and axes
  - -xy: opposite xy plane with inverse x axis
  - zy: zy grid and axes
  - -zy: opposite zy plane with inverse z axis
  - xz: floor grid and axes
- Data Stage Panels + plotting
  - +l: line plot
  - +s: scatter plot
  - +b: bar blot
  - +a: area plot
  - +p: pie plot?
  - +c: category cluster showing min-max-mean using color encoding

- Legend Panels
  - lc: color legend
  - lm: marker legend (shape categories)
  - ls: size legend (size categories)
- Legend Panels pose
  - = flat
  - | upright
  - ! upright billboarding
- Legend Panels position
  - x dir: <>
  - y dir: v^
  - z dir: _-

### Mark / Plot (Layout)
- point / scatter
- circle / scatter 
- line / line
- bar / bar
- area
- text

## References

- https://github.com/vega/vega-lite
- https://github.com/vega/vega-datasets
- https://github.com/Wizualization/optomancy

## Samples

https://vega.github.io/vega-lite/examples/stacked_bar_weather.html 

## DATA
Economics
https://data.worldbank.org/indicator/FS.AST.PRVT.GD.ZS?locations=EU
https://www.macrotrends.net/global-metrics/countries/chn/china/gdp-per-capita
Source: https://en.wikipedia.org/wiki/Economy_of_the_European_Union

## VIDEOS
irisLOD: https://youtu.be/UL8XRe5luu8
ecoANIM: https://youtube.com/shorts/PjelVMMz4Dk

