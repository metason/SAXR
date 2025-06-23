# #### Data Rep Generator ####
# Create data vizualisation for XR

import os
import sys
import json
import numpy as np
import pandas as pd
import matplotlib as mpl
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
from matplotlib import colormaps

# ---- SETTINGS ----
# can be overwritten in settings.json
folder = os.path.split(os.path.realpath(sys.argv[0]))[0] # default folder is script location
if len(sys.argv) > 1:
    folder_name = sys.argv[1]
    print(folder_name)
    if folder_name.startswith('/'):
        folder = folder_name
    else:
        folder = os.path.join(folder, folder_name)
outputFile = "viz.json" # a list if scenes containing and array of DataRep objects
assetURL = ""
doSaveEncoding = True
title = ""
stage = {
    "height": 1.0, # height of data viz stage in meters (without labels)
    "width": 1.0, # width of data viz stage in meters 
    "depth": 1.0 # depth of data viz stage in meters 
}
dpi = 200 # dpi resolution of panel images

# ---- GLOBAL VARIABLES ----
chartHeight = 1.0 # specified height of data viz cube in meters (without labels)
chartWidth = 1.0 # will be derived from height depending on stage layouting
chartDepth = 1.0 # will be derived from height depending on stage layouting
bgColor = [1.0,1.0,1.0]
gridColor = [0.7,0.85,1.0]
sequence = None # sequence spec
visuals = [] # list of all visual 3D elements (datareps, annotations, scene panels, ...) building a scene
scenes = [] # list of scenes: may be interpreted as animatable time series, as level of details, or as storytelling sequence
df = pd.DataFrame() # working data frame
srcdf = None # source data frame
dimension = {} # type and domain of data frame columns
encoding = {} 
panelsSpec = {} # set of panel spec derived from scenes
maptype = None  # handle upper/lowercase coding of type in dictionary
# data cube limits in upper and lower x,y,z values; will be calculated from data
lowerX = -0.5
upperX = 0.5
lowerY = 0.0
upperY = 1.0
lowerZ = -0.5
upperZ = 0.5
# scaling factors, derived from chart layouting
factorX = 1.0 
factorY = 1.0
factorZ = 1.0
# 3D shapes for visual data representations
shapes = ["sphere", "box", "pyramid", "pyramid_down", "octahedron", "plus", "cross"]
# 2D markers used in Matplotlib as equivalents of 3D shapes
markers = ['circle', 'square', 'triangle_up', 'triangle_down', 'diamond', 'plus, cross']
markerSymbols = ["o", "s", "^", "v", "D", "P", "X"]
# color palettes as defined in Matplotlib
palette = {
    "metrical": "Blues",
    "temporal": "Greys",
    "ordinal": "Oranges",
    "nominal": "tab10"
}
mark = "sphere"
plot = "scatter"
mpl.rcParams['figure.dpi'] = dpi # set the dpi resolution of panel images

def key(field):
    if field in encoding:
        if 'field' in encoding[field]:
            return encoding[field]['field']
    return field

def indexOf(val, dim):
    # get index of val in dimension
    if dim in encoding:
        if 'scale' in encoding[dim] and 'domain' in encoding[dim]['scale']:
            return encoding[dim]['scale']['domain'].index(val)
    return -1

def scaleX(val):
    return val * factorX

def scaleY(val):
    return val * factorY

def scaleZ(val):
    return val * factorZ

def placeX(val):
    return (val - (lowerX + (upperX - lowerX) / 2.0)) * factorX

def placeY(val):
    return (val - lowerY) * factorY

def placeZ(val):
    return (val - (lowerZ + (upperZ - lowerZ) / 2.0)) * factorZ

def inch2m(inch):
    return inch * 2.54 / 100.0

def getSize2D():
    # marker size from m in points of dpi 
    if 'size' in encoding:
        if 'value' in encoding['size']:
            return encoding['size']['value'] * 100 * 100.0 * 72.0 / dpi / 2.54
    if key("size") in df and df.dtypes[key("size")] == float:
        return df[key("size")].map(lambda x: x * 100.0 * 100.0 * 72.0 / dpi / 2.54)
    return dpi / 5.0

def getSize():
    # marker size in m
    if 'size' in encoding:
        if 'value' in encoding['size']:
            return encoding['size']['value']
    if key("size") in df and df.dtypes[key('size')] == float:
        return df[key('size')]
    return 0.05

def getMarker():
    if 'shape' in encoding:
        if 'value' in encoding['shape']:
            m = encoding['shape']['value']
            if m in markers or m in markerSymbols:
                return m
            if m in shapes:
                idx = shapes.index(m)
                if idx >= 0:
                    return markerSymbols[idx]
        if 'marker' in encoding['shape']:
            return encoding['shape']['marker']
    return 'o'

def getShape():
    if 'shape' in encoding:
        if 'value' in encoding['shape']:
            sh = encoding['shape']['value']
            if sh in shapes:
                return sh
            if sh in markers:
                idx = markers.index(sh)
                if idx >= 0:
                    return shapes[idx]
            if sh in markerSymbols:
                idx = markerSymbols.index(sh)
                if idx >= 0:
                    return shapes[idx]
    return 'sphere'

def getColor():
    if 'color' in encoding:
        if 'value' in encoding['color']:
            return encoding['shape']['value']
        if key("color") in df and 'scale' in encoding['color']:
            return df[key("color")].map(lambda x: encoding['color']['scale']['range'][encoding['color']['scale']['domain'].index(x)])
    return 'orange'

def rgb2hex(red, green, blue):
    return '#%02x%02x%02x' % (int(red*255.0), int(green*255.0), int(blue*255.0))

def exportLegend(legend, filename="legend.png"):
    fig  = legend.figure
    fig.canvas.draw()
    bbox  = legend.get_window_extent()
    bbox = bbox.transformed(fig.dpi_scale_trans.inverted())
    fig.savefig(os.path.join(folder, filename), dpi=dpi, bbox_inches=bbox)
    return bbox

def execute(settings):
    # read settings
    global df
    global stage
    global dimension
    if 'title' in settings:
        global title
        title = settings["title"]
    if 'height' in settings:
        stage["height"] = settings["height"]
    if 'width' in settings:
        stage["width"]  = settings["width"]
    if 'depth' in settings:
        stage["depth"]  = settings["depth"]
    if 'stage' in settings:
        stage = settings['stage']
    if 'dimension' in settings:
        dimension = settings['dimension']
    if 'data' in settings:
        if 'url' in settings['data']:
            loadData(settings['data']['url'])
        else:
            if 'values' in settings['data']:
                values = settings['data']['values']
                if isinstance(values, dict):
                    df = pd.DataFrame(values)
                else:
                    df = pd.from_records(values)
        # try to convert datatime strings 
        for col in df.columns:
            if df[col].dtype == 'object':
                try:
                    df[col] = pd.to_datetime(df[col])
                except ValueError:
                    pass
        print(df)
        print(df.dtypes)
        deduceDimensions()

    if 'auxreps' in settings:
        global visuals
        visuals = settings["auxreps"]

    if 'panels' in settings:
        global panelsSpec
        panelsSpec = settings["panels"]

    if 'mark' in settings:
        global mark
        mark = settings["mark"]

    if 'plot' in settings:
        global plot
        plot = settings["plot"]

    if 'sequence' in settings:
        global sequence
        global srcdf
        sequence = settings['sequence']
        if 'field' in sequence and 'domain' in sequence:
            srcdf = df.copy()
            df = srcdf[srcdf[sequence['field']] == sequence['domain'][0]]

    if 'encoding' in settings:
        enc = settings["encoding"] 
        global encoding
        encoding = enc
        deduceEncoding()

    if 'bgcolor' in settings:
        global bgColor
        bgColor = settings["bgcolor"] 

    if 'gridcolor' in settings:
        global gridColor
        gridColor = settings["gridcolor"] 

    if 'output' in settings:
        global outputFile
        outputFile = settings["output"] 

    if 'assetURL' in settings:
        global assetURL
        assetURL = settings["assetURL"]

def deduceDimensions():
    global dimension
    print(df.columns)
    for col in df.columns:
        calcDomain = True
        spec = {}
        if col in dimension and 'domain' in dimension[col]:
            spec['domain'] = dimension[col]['domain']
            calcDomain = False

        if df[col].dtype == 'object' or df[col].dtype == 'category':
            spec['type'] = 'nominal'
            if calcDomain:
                cat = df[col].unique()
                if cat.size <  df[col].size:
                    spec['domain'] = cat.tolist()
        elif df[col].dtype == 'datetime64[ns]':
            spec['type'] = 'temporal'
            if calcDomain:
                spec['domain'] = [str(df[col].min()), str(df[col].max())]
        elif df[col].dtype == 'int64':
            spec['type'] = 'quantitative'
            if calcDomain:
                spec['domain'] = [int(df[col].min()), int(df[col].max())]
        else:
            spec['type'] = 'quantitative'
            if calcDomain:
                spec['domain'] = [float(df[col].min()), float(df[col].max())]
        dimension[col] = spec
    print(dimension)

def deduceEncoding():
    global encoding
    if 'x' in encoding:
        key = 'x'
        if 'field' in encoding["x"]:
            key = encoding["x"]['field']
            if 'title' not in encoding['x']:
                encoding['x']['title'] = key
        if key in dimension and 'type' in dimension[key]:
            type = dimension[key]['type']
            if type == 'quantitative' and 'domain' in dimension[key]:
                min = dimension[key]["domain"][0]
                max = dimension[key]["domain"][1]
                global lowerX
                global upperX
                delta = 0.0
                if plot == 'scatter':
                    delta = (max - min) * 0.05
                lowerX = min - delta
                upperX = max + delta                

    if 'y' in encoding:
        key = 'y'
        if 'field' in encoding["y"]:
            key = encoding["y"]['field']
            if 'title' not in encoding['y']:
                encoding['y']['title'] = key
        if key in dimension  and 'type' in dimension[key]:
            type = dimension[key]['type']
            if type == 'quantitative' and 'domain' in dimension[key]:
                min = dimension[key]["domain"][0]
                max = dimension[key]["domain"][1]
                global lowerY
                global upperY
                delta = 0.0
                if plot == 'scatter':
                    delta = (max - min) * 0.05
                lowerY = min - delta
                upperY = max + delta

    if 'z' in encoding:
        key = 'z'
        if 'field' in encoding["z"]:
            key = encoding["z"]['field']
            if 'title' not in encoding['z']:
                encoding['z']['title'] = key
        if key in dimension and 'type' in dimension[key]:
            type = dimension[key]['type']
            if type == 'quantitative' and 'domain' in dimension[key]:
                min = dimension[key]["domain"][0]
                max = dimension[key]["domain"][1]
                global lowerZ
                global upperZ
                delta = 0.0
                if plot == 'scatter':
                    delta = (max - min) * 0.05
                lowerZ = min - delta
                upperZ = max + delta

    if 'color' in encoding:
        key = 'color'
        if 'field' in encoding["color"]:
            key = encoding["color"]['field']
            cat = []
            if key in dimension and 'domain' in dimension[key]:
                cat = dimension[key]['domain']
                if len(cat) <= 10:
                    encoding['color']['labels'] = cat
                    rgb_values = plt.get_cmap(palette['nominal']).colors
                    color_list = [rgb2hex(r, g, b) for r, g, b in rgb_values[:len(cat)]]
                    scale = {'domain': cat, 'range': color_list}
                    encoding['color']['scale'] = scale

    if 'shape' in encoding:
        key = 'shape'
        if 'field' in encoding['shape']:
            key = encoding['shape']['field']
        cat = []
        if key in dimension and 'domain' in dimension[key]:
            cat = dimension[key]['domain']
            if len(cat) <= 7:
                encoding['shape']['labels'] = cat
                scale = {'domain': cat, 'range': shapes[:len(cat)]}
                encoding['shape']['scale'] = scale

    if 'size' in encoding:
        key = 'size'
        if 'field' in encoding["size"]:
            key = encoding["size"]['field']
        cat = []
        if key in dimension and 'domain' in dimension[key]:
            cat = dimension[key]['domain']
            if len(cat) <= 7:
                encoding['size']['labels'] = cat
                scale = {'domain': cat, 'range': []}
                encoding['size']['scale'] = scale
        if 'values' in encoding["size"]:
            df['size'] = encoding["size"]["values"]
    print(df)
    print(df.dtypes)

def loadData(dataFile):
    if dataFile:
        global df
        path = dataFile
        if dataFile.startswith("http") == False and dataFile.startswith("file:") == False and dataFile.startswith("/") == False:
            path = os.path.join(folder, dataFile)
        if path.endswith("json"):
             df = pd.read_json(path)
        elif path.endswith("xlsx"):
            df = pd.read_excel(path)
        elif path.endswith("csv"):
            df = pd.read_csv(path)
        else:
            df = pd.read_csv(path)

def createCluster():
    # build min-max cluster over color category, add median
    k = key('color')
    cats = dimension[k]['domain']
    color = '#FF0000'
    idx = 0
    for cat in cats:
        minx, maxx, miny, maxy, minz, maxz = 0, 0, 0, 0, 0, 0
        res = df[df[k] == cat]
        if key('x') in res:
            minx = res[key('x')].min()
            maxx = res[key('x')].max()
        else :
            maxx = encoding[key('x')]['value']
            minx = maxx - 0.005
        if key('y') in res:
            miny = res[key('y')].min()
            maxy = res[key('y')].max()
        else :
            maxy = encoding[key('y')]['value']
            miny = maxy - 0.005
        if key('z') in res:
            minz = res[key('z')].min()
            maxz = res[key('z')].max()
        else:
            maxz = encoding[key('z')]['value'] + idx * 0.005
            minz = maxz - idx * 0.0075
        sw = scaleX(maxx - minx)
        sh = scaleY(maxy - miny)
        sd = scaleZ(maxz - minz)
        if 'color' in encoding:
            if 'scale' in encoding['color'] and 'range' in encoding['color']['scale']:
                color = encoding['color']['scale']['range'][idx]

        alpha = 'AA'    
        if 'opacity' in encoding:
            opac =  encoding['opacity']['value']
            alpha = '%02x' % int(opac*255.0)

        datavis = {"type": "box", "x":placeX(minx + (maxx-minx)/2.0), "y":placeY(miny + (maxy-miny)/2.0), "z":placeZ(minz + (maxz-minz)/2.0), "w":sw, "h": sh, "d":sd, "color": color + alpha}
        visuals.append(datavis)
        medianx, mediany, medianz = 0, 0, 0
        medianx = res[key('x')].median()
        mediany = res[key('y')].median()
        medianz = res[key('z')].median()
        #sm = min(sw, sh, sd)/3.0
        sm = 0.05
        if 'size' in encoding:
            size =  encoding['size']['value']
            sm = size * 3.0
        datavis = {"type": "sphere", "x":placeX(medianx), "y":placeY(mediany), "z":placeZ(medianz), "w":sm, "h": sm, "d":sm, "color": color}
        visuals.append(datavis)
        idx = idx + 1

def createScatter():
    for index, row in df.iterrows():
        x = 0
        y = 0
        z = 0
        w = 0.05
        h = 0.05
        d = 0.05
        size = 0
        color = 'orange'
        if 'x' in encoding:
            if 'value' in encoding['x']:
                x = encoding['x']['value']
            else:
                val = row[key('x')]
                x = val
        else:
            x = row['x']
        if 'y' in encoding:
            if 'value' in encoding['y']:
                y = encoding['y']['value']
            else:
                val = row[key('y')]
                y = val
        else:
            y = row['y']
        if 'z' in encoding:
            if 'value' in encoding['z']:
                z = encoding['z']['value']
            else:
                val = row[key('z')]
                z = val
        else:
            z = row['z']
        if 'size' in encoding:
            if 'value' in encoding['size']:
                size = encoding['size']['value']
            elif key('size') in row:
                val = row[key('size')]
                size = val
        else:
            size = row['size']
        if 'color' in encoding:
            if 'value' in encoding['color']:
                color = encoding['color']['value']
            else:
                val = row[key('color')]
                if 'scale' in encoding['color']:
                    idx = encoding['color']['scale']['domain'].index(val)
                    color = encoding['color']['scale']['range'][idx]
        else:
            color = row['color']
        sw = scaleX(w)
        sh = scaleY(h)
        sd = scaleZ(d)
        if size > 0.0:
            sw = size
            sh = size
            sd = size
            datavis = {"type": "sphere", "x":placeX(x), "y":placeY(y), "z":placeZ(z), "w":sw, "h": sh, "d":sd, "color": color}
            visuals.append(datavis)

def createBar():
    for index, row in df.iterrows():
        x = 0
        y = 0
        z = 0
        w = 0.05
        h = 0.05
        d = 0.05
        size = 0
        color = 'orange'
        if 'x' in encoding:
            if 'value' in encoding['x']:
                x = encoding['x']['value']
            else:
                val = row[key('x')]
                x = val
        else:
            x = row['x']
        if 'y' in encoding:
            if 'value' in encoding['y']:
                y = encoding['y']['value']
            else:
                val = row[key('y')]
                y = val
        else:
            y = row['y']
        if 'z' in encoding:
            if 'value' in encoding['z']:
                z = encoding['z']['value']
            else:
                val = row[key('z')]
                z = val
        else:
            z = row['z']
        if 'size' in encoding:
            if 'value' in encoding['size']:
                size = encoding['size']['value']
            elif key('size') in row:
                val = row[key('size')]
                size = val
        
        if 'color' in encoding:
            if 'value' in encoding['color']:
                color = encoding['color']['value']
            else:
                val = row[key('color')]
                if 'scale' in encoding['color']:
                    idx = encoding['color']['scale']['domain'].index(val)
                    color = encoding['color']['scale']['range'][idx]
        else:
            color = row['color']
        sh = scaleY(y)
        if sh > 0.0:
            if size > 0.0:
                sw = size
            else:
                sw = scaleX((upperX - lowerX) / (1 + len(encoding['x']['scale']['range'])))
            if size > 0.0:
                sd = size
            else:
                sd = scaleZ((upperZ - lowerZ) / (1 + len(encoding['z']['scale']['range'])))
            
            posX = 0.0
            posZ = 0.0
            idx = indexOf(x, 'x')
            posX = encoding['x']['scale']['range'][idx]
            idx = indexOf(z, 'z')
            posZ = encoding['z']['scale']['range'][idx]
            datavis = {"type": "box", "x":posX, "y":sh/2.0, "z":posZ, "w":sw, "h": sh, "d":sd, "color": color}
            visuals.append(datavis)
    
def createLegend(spec, bbox, y0):
    leg = spec[:3]
    layout = spec[2:]
    w = inch2m((bbox.x1 - bbox.x0) * 4.8 * stage['width']) 
    h = inch2m((bbox.y1 - bbox.y0) * 4.8 * stage['width'])
    x = 0.0
    y = 0.005
    z = 0.0
    if '=' in layout:
        shift = stage['depth'] * 0.15
        if '<' in layout:
            x = -float(chartWidth/2.0) + w/2.0
        elif '>' in layout:
            x = float(chartWidth/2.0) - w/2.0
        if '-' in layout:
            z = -float(chartDepth/2.0) + h/2.0 + shift
        elif '_' in layout:
            z = float(chartDepth/2.0) + h/2.0 + shift
        panel = {"type": maptype[spec], "x":x, "y":y, "z":z, "w":w, "d": h, "h": 0, "asset": assetURL + leg[:2] + ".png"}
        return panel
    else:
        # upright
        if '<' in layout:
            x = -float(chartWidth/2.0) + w/2.0
        elif '>' in layout:
            x = float(chartWidth/2.0) - w/2.0
        y = y0 + chartHeight/2.0
        if 'v' in layout:
            y = y0 + h/2.0
        elif '^' in layout:
            y = y0 + float(chartHeight/2.0) - h/2.0
        z = 0.0
        if '-' in layout:
            z = -float(chartDepth/2.0)
        elif '_' in layout:
            z = float(chartDepth/2.0)
        panel = {"type": maptype[spec], "x":x, "y":y, "z":z, "w":w, "d": 0, "h": h, "asset": assetURL + leg[:2] + ".png"}
        return panel

def createPanels(spec):
    # create panels, will overwrite chart wxhxd and scale factors
    global encoding
    global maptype
    global visuals
    global chartWidth
    global chartHeight
    global chartDepth
    global lowerX
    global upperX
    global lowerY
    global upperY
    global lowerZ
    global upperZ
    global factorX
    global factorY
    global factorZ

    chartWidth = stage['width']
    plotWidth = chartWidth
    panelWidth = chartWidth
    chartHeight = stage['height']
    plotHeight = chartHeight
    panelHeight = chartHeight
    panelY = 0.0
    chartDepth = stage['depth']
    plotDepth2 = chartDepth
    plotHeight2 = chartHeight
    panelDepth2 = chartDepth
    panelHeight2 = chartHeight
    panelY2 = 0.0

    # handle upper/lowercase coding of type
    speclc = list(map(str.lower,spec))
    maptype = dict(zip(speclc, spec))
    spec = speclc

    # generate xy and -xy panels
    if any(p.startswith('xy') or p.startswith('-xy') for p in spec):
         # xy panels ----
        fig, ax = plt.subplots(facecolor=(1, 1, 1, 0.0), layout="constrained")
        fig.set_size_inches(4.8*stage['width']/stage['height'], 4.8)
        ax.set_facecolor(bgColor)
        ax.grid(color = gridColor, linewidth = 1.25)
        ax.tick_params(top=True, labeltop=True, bottom=False, labelbottom=False, color=gridColor, labelcolor=gridColor)
        ax.set_title(title, color=gridColor)
        ax.xaxis.set_label_position("top")
        ax.spines['top'].set_visible(False)
        ax2 = ax.twinx()
        if dimension[key('x')]['type'] == 'quantitative':
            ax.set_xlim(lowerX, upperX)
        if dimension[key('y')]['type'] == 'quantitative':
            ax.set_ylim(lowerY, upperY)
            ax2.set_ylim(lowerY, upperY)
        ax2.tick_params(right=True, labelright=True, color=gridColor, labelcolor=gridColor)
        ax2.spines['top'].set_visible(False)
        if 'title' in encoding['x']:
            ax.set_xlabel(encoding['x']['title'], color=gridColor)
        if 'title' in encoding['y']:
            ax.set_ylabel(encoding['y']['title'], color=gridColor)
            ax2.set_ylabel(encoding['y']['title'], color=gridColor)
        if dimension[key('x')]['type'] == 'quantitative' and dimension[key('y')]['type'] == 'quantitative':
            ax.scatter(df[key('x')], df[key('y')], alpha=0)
        else:
            ax.bar(df[key('x')], df[key('y')], alpha=0)
        if 'xy' in spec:
            plt.savefig(os.path.join(folder, 'xy.png'))
            panel = {"type": maptype["xy"], "x":0.0, "y":float(panelY), "z":-float(chartDepth/2.0), "w":float(panelWidth), "d": 0, "h":float(panelHeight), "asset": assetURL + "xy.png"}
            visuals.append(panel)
        if '-xy' in spec:
            ax.xaxis.set_inverted(True)
            plt.savefig(os.path.join(folder, '-xy.png'))
            panel = {"type": maptype["-xy"], "x":0.0, "y":float(panelY), "z":float(chartDepth/2.0), "w":float(panelWidth), "d": 0, "h":float(panelHeight), "asset": assetURL + "-xy.png"}            
            visuals.append(panel)
        ax.xaxis.set_inverted(False)
        if 'xy+s' in spec:
            #ax.scatter(df['x'], df['y'], c=df['color'].map(encoding['color']['map']), s=getSize2D() , marker=getMarker())
            ax.scatter(df[key('x')], df[key('y')], c=getColor(), s=getSize2D() , marker=getMarker())
            plt.savefig(os.path.join(folder, 'xy+s.png'))
            panel = {"type": maptype["xy"], "x":0.0, "y":float(panelY), "z":-float(chartDepth/2.0), "w":float(panelWidth), "d": 0, "h":float(panelHeight), "asset": assetURL + "xy+s.png"}
            visuals.append(panel)
        ax.xaxis.set_inverted(True)
        if '-xy+s' in spec:
            ax.scatter(df[key('x')], df[key('y')], c=getColor(), s=getSize2D() , marker=getMarker())
            plt.savefig(os.path.join(folder, '-xy+s.png'))
            panel = {"type": maptype["-xy"], "x":0.0, "y":float(panelY), "z":float(chartDepth/2.0), "w":float(panelWidth), "d": 0, "h":float(panelHeight), "asset": assetURL + "-xy+s.png"}            
            visuals.append(panel)

        # access plot size, must run after savefig()!
        fig_width, fig_height = plt.gcf().get_size_inches()
        chartBox = ax.get_position()
        plotHeight = chartBox.y1 - chartBox.y0
        panelHeight = chartHeight / plotHeight
        panelY = -chartBox.y0 * panelHeight
        plotWidth = chartBox.x1 - chartBox.x0
        panelWidth = panelHeight * fig_width / fig_height
        chartWidth = panelWidth * plotWidth
        if dimension[key('x')]['type'] == 'quantitative':
            factorX = chartWidth / (upperX - lowerX)
            scale = {'domain': [lowerX, upperX], 'range': [placeX(lowerX), placeX(upperX)]}
            encoding['x']['scale'] = scale
        else:
            min, max = ax.get_xlim()
            if min > max: # from inverse panel
                lowerX = max; upperX = min;
            else:
                lowerX = min; upperX = max;
            factorX = chartWidth / (upperX - lowerX)
            xrange = [placeX(x) for x in ax.get_xticks()]
            scale = {'domain': dimension[key('x')]['domain'], 'range': xrange}
            encoding['x']['scale'] = scale
    
        if dimension[key('y')]['type'] == 'quantitative':
            factorY = chartHeight / (upperY - lowerY)
            scale = {'domain': [lowerY, upperY], 'range': [placeY(lowerY), placeY(upperY)]}
            encoding['y']['scale'] = scale
        else:
            min, max = ax.get_ylim()
            if min > max: # from inverse panel
                lowerY = max; upperY = min;
            else:
                lowerY = min; upperY = max;
            factorY = chartHeight / (upperY - lowerY)
            yrange = [placeY(x) for x in ax.get_yticks()]
            scale = {'domain': dimension[key('y')]['domain'], 'range': yrange}
            encoding['y']['scale'] = scale

    # zy panels ---- 
    if any(p.startswith('zy') or p.startswith('-zy') for p in spec):
        # generate zy and -zy panels
        fig, ax = plt.subplots(facecolor=(1, 1, 1, 0.0), layout="constrained")
        fig.set_size_inches(4.8*stage['depth']/stage['height'], 4.8)
        ax.set_facecolor(bgColor)
        if dimension[key('z')]['type'] == 'quantitative':
            ax.set_xlim(lowerZ, upperZ)
        if dimension[key('y')]['type'] == 'quantitative':
            ax.set_ylim(lowerY, upperY)
        ax.grid(color = gridColor, linewidth = 1.25)
        ax.tick_params(top=True, labeltop=True, bottom=False, labelbottom=False, color=gridColor, labelcolor=gridColor)
        ax.set_title(title, color=gridColor)
        ax.xaxis.set_label_position("top")
        ax.spines['top'].set_visible(False)
        ax2 = ax.twinx()
        ax2.tick_params(right=True, labelright=True, color=gridColor, labelcolor=gridColor)
        ax2.set_ylim(lowerY, upperY)
        ax2.spines['top'].set_visible(False)
        if 'title' in encoding['z']:
            ax.set_xlabel(encoding['z']['title'], color=gridColor)
        if 'title' in encoding['y']:
            ax.set_ylabel(encoding['y']['title'], color=gridColor)
            ax2.set_ylabel(encoding['y']['title'], color=gridColor)
        if dimension[key('z')]['type'] == 'quantitative' and dimension[key('y')]['type'] == 'quantitative':
            ax.scatter(df[key('z')], df[key('y')], alpha=0)
        else:
            ax.bar(df[key('z')], df[key('y')], alpha=0)
        if 'zy' in spec:
            plt.savefig(os.path.join(folder, 'zy.png'))
            panel = {"type": maptype["zy"], "x":float(chartWidth/2.0), "y":float(panelY2), "z":0.0, "w":float(panelDepth2), "d": 0, "h":float(panelHeight2), "asset": assetURL + "zy.png"}
            visuals.append(panel)
        if '-zy' in spec:
            ax.xaxis.set_inverted(True)
            plt.savefig(os.path.join(folder, '-zy.png'))
            panel = {"type": maptype["-zy"], "x":-float(chartWidth/2.0), "y":float(panelY2), "z":0.0, "w":float(panelDepth2), "d": 0, "h":float(panelHeight2), "asset": assetURL + "-zy.png"}
            visuals.append(panel)
        ax.xaxis.set_inverted(False)
        if 'zy+s' in spec:
            ax.scatter(df[key('z')], df[key('y')], c=getColor(), s=getSize2D() , marker=getMarker())
            plt.savefig(os.path.join(folder, 'zy+s.png'))
            panel = {"type": maptype["zy"], "x":float(chartWidth/2.0), "y":float(panelY2), "z":0.0, "w":float(panelDepth2), "d": 0, "h":float(panelHeight2), "asset": assetURL + "zy+s.png"}
            visuals.append(panel)
        ax.xaxis.set_inverted(True)
        if '-zy+s' in spec:
            ax.scatter(df[key('z')], df[key('y')], c=getColor(), s=getSize2D() , marker=getMarker())
            plt.savefig(os.path.join(folder, '-zy+s.png'))
            panel = {"type": maptype["-zy"], "x":-float(chartWidth/2.0), "y":float(panelY2), "z":0.0, "w":float(panelDepth2), "d": 0, "h":float(panelHeight2), "asset": assetURL + "-zy+s.png"}
            visuals.append(panel)

        fig_width, fig_height = plt.gcf().get_size_inches()
        chartBox = ax.get_position()
        plotHeight2 = chartBox.y1 - chartBox.y0
        panelHeight2 = chartHeight / plotHeight2
        panelY2 = -chartBox.y0 * panelHeight2
        plotDepth2 = chartBox.x1 - chartBox.x0
        panelDepth2 = panelHeight2  * fig_width / fig_height
        chartDepth = panelDepth2 * plotDepth2
        shiftZ = (chartBox.x0 - (1.0 - chartBox.x1)) * panelDepth2 / 2.0
        if dimension[key('z')]['type'] == 'quantitative':
            factorZ = abs(chartDepth / (upperZ - lowerZ))
            scale = {'domain': [lowerZ, upperZ], 'range': [placeZ(lowerZ), placeZ(upperZ)]}
            encoding['z']['scale'] = scale
        else:
            min, max = ax.get_xlim()
            print(min, max)
            if min > max: # from inverse panel
                lowerZ = max; upperZ = min;
            else:
                lowerZ = min; upperZ = max;
            factorZ = chartDepth / (upperZ - lowerZ)
            zrange = [placeZ(z) for z in ax.get_xticks()]
            scale = {'domain': dimension[key('z')]['domain'], 'range': zrange}
            encoding['z']['scale'] = scale
    
    # align side panels
    for panel in visuals:
        if panel['type'].lower().startswith('xy'):
            panel['y'] = panelY
            panel['z'] = -float(chartDepth/2.0)
            panel['w'] = float(panelWidth)
            panel['h'] = float(panelHeight)
        if panel['type'].lower().startswith('-xy'):
            panel['y'] = panelY
            panel['z'] = float(chartDepth/2.0)
            panel['w'] = float(panelWidth)
            panel['h'] = float(panelHeight)
        if panel['type'].lower().startswith('zy'):
            panel['x'] = float(chartWidth/2.0)
            panel['y'] = float(panelY2)
            panel['z'] = panel['z'] - shiftZ
            panel['w'] = float(panelDepth2)
            panel['h'] = float(panelHeight2)
        if panel['type'].lower().startswith('-zy'):
            panel['x'] = -float(chartWidth/2.0)
            panel['y'] = float(panelY2)
            panel['z'] = panel['z'] + shiftZ
            panel['w'] = float(panelDepth2)
            panel['h'] = float(panelHeight2)
    
    if any(p.startswith('xz')for p in spec):
        fig, ax = plt.subplots(figsize=plt.figaspect(1.0), facecolor=(1, 1, 1, 0.0), layout="constrained")
        fig.set_size_inches(4.8*stage['width']/stage['height'], 4.8*stage['depth']/stage['height'])
        ax.set_facecolor(bgColor)
        plt.yticks(rotation=-90)
        ax.tick_params(top=True, labeltop=True, bottom=False, labelbottom=True, right=False, labelright=False, color=gridColor, labelcolor=gridColor) # labelbottom=False, bottom=True, 
        ax2 = ax.twinx()
        ax2.tick_params(right=True, labelright=True, color=gridColor, labelcolor=gridColor) # labelrotation=90, 
        if dimension[key('x')]['type'] == 'quantitative':
            ax.set_xlim(lowerX, upperX)
            ax2.set_xlim(lowerX, upperX)
        if dimension[key('z')]['type'] == 'quantitative':
            ax.set_ylim(lowerZ, upperZ)
            ax2.set_ylim(lowerZ, upperZ)
            ax.set_yticklabels(ax.get_yticklabels(), rotation=-90)
            ax2.set_yticklabels(ax2.get_yticklabels(), rotation=90)
        else:
            ax.set_ylim(upperZ, lowerZ)
            ax2.set_ylim(upperZ, lowerZ)
        ax.grid(color = gridColor, linewidth = 1.25)
        ax.yaxis.set_inverted(True)
        ax2.yaxis.set_inverted(True)           

        if dimension[key('x')]['type'] == 'quantitative' and dimension[key('z')]['type'] == 'quantitative':
            ax.scatter(df[key('x')], df[key('z')], alpha=0)
        else:
            ax.bar(df[key('x')], df[key('z')], alpha=0)
            ax2.set_yticks(ax.get_yticks())
            ax2.set_yticklabels(ax.get_yticklabels(), rotation=--90)
        ax2.spines['top'].set_visible(False)   
        if 'title' in encoding['x']:
            ax.set_xlabel(encoding['x']['title'], color=gridColor)
            ax2.set_xlabel(encoding['x']['title'], color=gridColor)
        if 'title' in encoding['y']:
            ax.set_ylabel(encoding['z']['title'], color=gridColor, rotation=-90, labelpad=12)
            ax2.set_ylabel(encoding['z']['title'], color=gridColor, )
        if 'xz' in spec:     
            plt.savefig(os.path.join(folder, 'xz.png'))
        if 'xz+s' in spec:
            ax.scatter(df[key('x')], df[key('z')], c=getColor(), s=getSize2D() , marker=getMarker())
            plt.savefig(os.path.join(folder, 'xz+s.png'))
        fig_width, fig_height = plt.gcf().get_size_inches()
        chartBox = ax.get_position()
        plotDepth3 = chartBox.y1 - chartBox.y0
        panelDepth3 = chartDepth / plotDepth3
        plotWidth3 = chartBox.x1 - chartBox.x0
        panelWidth3 = chartWidth / plotWidth3
        shiftX = (chartBox.x0 - (1.0 - chartBox.x1)) * panelWidth3 / 2.0
        shiftZ = (chartBox.y0 - (1.0 - chartBox.y1)) * panelDepth3 / 2.0

        if 'xz' in spec: 
            panel = {"type": maptype["xz"], "x":0.0-shiftX, "y":0.0, "z":shiftZ, "w":float(panelWidth3), "d": float(panelDepth3), "h":0.0, "asset": assetURL + "xz.png"}
            visuals.append(panel)
        if 'xz+s' in spec: 
            panel = {"type": maptype["xz+s"], "x":0.0-shiftX, "y":0.0, "z":shiftZ, "w":float(panelWidth3), "d": float(panelDepth3), "h":0.0, "asset": assetURL + "xz+s.png"}
            visuals.append(panel)

    # legend panels
    if any(p.startswith('lc')for p in spec):
        fig, ax = plt.subplots(figsize=plt.figaspect(1.0), facecolor=(1, 1, 1, 0.0), layout="constrained")
        colorRange = encoding['color']['scale']['range']
        f = lambda m,c: plt.plot([],[],marker=m, color=c, ls="none")[0]
        handles = [f("s", colorRange[i]) for i in range(len(colorRange))]
        labels = encoding['color']['labels']
        legend = fig.legend(handles, labels, loc='center', framealpha=0, frameon=True, title=encoding['color']['title'])
        bbox = exportLegend(legend, 'lc.png')
        legSpec = next((element for element in spec if str(element).startswith('lc')))
        panel = createLegend(legSpec, bbox, panelY2)
        visuals.append(panel)

    if any(p.startswith('lm')for p in spec):
        fig, ax = plt.subplots(figsize=plt.figaspect(1.0), facecolor=(1, 1, 1, 0.0), layout="constrained")
        markerRange = encoding['shape']['scale']['range']
        f = lambda m,c: plt.plot([],[],marker=m, color=c, ls="none")[0]
        handles = [f(markerSymbols[i], "black") for i in range(len(markerRange))]
        labels = encoding['shape']['labels']
        legend = fig.legend(handles, labels, loc='center', framealpha=0, frameon=True, title=encoding['shape']['title'])
        bbox = exportLegend(legend, 'lm.png')
        legSpec = next((element for element in spec if str(element).startswith('lm')))
        panel = createLegend(legSpec, bbox, panelY2)
        visuals.append(panel)

    if any(p.startswith('ls')for p in spec):
        print('TODO: size/magnitude legend')

    if doSaveEncoding:
        panel = {"type": "encoding", "x":0, "y":0, "z":0, "w":float(chartWidth), "d": float(chartDepth), "h":float(chartHeight), "asset": assetURL + "encoding.json"}
        visuals.insert(0, panel)
        
def testScale():
    ref = {"type": "box", "x":0.0, "y":placeY(2.25), "z":placeZ(upperZ), "w":0.5, "d": 0.1, "h":0.01, "color": "green"}
    visuals.append(ref)
    ref2 = {"type": "box", "x":0.0, "y":placeY(1.5), "z":placeZ(upperZ), "w":0.4, "d": 0.1, "h":0.08, "color": "yellow"}
    visuals.append(ref2)
    ref3 = {"type": "box", "x":placeX(2.0), "y":placeY(1.0), "z":placeZ(upperZ), "w":0.01, "d": 0.1, "h":0.3, "color": "red"}
    visuals.append(ref3)
    ref4 = {"type": "box", "x":placeX(lowerX), "y":placeY(2.0), "z":placeZ(3.0), "w":0.03, "d": 0.03, "h":0.03, "color": "blue"}
    visuals.append(ref4)

def createDataViz():
    global visuals
    if sequence != None and 'domain' in sequence:
        for val in range(sequence['domain'][0] + 1, sequence['domain'][1] + 2):
            global df
            createPlots()
            scenes.append(visuals)
            visuals = []
            df = srcdf[srcdf[sequence['field']] == val]
        scenes.append(visuals)
    else:
        createPlots()
        scenes.append(visuals)

def createPlots():
    if plot == 'scatter':
        createScatter()
    elif plot == 'bar':
        createBar()
    elif plot == 'cluster':
        createCluster()

def saveEncoding():
    path = str(outputFile)
    jsonFile = os.path.join(folder, 'encoding.json')
    with open(jsonFile, 'w') as jsonout:
        json.dump(encoding, jsonout)
        jsonout.close()

def saveVizRep():
    path = str(outputFile)
    outputURL = path
    if path.startswith("http") == False and path.startswith("file") == False and path.startswith("/") == False:
        outputURL = os.path.join(folder, path)
    with open(outputURL, 'w') as outfile:
        json.dump(scenes, outfile)
        outfile.close()

# ---- main ----

try:
    with open(os.path.join(folder, 'settings.json'), 'r') as data:
        execute(json.load(data))
except FileNotFoundError:
    print("Usage: python3 datarepgen.py <folder>")
    print("folder needs to contain a <settings.json> file!")
    sys.exit(1)
createPanels(panelsSpec)
createDataViz()
saveVizRep()
if doSaveEncoding:
    saveEncoding()
