import pandas as pd

df = pd.read_csv("data/ciqual_2025.csv")

def get_name(lookup):
    results = df[df["alim_nom_fr"].str.startswith(lookup, na=False)]
    results.sort_values(by="alim_nom_fr", key = lambda col : col.str.len())
    print(results["alim_nom_fr"].values)

def extract_alim():
    with open("data/aliments.txt") as f:
        valeurs = {line.strip() for line in f}

    result = df[df["alim_nom_fr"].isin(valeurs)]
    result.sort_values(by="alim_nom_fr")
    result.to_csv("data/out_csv/aliments_full.csv", index=False)

# get_name("Framb")
extract_alim()