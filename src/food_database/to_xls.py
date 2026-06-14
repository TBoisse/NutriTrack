import pandas as pd

df = pd.read_csv("data/aliments_vitmin_pp.csv")
df.to_excel("data/aliments_vitmin.xlsx", index=False)