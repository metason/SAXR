# ecoANIM.json

[<img src="../../docu/images/ecoanim.jpg" height="256"/>](https://youtube.com/shorts/PjelVMMz4Dk)

## Description 

The definition of a `sequence` in [`settings.json`](../../samples/eco/settings.json) does specify seperate data _scenes_ with anual data reps corresponding to the year of the time series stored in [`perCapita.json`](../../samples/eco/perCapita.json). `datarepgen.py`generates all anual scenes with their data reps and stores the result in [`viz.json`](https://service.metason.net/ar/content/viz/ecoANIM/viz.json).

```json
    "sequence": {
        "field": "year",
        "domain": [
            2000,
            2024
        ]
    },
```

In the ARchi app the [`ecoANIM.json`](ecoANIM.json) script does increase the `data.idx`counter each second between 0 and 23.
With the `setVal()`command the counter is applied to select the current data scene of the data visualization item.
In parallel the year is shown in a label that is billboarding.


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

- _SAXR spec_: [settings.json](../../samples/eco/settings.json)
- _ARchi script_: [ecoANIM.json](ecoANIM.json)

__Asset Refs__

- _Item asset:_ https://service.metason.net/ar/content/viz/ecoANIM/viz.json
- _Item asset:_ https://service.metason.net/ar/content/viz/ecoANIM/xz.png
- _Item asset:_ https://service.metason.net/ar/content/viz/ecoANIM/xy.png
- _Item asset:_ https://service.metason.net/ar/content/viz/ecoANIM/-xy.png
- _Item asset:_ https://service.metason.net/ar/content/viz/ecoANIM/zy.png
- _Item asset:_ https://service.metason.net/ar/content/viz/ecoANIM/-zy.png
- _Item asset:_ https://service.metason.net/ar/content/viz/ecoANIM/lc.png
- _Item asset:_ https://service.metason.net/ar/content/viz/ecoANIM/USflag.png
- _Item asset:_ https://service.metason.net/ar/content/viz/ecoANIM/EUflag.png
- _Item asset:_ https://service.metason.net/ar/content/viz/ecoANIM/CNflag.png


__Technology Refs__

- _Technical Documentation :_ https://service.metason.net/ar/docu/
- _AR Pattern Diagram :_ https://github.com/ARpatterns/diagram
- _ARchi VR App :_ https://archi.metason.net
