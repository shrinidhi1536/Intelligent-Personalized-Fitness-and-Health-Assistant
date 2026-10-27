import json
import re
from datetime import datetime, date
import numpy as np
from scipy.optimize import lsq_linear
from backend.db import fetch_one, fetch_all, execute

MEAL_SPLITS = {
    "Breakfast": 0.25,
    "Lunch": 0.35,
    "Dinner": 0.25,
    "Snacks": 0.15
}

def get_recent_workout_categories(user_id: int, limit: int = 3) -> list:
    rows = fetch_all("""
        SELECT w.category, c.workout_name, c.log_date 
        FROM workout_completions c
        LEFT JOIN workouts w ON c.workout_id = w.id
        WHERE c.user_id = %s ORDER BY c.completed_at DESC LIMIT %s
    """, (user_id, limit))
    return [r["category"] for r in rows if r.get("category")]

DAILY_SPLIT_ROSTER = {
    0: {
        "focus": "Upper Body Sculpt & Push Tone",
        "description": "Targeting chest, triceps, anterior deltoids, and upper posture stability.",
        "primary_ids": [2, 25, 22, 18],  # Push Ups, Advanced Calisthenics, Desk Worker Posture, Dumbbell Full Body
    },
    1: {
        "focus": "Lower Body Power & Glute Sculpt",
        "description": "Targeting quads, gluteus maximus, hamstrings, and unilateral leg strength.",
        "primary_ids": [3, 20, 1],  # Lunges, Glute & Leg Sculpt Blast, Squats
    },
    2: {
        "focus": "Core Definition & Wall Pilates",
        "description": "Deep transverse abdominis activation, pelvic floor bracing, and spinal alignment.",
        "primary_ids": [16, 4, 7],  # Wall Pilates Core & Posture, Plank, Mountain Climbers
    },
    3: {
        "focus": "Metabolic HIIT & Cardio Burn",
        "description": "High-octane interval conditioning, stamina acceleration, and explosive metabolic calorie torch.",
        "primary_ids": [17, 8, 5, 6, 9],  # 10-Min Fast Calorie Torch HIIT, Burpees, Jumping Jacks, High Knees, Jump Squats
    },
    4: {
        "focus": "Full Body Power & Tone",
        "description": "Compound multi-joint recruitment, athletic conditioning, and whole-body power output.",
        "primary_ids": [1, 18, 23, 2],  # Squats, Dumbbell Full Body Hypertrophy, Cardio Walking Fat Melt, Push Ups
    },
    5: {
        "focus": "Dynamic Mobility & Somatic Reset",
        "description": "Myofascial decompression, psoas release, joint mobility, and nervous system down-regulation.",
        "primary_ids": [19, 15, 22],  # Somatic Reset & Nervous System De-stress, Stretching, Desk Worker Posture
    },
    6: {
        "focus": "Restorative Flow & Mindful Yoga",
        "description": "Parasympathetic recovery, diaphragmatic breathing, spinal fluid flow, and active rejuvenation.",
        "primary_ids": [24, 21, 14],  # Morning Sun Salutation Yoga Flow, Bedtime Deep Rest, Yoga Flow
    }
}

def recommend_spotlight_workout(user_id: int, profile: dict) -> dict:
    today = date.today()
    day_idx = today.weekday()  # 0=Monday ... 6=Sunday
    day_split = DAILY_SPLIT_ROSTER.get(day_idx, DAILY_SPLIT_ROSTER[0])

    goal = (profile.get("goal") or "fitness").lower().strip()
    target_weight = profile.get("target_weight_kg")
    equipment = (profile.get("equipment") or "No Equipment").lower()
    pref_duration = profile.get("workout_duration_min") or profile.get("preferred_duration") or 20
    fitness_level = (profile.get("fitness_level") or "Beginner").lower()
    workout_type = (profile.get("workout_type") or "").lower()

    # Parse survey_data if present
    survey = profile.get("survey_data")
    if isinstance(survey, str):
        try:
            survey = json.loads(survey)
        except Exception:
            survey = {}
    elif not isinstance(survey, dict):
        survey = {}

    survey_types = [t.lower() for t in survey.get("q15_workout_types", [])]
    survey_equipment = [e.lower() for e in survey.get("q16_equipment", [])]
    survey_focus = [f.lower() for f in survey.get("q7_body_focus", [])]
    survey_injuries = (survey.get("q27_injuries_desc") or "").lower()
    survey_conditions = (survey.get("q28_conditions_desc") or "").lower()

    # Workouts completed today should never be repeated
    completed_today_ids = {
        r["workout_id"] for r in fetch_all(
            "SELECT workout_id FROM workout_completions WHERE user_id = %s AND log_date = %s",
            (user_id, today)
        ) if r.get("workout_id")
    }

    # Workouts completed in the last 2 days should be avoided for variety
    completed_recent_ids = {
        r["workout_id"] for r in fetch_all(
            "SELECT workout_id FROM workout_completions WHERE user_id = %s AND log_date >= DATE_SUB(%s, INTERVAL 2 DAY) AND log_date < %s",
            (user_id, today, today)
        ) if r.get("workout_id")
    }

    workouts = fetch_all("SELECT * FROM workouts ORDER BY id ASC")
    if not workouts:
        return {}

    scored = []
    for w in workouts:
        w_id = w["id"]
        score = 0
        w_name = w.get("name", "").lower()
        w_cat = (w.get("category") or "").lower()
        w_diff = (w.get("difficulty") or "Beginner").lower()
        w_eq = (w.get("equipment_needed") or "No Equipment").lower()
        w_dur = w.get("duration_min") or 20

        # --- 1. GOAL ALIGNMENT (Primary Driving Factor) ---
        if "gain" in goal or "muscle" in goal:
            if any(k in w_cat for k in ["strength", "pilates"]):
                score += 85
            elif any(k in w_cat for k in ["mobility", "flexibility", "yoga"]):
                score += 45
            elif any(k in w_cat for k in ["hiit", "cardio", "running"]):
                score -= 60
        elif "loss" in goal or "fat" in goal:
            if any(k in w_cat for k in ["hiit", "cardio", "running"]):
                score += 85
            elif "strength" in w_cat:
                score += 45
            elif any(k in w_cat for k in ["mobility", "yoga", "walking"]):
                score += 25
        else:
            if any(k in w_cat for k in ["strength", "cardio", "pilates"]):
                score += 45
            else:
                score += 30

        # --- 2. SURVEY PREFERRED WORKOUT TYPES (Q15) ---
        if survey_types:
            for st in survey_types:
                if "pilates" in st and "pilates" in w_cat:
                    score += 55
                elif "yoga" in st and ("yoga" in w_cat or "yoga" in w_name):
                    score += 55
                elif "hiit" in st and "hiit" in w_cat:
                    score += 55
                elif "strength" in st and "strength" in w_cat:
                    score += 55
                elif "walking" in st and ("walking" in w_cat or "walking" in w_name):
                    score += 50
                elif ("stretch" in st or "mobility" in st) and ("mobility" in w_cat or "flexibility" in w_cat):
                    score += 50
                elif "cardio" in st and ("cardio" in w_cat or "running" in w_cat):
                    score += 40
        elif workout_type and workout_type in w_cat:
            score += 35

        # --- 3. BODY FOCUS ZONES (Q7) ---
        if "belly strength" in survey_focus and any(k in w_name or k in w_cat for k in ["core", "pilates", "abs", "plank"]):
            score += 40
        if "legs and glutes" in survey_focus and any(k in w_name or k in w_cat for k in ["glute", "leg", "squat", "lunge"]):
            score += 40
        if "arms and shoulders" in survey_focus and any(k in w_name or k in w_cat for k in ["push up", "upper", "hypertrophy", "calisthenics"]):
            score += 40
        if "back and posture" in survey_focus and any(k in w_name or k in w_cat for k in ["posture", "back", "neck", "relief"]):
            score += 45
        if "flexibility and mobility" in survey_focus and any(k in w_name or k in w_cat for k in ["mobility", "stretch", "yoga"]):
            score += 40

        # --- 4. EQUIPMENT CONSTRAINTS & FEASIBILITY (Q16) ---
        user_has_no_eq = "no equipment" in equipment or ("no equipment" in survey_equipment and not any(e in survey_equipment for e in ["dumbbells", "resistance bands", "gym equipment"]))
        if user_has_no_eq:
            if "dumbbell" in w_eq or "resistance" in w_eq or "pull-up" in w_eq:
                score -= 300  # Strict rejection if equipment is missing!
            else:
                score += 30
        if "dumbbells" in survey_equipment and "dumbbell" in w_eq:
            score += 45
        if "resistance bands" in survey_equipment and "resistance" in w_eq:
            score += 45
        if "yoga mat" in survey_equipment and "mat" in w_eq:
            score += 20

        # --- 5. INJURIES & REHAB SAFETY (Q27, Q28) ---
        has_joint_pain = any(k in survey_injuries or k in survey_conditions for k in ["knee", "back", "joint", "shoulder", "pain", "injury"])
        if has_joint_pain:
            if any(k in w_name for k in ["burpee", "jump", "sprint", "high knees"]):
                score -= 250  # Protect knees and spine from explosive impact!
            elif any(k in w_cat for k in ["mobility", "flexibility", "pilates", "walking"]):
                score += 55

        # --- 6. DAY OF WEEK SPLIT SYNERGY ---
        if w_id in day_split["primary_ids"]:
            pos = day_split["primary_ids"].index(w_id)
            score += 30 - (pos * 6)

        # --- 7. FITNESS LEVEL MATCH ---
        if fitness_level in w_diff:
            score += 25
        elif fitness_level == "beginner" and "advanced" in w_diff:
            score -= 50

        # --- 8. DURATION MATCH ---
        dur_diff = abs(w_dur - pref_duration)
        score += max(20 - dur_diff, 0)

        # --- 9. ANTI-REPETITION (Completed Today & Recently) ---
        if w_id in completed_today_ids:
            score -= 500
        elif w_id in completed_recent_ids:
            score -= 150

        scored.append((score, w))

    # Sort descending by score
    scored.sort(key=lambda x: (x[0], -x[1]["id"]), reverse=True)
    best = scored[0][1] if scored else workouts[0]

    steps = best.get("exercise_steps_json")
    if isinstance(steps, str):
        try:
            best["exercise_steps"] = json.loads(steps)
        except Exception:
            best["exercise_steps"] = []
    else:
        best["exercise_steps"] = steps or []

    # Dynamic goal-tailored spotlight banner & description
    if survey.get("q15_workout_types"):
        pref_names = ", ".join(survey.get("q15_workout_types")[:2])
        best["daily_focus"] = f"Personalized {best.get('category', 'Workout')} • {best.get('duration_min', 20)} min"
        best["daily_description"] = f"Custom-matched to your preference for {pref_names} and {best.get('equipment_needed', 'No Equipment')}."
    elif "gain" in goal or "muscle" in goal:
        best["daily_focus"] = f"Hypertrophy & Mass • {best.get('category', 'Strength')}"
        best["daily_description"] = f"Personalized for Weight & Muscle Gain (Target: {target_weight or '58.0'} kg). Calibrated for muscle hypertrophy, core stability, and protecting your caloric surplus."
    elif "loss" in goal or "fat" in goal:
        best["daily_focus"] = f"Metabolic Fat Burn • {best.get('category', 'HIIT')}"
        best["daily_description"] = f"Personalized for Fat Loss (Target: {target_weight or '65.0'} kg). Calibrated for elevated caloric afterburn (EPOC) and cardiovascular conditioning."
    else:
        best["daily_focus"] = day_split["focus"]
        best["daily_description"] = day_split["description"]

    return best

def get_post_workout_recommendations(user_id: int, completed_workout_id: int, profile: dict) -> dict:
    today = date.today()
    goal = (profile.get("goal") or "fitness").lower().strip()
    equipment = (profile.get("equipment") or "No Equipment").lower()

    # Exclude completed workouts from today
    completed_today_ids = {
        r["workout_id"] for r in fetch_all(
            "SELECT workout_id FROM workout_completions WHERE user_id = %s AND log_date = %s",
            (user_id, today)
        ) if r.get("workout_id")
    }
    completed_today_ids.add(completed_workout_id)

    id_str = ','.join(str(i) for i in completed_today_ids) if completed_today_ids else '0'
    workouts = fetch_all(f"SELECT * FROM workouts WHERE id NOT IN ({id_str})")
    completed = fetch_one("SELECT * FROM workouts WHERE id = %s", (completed_workout_id,)) or {}

    recovery = []
    goal_aligned = []
    other = []

    for w in workouts:
        cat = w.get("category", "")
        cat_lower = cat.lower()
        w_eq = (w.get("equipment_needed") or "No Equipment").lower()

        # Equipment feasibility check
        if "no equipment" in equipment and ("dumbbell" in w_eq or "resistance" in w_eq):
            continue

        steps = w.get("exercise_steps_json")
        if isinstance(steps, str):
            try:
                w["exercise_steps"] = json.loads(steps)
            except Exception:
                w["exercise_steps"] = []
        else:
            w["exercise_steps"] = steps or []

        if any(k in cat_lower for k in ["mobility", "flexibility", "yoga"]):
            recovery.append(w)
        elif "gain" in goal or "muscle" in goal:
            if any(k in cat_lower for k in ["strength", "pilates"]):
                goal_aligned.append(w)
            else:
                other.append(w)
        elif "loss" in goal or "fat" in goal:
            if any(k in cat_lower for k in ["hiit", "cardio", "strength"]):
                goal_aligned.append(w)
            else:
                other.append(w)
        else:
            other.append(w)

    return {
        "completed_workout": completed,
        "goal": goal,
        "recovery_recommendations": recovery[:3],
        "similar_workouts": (goal_aligned if goal_aligned else other)[:3],
        "try_something_new": other[:3]
    }

JUNK_CATEGORIES = {
    "junk food & snacks", "fast food", "desserts & sweets", "beverages & sodas", "street food"
}

JUNK_FOOD_KEYWORDS = [
    "burger", "pizza", "fries", "chips", "donut", "doughnut", "brownie", "cake", "cookie",
    "ice cream", "waffle", "nugget", "hot dog", "nachos", "garlic bread", "spring roll",
    "samosa", "pav bhaji", "vada pav", "pani puri", "golgappa", "popcorn", "soda", "coke",
    "pepsi", "milkshake", "boba", "energy drink", "frappuccino", "mithai", "laddu", "ladoo",
    "katli", "mysore pak", "rasgulla", "peda", "jalebi", "gulab jamun", "bhature", "noodle",
    "chow mein", "ramen", "fried chicken", "shawarma wrap", "alfredo", "carbonara"
]

NON_VEG_KEYWORDS = [
    "chicken", "meat", "fish", "seafood", "prawn", "salmon", "tuna", 
    "pomfret", "lamb", "mutton", "beef", "pork", "turkey", "kebab",
    "shrimp", "crab", "bolognese", "taco", "murgh", "shawarma"
]

EGG_KEYWORDS = [
    "egg", "omelette", "bhurji"
]

DAIRY_KEYWORDS = [
    "paneer", "dahi", "curd", "ghee", "yogurt", "milk", "cheese", "butter", "whey", "casein"
]

GLUTEN_KEYWORDS = [
    "wheat", "chapati", "roti", "paratha", "bread", "pasta", "atta", "maida", "suji", "semolina"
]

NUT_KEYWORDS = [
    "peanut", "almond", "walnut", "cashew", "pistachio", "nut"
]

def filter_foods_by_diet(foods: list, diet_pref: str, allergies: str, dislikes: str) -> list:
    diet = (diet_pref or "vegetarian").lower().strip()
    raw_allergies = (allergies or "").lower()
    raw_dislikes = (dislikes or "").lower()

    allergy_tokens = [a.strip() for a in raw_allergies.split(",") if a.strip() and a.strip() not in ("none", "no restrictions")]
    dislike_tokens = [d.strip() for d in raw_dislikes.split(",") if d.strip() and d.strip() not in ("none", "no")]

    filtered = []
    for f in foods:
        name = f["name"].lower()
        cat = (f.get("category") or "").lower()

        # 1. Zero Junk Food Guarantee: Exclude all junk categories and keywords
        if cat in JUNK_CATEGORIES:
            continue
        if any(kw in name for kw in JUNK_FOOD_KEYWORDS):
            continue

        # 2. Strict Allergies Filter
        has_allergy = False
        for a in allergy_tokens:
            if "dairy" in a:
                if any(k in name or k in cat for k in DAIRY_KEYWORDS):
                    has_allergy = True
                    break
            elif "egg" in a:
                if any(k in name for k in EGG_KEYWORDS):
                    has_allergy = True
                    break
            elif "nut" in a or "peanut" in a:
                if any(k in name or k in cat for k in NUT_KEYWORDS):
                    has_allergy = True
                    break
            elif "gluten" in a:
                if any(k in name or k in cat for k in GLUTEN_KEYWORDS):
                    has_allergy = True
                    break
            elif a in name or a in cat:
                has_allergy = True
                break
        if has_allergy:
            continue

        # 3. Disliked Foods Filter
        if any(d in name or d in cat for d in dislike_tokens):
            continue

        # 4. Strict Diet Preferences Filter
        is_non_veg = (
            cat in ("eggs & poultry", "seafood") or
            any(k in name for k in NON_VEG_KEYWORDS)
        )
        is_egg = any(k in name for k in EGG_KEYWORDS)

        if diet == "vegan":
            if is_non_veg or is_egg or any(k in name or k in cat for k in DAIRY_KEYWORDS + ["honey"]):
                continue
        elif diet == "vegetarian":
            if is_non_veg or is_egg:
                continue
        elif diet == "eggetarian":
            if is_non_veg:
                continue

        filtered.append(f)
    return filtered

def scale_serving_label(base_serving: str, scale: float) -> str:
    if abs(scale - 1.0) < 0.05:
        return base_serving
    m_pcs = re.search(r'(\d+)\s*pcs', base_serving, re.I)
    m_grams = re.search(r'(\d+)\s*g', base_serving, re.I)
    if m_pcs and m_grams:
        pcs = max(round(int(m_pcs.group(1)) * scale), 1)
        g = max(round(int(m_grams.group(1)) * scale), 10)
        return f"{pcs} pcs (~{g}g)"
    elif m_grams:
        g = max(round(int(m_grams.group(1)) * scale), 10)
        if "bowl" in base_serving.lower():
            b = max(round(scale, 1), 0.2)
            return f"{b} bowl ({g}g)"
        elif "cup" in base_serving.lower():
            c = max(round(scale, 1), 0.2)
            return f"{c} cup ({g}g)"
        return f"~{g}g portion"
    return f"{base_serving} (x{max(round(scale, 1), 0.2)})"

def generate_or_get_daily_plan(user_id: int, profile: dict, target_date: date = None) -> dict:
    if target_date is None:
        target_date = date.today()

    existing = fetch_all("""
        SELECT * FROM daily_plan_checklist 
        WHERE user_id = %s AND plan_date = %s 
        ORDER BY FIELD(meal_type, 'Breakfast', 'Lunch', 'Dinner', 'Snacks'), id ASC
    """, (user_id, target_date))

    if existing:
        grouped = {"Breakfast": [], "Lunch": [], "Dinner": [], "Snacks": []}
        total_cals = 0.0
        total_prot = 0.0
        total_carbs = 0.0
        total_fat = 0.0

        for item in existing:
            m_type = item["meal_type"]
            grouped[m_type].append(item)
            total_cals += float(item["calories"])
            total_prot += float(item["protein_g"])
            total_carbs += float(item["carbs_g"])
            total_fat += float(item["fat_g"])

        return {
            "date": str(target_date),
            "target": {
                "calories": profile.get("calorie_goal", 2000),
                "protein_g": profile.get("protein_goal_g", 120),
                "carbs_g": profile.get("carbs_goal_g", 250),
                "fat_g": profile.get("fat_goal_g", 65),
            },
            "planned_total": {
                "calories": round(total_cals, 1),
                "protein_g": round(total_prot, 1),
                "carbs_g": round(total_carbs, 1),
                "fat_g": round(total_fat, 1)
            },
            "meals": grouped
        }

    all_foods = fetch_all("SELECT * FROM food_database ORDER BY id ASC")
    diet = profile.get("diet_preference", "Vegetarian")
    allergies = profile.get("allergies", "")
    dislikes = profile.get("disliked_foods", "")
    cuisine = (profile.get("cuisine_preference") or "South Indian").lower()

    # Parse survey_data for detailed food enjoyment (Q18)
    survey = profile.get("survey_data")
    if isinstance(survey, str):
        try:
            survey = json.loads(survey)
        except Exception:
            survey = {}
    elif not isinstance(survey, dict):
        survey = {}

    food_enjoyment = [f.lower() for f in survey.get("q18_food_enjoyment", [])]

    eligible_foods = filter_foods_by_diet(all_foods, diet, allergies, dislikes)

    cal_goal = float(profile.get("calorie_goal", 2000))
    prot_goal = float(profile.get("protein_goal_g", 120))
    carbs_goal = float(profile.get("carbs_goal_g", 250))
    fat_goal = float(profile.get("fat_goal_g", 65))

    # Categorize eligible foods by nutritional role
    protein_anchors = [
        f for f in eligible_foods 
        if (float(f["protein_g"]) >= 10.0 or (float(f["protein_g"]) >= 6.0 and float(f["protein_g"]) / max(float(f["calories"]), 1) > 0.055))
        and not any(k in (f.get("category") or "").lower() for k in ["nuts", "seeds"])
    ]
    carb_staples = [
        f for f in eligible_foods 
        if float(f["carbs_g"]) >= 15.0 and not any(k in (f.get("category") or "").lower() for k in ["nuts", "seeds"])
    ]
    fat_sides = [
        f for f in eligible_foods 
        if any(k in f["name"].lower() or k in (f.get("category") or "").lower() for k in ["nut", "seed", "almond", "walnut", "peanut", "chia", "flax", "pumpkin seed"])
    ] or [f for f in eligible_foods if float(f["fat_g"]) >= 8.0]

    veggie_fruit_sides = [
        f for f in eligible_foods 
        if any(k in (f.get("category") or "").lower() for k in ["vegetable", "fruit", "salad", "beverage", "dairy"])
    ]

    # Fallbacks if pools are small
    if not protein_anchors:
        protein_anchors = sorted(eligible_foods, key=lambda x: float(x["protein_g"]), reverse=True)[:10]
    if not carb_staples:
        carb_staples = sorted(eligible_foods, key=lambda x: float(x["carbs_g"]), reverse=True)[:10]
    if not fat_sides:
        fat_sides = sorted(eligible_foods, key=lambda x: float(x["fat_g"]), reverse=True)[:10]
    if not veggie_fruit_sides:
        veggie_fruit_sides = eligible_foods[:10]

    today_ordinal = target_date.toordinal()
    seed = today_ordinal + user_id

    def score_food_preference(item):
        cat = (item.get("category") or "").lower()
        nm = item["name"].lower()
        sc = 0
        if "south indian food" in food_enjoyment or "south" in cuisine:
            if "south indian" in cat or any(k in nm for k in ["idli", "dosa", "sambar", "upma", "pongal", "rasam", "curd rice"]):
                sc += 30
        if "north indian food" in food_enjoyment or "north" in cuisine:
            if "north indian" in cat or any(k in nm for k in ["roti", "chapati", "dal", "paneer", "rajma"]):
                sc += 30
        if "rice and grains" in food_enjoyment:
            if "grains" in cat or any(k in nm for k in ["rice", "oats", "quinoa", "poha"]):
                sc += 20
        if "fruits and vegetables" in food_enjoyment:
            if any(c in cat for c in ["fruit", "vegetable", "salad"]):
                sc += 20
        if "pulses and legumes" in food_enjoyment:
            if "legumes" in cat or any(k in nm for k in ["dal", "lentil", "chana", "rajma", "sprout", "moong"]):
                sc += 20
        if "chicken and fish" in food_enjoyment:
            if any(c in cat for c in ["poultry", "seafood"]) or any(k in nm for k in ["chicken", "fish", "salmon", "prawn"]):
                sc += 30
        if "eggs" in food_enjoyment:
            if "egg" in nm or "egg" in cat:
                sc += 25
        if "dairy products" in food_enjoyment:
            if "dairy" in cat or any(k in nm for k in ["paneer", "curd", "yogurt", "milk"]):
                sc += 20
        if "nuts and seeds" in food_enjoyment:
            if "nuts" in cat or any(k in nm for k in ["almond", "walnut", "chia", "flax", "seed"]):
                sc += 20
        return sc

    def prioritize_preferences(items):
        return sorted(items, key=lambda x: -score_food_preference(x))

    used_food_ids = set()

    def pick_next(pool, offset=0):
        sorted_pool = prioritize_preferences(pool)
        for i in range(len(sorted_pool)):
            cand = sorted_pool[(seed + offset + i) % len(sorted_pool)]
            if cand["id"] not in used_food_ids:
                used_food_ids.add(cand["id"])
                return cand
        return sorted_pool[0]

    # Select meal components:
    # 1. Breakfast: Protein Anchor, Carb Staple, Fruit/Beverage side
    bf_p = pick_next(protein_anchors, 0)
    bf_c = pick_next(carb_staples, 2)
    bf_s = pick_next([f for f in veggie_fruit_sides if "fruit" in (f.get("category") or "").lower() or "beverage" in (f.get("category") or "").lower()] or veggie_fruit_sides, 4)

    # 2. Lunch: Protein Anchor, Carb Staple, Veggie/Dairy side
    lu_p = pick_next(protein_anchors, 6)
    lu_c = pick_next(carb_staples, 8)
    lu_s = pick_next([f for f in veggie_fruit_sides if "vegetable" in (f.get("category") or "").lower() or "dairy" in (f.get("category") or "").lower()] or veggie_fruit_sides, 10)

    # 3. Dinner: Protein Anchor, Carb Staple, Veggie/Salad side
    di_p = pick_next(protein_anchors, 12)
    di_c = pick_next(carb_staples, 14)
    di_s = pick_next([f for f in veggie_fruit_sides if "vegetable" in (f.get("category") or "").lower() or "salad" in (f.get("category") or "").lower()] or veggie_fruit_sides, 16)

    # 4. Snacks: Healthy Fat / Nut, Light Snack / Fruit
    sn_f = pick_next(fat_sides, 18)
    sn_l = pick_next([f for f in eligible_foods if "snack" in (f.get("category") or "").lower() or "fruit" in (f.get("category") or "").lower()] or veggie_fruit_sides, 20)

    meals = {
        "Breakfast": [bf_p, bf_c, bf_s],
        "Lunch": [lu_p, lu_c, lu_s],
        "Dinner": [di_p, di_c, di_s],
        "Snacks": [sn_f, sn_l]
    }

    all_selected = [bf_p, bf_c, bf_s, lu_p, lu_c, lu_s, di_p, di_c, di_s, sn_f, sn_l]
    N = len(all_selected)

    # Optimization system
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

    # Meal calorie splits: Breakfast 25%, Lunch 35%, Dinner 25%, Snacks 15%
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

    # Exact Macro Matching Fine-Tuning:
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

    # Insert optimized items into checklist
    for it in plan_items:
        f = it["food"]
        eff_scale = it["calories"] / max(float(f["calories"]), 1.0)
        scaled_serving = scale_serving_label(f["serving"], eff_scale)

        execute("""
            INSERT INTO daily_plan_checklist 
            (user_id, plan_date, meal_type, food_id, food_name, serving, calories, protein_g, carbs_g, fat_g, is_consumed)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 0)
        """, (
            user_id, target_date, it["meal_type"], f["id"], f["name"], scaled_serving,
            it["calories"], it["protein_g"], it["carbs_g"], it["fat_g"]
        ))

    return generate_or_get_daily_plan(user_id, profile, target_date)

def swap_checklist_item(user_id: int, checklist_item_id: int, profile: dict) -> dict:
    current_item = fetch_one("SELECT * FROM daily_plan_checklist WHERE id = %s AND user_id = %s", (checklist_item_id, user_id))
    if not current_item:
        return {"success": False, "error": "Item not found."}

    orig_cals = float(current_item["calories"])
    orig_prot = float(current_item["protein_g"])
    orig_carbs = float(current_item["carbs_g"])
    orig_fat = float(current_item["fat_g"])
    diet = profile.get("diet_preference", "Vegetarian")
    allergies = profile.get("allergies", "")
    dislikes = profile.get("disliked_foods", "")

    all_foods = fetch_all("SELECT * FROM food_database WHERE id != %s", (current_item.get("food_id") or 0,))
    eligible = filter_foods_by_diet(all_foods, diet, allergies, dislikes)

    candidates = []
    for f in eligible:
        fcals = float(f["calories"])
        fprot = float(f["protein_g"])
        fcarbs = float(f["carbs_g"])
        ffat = float(f["fat_g"])

        scale = orig_cals / max(fcals, 1.0)
        if scale < 0.25 or scale > 3.0:
            continue

        sc_prot = fprot * scale
        sc_carbs = fcarbs * scale
        sc_fat = ffat * scale

        # Score by how well scaled food preserves the original item's macros
        diff = abs(sc_prot - orig_prot) * 3.0 + abs(sc_carbs - orig_carbs) * 1.5 + abs(sc_fat - orig_fat) * 2.5
        score = 100.0 - diff
        candidates.append((score, f, scale))

    if not candidates:
        for f in eligible:
            candidates.append((0, f, 1.0))

    candidates.sort(key=lambda x: x[0], reverse=True)
    best_score, best_match, best_scale = candidates[0]

    scaled_cals = round(float(best_match["calories"]) * best_scale, 1)
    scaled_prot = round(float(best_match["protein_g"]) * best_scale, 1)
    scaled_carbs = round(float(best_match["carbs_g"]) * best_scale, 1)
    scaled_fat = round(float(best_match["fat_g"]) * best_scale, 1)
    scaled_serving = scale_serving_label(best_match["serving"], best_scale)

    execute("""
        UPDATE daily_plan_checklist SET 
            food_id = %s, food_name = %s, serving = %s, calories = %s,
            protein_g = %s, carbs_g = %s, fat_g = %s, swapped_from_id = %s
        WHERE id = %s AND user_id = %s
    """, (
        best_match["id"], best_match["name"], scaled_serving,
        scaled_cals, scaled_prot, scaled_carbs, scaled_fat,
        current_item.get("food_id"), checklist_item_id, user_id
    ))

    return {
        "success": True,
        "new_item": {
            "id": checklist_item_id,
            "food_id": best_match["id"],
            "food_name": best_match["name"],
            "serving": scaled_serving,
            "calories": scaled_cals,
            "protein_g": scaled_prot,
            "carbs_g": scaled_carbs,
            "fat_g": scaled_fat
        }
    }
