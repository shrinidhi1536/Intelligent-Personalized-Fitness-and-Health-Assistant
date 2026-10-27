from datetime import datetime, timedelta
import math

def calculate_bmi(weight_kg: float, height_cm: float) -> dict:
    if not height_cm or height_cm <= 0:
        return {"bmi": 22.0, "category": "Normal"}
    height_m = height_cm / 100.0
    bmi = round(weight_kg / (height_m * height_m), 1)
    
    if bmi < 18.5:
        category = "Underweight"
    elif bmi < 25.0:
        category = "Normal"
    elif bmi < 30.0:
        category = "Overweight"
    else:
        category = "Obese"
        
    return {"bmi": bmi, "category": category}

def calculate_bmr(gender: str, weight_kg: float, height_cm: float, age: int) -> float:
    # Mifflin-St Jeor equation
    s = 5 if gender.lower() == "male" else -161
    bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) + s
    return max(round(bmr, 1), 1000.0)

def calculate_tdee(bmr: float, activity_multiplier: float) -> float:
    return round(bmr * activity_multiplier, 1)

def get_activity_multiplier(level_str_or_float) -> float:
    try:
        val = float(level_str_or_float)
        if 1.0 <= val <= 2.5:
            return val
    except (ValueError, TypeError):
        pass

    mapping = {
        "sedentary": 1.2,
        "light": 1.375,
        "lightly active": 1.375,
        "moderate": 1.55,
        "moderately active": 1.55,
        "very_active": 1.725,
        "very active": 1.725,
        "extremely active": 1.9,
    }
    key = str(level_str_or_float).lower().strip().replace("-", "_").replace(" ", "_")
    if key in mapping:
        return mapping[key]
    key_spaces = key.replace("_", " ")
    return mapping.get(key_spaces, 1.375)

def calculate_macro_targets(goal: str, weight_kg: float, tdee: float) -> dict:
    goal_norm = str(goal).lower().strip()
    
    # 1. Determine daily calorie goal
    if "loss" in goal_norm or "burn" in goal_norm:
        daily_calories = max(round(tdee - 450), 1300)
    elif "gain" in goal_norm or "muscle" in goal_norm:
        daily_calories = round(tdee + 350)
    else:  # maintain / fitness
        daily_calories = round(tdee)

    # 2. Determine protein target in grams
    if "muscle" in goal_norm or "gain" in goal_norm:
        protein_g = round(weight_kg * 2.0)
    elif "loss" in goal_norm:
        protein_g = round(weight_kg * 1.8)
    else:
        protein_g = round(weight_kg * 1.4)
    protein_g = max(protein_g, 60)

    # 3. Determine fat target (25% of calories, 9 kcal/g)
    fat_cals = daily_calories * 0.25
    fat_g = max(round(fat_cals / 9), 40)

    # 4. Remaining calories to carbohydrates (4 kcal/g)
    used_cals = (protein_g * 4) + (fat_g * 9)
    carbs_cals = max(daily_calories - used_cals, 200)
    carbs_g = max(round(carbs_cals / 4), 80)

    # Recalculate true daily total from rounded macros
    adjusted_calories = (protein_g * 4) + (carbs_g * 4) + (fat_g * 9)

    return {
        "daily_calories": adjusted_calories,
        "protein_g": protein_g,
        "carbs_g": carbs_g,
        "fat_g": fat_g
    }

def calculate_water_target(weight_kg: float, activity_level: str = "moderate") -> int:
    base_ml = weight_kg * 35.0
    act = str(activity_level).lower()
    if "very" in act or "extremely" in act:
        base_ml += 700
    elif "moderat" in act:
        base_ml += 400
    else:
        base_ml += 200
    # Round to nearest 100ml
    return int(round(base_ml / 100.0) * 100)

def calculate_projected_date(current_weight: float, target_weight: float) -> str:
    diff = abs(current_weight - target_weight)
    if diff < 0.5:
        return datetime.now().strftime("%B %d, %Y")
    # Safe rate: ~0.5 kg per week
    weeks_needed = max(diff / 0.5, 2.0)
    target_date = datetime.now() + timedelta(weeks=weeks_needed)
    return target_date.strftime("%B %d, %Y")
