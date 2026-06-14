import re
import pandas as pd

df = pd.read_csv("data/out_csv/aliments_vitmin.csv")
conversion = {
    "_kg_": 1000,
    "_g_": 1,
    "_mg_": 1e-3,
    "_ug_": 1e-6,
    "_µg_": 1e-6,
}

df = df.replace("-",0)
df = df.replace("traces", 0)
df = df.replace(
    r'^<\s*(\d+(?:[.,]\d+)?)$',
    r'\1',
    regex=True
)
num_col = df.columns[1:]

df[num_col] = df[num_col].replace(",", ".", regex=True)
for col in num_col:
    df[col] = pd.to_numeric(df[col], errors="coerce")


def set_unit(df, goal_unit):
    factor_goal = conversion[goal_unit]

    rename_map = {}

    for col in df.columns:
        match = re.search(r"_(kg|g|mg|ug|µg)_", col)
        if match:
            unit = f"_{match.group(1)}_"
            factor = conversion[unit]

            df[col] *= factor / factor_goal
            rename_map[col] = col.replace(unit, goal_unit)

    return df.rename(columns=rename_map)
# df = set_unit(df,"_mg_")
df = df.round(4)
df["price_eur_100g"] = 0
df = df.sort_values(by="alim_nom_fr")
df.to_csv("data/aliments_vitmin_pp.csv", index=False)