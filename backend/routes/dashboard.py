from datetime import date
from fastapi import APIRouter, HTTPException, Depends
from backend.db import fetch_one, fetch_all
from backend.routes.auth import get_current_user, ensure_user_profile
from backend.services.calculations import calculate_bmi
from backend.services.recommendation_service import recommend_spotlight_workout, generate_or_get_daily_plan
from backend.services.habit_engine import sync_daily_habits, calculate_user_streak

dashboard_router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@dashboard_router.get("/summary")
def get_dashboard_summary(user: dict = Depends(get_current_user)):
    user_id = user["id"]
    profile = ensure_user_profile(user_id)

    today = date.today()

    # 1. Sync habits automatically from today's real activity
    habits = sync_daily_habits(user_id, today)

    # 2. Nutrition consumed today
    nutr = fetch_one("""
        SELECT 
            COALESCE(SUM(calories), 0) AS total_cals,
            COALESCE(SUM(protein_g), 0) AS total_prot,
            COALESCE(SUM(carbs_g), 0) AS total_carbs,
            COALESCE(SUM(fat_g), 0) AS total_fat
        FROM food_logs WHERE user_id = %s AND log_date = %s
    """, (user_id, today))

    consumed_cals = float(nutr["total_cals"]) if nutr else 0.0
    consumed_prot = float(nutr["total_prot"]) if nutr else 0.0
    consumed_carbs = float(nutr["total_carbs"]) if nutr else 0.0
    consumed_fat = float(nutr["total_fat"]) if nutr else 0.0

    target_cals = float(profile.get("calorie_goal", 2000))
    target_prot = float(profile.get("protein_goal_g", 120))
    target_carbs = float(profile.get("carbs_goal_g", 250))
    target_fat = float(profile.get("fat_goal_g", 65))

    # 3. Hydration
    hyd = fetch_one("SELECT COALESCE(SUM(amount_ml), 0) AS total_ml FROM hydration WHERE user_id = %s AND log_date = %s", (user_id, today))
    water_consumed = int(hyd["total_ml"]) if hyd else 0
    water_target = int(profile.get("water_goal_ml", 2500))

    # 4. Spotlight workout
    spotlight_workout = recommend_spotlight_workout(user_id, profile)

    # Check if completed today
    completed_today = fetch_all("SELECT * FROM workout_completions WHERE user_id = %s AND log_date = %s", (user_id, today))

    # 5. Today's meal plan checklist
    daily_plan = generate_or_get_daily_plan(user_id, profile, today)

    # 6. Biometrics
    bmi_info = calculate_bmi(float(profile["weight_kg"]), float(profile["height_cm"]))

    burned_cals = sum(float(w.get("calories_burned") or 0) for w in (completed_today or []))
    workout_mins_today = sum(int(w.get("duration_min") or 0) for w in (completed_today or []))
    remaining_cals = max(round(target_cals - consumed_cals, 1), 0.0)

    # Health Score Calculation (0 - 100)
    c_score = min(round((consumed_cals / max(target_cals, 1)) * 35), 35)
    p_score = min(round((consumed_prot / max(target_prot, 1)) * 25), 25)
    w_score = min(round((water_consumed / max(water_target, 1)) * 25), 25)
    ex_score = 15 if len(completed_today) > 0 else 0
    health_score = c_score + p_score + w_score + ex_score

    # Category formatting (e.g. Underweight BMI, Normal BMI, Overweight BMI)
    raw_cat = bmi_info["category"]
    bmi_badge = f"{raw_cat} BMI" if "BMI" not in raw_cat else raw_cat

    # Tailored insights for Nutrition and Hydration
    if consumed_prot < target_prot * 0.7:
        nutr_insight = f"Your protein intake is below your target. You've had {round(consumed_prot)}g of {round(target_prot)}g — consider adding paneer, eggs, dal or sprouts."
    elif consumed_cals == 0:
        nutr_insight = f"Your personalized daily meal plan of {round(target_cals)} kcal is ready. Check off your breakfast items once consumed to track macros."
    else:
        nutr_insight = f"Great progress! You've logged {round(consumed_cals)} of {round(target_cals)} kcal with {round(consumed_prot)}g protein."

    if water_consumed < water_target:
        hyd_diff = max(water_target - water_consumed, 0)
        hyd_insight = f"You've consumed {round(water_consumed/1000, 1)} L of your {round(water_target/1000, 1)} L target. You need approximately {hyd_diff} ml more."
    else:
        hyd_insight = f"Hydration target achieved! You've consumed {round(water_consumed/1000, 1)} L of water today."

    # 7. Adaptive coach insight
    if consumed_cals == 0:
        insight = f"Good day, {user['name']}! Your personalized plan for {profile['goal']} is ready. Check off your breakfast once enjoyed."
    elif consumed_prot < target_prot * 0.4:
        insight = f"You've consumed {round(consumed_cals)} kcal so far. Boost your protein intake in your next meal to hit your {round(target_prot)}g target."
    elif consumed_cals >= target_cals * 0.9:
        insight = f"Excellent adherence! You're within 10% of your daily calorie budget with solid macro distribution."
    else:
        insight = f"On track! Hydration is at {round((water_consumed/max(water_target,1))*100)}% and your metabolic burn is steady."

    return {
        "success": True,
        "onboarding_required": False,
        "user": user,
        "biometrics": {
            "name": user["name"],
            "current_weight": float(profile["weight_kg"]),
            "target_weight": float(profile["target_weight_kg"]),
            "height_cm": float(profile["height_cm"]),
            "bmi": bmi_info["bmi"],
            "bmi_category": bmi_badge,
            "goal": profile["goal"]
        },
        "daily_tracking": {
            "consumed_cals": round(consumed_cals, 1),
            "burned_cals": round(burned_cals, 1),
            "remaining_cals": round(remaining_cals, 1),
            "goal_cals": round(target_cals, 1)
        },
        "health_score": health_score,
        "workout_minutes_today": workout_mins_today,
        "todays_insights": {
            "nutrition": nutr_insight,
            "hydration": hyd_insight
        },
        "nutrition": {
            "target": {
                "calories": target_cals,
                "protein_g": target_prot,
                "carbs_g": target_carbs,
                "fat_g": target_fat
            },
            "consumed": {
                "calories": round(consumed_cals, 1),
                "protein_g": round(consumed_prot, 1),
                "carbs_g": round(consumed_carbs, 1),
                "fat_g": round(consumed_fat, 1)
            },
            "remaining": {
                "calories": max(round(target_cals - consumed_cals, 1), 0),
                "protein_g": max(round(target_prot - consumed_prot, 1), 0),
                "carbs_g": max(round(target_carbs - consumed_carbs, 1), 0),
                "fat_g": max(round(target_fat - consumed_fat, 1), 0)
            }
        },
        "hydration": {
            "consumed_ml": water_consumed,
            "target_ml": water_target,
            "percentage": min(round((water_consumed / max(water_target, 1)) * 100), 100)
        },
        "workout": {
            "spotlight": spotlight_workout,
            "completed_today": completed_today
        },
        "daily_plan": daily_plan,
        "habits": habits,
        "streak_days": calculate_user_streak(user_id),
        "insight": insight
    }
