from flask import Flask, render_template, jsonify
import pandas as pd
import os
from pathlib import Path

app = Flask(__name__)

VITMIN_CSV_PATH = Path(os.path.dirname(__file__), "data", 'aliments_vitmin_pp.csv')
RECO_CSV_PATH = Path(os.path.dirname(__file__), "data", 'aliments_reco.csv')

MACROS = [
    ("eau_g_100g", "Eau", "g"),
    ("energie_kcal_100g", "Énergie", "kcal"),
    ("proteines_g_100g", "Protéines", "g"),
    ("lipides_g_100g", "Lipides", "g"),
    ("sucres_g_100g", "Sucres", "g"),
    ("fibres_g_100g", "Fibres", "g"),
    ("cholesterol_mg_100g", "Cholestérol", "mg"),
    ("calcium_mg_100g", "Calcium", "mg"),
    ("chlorure_mg_100g", "Chlorure", "mg"),
    ("cuivre_mg_100g", "Cuivre", "mg"),
    ("fer_mg_100g", "Fer", "mg"),
    ("iode_µg_100g", "Iode", "µg"),
    ("magnésium_mg_100g", "Magnésium", "mg"),
    ("manganèse_mg_100g", "Manganèse", "mg"),
    ("phosphore_mg_100g", "Phosphore", "mg"),
    ("potassium_mg_100g", "Potassium", "mg"),
    ("sélénium_µg_100g", "Sélénium", "µg"),
    ("sodium_mg_100g", "Sodium", "mg"),
    ("zinc_mg_100g", "Zinc", "mg"),
    ("vitamine_a_µg_100g", "Vitamine A", "µg"),
    ("vitamine_b1_mg_100g", "Vitamine B1", "mg"),
    ("vitamine_b2_mg_100g", "Vitamine B2", "mg"),
    ("vitamine_b3_mg_100g", "Vitamine B3", "mg"),
    ("vitamine_b5_mg_100g", "Vitamine B5", "mg"),
    ("vitamine_b6_mg_100g", "Vitamine B6", "mg"),
    ("vitamine_b9_µg_100g", "Vitamine B9", "µg"),
    ("vitamine_b12_µg_100g", "Vitamine B12", "µg"),
    ("vitamine_c_mg_100g", "Vitamine C", "mg"),
    ("vitamine_d_µg_100g", "Vitamine D", "µg"),
    ("vitamine_e_mg_100g", "Vitamine E", "mg"),
    ("vitamine_k1_µg_100g", "Vitamine K1", "µg"),
    ("vitamine_k2_µg_100g", "Vitamine K2", "µg"),
]

def load_data():
    df_vitmin = pd.read_csv(VITMIN_CSV_PATH)
    df_vitmin = df_vitmin.fillna(0)
    df_reco = pd.read_csv(RECO_CSV_PATH)
    df_reco = df_reco.fillna(0)
    return df_vitmin, df_reco

@app.route('/')
def index():
    df_vitmin, df_reco = load_data()
    aliments = sorted(df_vitmin['alim_nom_fr'].tolist())
    macros = MACROS
    recos = list(df_reco.itertuples(index=False, name=None))
    return render_template('index.html', aliments=aliments, macros=macros, recos=recos)

@app.route('/api/aliment/<nom>')
def get_aliment(nom):
    df = load_data()
    row = df[df['alim_nom_fr'] == nom]
    if row.empty:
        return jsonify({'error': 'Aliment non trouvé'}), 404
    data = row.iloc[0].to_dict()
    return jsonify(data)

@app.route('/api/aliments')
def get_all_aliments():
    df_vitmin, _ = load_data()
    result = {}
    for _, row in df_vitmin.iterrows():
        result[row['alim_nom_fr']] = row.to_dict()
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
