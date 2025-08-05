# ecoANIM.json

[<img src="../../docu/images/ecoanim.jpg" height="256"/>](https://youtube.com/shorts/PjelVMMz4Dk)

## Description 


## Items 

__1 'dataviz.anim'__  🔓
- Data.Viz
- https://service.metason.net/ar/content/viz/ecoANIM/viz.json
- value:0

__2 'dataviz.label'__ 2000  🔓
- Data.Label
- wxdxh:0.20x0.0x0.07;color:#BBCCFF;bgcolor:#FFFFFF00;font:Courier


## Tasks 

 | on:command |  &rarr; | do:add ahead 0 0.02 -1.25 |
 |---|---|---|
> 'dataviz.anim' ➕
 
 | on:command |  &rarr; | do:add to 'dataviz.anim' |
 |---|---|---|
> 'dataviz.label' ➕
 
 | on:command |  &rarr; | do:billboard |
 |---|---|---|
> 'dataviz.label'
 
 | on:command |  &rarr; | do:assign |
 |---|---|---|
> `data.idx = 0`
 
 | as:repeated each 1 secs |  &rarr; | do:eval |
 |---|---|---|
> `idx = modulus:by:(data.idx + 1,25)`
 
 | as:repeated each 1 secs |  &rarr; | do:execute |
 |---|---|---|
>  `setVal('dataviz.label', data.idx + 2000)`  
>  `setVal('dataviz.anim', data.idx)`  
> 
 

## References 

__Code Refs__

- ecoANIM.json

__Asset Refs__

- _Item asset:_ https://service.metason.net/ar/content/viz/ecoANIM/viz.json

__Technology Refs__

- _Technical Documentation :_ https://service.metason.net/ar/docu/
- _AR Pattern Diagram :_ https://github.com/ARpatterns/diagram
- _ARchi VR App :_ https://archi.metason.net
