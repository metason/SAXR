# TODO

## Version 1.0 Actions

- Move Web3D and Unity code and READMEs to frontends folder
- No Swift source code in repo (was only as kick-off for BA, now there is Blender, Unity and Web3D code available)
- Python code is on root level of repo
- Python tests
  - README, howto
  - check path dependencies
- Schemas
  - settings.json --> schema added to sample settings.json files
    - "$schema": "../../schemas/settings.json",
  - see schema bug in samples/burnout/settings.json
  - datareps schema?
  - specs schema?
  - https URL for schemas on metason.net?
    - "$schema": "https://service.metason.net/saxr/schemas/settings.json"
- Rename files
  - viz.json --> datareps.json: more or less done, check test framework for naming of "golden" files
  - encoding.json --> specs.json
  - settings.json --> config.json???????

## Settings Schema Extensions

Topics:
- Spatio-temporal arrangement of data scene sequences
- Behavior
  - placing
  - navigation
  - interaction: selection? pick/gaze/...

### Temporal Sequence
Datarep sequence automatically generated from data (as in samples/eco)
Interval of animation in seconds.

```json
    "sequence": {
        "field": "year",
        "domain": [
            2000,
            2024
        ],
        "arrangement": "animated",
        "interval": 1.5
    }
```

### Comparative Sequence
Datarep sequence automatically generated from data (as in samples/eco)
Gap between side-by-side arrangement in meters.

```json
    "sequence": {
        "field": "year",
        "domain": [
            2000,
            2020
        ],
        "arrangement": "comparative",
        "gap": [0.25 0 0]
    }
```

### LOD Sequence
Datarep sequence manually composed (as in samples/iris)
Distance in meters (of user's proximity) when LOD elements are switched.

```json
    "sequence": {
        "arrangement": "LOD",
        "steps": [4.5, 2.0]
    }
```

### Narrative Sequence
Datarep sequence manually composed (as in samples/fruits)
Control as interaction buttons or defined in behavior as interaction?

```json
    "sequence": {
        "arrangement": "narrative",
        "control": "selection" // selection, next, prev-next, touch, ...?
    }
```

### Behavior

```json
    "behavior": {
        "placing": {
            ...
        },
        "interaction": {
            ...
        },
        "navigation": {
            ...
        }
    },
```

## Frontend Specs 
Formerly named "encoding.json", new "specs.json"
- pass behavior definitions from settings.json
- encoding are generated as is, used for remapping visuals to data 


```json
{
    "behavior": {
        "placing": {
            ...
        },
        "interaction": {
            ...
        },
        "navigation": {
            ...
        }
    },
    "encoding": {
        "x": {
            "field": "category",
            "title": "category",
            "scale": {
                "domain": [
                    "GDP",
                    "gov debt",
                    "priv debt"
                ],
                "range": [
                    -0.22727272727272727,
                    -5.04646829375071e-17,
                    0.22727272727272715
                ]
            },
            "type": "nominal"
        },
        "y": {
            "field": "value",
            "scale": {
                "domain": [
                    0.0,
                    125000.0
                ],
                "range": [
                    0.0,
                    0.55
                ]
            },
            "title": "value",
            "type": "quantitative"
        },
        "z": {
            "field": "region",
            "title": "region",
            "scale": {
                "domain": [
                    "US",
                    "EU",
                    "CN"
                ],
                "range": [
                    -0.17857142857142858,
                    -3.96508223080413e-17,
                    0.17857142857142852
                ]
            },
            "type": "nominal"
        },
        "color": {
            "field": "category",
            "title": "per capita in USD",
            "type": "nominal",
            "labels": [
                "GDP",
                "gov debt",
                "priv debt"
            ],
            "scale": {
                "domain": [
                    "GDP",
                    "gov debt",
                    "priv debt"
                ],
                "range": [
                    "#1f77b4",
                    "#ff7f0e",
                    "#2ca02c"
                ]
            }
        }
    }
}
```

## FIXES
- mark/shape: global and/or encoding?
- datarep: rich-text panels, say, play 
- ls=size
- legend pos, billboard

## TEST
- size of legends
- legends: ls=size, lc=color, lm=marker/shape

## DOCU

Encodings
```json
    "encoding": {
        "x": {
            "field": "sepal length",
            "title": "my X axis"
        },
        "y": {
            "field": "sepal width",
            "title": "my Y axis"
        },
        "z": {
            "field": "petal length",
            "title": "my Z axis"
        },
        "w": {
            "value": 0.03
        },
        "h": {
            "value": 0.03
        },
        "d": {
            "value": 0.03
        },
        "size": {
            "value": 0.05,
            "field_": "size"
        },
        "color": {
            "field": "class",
            "title": "Category1",
            "labels": [],
            "range": [],
            "opacity": 0.5
        },
        "shape_": {
            "field": "shape",
            "title": "Category2",
            "labels": [],
            "range": [],
            "marker": "o",
            "opacity": 0.5
        },
        "opacity": {
            "value": 0.5
        }
    },
```

## IDEAS

DataReps
- label: text label for tooltip
- link: URL link as asset attribute?
- [rx,ry,rz: rotation --> not used due to not being view-independent for markers]
-Linking sceneries for comparing --> comparative sequence

Plot (Layout)
- line
- area?
- text?
- surface
- stack

Data Stage Panels + plotting
- +l: line plot
- +b: bar blot
- +a: area plot

Scenes
```json
    "scenes": [
        {
            "plot": "scatter",
            "encoding": {
                "shape": "row0",
                "x": "row1",
                "y": "row2",
                "z": "row3",
                "w": 0.02,
                "h": 0.02,
                "d": 0.02,
                "size": 0.2,
                "color": "row4",
                "opacity": 0.5
            },
            "panels": [
                "xy+s",
                "zy+s",
                "-xy",
                "-zy",
                "xz+s",
                "lc",
                "lm"
            ],
            "annotations": []
        }
    ]
```

## CHECK
- rotation of top labels in xz plane (gave up)

## DATA SOURCES
Economics
https://data.worldbank.org/indicator/FS.AST.PRVT.GD.ZS?locations=EU
https://www.macrotrends.net/global-metrics/countries/chn/china/gdp-per-capita

Source: https://en.wikipedia.org/wiki/Economy_of_the_European_Union
https://www.kaggle.com/
CH: https://opendata.swiss/de

https://stats.swiss/vis?lc=de&df[ds]=disseminate&df[id]=DF_COU_HEALTH_COSTS&df[ag]=CH1.COU&df[vs]=1.0.0&dq=_T._T.M_1%2BM_2._T._T._T.4%2B5%2B6%2B7%2B8%2B9%2B10%2B11%2B12%2B13%2B14%2B15%2B16%2B17%2B18%2B19%2B20%2B21%2B22%2B23%2B24%2B25%2B26%2B3%2B2%2B1.CHF_R_POP_R_MH.A&lom=LASTNPERIODS&lo=1&to[TIME_PERIOD]=false&vw=ov

https://swiss-maps.interactivethings.io

