# geoSPATIAL.json

[<img src="../../docu/images/geoplacing.jpg" height="256"/>](https://youtube.com/shorts/6w4DJwMHewY)

## Description 

## Items 

__1 'dataviz.placing'__  🔓
- Data.Viz
- https://service.metason.net/ar/content/viz/geoSPATIAL/viz.json



## Tasks 

 | on:command |  &rarr; | do:detect spatial|
 |---|---|---|
 > `adjust(sector fixed 0.01) | filter(type == 'table' AND footprint > 1.2) | produce(o)`
> 
> | _on:detect_ | &rarr; | _do:add to AR anchor_ |
> |---|---|---|
> 
>> 'dataviz.placing' ➕
> 
> | _as:stated_ | _if:`visible('dataviz.placing') == false`_ | _do:remove_ |
> |---|---|---|
> 
>> 'dataviz.placing' ❌
 


## References 

__Code Refs__

- actions/geoSPATIAL.json

__Asset Refs__

- _Item asset:_ https://service.metason.net/ar/content/viz/geoSPATIAL/viz.json

__Technology Refs__

- _Technical Documentation :_ https://service.metason.net/ar/docu/
- _AR Pattern Diagram :_ https://github.com/ARpatterns/diagram
- _ARchi VR App :_ https://archi.metason.net
