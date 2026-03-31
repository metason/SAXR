import numpy as np
import pandas as pd

points = 1000
x = np.random.rand(points)*100.0
z = np.random.rand(points)*100.0
y = np.sinc((x-26)/100*3.14) + np.sinc((z-54)/100*3.14)

df = pd.DataFrame({'x': x, 'y': y, 'z': z})
df.to_csv('data.csv', index=False)
