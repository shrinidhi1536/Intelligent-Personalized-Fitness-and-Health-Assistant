import sys
import numpy as np
from scipy.optimize import lsq_linear
from datetime import date
sys.path.append('.')
from backend.db import fetch_all

def test_planner_for_profile(user_id=2):
    profiles = fetch_all("SELECT * FROM profiles WHERE user_id = %s", (user_id,))
    if not profiles:
        print(f"No profile for user {user_id}")
        return
    profile = profiles[0]
    
    cal_goal = float(profile.get("calorie_goal", 2000))
    prot_goal = float(profile.get("protein_goal_g", 120))
    carbs_goal = float(profile.get("carbs_goal_g", 250))
    fat_goal = float(profile.get("fat_goal_g", 65))
    diet = profile.get("diet_preference", "Vegetarian")
    cuisine = (profile.get("cuisine_preference") or "South Indian").lower()
    allergies = profile.get("allergies", "")
    dislikes = profile.get("disliked_foods", "")

    print(f"============================================================")
    print(f"TESTING NUTRITION PLANNER FOR USER {user_id}")
    print(f"Diet: {diet} | Cuisine: {cuisine}")
    print(f"TARGETS -> Calories: {cal_goal} kcal | P: {prot_goal}g | C: {carbs_goal}g | F: {fat_goal}g")
    print(f"============================================================")

    all_foods = fetch_all("SELECT * FROM food_database ORDER BY id ASC")
    
    # Filter foods by diet
    diet_lower = diet.lower().strip()
    allergy_tokens = [a.strip().lower() for a in (allergies or "").split(",") if a.strip() and a.strip().lower() != "none"]
    dislike_tokens = [d.strip().lower() for d in (dislikes or "").split(",") if d.strip() and d.strip().lower() != "none"]

    eligible = []
    for f in all_foods:
        name = f["name"].lower()
        cat = (f.get("category") or "").lower()
        if any(token in name or token in cat for token in allergy_tokens):
            continue
        if any(token in name or token in cat for token in dislike_tokens):
            continue
        if diet_lower == "vegan":
            if any(k in name or k in cat for k in ["egg", "chicken", "meat", "fish", "paneer", "dahi", "curd", "ghee", "yogurt", "milk"]):
                continue
        elif diet_lower == "vegetarian":
            if any(k in name or k in cat for k in ["egg", "chicken", "meat", "fish", "seafood", "prawn"]):
                continue
        elif diet_lower == "eggetarian":
            if any(k in name or k in cat for k in ["chicken", "meat", "fish", "seafood", "prawn"]):
                continue
        eligible.append(f)

    # Classify eligible foods by nutritional role
    # Role A: Protein Anchors (high protein density: P >= 8g per serving)
    # Role B: Carb Staples (high carb density: C >= 15g per serving)
    # Role C: Healthy Fats / Nutrient Sides (nuts, seeds, dairy, veggies, sides)
    
    protein_anchors = [f for f in eligible if float(f["protein_g"]) >= 8.0]
    carb_staples = [f for f in eligible if float(f["carbs_g"]) >= 15.0 and f["id"] not in [p["id"] for p in protein_anchors if float(p["protein_g"]) >= 18.0]]
    fat_sides = [f for f in eligible if (float(f["fat_g"]) >= 4.0 or "vegetable" in (f.get("category") or "").lower() or "fruit" in (f.get("category") or "").lower())]

    print(f"Pool sizes: Protein Anchors={len(protein_anchors)}, Carb Staples={len(carb_staples)}, Fat/Sides={len(fat_sides)}")

    MEAL_CONFIGS = [
        ("Breakfast", 0.25, ["south indian", "grains", "eggs & poultry", "fruits"]),
        ("Lunch", 0.35, ["south indian", "north indian", "grains", "vegetables", "dairy"]),
        ("Dinner", 0.25, ["vegetarian protein", "vegan protein", "eggs & poultry", "seafood", "vegetables", "north indian"]),
        ("Snacks", 0.15, ["healthy snacks", "fruits", "nuts & seeds", "healthy beverages"]),
    ]

    used_ids = set()
    today = date.today()
    day_seed = today.toordinal() + user_id

    total_plan = []

    for meal_name, split, preferred_cats in MEAL_CONFIGS:
        t_cal = cal_goal * split
        t_p = prot_goal * split
        t_c = carbs_goal * split
        t_f = fat_goal * split
        b = np.array([t_p, t_c, t_f])

        # Pick 3 items for main meals, 2 for snacks:
        # Item 1: Protein Anchor
        # Item 2: Carb Staple
        # Item 3: Side / Fat / Veggie
        
        p_cands = [f for f in protein_anchors if f["id"] not in used_ids]
        if not p_cands: p_cands = protein_anchors
        # Prefer matching categories
        p_cands.sort(key=lambda f: 0 if any(c in (f.get("category") or "").lower() for c in preferred_cats) else 1)
        p_idx = (day_seed + len(total_plan) * 3) % len(p_cands)
        item1 = p_cands[p_idx]
        used_ids.add(item1["id"])

        c_cands = [f for f in carb_staples if f["id"] not in used_ids]
        if not c_cands: c_cands = carb_staples
        c_cands.sort(key=lambda f: 0 if any(c in (f.get("category") or "").lower() for c in preferred_cats) else 1)
        c_idx = (day_seed + len(total_plan) * 5) % len(c_cands)
        item2 = c_cands[c_idx]
        used_ids.add(item2["id"])

        if meal_name != "Snacks":
            f_cands = [f for f in fat_sides if f["id"] not in used_ids]
            if not f_cands: f_cands = fat_sides
            f_cands.sort(key=lambda f: 0 if any(c in (f.get("category") or "").lower() for c in preferred_cats) else 1)
            f_idx = (day_seed + len(total_plan) * 7) % len(f_cands)
            item3 = f_cands[f_idx]
            used_ids.add(item3["id"])
            meal_items = [item1, item2, item3]
        else:
            meal_items = [item1, item2]

        # Solve for portions x:
        A = np.array([
            [float(it["protein_g"]) for it in meal_items],
            [float(it["carbs_g"]) for it in meal_items],
            [float(it["fat_g"]) for it in meal_items]
        ])

        # Bounds: sensible portions (0.5x to 2.5x base serving)
        res = lsq_linear(A, b, bounds=(0.5, 2.5))
        scales = res.x

        print(f"\n--- {meal_name} (Target: {t_cal:.1f} kcal | P:{t_p:.1f}g C:{t_c:.1f}g F:{t_f:.1f}g) ---")
        for it, sc in zip(meal_items, scales):
            c_val = round(float(it["calories"]) * sc, 1)
            p_val = round(float(it["protein_g"]) * sc, 1)
            c_carb = round(float(it["carbs_g"]) * sc, 1)
            f_val = round(float(it["fat_g"]) * sc, 1)
            total_plan.append({
                "meal": meal_name,
                "name": it["name"],
                "scale": sc,
                "calories": c_val,
                "protein_g": p_val,
                "carbs_g": c_carb,
                "fat_g": f_val
            })
            print(f"  {it['name']:30s} (x{sc:.2f}) -> {c_val:5.1f} kcal | P:{p_val:4.1f}g | C:{c_carb:4.1f}g | F:{f_val:4.1f}g")

    tot_cal = sum(x["calories"] for x in total_plan)
    tot_p = sum(x["protein_g"] for x in total_plan)
    tot_c = sum(x["carbs_g"] for x in total_plan)
    tot_f = sum(x["fat_g"] for x in total_plan)

    print("\n============================================================")
    print("DAY TOTALS SUMMARY:")
    print(f"CALORIES: Planned {tot_cal:6.1f} / Target {cal_goal:6.1f} ({tot_cal/cal_goal*100:.1f}%)")
    print(f"PROTEIN:  Planned {tot_p:6.1f}g / Target {prot_goal:6.1f}g ({tot_p/prot_goal*100:.1f}%)")
    print(f"CARBS:    Planned {tot_c:6.1f}g / Target {carbs_goal:6.1f}g ({tot_c/carbs_goal*100:.1f}%)")
    print(f"FAT:      Planned {tot_f:6.1f}g / Target {fat_goal:6.1f}g ({tot_f/fat_goal*100:.1f}%)")
    print("============================================================")

test_planner_for_profile(2)
test_planner_for_profile(1)
test_planner_for_profile(3)
test_planner_for_profile(4)
