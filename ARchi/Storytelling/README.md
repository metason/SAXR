# salesSTORY.json

[<img src="../../docu/images/salesstory.jpg" height="256"/>](https://youtube.com/shorts/85cTH27r540) 

## Description 

## Items 

__1 'dataviz.story'__  🔓
- Data.Viz
- https://service.metason.net/ar/content/viz/salesSTORY/viz.json
- value:0

__2 'data.hint'__  🔐
- Spot.Panel
- <b>Apples:</b><br>Large display area,<br>but <i>low profit</i>.<br>
- color:#000000; bgcolor:#EEEEEECC; scale:0.4; billboard:1

__3 'step.1'__  🔐
- Spot.Panel
- https://service.metason.net/ar/extension/images/1.png
- wxdxh:0.065x0.065x0.0
- on:tap=setVal('dataviz.story', 0)

__4 'step.2'__  🔐
- Spot.Panel
- https://service.metason.net/ar/extension/images/2.png
- wxdxh:0.065x0.065x0.0
- on:tap=setVal('dataviz.story', 1)

__5 'step.3'__  🔐
- Spot.Panel
- https://service.metason.net/ar/extension/images/3.png
- wxdxh:0.065x0.065x0.0
- on:tap=setVal('dataviz.story', 2);addto('data.hint', 'dataviz.story')



## Tasks 

 | on:command |  &rarr; | do:add ahead 0 0.76 -1.25 |
 |---|---|---|
> 'dataviz.story' ➕
 
 | on:command |  &rarr; | do:add to 'dataviz.story' |
 |---|---|---|
> 'step.1' ➕
 
 | on:command |  &rarr; | do:add to 'dataviz.story' |
 |---|---|---|
> 'step.2' ➕
 
 | on:command |  &rarr; | do:add to 'dataviz.story' |
 |---|---|---|
> 'step.3' ➕
 


## References 

__Code Refs__

- _SAXR spec_: [settings0.json](./settings0.json), [settings1.json](./settings1.json), [settings2.json](./settings2.json)
- _ARchi script_: [salesSTORY.json](salesSTORY.json)

__Asset Refs__

- _Item asset:_ https://service.metason.net/ar/content/viz/salesSTORY/viz.json
- _Item asset:_ https://service.metason.net/ar/content/viz/salesSTORY/xz+p.png
- _Item asset:_ https://service.metason.net/ar/content/viz/salesSTORY/lc.png
- _Item asset:_ https://service.metason.net/ar/extension/images/1.png
- _Item asset:_ https://service.metason.net/ar/extension/images/2.png
- _Item asset:_ https://service.metason.net/ar/extension/images/3.png

__Technology Refs__

- _Technical Documentation :_ https://service.metason.net/ar/docu/
- _AR Pattern Diagram :_ https://github.com/ARpatterns/diagram
- _ARchi VR App :_ https://archi.metason.net
