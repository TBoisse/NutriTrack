import pandas as pd

df = pd.read_csv("data/out_csv/aliments_full.csv")
cols = [
    "alim_nom_fr",
    "Eau (g 100 g)",
    "Energie, Règlement UE N° 1169 2011 (kcal 100 g)",
    "Protéines, N x facteur de Jones (g 100 g)",
    "Lipides (g 100 g)",
    "Sucres (g 100 g)",
    "Fibres alimentaires (g 100 g)",
    "Cholestérol (mg 100 g)",
    "Calcium (mg 100 g)",
    "Chlorure (mg 100 g)",
    "Cuivre (mg 100 g)",
    "Fer (mg 100 g)",
    "Iode (µg 100 g)",
    "Magnésium (mg 100 g)",
    "Manganèse (mg 100 g)",
    "Phosphore (mg 100 g)",
    "Potassium (mg 100 g)",
    "Sélénium (µg 100 g)",
    "Sodium (mg 100 g)",
    "Zinc (mg 100 g)",
    "Activité vitaminique A, équivalents rétinol (µg 100 g)",
    "Vitamine B1 ou Thiamine (mg 100 g)",
    "Vitamine B2 ou Riboflavine (mg 100 g)",
    "Vitamine B3 ou PP ou Niacine (mg 100 g)",
    "Vitamine B5 ou Acide pantothénique (mg 100 g)",
    "Vitamine B6 (mg 100 g)",
    "Vitamine B9 ou Folates totaux, équivalents folates alimentaires, DFE (µg 100 g)",
    "Vitamine B12 (µg 100 g)",
    "Vitamine C (mg 100 g)",
    "Vitamine D (µg 100 g)",
    "Alpha-tocophérol (vitamine E) (mg 100 g)",
    "Vitamine K1 (µg 100 g)",
    "Vitamine K2 (µg 100 g)"
]
df = df[cols]
new_cols = [
    "alim_nom_fr",
    "eau_g_100g",
    "energie_kcal_100g",
    "proteines_g_100g",
    "lipides_g_100g",
    "sucres_g_100g",
    "fibres_g_100g",
    "cholesterol_mg_100g",
    "Calcium (mg 100 g)",
    "Chlorure (mg 100 g)",
    "Cuivre (mg 100 g)",
    "Fer (mg 100 g)",
    "Iode (µg 100 g)",
    "Magnésium (mg 100 g)",
    "Manganèse (mg 100 g)",
    "Phosphore (mg 100 g)",
    "Potassium (mg 100 g)",
    "Sélénium (µg 100 g)",
    "Sodium (mg 100 g)",
    "Zinc (mg 100 g)",
    "Vitamine A (µg 100 g)",
    "Vitamine B1 (mg 100 g)",
    "Vitamine B2 (mg 100 g)",
    "Vitamine B3 (mg 100 g)",
    "Vitamine B5 (mg 100 g)",
    "Vitamine B6 (mg 100 g)",
    "Vitamine B9 (µg 100 g)",
    "Vitamine B12 (µg 100 g)",
    "Vitamine C (mg 100 g)",
    "Vitamine D (µg 100 g)",
    "vitamine E (mg 100 g)",
    "Vitamine K1 (µg 100 g)",
    "Vitamine K2 (µg 100 g)"
]
new_cols = list(map(lambda s : 
    s if "(" not in s else 
    s.lower()
    .replace("(", "")
    .replace(")", "")
    .replace("100 g", "100g")
    .replace(" ", "_"),
    new_cols
))
df.columns = new_cols
df.to_csv("data/out_csv/aliments_vitmin.csv", index=False)