# irisLOD.json

[<img src="../../docu/images/irislod.jpg" height="256"/>](https://youtu.be/UL8XRe5luu8)

## Items 

__1 'net.metason.dataviz.lod'__  🔓
- Data.Viz
- https://service.metason.net/ar/content/viz/irisLOD/viz.json
- value:0



## Tasks 

 | on:command |  &rarr; | do:add ahead 0 0 -2.5 |
 |---|---|---|
> 'net.metason.dataviz.lod' ➕
 
 | as:always | if:`proximity('net.metason.dataviz.lod') <= 1.8 `| do:execute |
 |---|---|---|
>  `setVal('net.metason.dataviz.lod', 2)`  
> 

 
 | as:always | if:`proximity('net.metason.dataviz.lod') > 1.8 AND proximity('net.metason.dataviz.lod') < 3.2`| do:execute |
 |---|---|---|
>  `setVal('net.metason.dataviz.lod', 1)`  
> 

 
 | as:always | if:`proximity('net.metason.dataviz.lod') >= 3.2 `| do:execute |
 |---|---|---|
>  `setVal('net.metason.dataviz.lod', 0)`  
> 


## References 

__Code Refs__

- irisLOD.json

__Asset Refs__

- _Item asset:_ https://service.metason.net/ar/content/viz/irisLOD/viz.json

__Technology Refs__

- _Technical Documentation :_ https://service.metason.net/ar/docu/
- _AR Pattern Diagram :_ https://github.com/ARpatterns/diagram
- _ARchi VR App :_ https://archi.metason.net
