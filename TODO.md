# TODO

## FIXES
- mark/shape: global and/or encoding?
- datarep: rich-text panels, say, play 
- ls=size
- legend pos, billboard
- Docu for export3D
  - output formats

## TEST
- size of legends
- legends: ls=size, lc=color, lm=marker

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
-Linking sceneries for comparing

Plot (Layout)
- line
- area?
- text?

Data Stage Panels + plotting
- +l: line plot
- +b: bar blot
- +a: area plot
- +c: category cluster showing min-max-mean using color encoding

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

datareps2glb
- generate glb from datareps
- In Python using trimesh? https://trimesh.org
- Python scripting of Blender?

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

