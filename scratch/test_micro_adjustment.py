import sys
import numpy as np
from scipy.optimize import lsq_linear

# Let's test micro-adjustment on a plan
def fine_tune_macros(items, target_cals, target_p, target_c, target_f):
    # items is a list of dicts with keys: name, serving, calories, protein_g, carbs_g, fat_g, scale
    cur_p = sum(it["protein_g"] for it in items)
    cur_c = sum(it["carbs_g"] for it in items)
    cur_f = sum(it["fat_g"] for it in items)
    cur_cal = sum(it["calories"] for it in items)

    dp = target_p - cur_p
    dc = target_c - cur_c
    df = target_f - cur_f

    # Find the best item to absorb dp (item with highest protein density)
    best_p = max(items, key=lambda it: it["protein_g"] / max(it["calories"], 1))
    # Find best item to absorb dc (item with highest carb density)
    best_c = max(items, key=lambda it: it["carbs_g"] / max(it["calories"], 1))
    # Find best item to absorb df (item with highest fat density)
    best_f = max(items, key=lambda it: it["fat_g"] / max(it["calories"], 1))

    # Apply adjustments directly
    best_p["protein_g"] = round(best_p["protein_g"] + dp, 1)
    best_p["calories"] = round(best_p["calories"] + dp * 4, 1)

    best_c["carbs_g"] = round(best_c["carbs_g"] + dc, 1)
    best_c["calories"] = round(best_c["calories"] + dc * 4, 1)

    best_f["fat_g"] = round(best_f["fat_g"] + df, 1)
    best_f["calories"] = round(best_f["calories"] + df * 9, 1)

    final_p = round(sum(it["protein_g"] for it in items), 1)
    final_c = round(sum(it["carbs_g"] for it in items), 1)
    final_f = round(sum(it["fat_g"] for it in items), 1)
    final_cal = round(sum(it["calories"] for it in items), 1)

    print(f"TARGET: P={target_p}g, C={target_c}g, F={target_f}g, Cal={target_cals}")
    print(f"FINAL:  P={final_p}g, C={final_c}g, F={final_f}g, Cal={final_cal}")
    print(f"DIFF:   dP={round(final_p - target_p, 1)}g, dC={round(final_c - target_c, 1)}g, dF={round(final_f - target_f, 1)}g, dCal={round(final_cal - target_cals, 1)}")

test_items = [
    {"name": "Paneer", "calories": 209.0, "protein_g": 14.2, "carbs_g": 2.8, "fat_g": 15.8},
    {"name": "Rice", "calories": 342.3, "protein_g": 12.5, "carbs_g": 60.7, "fat_g": 5.6},
    {"name": "Almonds", "calories": 162.8, "protein_g": 13.9, "carbs_g": 0.9, "fat_g": 11.0}
]
fine_tune_macros(test_items, 720, 45, 65, 32)
