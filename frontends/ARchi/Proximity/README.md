# irisLOD.json

[<img src="../../docu/images/irislod.jpg" height="256"/>](https://youtu.be/UL8XRe5luu8)

## Description

By changing the definition of [`config.json`](../../samples/iris/config.json) three different representations of the [`iris.json`](../../samples/iris/iris.json) dataset has been generated:

0. a non-transparent cluster plot
1. a transparent cluster plot combined with a scatter plot
2. a scatter plot

The three generated data viz representations including all generated panels have been manually merged into a list and stored in [`datareps.json`](https://service.metason.net/ar/content/viz/irisLOD/datareps.json).

In the ARchi app the [`irisLOD.json`](irisLOD.json) script does constantly evaluating the proximity of the user to the data vizualisation. Depending on the distance the active data representation is selected by setting the index of the data visualization with the `setVal()` function.

## Items

**1 'net.metason.dataviz.lod'** 🔓

- Data.Viz
- https://service.metason.net/ar/content/viz/irisLOD/datareps.json
- value:0

## Tasks

| on:command | &rarr; | do:add ahead 0 0 -2.5 |
| ---------- | ------ | --------------------- |

> 'net.metason.dataviz.lod' ➕

| as:always | if:`proximity('net.metason.dataviz.lod') <= 1.8 ` | do:execute |
| --------- | ------------------------------------------------- | ---------- |

> `setVal('net.metason.dataviz.lod', 2)`

| as:always | if:`proximity('net.metason.dataviz.lod') > 1.8 AND proximity('net.metason.dataviz.lod') < 3.2` | do:execute |
| --------- | ---------------------------------------------------------------------------------------------- | ---------- |

> `setVal('net.metason.dataviz.lod', 1)`

| as:always | if:`proximity('net.metason.dataviz.lod') >= 3.2 ` | do:execute |
| --------- | ------------------------------------------------- | ---------- |

> `setVal('net.metason.dataviz.lod', 0)`

## References

**Code Refs**

- _SAXR spec_: [config.json](../../samples/iris/config.json)
- _ARchi script_: [irisLOD.json](irisLOD.json)

**Asset Refs**

- _Item asset:_ https://service.metason.net/ar/content/viz/irisLOD/datareps.json
- _Item asset:_ https://service.metason.net/ar/content/viz/irisLOD/xz+s.png
- _Item asset:_ https://service.metason.net/ar/content/viz/irisLOD/xy.png
- _Item asset:_ https://service.metason.net/ar/content/viz/irisLOD/-xy.png
- _Item asset:_ https://service.metason.net/ar/content/viz/irisLOD/zy.png
- _Item asset:_ https://service.metason.net/ar/content/viz/irisLOD/-zy.png
- _Item asset:_ https://service.metason.net/ar/content/viz/irisLOD/lc.png

**Technology Refs**

- _Technical Documentation :_ https://service.metason.net/ar/docu/
- _AR Pattern Diagram :_ https://github.com/ARpatterns/diagram
- _ARchi VR App :_ https://archi.metason.net
