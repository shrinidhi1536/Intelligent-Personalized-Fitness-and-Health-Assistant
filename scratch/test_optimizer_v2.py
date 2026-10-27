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

def filter_foods(foods: list, diet_pref: str, allergies: str = "", dislikes: str = "") -> list:
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

def optimize_user_diet(user_id: int):
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
    eligible = filter_foods(all_foods, diet, allergies, dislikes)

    # Segregate foods by nutritional roles:
    # 1. Protein Anchors: high protein density (P >= 10g or P/cal >= 0.05)
    # 2. Carb Staples: C >= 15g
    # 3. Healthy Fats: F >= 6g or "nut" / "seed" in cat/name
    # 4. Veggies / Fruits / Sides: low cal, micronutrient rich
    protein_anchors = [f for f in eligible if float(f["protein_g"]) >= 10.0 or (float(f["protein_g"]) >= 6.0 and float(f["protein_g"]) / max(float(f["calories"]), 1) > 0.06)]
    carb_staples = [f for f in eligible if float(f["carbs_g"]) >= 15.0]
    fat_sides = [f for f in eligible if float(f["fat_g"]) >= 6.0 or any(k in f["name"].lower() or k in (f.get("category") or "").lower() for k in ["nut", "seed", "almond", "walnut", "peanut", "chia", "olive"])]
    veggie_fruit_sides = [f for f in eligible if any(k in (f.get("category") or "").lower() for k in ["vegetable", "fruit", "salad", "beverage", "dairy"])]

    # Fallbacks if list is too small
    if not protein_anchors:
        protein_anchors = sorted(eligible, key=lambda x: float(x["protein_g"]), reverse=True)[:10]
    if not carb_staples:
        carb_staples = sorted(eligible, key=lambda x: float(x["carbs_g"]), reverse=True)[:10]
    if not fat_sides:
        fat_sides = sorted(eligible, key=lambda x: float(x["fat_g"]), reverse=True)[:10]
    if not veggie_fruit_sides:
        veggie_fruit_sides = eligible[:10]

    # Deterministic rotation based on date + user_id
    today = date.today()
    seed = today.toordinal() + user_id

    # Filter by cuisine preference if available
    def prioritize_cuisine(items, pref_keywords):
        return sorted(items, key=lambda x: 0 if any(k in (x.get("category") or "").lower() or k in x["name"].lower() for k in pref_keywords) else 1)

    pref_kw = ["south"] if "south" in cuisine else (["north"] if "north" in cuisine else [])

    # Select distinct items
    used_ids = set()

    def pick_next(pool, offset=0):
        # Sort pool with preferred cuisine first, but preserve variety
        sorted_pool = prioritize_cuisine(pool, pref_kw) if pref_kw else pool
        for i in range(len(sorted_pool)):
            cand = sorted_pool[(seed + offset + i) % len(sorted_pool)]
            if cand["id"] not in used_ids:
                used_ids.add(cand["id"])
                return cand
        return sorted_pool[0]

    # Breakfast: 1 Protein Anchor, 1 Carb Staple, 1 Fruit/Beverage
    bf_p = pick_next(protein_anchors, 0)
    bf_c = pick_next(carb_staples, 2)
    bf_s = pick_next([f for f in veggie_fruit_sides if "fruit" in (f.get("category") or "").lower() or "beverage" in (f.get("category") or "").lower()] or veggie_fruit_sides, 4)

    # Lunch: 1 Protein Anchor, 1 Carb Staple, 1 Veggie/Curry/Dairy side
    lu_p = pick_next(protein_anchors, 6)
    lu_c = pick_next(carb_staples, 8)
    lu_s = pick_next([f for f in veggie_fruit_sides if "vegetable" in (f.get("category") or "").lower() or "dairy" in (f.get("category") or "").lower()] or veggie_fruit_sides, 10)

    # Dinner: 1 Protein Anchor, 1 Carb Staple, 1 Veggie/Salad side
    di_p = pick_next(protein_anchors, 12)
    di_c = pick_next(carb_staples, 14)
    di_s = pick_next([f for f in veggie_fruit_sides if "vegetable" in (f.get("category") or "").lower() or "salad" in (f.get("category") or "").lower()] or veggie_fruit_sides, 16)

    # Snacks: 1 Healthy Fat / Nut, 1 Light Snack / Fruit
    sn_f = pick_next(fat_sides, 18)
    sn_l = pick_next([f for f in eligible if "snack" in (f.get("category") or "").lower() or "fruit" in (f.get("category") or "").lower()] or veggie_fruit_sides, 20)

    meal_groups = {
        "Breakfast": [bf_p, bf_c, bf_s],
        "Lunch": [lu_p, lu_c, lu_s],
        "Dinner": [di_p, di_c, di_s],
        "Snacks": [sn_f, sn_l]
    }

    all_selected = [bf_p, bf_c, bf_s, lu_p, lu_c, lu_s, di_p, di_c, di_s, sn_f, sn_l]
    N = len(all_selected)

    # Global optimization with lsq_linear:
    # 8 Constraints:
    # 0: Protein goal
    # 1: Carbs goal
    # 2: Fat goal
    # 3: Calorie goal
    # 4-7: Meal calorie distribution (25%, 35%, 25%, 15%)
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

    # Meal splits
    # Breakfast (0, 1, 2)
    A[4, 0:3] = np.array([float(f["calories"]) for f in all_selected[0:3]]) * w_meal
    b[4] = cal_goal * 0.25 * w_meal

    # Lunch (3, 4, 5)
    A[5, 3:6] = np.array([float(f["calories"]) for f in all_selected[3:6]]) * w_meal
    b[5] = cal_goal * 0.35 * w_meal

    # Dinner (6, 7, 8)
    A[6, 6:9] = np.array([float(f["calories"]) for f in all_selected[6:9]]) * w_meal
    b[6] = cal_goal * 0.25 * w_meal

    # Snacks (9, 10)
    A[7, 9:11] = np.array([float(f["calories"]) for f in all_selected[9:11]]) * w_meal
    b[7] = cal_goal * 0.15 * w_meal

    # Bounds: 0.4x to 2.5x base serving
    res = lsq_linear(A, b, bounds=(0.4, 2.5))
    scales = np.copy(res.x)

    # Fine-tuning: Exact 3x3 solve on macro anchors to zero out any residual macro deficit
    cur_p = sum(scales[i] * float(all_selected[i]["protein_g"]) for i in range(N))
    cur_c = sum(scales[i] * float(all_selected[i]["carbs_g"]) for i in range(N))
    cur_f = sum(scales[i] * float(all_selected[i]["fat_g"]) for i in range(N))

    dP = prot_goal - cur_p
    dC = carbs_goal - cur_c
    dF = fat_goal - cur_f

    # Pick top pure-protein anchor, top pure-carb anchor, top pure-fat anchor
    idx_p = max(range(N), key=lambda i: float(all_selected[i]["protein_g"]) / max(float(all_selected[i]["calories"]), 1))
    idx_c = max(range(N), key=lambda i: float(all_selected[i]["carbs_g"]) / max(float(all_selected[i]["calories"]), 1))
    idx_f = max(range(N), key=lambda i: float(all_selected[i]["fat_g"]) / max(float(all_selected[i]["calories"]), 1))

    if len({idx_p, idx_c, idx_f}) == 3:
        M = np.array([
            [float(all_selected[idx_p]["protein_g"]), float(all_selected[idx_c]["protein_g"]), float(all_selected[idx_f]["protein_g"])],
            [float(all_selected[idx_p]["carbs_g"]), float(all_selected[idx_c]["carbs_g"]), float(all_selected[idx_f]["carbs_g"])],
            [float(all_selected[idx_p]["fat_g"]), float(all_selected[idx_c]["fat_g"]), float(all_selected[idx_f]["fat_g"])]
        ])
        try:
            delta_x = np.linalg.solve(M, np.array([dP, dC, dF]))
            # Apply fine adjustment within realistic bounds
            scales[idx_p] = max(0.2, scales[idx_p] + delta_x[0])
            scales[idx_c] = max(0.2, scales[idx_c] + delta_x[1])
            scales[idx_f] = max(0.2, scales[idx_f] + delta_x[2])
        except Exception as e:
            pass

    final_p = sum(round(scales[i] * float(all_selected[i]["protein_g"]), 1) for i in range(N))
    final_c = sum(round(scales[i] * float(all_selected[i]["carbs_g"]), 1) for i in range(N))
    final_f = sum(round(scales[i] * float(all_selected[i]["fat_g"]), 1) for i in range(N))
    final_cal = sum(round(scales[i] * float(all_selected[i]["calories"]), 1) for i in range(N))

    print(f"User {user_id} ({profile.get('name')}, Diet={diet}):")
    cur_p = sum(round(res.x[i] * float(all_selected[i]["protein_g"]), 1) for i in range(N))
    cur_c = sum(round(res.x[i] * float(all_selected[i]["carbs_g"]), 1) for i in range(N))
    cur_f = sum(round(res.x[i] * float(all_selected[i]["fat_g"]), 1) for i in range(N))
    cur_cal = sum(round(res.x[i] * float(all_selected[i]["calories"]), 1) for i in range(N))
    print(f"  BEFORE 3x3: Cal={cur_cal:.1f} | P={cur_p:.1f}g | C={cur_c:.1f}g | F={cur_f:.1f}g")

    if len({idx_p, idx_c, idx_f}) == 3:
        M = np.array([
            [float(all_selected[idx_p]["protein_g"]), float(all_selected[idx_c]["protein_g"]), float(all_selected[idx_f]["protein_g"])],
            [float(all_selected[idx_p]["carbs_g"]), float(all_selected[idx_c]["carbs_g"]), float(all_selected[idx_f]["carbs_g"])],
            [float(all_selected[idx_p]["fat_g"]), float(all_selected[idx_c]["fat_g"]), float(all_selected[idx_f]["fat_g"])]
        ])
        print(f"  Anchors: P={all_selected[idx_p]['name']}, C={all_selected[idx_c]['name']}, F={all_selected[idx_f]['name']}")
        print(f"  Residual: dP={dP:.1f}, dC={dC:.1f}, dF={dF:.1f}")
        try:
            delta_x = np.linalg.solve(M, np.array([dP, dC, dF]))
            print(f"  delta_x: {delta_x}")
            # Apply fine adjustment within realistic bounds
            scales[idx_p] = max(0.2, scales[idx_p] + delta_x[0])
            scales[idx_c] = max(0.2, scales[idx_c] + delta_x[1])
            scales[idx_f] = max(0.2, scales[idx_f] + delta_x[2])
        except Exception as e:
            print("Solve failed:", e)

    final_p = sum(round(scales[i] * float(all_selected[i]["protein_g"]), 1) for i in range(N))
    final_c = sum(round(scales[i] * float(all_selected[i]["carbs_g"]), 1) for i in range(N))
    final_f = sum(round(scales[i] * float(all_selected[i]["fat_g"]), 1) for i in range(N))
    final_cal = sum(round(scales[i] * float(all_selected[i]["calories"]), 1) for i in range(N))

    print(f"  TARGET:     Cal={cal_goal:.0f} | P={prot_goal:.0f}g | C={carbs_goal:.0f}g | F={fat_goal:.0f}g")
    print(f"  AFTER 3x3:  Cal={final_cal:.1f} | P={final_p:.1f}g | C={final_c:.1f}g | F={final_f:.1f}g")
    print(f"  DELTA:      dCal={round(final_cal - cal_goal, 1)} | dP={round(final_p - prot_goal, 1)}g | dC={round(final_c - carbs_goal, 1)}g | dF={round(final_f - fat_goal, 1)}g\n")

if __name__ == "__main__":
    for u in [1, 2, 3, 4]:
        optimize_user_diet(u)
