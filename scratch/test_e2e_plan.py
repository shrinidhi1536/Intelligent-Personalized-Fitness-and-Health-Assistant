import sys
sys.path.append('.')
import numpy as np
from scipy.optimize import lsq_linear
from datetime import date
from backend.db import fetch_all

NON_VEG_KEYWORDS = [
    "chicken", "meat", "fish", "seafood", "prawn", "salmon", "tuna", 
    "pomfret", "lamb", "mutton", "beef", "pork", "turkey"
]
DAIRY_KEYWORDS = [
    "paneer", "dahi", "curd", "ghee", "yogurt", "milk", "cheese", "butter", "whey", "casein"
]

def filter_foods_by_diet(foods: list, diet_pref: str, allergies: str, dislikes: str) -> list:
    diet = (diet_pref or "vegetarian").lower().strip()
    allergy_tokens = [a.strip().lower() for a in (allergies or "").split(",") if a.strip() and a.strip().lower() != "none"]
    dislike_tokens = [d.strip().lower() for d in (dislikes or "").split(",") if d.strip() and d.strip().lower() != "none"]

    filtered = []
    for f in foods:
        name = f["name"].lower()
        cat = (f.get("category") or "").lower()

        if any(tok in name or tok in cat for tok in allergy_tokens):
            continue
        if any(tok in name or tok in cat for tok in dislike_tokens):
            continue

        if diet == "vegan":
            if any(k in name or k in cat for k in NON_VEG_KEYWORDS + DAIRY_KEYWORDS + ["egg"]):
                continue
        elif diet == "vegetarian":
            if any(k in name or k in cat for k in NON_VEG_KEYWORDS + ["egg"]):
                continue
        elif diet == "eggetarian":
            if any(k in name or k in cat for k in NON_VEG_KEYWORDS):
                continue

        filtered.append(f)
    return filtered

def scale_serving_label(base_serving: str, scale: float) -> str:
    if abs(scale - 1.0) < 0.05:
        return base_serving
    import re
    m_pcs = re.search(r'(\d+)\s*pcs', base_serving, re.I)
    m_grams = re.search(r'(\d+)\s*g', base_serving, re.I)
    if m_pcs and m_grams:
        pcs = max(round(int(m_pcs.group(1)) * scale), 1)
        g = round(int(m_grams.group(1)) * scale)
        return f"{pcs} pcs (~{g}g)"
    elif m_grams:
        g = round(int(m_grams.group(1)) * scale)
        if "bowl" in base_serving.lower():
            b = round(scale, 1)
            return f"{b} bowl ({g}g)"
        elif "cup" in base_serving.lower():
            c = round(scale, 1)
            return f"{c} cup ({g}g)"
        return f"~{g}g portion"
    return f"{base_serving} (x{round(scale, 1)})"

def test_user_plan(user_id: int):
    profiles = fetch_all("SELECT * FROM profiles WHERE user_id = %s", (user_id,))
    if not profiles:
        return
    profile = profiles[0]

    cal_goal = float(profile.get("calorie_goal", 2000))
    prot_goal = float(profile.get("protein_goal_g", 120))
    carbs_goal = float(profile.get("carbs_goal_g", 250))
    fat_goal = float(profile.get("fat_goal_g", 65))
    diet = profile.get("diet_preference", "Vegetarian")
    allergies = profile.get("allergies", "")
    dislikes = profile.get("disliked_foods", "")
    cuisine = (profile.get("cuisine_preference") or "South Indian").lower()

    all_foods = fetch_all("SELECT * FROM food_database ORDER BY id ASC")
    eligible = filter_foods_by_diet(all_foods, diet, allergies, dislikes)

    protein_anchors = [f for f in eligible if (float(f["protein_g"]) >= 10.0 or (float(f["protein_g"]) >= 6.0 and float(f["protein_g"]) / max(float(f["calories"]), 1) > 0.055)) and not any(k in (f.get("category") or "").lower() for k in ["nuts", "seeds"])]
    carb_staples = [f for f in eligible if float(f["carbs_g"]) >= 15.0 and not any(k in (f.get("category") or "").lower() for k in ["nuts", "seeds"])]
    fat_sides = [f for f in eligible if any(k in f["name"].lower() or k in (f.get("category") or "").lower() for k in ["nut", "seed", "almond", "walnut", "peanut", "chia", "flax", "pumpkin seed"])] or [f for f in eligible if float(f["fat_g"]) >= 8.0]
    veggie_fruit_sides = [f for f in eligible if any(k in (f.get("category") or "").lower() for k in ["vegetable", "fruit", "salad", "beverage", "dairy"])]

    if not protein_anchors:
        protein_anchors = sorted(eligible, key=lambda x: float(x["protein_g"]), reverse=True)[:10]
    if not carb_staples:
        carb_staples = sorted(eligible, key=lambda x: float(x["carbs_g"]), reverse=True)[:10]
    if not fat_sides:
        fat_sides = sorted(eligible, key=lambda x: float(x["fat_g"]), reverse=True)[:10]
    if not veggie_fruit_sides:
        veggie_fruit_sides = eligible[:10]

    today = date.today()
    seed = today.toordinal() + user_id

    def prioritize_cuisine(items, pref_keywords):
        return sorted(items, key=lambda x: 0 if any(k in (x.get("category") or "").lower() or k in x["name"].lower() for k in pref_keywords) else 1)

    pref_kw = ["south"] if "south" in cuisine else (["north"] if "north" in cuisine else [])

    used_ids = set()

    def pick_next(pool, offset=0):
        sorted_pool = prioritize_cuisine(pool, pref_kw) if pref_kw else pool
        for i in range(len(sorted_pool)):
            cand = sorted_pool[(seed + offset + i) % len(sorted_pool)]
            if cand["id"] not in used_ids:
                used_ids.add(cand["id"])
                return cand
        return sorted_pool[0]

    bf_p = pick_next(protein_anchors, 0)
    bf_c = pick_next(carb_staples, 2)
    bf_s = pick_next([f for f in veggie_fruit_sides if "fruit" in (f.get("category") or "").lower() or "beverage" in (f.get("category") or "").lower()] or veggie_fruit_sides, 4)

    lu_p = pick_next(protein_anchors, 6)
    lu_c = pick_next(carb_staples, 8)
    lu_s = pick_next([f for f in veggie_fruit_sides if "vegetable" in (f.get("category") or "").lower() or "dairy" in (f.get("category") or "").lower()] or veggie_fruit_sides, 10)

    di_p = pick_next(protein_anchors, 12)
    di_c = pick_next(carb_staples, 14)
    di_s = pick_next([f for f in veggie_fruit_sides if "vegetable" in (f.get("category") or "").lower() or "salad" in (f.get("category") or "").lower()] or veggie_fruit_sides, 16)

    sn_f = pick_next(fat_sides, 18)
    sn_l = pick_next([f for f in eligible if "snack" in (f.get("category") or "").lower() or "fruit" in (f.get("category") or "").lower()] or veggie_fruit_sides, 20)

    meals = {
        "Breakfast": [bf_p, bf_c, bf_s],
        "Lunch": [lu_p, lu_c, lu_s],
        "Dinner": [di_p, di_c, di_s],
        "Snacks": [sn_f, sn_l]
    }

    all_selected = [bf_p, bf_c, bf_s, lu_p, lu_c, lu_s, di_p, di_c, di_s, sn_f, sn_l]
    N = len(all_selected)

    w_p, w_c, w_f, w_cal, w_meal = 8.0, 6.0, 8.0, 1.0, 0.4

    A = np.zeros((8, N))
    b = np.zeros(8)
    A[0, :] = np.array([float(f["protein_g"]) for f in all_selected]) * w_p
    b[0] = prot_goal * w_p

    A[1, :] = np.array([float(f["carbs_g"]) for f in all_selected]) * w_c
    b[1] = carbs_goal * w_c

    A[2, :] = np.array([float(f["fat_g"]) for f in all_selected]) * w_f
    b[2] = fat_goal * w_f

    A[3, :] = np.array([float(f["calories"]) for f in all_selected]) * w_cal
    b[3] = cal_goal * w_cal

    A[4, 0:3] = np.array([float(f["calories"]) for f in all_selected[0:3]]) * w_meal
    b[4] = cal_goal * 0.25 * w_meal

    A[5, 3:6] = np.array([float(f["calories"]) for f in all_selected[3:6]]) * w_meal
    b[5] = cal_goal * 0.35 * w_meal

    A[6, 6:9] = np.array([float(f["calories"]) for f in all_selected[6:9]]) * w_meal
    b[6] = cal_goal * 0.25 * w_meal

    A[7, 9:11] = np.array([float(f["calories"]) for f in all_selected[9:11]]) * w_meal
    b[7] = cal_goal * 0.15 * w_meal

    res = lsq_linear(A, b, bounds=(0.4, 2.5))
    scales = np.copy(res.x)

    # Initial scaled plan items
    plan_items = []
    idx = 0
    for meal_type, items in meals.items():
        for f in items:
            sc = scales[idx]
            idx += 1
            plan_items.append({
                "meal_type": meal_type,
                "food": f,
                "scale": sc,
                "calories": round(float(f["calories"]) * sc, 1),
                "protein_g": round(float(f["protein_g"]) * sc, 1),
                "carbs_g": round(float(f["carbs_g"]) * sc, 1),
                "fat_g": round(float(f["fat_g"]) * sc, 1)
            })

    # Fine-tuning:
    cur_p = sum(it["protein_g"] for it in plan_items)
    cur_c = sum(it["carbs_g"] for it in plan_items)
    cur_f = sum(it["fat_g"] for it in plan_items)

    dp = round(prot_goal - cur_p, 1)
    dc = round(carbs_goal - cur_c, 1)
    df = round(fat_goal - cur_f, 1)

    def absorb_discrepancy(items, key_macro, delta_val, cal_multiplier):
        if abs(delta_val) < 0.05:
            return
        if delta_val > 0:
            target = max(items, key=lambda it: float(it["food"][key_macro]) / max(float(it["food"]["calories"]), 1))
            target[key_macro] = round(target[key_macro] + delta_val, 1)
            target["calories"] = round(target["calories"] + delta_val * cal_multiplier, 1)
        else:
            rem = -delta_val
            candidates = sorted(items, key=lambda it: it[key_macro], reverse=True)
            for target in candidates:
                min_macro = round(float(target["food"][key_macro]) * 0.25, 1)
                avail = max(target[key_macro] - min_macro, 0.0)
                reduction = min(rem, avail)
                if reduction > 0:
                    target[key_macro] = round(target[key_macro] - reduction, 1)
                    target["calories"] = max(round(target["calories"] - reduction * cal_multiplier, 1), 10.0)
                    rem = round(rem - reduction, 1)
                    if rem <= 0.05:
                        break

    absorb_discrepancy(plan_items, "protein_g", dp, 4.0)
    absorb_discrepancy(plan_items, "carbs_g", dc, 4.0)
    absorb_discrepancy(plan_items, "fat_g", df, 9.0)

    cur_cal = sum(it["calories"] for it in plan_items)
    d_cal = round(cal_goal - cur_cal, 1)
    if abs(d_cal) > 0.05:
        largest_item = max(plan_items, key=lambda it: it["calories"])
        largest_item["calories"] = round(largest_item["calories"] + d_cal, 1)

    # Compute final serving labels
    for it in plan_items:
        eff_scale = it["calories"] / max(float(it["food"]["calories"]), 1.0)
        it["serving"] = scale_serving_label(it["food"]["serving"], eff_scale)

    final_cal = round(sum(it["calories"] for it in plan_items), 1)
    final_p = round(sum(it["protein_g"] for it in plan_items), 1)
    final_c = round(sum(it["carbs_g"] for it in plan_items), 1)
    final_f = round(sum(it["fat_g"] for it in plan_items), 1)

    print(f"=== User {user_id} ({diet}) ===")
    print(f"  TARGET: Cal={cal_goal:.0f} | P={prot_goal:.0f}g | C={carbs_goal:.0f}g | F={fat_goal:.0f}g")
    print(f"  FINAL:  Cal={final_cal:.1f} | P={final_p:.1f}g | C={final_c:.1f}g | F={final_f:.1f}g")
    print(f"  DELTA:  dCal={round(final_cal - cal_goal, 1)} | dP={round(final_p - prot_goal, 1)}g | dC={round(final_c - carbs_goal, 1)}g | dF={round(final_f - fat_goal, 1)}g")
    print("  MEALS:")
    for it in plan_items:
        print(f"    [{it['meal_type']:9s}] {it['food']['name']:25s} | {it['serving']:20s} | {it['calories']:5.1f} kcal | P:{it['protein_g']:4.1f}g | C:{it['carbs_g']:4.1f}g | F:{it['fat_g']:4.1f}g")
    print()

if __name__ == "__main__":
    for u in [2, 1, 3, 4]:
        test_user_plan(u)
