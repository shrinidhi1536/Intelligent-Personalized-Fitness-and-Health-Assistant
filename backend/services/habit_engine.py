from datetime import date
from backend.db import fetch_one, fetch_all, execute

def sync_daily_habits(user_id: int, target_date: date = None) -> dict:
    if target_date is None:
        target_date = date.today()

    # 1. Check Hydration
    water_row = fetch_one("""
        SELECT COALESCE(SUM(amount_ml), 0) AS total_ml 
        FROM hydration WHERE user_id = %s AND log_date = %s
    """, (user_id, target_date))
    water_ml = int(water_row["total_ml"]) if water_row else 0
    water_done = 1 if water_ml >= 1500 else 0

    # 2. Check Workouts
    workout_row = fetch_one("""
        SELECT COUNT(*) AS total_workouts FROM workout_completions 
        WHERE user_id = %s AND log_date = %s
    """, (user_id, target_date))
    workout_done = 1 if workout_row and workout_row["total_workouts"] > 0 else 0

    # 3. Check Food & Nutrition
    food_row = fetch_one("""
        SELECT 
            COALESCE(SUM(calories), 0) AS total_cals,
            COALESCE(SUM(protein_g), 0) AS total_prot,
            COUNT(DISTINCT meal_type) AS distinct_meals
        FROM food_logs 
        WHERE user_id = %s AND log_date = %s
    """, (user_id, target_date))
    
    total_cals = float(food_row["total_cals"]) if food_row else 0.0
    total_prot = float(food_row["total_prot"]) if food_row else 0.0
    distinct_meals = int(food_row["distinct_meals"]) if food_row else 0

    calorie_done = 1 if total_cals >= 1000 else 0
    protein_done = 1 if total_prot >= 40 else 0
    meals_done = 1 if distinct_meals >= 2 else 0

    # 4. Check existing habit record
    existing = fetch_one("SELECT * FROM habits WHERE user_id = %s AND habit_date = %s", (user_id, target_date))
    
    if existing:
        # Preserve manual sleep or manual overrides if set
        sleep_done = existing.get("sleep", 0)
        final_water = max(existing.get("water", 0), water_done)
        final_workout = max(existing.get("workout", 0), workout_done)
        final_calorie = max(existing.get("calorie", 0), calorie_done)
        final_protein = max(existing.get("protein", 0), protein_done)
        final_meals = max(existing.get("meals", 0), meals_done)

        execute("""
            UPDATE habits SET 
                water = %s, workout = %s, calorie = %s, protein = %s, sleep = %s, meals = %s
            WHERE id = %s
        """, (final_water, final_workout, final_calorie, final_protein, sleep_done, final_meals, existing["id"]))
    else:
        sleep_done = 0
        final_water = water_done
        final_workout = workout_done
        final_calorie = calorie_done
        final_protein = protein_done
        final_meals = meals_done

        execute("""
            INSERT INTO habits (user_id, habit_date, water, workout, calorie, protein, sleep, meals)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (user_id, target_date, final_water, final_workout, final_calorie, final_protein, sleep_done, final_meals))

    return {
        "user_id": user_id,
        "date": str(target_date),
        "water": bool(final_water),
        "workout": bool(final_workout),
        "calorie": bool(final_calorie),
        "protein": bool(final_protein),
        "sleep": bool(sleep_done),
        "meals": bool(final_meals),
        "auto_detected": {
            "water_ml": water_ml,
            "workouts_completed": workout_row["total_workouts"] if workout_row else 0,
            "calories_logged": round(total_cals, 1),
            "protein_logged": round(total_prot, 1),
            "distinct_meals": distinct_meals
        }
    }

def calculate_user_streak(user_id: int) -> int:
    """
    Calculate the consecutive active days streak for the user.
    An active day is one where the user logged food, water, or completed a workout.
    """
    from datetime import timedelta
    rows = fetch_all("""
        SELECT DISTINCT d FROM (
            SELECT log_date AS d FROM food_logs WHERE user_id = %s
            UNION
            SELECT log_date AS d FROM hydration WHERE user_id = %s
            UNION
            SELECT log_date AS d FROM workout_completions WHERE user_id = %s
        ) t ORDER BY d DESC
    """, (user_id, user_id, user_id))

    if not rows:
        return 0

    active_dates = {r["d"] for r in rows if r.get("d")}
    today = date.today()
    streak = 0
    curr = today

    if curr in active_dates:
        while curr in active_dates:
            streak += 1
            curr -= timedelta(days=1)
    else:
        yesterday = today - timedelta(days=1)
        if yesterday in active_dates:
            curr = yesterday
            while curr in active_dates:
                streak += 1
                curr -= timedelta(days=1)
        else:
            return 0

    return streak

