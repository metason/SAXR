import os
import sys
import json
import pandas as pd
import geopandas
import matplotlib.pyplot as plt

# --- settings ----
doSaveSettings = True
width = 1.0
geofile = "swissmap.json"
datafile = "healthcosts.csv"
key = "canton"
# group fields to export as data
fields = ["ambulant", "stationary", "total"]
colors = ["blue", "yellow", "black"]
exportfields = fields.copy()
assetURL = "$SERVER/run/vis/"
dpi=300
colorLegend = "Mean Net Income per Year"
groupLegend = "Health Costs per Year"

# --- main ---
map_df = geopandas.read_file(geofile)
map_df.set_crs("EPSG:4326", inplace=True) # set WGS 84 projection
#print(map_df.dtypes)
#print(map_df.describe)

df = pd.read_csv(datafile)
#print(df.dtypes)
#print(df.describe)

gdf = map_df.merge(df, on=key)
ax = gdf["geometry"].plot()
gdf["center"] = gdf.centroid
gdf["lattitude"] = gdf["center"].x
gdf["longitude"] = gdf["center"].y
exportfields.insert(0, key)
exportfields.append("lattitude")
exportfields.append("longitude")
gdf.apply(lambda x: ax.annotate(text=x[key], xy=x['center'].coords[0], ha='center', size=8), axis=1);
#print(gdf.describe)

ax.set_axis_off()
ax.get_xaxis().set_visible(False)
ax.get_yaxis().set_visible(False)
gax = gdf.plot(ax=ax, column='Kaufkraft', cmap='OrRd_r', edgecolor="black", linewidth=0.5)
#plt.show()
plt.savefig('map.png', bbox_inches='tight', pad_inches = 0, dpi=dpi)

print("===================")
fig_width, fig_height = plt.gcf().get_size_inches()
chartBox = gax.get_position()
print(fig_width, fig_height)
print(chartBox)
xmin, xmax = ax.get_xlim()
ymin, ymax = ax.get_ylim()
print(xmin, xmax)
print(ymin, ymax)
map_width = fig_width * (chartBox.x1 - chartBox.x0)
map_depth = fig_height * (chartBox.y1 - chartBox.y0)
depth = width * map_depth/map_width
print(width, depth, width/depth)

# --- save settings ---
setting = {}
setting["assetURL"] = assetURL
data = {}
data['values'] = {}
for field in exportfields:
    values = gdf[field].to_list()
    data['values'][field] = values
setting["data"] = data
stage = {"width": width, "height": width/2.0, "depth": depth}
setting['stage'] = stage
setting["plot"] = "bar"
setting["mark"] = "box"
xscale = {'domain': [xmin, xmax], 'range': [-width/2.0, width/2.0], 'type': 'quantitative'}
zscale = {'domain': [ymin, ymax], 'range': [depth/2.0, -depth/2.0], 'type': 'quantitative', 'offset': -0.027}
dim = {}
dim['x'] = xscale
dim['y'] = {'domain': [0, 10], 'type': 'quantitative'}
dim['z'] = zscale
setting["dimension"] = dim
if len(fields) > 1:
    setting["group"] = {'fields': fields, 'colors':colors} 
    yenc = {'field': {'group': 'fields'}}
    colorenc = {'field': {'group': 'colors'}}
else:
    yenc = {"field": fields[0]}
    colorenc = {"value": "yellow"}
enc = {}
enc['x'] = {"field": "lattitude"}
enc['y'] = yenc
enc['z'] = {"field": "longitude"}
enc['color'] = colorenc
enc['size'] = {"value": 0.015}
setting["encoding"] = enc
panel = {"type": "XZ", "x":0, "y":0, "z":0, "w":width, "d": depth, "h": 0, "asset": assetURL + "map.png"}
panels = [panel]
setting["auxReps"] = panels
setting["panels"] = ["XY", "-XY", "ZY", "-ZY"]

if doSaveSettings:
    folder = os.path.split(os.path.realpath(sys.argv[0]))[0] # default folder is script location
    outputURL = os.path.join(folder, "settings.json")
    with open(outputURL, 'w') as outfile:
        json.dump(setting, outfile)
        outfile.close()
else:
    print()
    print("================================================")
    print("---- use following output for settings.json ----")
    print("------------------------------------------------")
    print(json.dumps(setting, indent=4))