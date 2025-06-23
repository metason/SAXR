# #### Data Prep ####
# Prepare data for vizualisation in XR

import os
import sys
import json
import numpy as np
import pandas as pd

# ---- SETTINGS ----
folder = os.path.split(os.path.realpath(sys.argv[0]))[0] # default folder is script location
inputFile = "data/perCapita.xlsx"
outputFile = "data/perCapita.json"
df = pd.DataFrame()

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

def saveData(dataFile):
    if dataFile:
        global df
        path = dataFile
        if dataFile.startswith("http") == False and dataFile.startswith("file:") == False and dataFile.startswith("/") == False:
            path = os.path.join(folder, dataFile)
        if path.endswith("json"):
             df.to_json(path, orient='records')


# ---- main ----

loadData(inputFile)
df = df.drop("Gov Debt to GDP Ratio", axis='columns')
df = df.drop("Priv Dept to GDP Ratio", axis='columns')
print(df)
print(df.dtypes)
df = pd.melt(df, value_vars=['GDP', 'gov debt', 'priv debt'], var_name='category', id_vars=['year', 'region'])
print(df)
saveData(outputFile)
