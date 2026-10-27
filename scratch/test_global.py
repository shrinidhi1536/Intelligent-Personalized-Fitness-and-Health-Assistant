import sys
import numpy as np
from scipy.optimize import lsq_linear, minimize
from datetime import date
sys.path.append('.')
from backend.db import fetch_all

def test_global_planner(user_id=2):
    profiles = fetch_all("SELECT * FROM profiles WHERE user_id = %s", (user_id,))
    profile = profiles[0]
    
    cal_goal = float(profile.get("calorie_goal", 2000))
    prot_goal = float(profile.get("protein_goal_g", 120))
    carbs_goal = float(profile.get("carbs_goal_g", 250))
    fat_goal = float(profile.get("fat_goal_g", 65))
    diet = profile.get("diet_preference", "Vegetarian")
    cuisine = (profile.get("cuisine_preference") or "South Indian").lower()

    all_foods = fetch_all("SELECT * FROM food_database ORDER BY id ASC")
    diet_lower = diet.lower().strip()
    
    eligible = []
    for f in all_foods:
        name = f["name"].lower()
        cat = (f.get("category") or "").lower()
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

    # Sort high protein foods
    protein_foods = [f for f in eligible if float(f["protein_g"]) >= 10.0]
    carb_foods = [f for f in eligible if float(f["carbs_g"]) >= 18.0]
    fat_foods = [f for f in eligible if float(f["fat_g"]) >= 5.0 or "nut" in (f.get("category") or "").lower()]
    fruit_veggie = [f for f in eligible if "fruit" in (f.get("category") or "").lower() or "vegetable" in (f.get("category") or "").lower()]

    # Pick balanced items for each meal
    today = date.today()
    seed = today.toordinal() + user_id

    # 1. Breakfast: 1 Protein, 1 Carb, 1 Fruit/Side
    p_b = protein_foods[seed % len(protein_foods)]
    c_b = carb_foods[(seed + 2) % len(carb_foods)]
    s_b = fruit_veggie[(seed + 4) % len(fruit_veggie)] if fruit_veggie else carb_foods[0]

    # 2. Lunch: 1 Protein, 1 Carb, 1 Veggie/Side
    p_l = [f for f in protein_foods if f["id"] != p_b["id"]][(seed + 1) % (len(protein_foods)-1)]
    c_l = [f for f in carb_foods if f["id"] != c_b["id"]][(seed + 3) % (len(carb_foods)-1)]
    s_l = [f for f in eligible if "dairy" in (f.get("category") or "").lower() or "vegetable" in (f.get("category") or "").lower()][(seed + 5) % 10]

    # 3. Dinner: 1 Protein, 1 Carb, 1 Veggie
    p_d = [f for f in protein_foods if f["id"] not in [p_b["id"], p_l["id"]]][(seed + 2) % (len(protein_foods)-2)]
    c_d = [f for f in carb_foods if f["id"] not in [c_b["id"], c_l["id"]]][(seed + 4) % (len(carb_foods)-2)]
    s_d = fruit_veggie[(seed + 6) % len(fruit_veggie)] if fruit_veggie else fat_foods[0]

    # 4. Snacks: 1 Healthy Fat / Nut, 1 Healthy Snack / Fruit
    snk1 = fat_foods[seed % len(fat_foods)]
    snk2 = [f for f in eligible if "snack" in (f.get("category") or "").lower() or "fruit" in (f.get("category") or "").lower()][(seed + 1) % 10]

    meals_items = {
        "Breakfast": [p_b, c_b, s_b],
        "Lunch": [p_l, c_l, s_l],
        "Dinner": [p_d, c_d, s_d],
        "Snacks": [snk1, snk2]
    }

    all_selected = [p_b, c_b, s_b, p_l, c_l, s_l, p_d, c_d, s_d, snk1, snk2]
    N = len(all_selected)

    # Let's formulate objective:
    # 1. Match Total Calories: sum(x_i * cal_i) = cal_goal
    # 2. Match Total Protein: sum(x_i * p_i) = prot_goal
    # 3. Match Total Carbs: sum(x_i * c_i) = carbs_goal
    # 4. Match Total Fat: sum(x_i * f_i) = fat_goal
    # 5. Meal Calorie Distribution:
    #    Breakfast cals ~= 0.25 * cal_goal
    #    Lunch cals ~= 0.35 * cal_goal
    #    Dinner cals ~= 0.25 * cal_goal
    #    Snacks cals ~= 0.15 * cal_goal

    # Matrix rows:
    # row 0: Protein (weight 3.0)
    # row 1: Carbs (weight 2.0)
    # row 2: Fat (weight 3.0)
    # row 3: Total Cals (weight 1.0)
    # row 4: Breakfast Cals (weight 0.8)
    # row 5: Lunch Cals (weight 0.8)
    # row 6: Dinner Cals (weight 0.8)
    # row 7: Snacks Cals (weight 0.8)

    w_p, w_c, w_f, w_cal, w_meal = 4.0, 3.0, 4.0, 0.5, 0.3

    A = np.zeros((8, N))
    b = np.zeros(8)

    # Row 0: Protein
    A[0, :] = np.array([float(f["protein_g"]) for f in all_selected]) * w_p
    b[0] = prot_goal * w_p

    # Row 1: Carbs
    A[1, :] = np.array([float(f["carbs_g"]) for f in all_selected]) * w_c
    b[1] = carbs_goal * w_c

    # Row 2: Fat
    A[2, :] = np.array([float(f["fat_g"]) for f in all_selected]) * w_f
    b[2] = fat_goal * w_f

    # Row 3: Total Calories
    A[3, :] = np.array([float(f["calories"]) for f in all_selected]) * w_cal
    b[3] = cal_goal * w_cal

    # Rows 4-7: Meal calorie splits
    # Breakfast (items 0, 1, 2)
    A[4, 0:3] = np.array([float(f["calories"]) for f in all_selected[0:3]]) * w_meal
    b[4] = cal_goal * 0.25 * w_meal

    # Lunch (items 3, 4, 5)
    A[5, 3:6] = np.array([float(f["calories"]) for f in all_selected[3:6]]) * w_meal
    b[5] = cal_goal * 0.35 * w_meal

    # Dinner (items 6, 7, 8)
    A[6, 6:9] = np.array([float(f["calories"]) for f in all_selected[6:9]]) * w_meal
    b[6] = cal_goal * 0.25 * w_meal

    # Snacks (items 9, 10)
    A[7, 9:11] = np.array([float(f["calories"]) for f in all_selected[9:11]]) * w_meal
    b[7] = cal_goal * 0.15 * w_meal

    # Reasonable serving bounds: 0.5x to 2.2x base serving
    res = lsq_linear(A, b, bounds=(0.5, 2.2))
    scales = res.x

    # Output results
    idx = 0
    total_cal = 0
    total_p = 0
    total_c = 0
    total_f = 0

    print(f"\n=== GLOBAL OPTIMIZATION RESULTS FOR USER {user_id} ({diet}) ===")
    for meal, items in meals_items.items():
        m_cal = 0
        m_p = 0
        m_c = 0
        m_f = 0
        print(f"\n{meal}:")
        for f in items:
            sc = scales[idx]
            idx += 1
            cal = round(float(f["calories"]) * sc, 1)
            p = round(float(f["protein_g"]) * sc, 1)
            c = round(float(f["carbs_g"]) * sc, 1)
            fat = round(float(f["fat_g"]) * sc, 1)
            m_cal += cal
            m_p += p
            m_c += c
            m_f += fat
            print(f"  {f['name']:30s} (x{sc:.2f}) -> {cal:5.1f} kcal | P:{p:4.1f}g | C:{c:4.1f}g | F:{fat:4.1f}g")
        total_cal += m_cal
        total_p += m_p
        total_c += m_c
        total_f += m_f
        print(f"  [Meal Subtotal: {m_cal:.1f} kcal | P:{m_p:.1f}g | C:{m_c:.1f}g | F:{m_f:.1f}g]")

    print("\n------------------------------------------------------------")
    print(f"DAILY TARGETS:  Calories: {cal_goal:.1f} | Protein: {prot_goal:.1f}g | Carbs: {carbs_goal:.1f}g | Fat: {fat_goal:.1f}g")
    print(f"PLANNED TOTAL:  Calories: {total_cal:.1f} | Protein: {total_p:.1f}g | Carbs: {total_c:.1f}g | Fat: {total_f:.1f}g")
    print(f"MATCH PERCENT:  Calories: {total_cal/cal_goal*100:.1f}% | Protein: {total_p/prot_goal*100:.1f}% | Carbs: {total_c/carbs_goal*100:.1f}% | Fat: {total_f/fat_goal*100:.1f}%")
    print("------------------------------------------------------------")

for uid in [2, 1, 3, 4]:
    test_global_planner(uid)
