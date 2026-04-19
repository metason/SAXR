import numpy as np
import pandas as pd

theta = np.linspace(-4 * np.pi, 4 * np.pi, 100)
y = np.linspace(-2, 2, 100)
r = y**2 + 1
x = r * np.sin(theta)
z = r * np.cos(theta)

df = pd.DataFrame({'x': x, 'y': y, 'z': z})
df.to_csv('data.csv', index=False)
