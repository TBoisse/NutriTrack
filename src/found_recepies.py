import pandas as pd
import numpy as np

CONFIG = {
    "macro_priority": [
        "energie_kcal_100g",
        "proteines_g_100g",
        "lipides_g_100g",
        "sucres_g_100g",
        "fibres_g_100g",
        "sodium_mg_100g",
    ],
    "enforce_order": True
}

def build_macro_matrix(
    df: pd.DataFrame,
    ingredients: list[str],
    macro_names: list[str]
):
    sub = (
        df[df["alim_nom_fr"].isin(ingredients)]
        .set_index("alim_nom_fr")
        .loc[ingredients]
    )
    matrix = []
    for macro in macro_names:
        matrix.append(
            sub[macro].values / 100.0
        )
    return np.array(matrix)

from scipy.optimize import minimize


def solve_recipe(
    nutrition_df,
    ingredients,
    target_macros,
    fixed_quantities=None,
    macro_priority=None,
    enforce_order=True
):
    """
    ingredients:
        ["Farine", "Lait", "Oeuf"]

    target_macros:
        {
            "energie_kcal_100g": 250,
            "proteines_g_100g": 12,
            "lipides_g_100g": 6
        }

    fixed_quantities:
        {
            "Sel": 2,
            "Farine": 60
        }
    """

    fixed_quantities = fixed_quantities or {}

    n = len(ingredients)

    # Macros utilisées
    available_macros = [
        m for m in macro_priority
        if m in target_macros
    ]

    nb_equations = min(
        len(available_macros),
        n
    )

    used_macros = available_macros[:nb_equations]

    A = build_macro_matrix(
        nutrition_df,
        ingredients,
        used_macros
    )

    b = np.array([
        target_macros[m]
        for m in used_macros
    ])

    fixed_idx = {}
    fixed_values = {}

    for i, ingredient in enumerate(ingredients):
        if ingredient in fixed_quantities:
            fixed_idx[i] = ingredient
            fixed_values[i] = fixed_quantities[ingredient]

    free_indices = [
        i for i in range(n)
        if i not in fixed_values
    ]

    A_free = A[:, free_indices]

    if fixed_values:

        contribution = np.zeros(len(used_macros))

        for idx, qty in fixed_values.items():
            contribution += A[:, idx] * qty

        b = b - contribution

    def objective(x_free):

        full = np.zeros(n)

        for idx, value in fixed_values.items():
            full[idx] = value

        for pos, idx in enumerate(free_indices):
            full[idx] = x_free[pos]

        residual = A @ full - np.array([
            target_macros[m]
            for m in used_macros
        ])

        return np.sum(residual ** 2)

    constraints = []

    # somme = 100g

    def total_weight(x_free):

        total = sum(fixed_values.values())

        total += np.sum(x_free)

        return total - 100

    constraints.append({
        "type": "eq",
        "fun": total_weight
    })

    # ordre décroissant

    if enforce_order:

        for i in range(n - 1):

            def make_constraint(i):

                def c(x_free):

                    full = np.zeros(n)

                    for idx, value in fixed_values.items():
                        full[idx] = value

                    for pos, idx in enumerate(free_indices):
                        full[idx] = x_free[pos]

                    return full[i] - full[i + 1]

                return c

            constraints.append({
                "type": "ineq",
                "fun": make_constraint(i)
            })

    bounds = [
        (0, 100)
        for _ in free_indices
    ]

    remaining = (
        100
        - sum(fixed_values.values())
    )

    x0 = np.full(
        len(free_indices),
        remaining / len(free_indices)
    )

    result = minimize(
        objective,
        x0,
        method="SLSQP",
        bounds=bounds,
        constraints=constraints
    )

    if not result.success:
        raise RuntimeError(result.message)

    quantities = np.zeros(n)

    for idx, value in fixed_values.items():
        quantities[idx] = value

    for pos, idx in enumerate(free_indices):
        quantities[idx] = result.x[pos]

    return pd.DataFrame({
        "ingredient": ingredients,
        "grams_per_100g": quantities
    })

df = pd.read_csv("aliments_vitmin_pp.csv")

ingredients = [
    "Farine de blé tendre ou froment T55 (pour pains)",
    "Eau",
    "Huile de colza",
    "Sel",
]

target_macros = {
    "energie_kcal_100g": 304,
    "proteines_g_100g": 11.3,
    "lipides_g_100g": 8.3,
    "sucres_g_100g": 45
}

fixed = {
    "Farine de blé tendre ou froment T55 (pour pains)": 60
}

result = solve_recipe(
    nutrition_df=df,
    ingredients=ingredients,
    target_macros=target_macros,
    fixed_quantities=fixed,
    macro_priority=CONFIG["macro_priority"],
    enforce_order=True
)

print(result)