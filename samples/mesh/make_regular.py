import numpy as np
import pandas as pd

x, z = np.meshgrid(np.linspace(-6, 6), 
                   np.linspace(-6, 6))
x = x.flatten()
z = z.flatten()
R = np.sqrt(x**2 + z**2)
y = np.sin(R) / R

df = pd.DataFrame({'x': x, 'y': y, 'z': z})
df.to_csv('data.csv', index=False)
