import json
from datetime import date
from fastapi import APIRouter, HTTPException, Depends
from backend.db import fetch_one, execute
from backend.models.schemas import OnboardingSubmit
from backend.routes.auth import get_current_user
from backend.services.calculations import (
    calculate_bmr,
    calculate_tdee,
    get_activity_multiplier,
    calculate_macro_targets,
    calculate_water_target,
    calculate_bmi,
    calculate_projected_date
)

onboarding_router = APIRouter(prefix="/api/onboarding", tags=["Onboarding"])

@onboarding_router.post("/submit")
def submit_onboarding(req: OnboardingSubmit, user: dict = Depends(get_current_user)):
    user_id = user["id"]

    # Normalize goal to valid enum ('loss', 'gain', 'muscle', 'maintain', 'fitness')
    raw_goal = str(req.goal).lower().strip()
    if "lose" in raw_goal or "loss" in raw_goal or "burn" in raw_goal:
        goal_norm = "loss"
    elif "muscle" in raw_goal or "build" in raw_goal or "tone" in raw_goal or "sculpt" in raw_goal:
        goal_norm = "muscle"
    elif "gain" in raw_goal:
        goal_norm = "gain"
    elif "maintain" in raw_goal:
        goal_norm = "maintain"
    else:
        goal_norm = "fitness"

    # Normalize diet to valid enum ('Vegetarian', 'Non-Vegetarian', 'Vegan', 'Eggetarian')
    raw_diet = str(req.diet_preference).lower().strip()
    if "vegan" in raw_diet:
        diet_norm = "Vegan"
    elif "egg" in raw_diet:
        diet_norm = "Eggetarian"
    elif "non" in raw_diet or "meat" in raw_diet or "keto" in raw_diet:
        diet_norm = "Non-Vegetarian"
    else:
        diet_norm = "Vegetarian"

    # Normalize gender to enum('male','female','other')
    g_raw = str(req.gender).lower().strip()
    if "female" in g_raw:
        gender_norm = "female"
    elif "male" in g_raw:
        gender_norm = "male"
    else:
        gender_norm = "other"

    # Calculate scientific targets
    bmr = calculate_bmr(gender_norm, req.weight_kg, req.height_cm, req.age)
    act_mult = get_activity_multiplier(req.activity_level)
    tdee = calculate_tdee(bmr, act_mult)
    macros = calculate_macro_targets(goal_norm, req.weight_kg, tdee)
    water_target = calculate_water_target(req.weight_kg, req.activity_level)
    bmi_info = calculate_bmi(req.weight_kg, req.height_cm)
    projected_date = calculate_projected_date(req.weight_kg, req.target_weight_kg)

    survey_json = json.dumps(req.survey_data or {})

    # Upsert into profiles table
    existing = fetch_one("SELECT id FROM profiles WHERE user_id = %s", (user_id,))
    if existing:
        execute("""
            UPDATE profiles SET
                age=%s, gender=%s, height_cm=%s, weight_kg=%s, target_weight_kg=%s,
                goal=%s, activity_level=%s, diet_preference=%s, cuisine_preference=%s, allergies=%s, disliked_foods=%s,
                workout_type=%s, workout_duration_min=%s, equipment=%s, fitness_level=%s,
                preferred_duration=%s, sleep_duration_hours=%s, water_intake_target_ml=%s,
                calorie_goal=%s, protein_goal_g=%s, carbs_goal_g=%s, fat_goal_g=%s, water_goal_ml=%s,
                survey_data=%s
            WHERE user_id=%s
        """, (
            req.age, gender_norm, req.height_cm, req.weight_kg, req.target_weight_kg,
            goal_norm, act_mult, diet_norm, req.cuisine_preference or "South Indian", req.allergies or "None", req.disliked_foods or "None",
            req.workout_type, req.preferred_duration, req.equipment, req.fitness_level,
            req.preferred_duration, req.sleep_duration_hours, water_target,
            macros["daily_calories"], macros["protein_g"], macros["carbs_g"], macros["fat_g"], water_target,
            survey_json,
            user_id
        ))
    else:
        execute("""
            INSERT INTO profiles (
                user_id, age, gender, height_cm, weight_kg, target_weight_kg, goal,
                activity_level, diet_preference, cuisine_preference, allergies, disliked_foods, workout_type,
                workout_duration_min, equipment, fitness_level, preferred_duration,
                sleep_duration_hours, water_intake_target_ml, calorie_goal, protein_goal_g,
                carbs_goal_g, fat_goal_g, water_goal_ml, survey_data
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id, req.age, gender_norm, req.height_cm, req.weight_kg, req.target_weight_kg, goal_norm,
            act_mult, diet_norm, req.cuisine_preference or "South Indian", req.allergies or "None", req.disliked_foods or "None", req.workout_type,
            req.preferred_duration, req.equipment, req.fitness_level, req.preferred_duration,
            req.sleep_duration_hours, water_target, macros["daily_calories"], macros["protein_g"],
            macros["carbs_g"], macros["fat_g"], water_target, survey_json
        ))

    # Log initial weight to progress table if none logged today
    today = date.today()
    prog = fetch_one("SELECT id FROM progress WHERE user_id=%s AND log_date=%s", (user_id, today))
    if not prog:
        execute("INSERT INTO progress (user_id, weight_kg, log_date) VALUES (%s, %s, %s)", (user_id, req.weight_kg, today))
    else:
        execute("UPDATE progress SET weight_kg=%s WHERE id=%s", (req.weight_kg, prog["id"]))

    # Regenerate daily meal and workout plan with updated profile
    meal_plan = {}
    spotlight = {}
    try:
        from backend.services.recommendation_service import generate_or_get_daily_plan, recommend_spotlight_workout
        execute("DELETE FROM daily_plan_checklist WHERE user_id=%s AND plan_date=%s AND is_consumed=0", (user_id, today))
        prof = fetch_one("SELECT * FROM profiles WHERE user_id=%s", (user_id,))
        meal_plan = generate_or_get_daily_plan(user_id, prof, today)
        spotlight = recommend_spotlight_workout(user_id, prof)
    except Exception as e:
        print(f"Warning: daily plan update error: {e}")

    return {
        "success": True,
        "message": "Personalized assessment completed successfully!",
        "metrics": {
            "bmr": bmr,
            "tdee": tdee,
            "bmi": bmi_info["bmi"],
            "bmi_category": bmi_info["category"],
            "daily_calories": macros["daily_calories"],
            "protein_g": macros["protein_g"],
            "carbs_g": macros["carbs_g"],
            "fat_g": macros["fat_g"],
            "water_target_ml": water_target,
            "projected_date": projected_date
        },
        "daily_plan": meal_plan.get("meals", {}),
        "spotlight_workout": {
            "id": spotlight.get("id"),
            "name": spotlight.get("name"),
            "category": spotlight.get("category"),
            "duration_min": spotlight.get("duration_min"),
            "difficulty": spotlight.get("difficulty"),
            "equipment_needed": spotlight.get("equipment_needed"),
            "daily_focus": spotlight.get("daily_focus"),
            "daily_description": spotlight.get("daily_description")
        } if spotlight else None
    }
