from datetime import date, timedelta
from fastapi import APIRouter, HTTPException, Depends
from backend.routes.auth import get_current_user
from backend.db import fetch_one, fetch_all, execute
from backend.models.schemas import WeightLogRequest

progress_router = APIRouter(prefix="/api/progress", tags=["Progress"])

@progress_router.get("/charts")
def get_progress_chart_data(user: dict = Depends(get_current_user)):
    user_id = user["id"]
    profile = fetch_one("SELECT * FROM profiles WHERE user_id = %s", (user_id,))
    target_weight = float(profile["target_weight_kg"]) if profile and profile.get("target_weight_kg") else 60.0
    calorie_goal = float(profile["calorie_goal"]) if profile and profile.get("calorie_goal") else 2000.0
    protein_goal = float(profile["protein_goal_g"]) if profile and profile.get("protein_goal_g") else 120.0

    today = date.today()
    labels = []
    weight_data = []
    calorie_data = []
    protein_data = []
    water_data = []

    for i in range(13, -1, -1):
        d = today - timedelta(days=i)
        labels.append(d.strftime("%b %d"))

        w_row = fetch_one("SELECT weight_kg FROM progress WHERE user_id = %s AND log_date = %s ORDER BY id DESC LIMIT 1", (user_id, d))
        if w_row:
            weight_data.append(float(w_row["weight_kg"]))
        else:
            last_w = weight_data[-1] if weight_data and weight_data[-1] is not None else (float(profile["weight_kg"]) if profile and profile.get("weight_kg") else 65.0)
            weight_data.append(last_w)

        nutr = fetch_one("""
            SELECT COALESCE(SUM(calories), 0) AS cals, COALESCE(SUM(protein_g), 0) AS prot 
            FROM food_logs WHERE user_id = %s AND log_date = %s
        """, (user_id, d))
        calorie_data.append(float(nutr["cals"]) if nutr else 0.0)
        protein_data.append(float(nutr["prot"]) if nutr else 0.0)

        hyd = fetch_one("SELECT COALESCE(SUM(amount_ml), 0) AS ml FROM hydration WHERE user_id = %s AND log_date = %s", (user_id, d))
        water_data.append(round(int(hyd["ml"]) / 1000.0, 2) if hyd else 0.0)

    workouts = fetch_all("""
        SELECT workout_name, duration_min, calories_burned, log_date 
        FROM workout_completions WHERE user_id = %s ORDER BY completed_at DESC LIMIT 10
    """, (user_id,))

    return {
        "success": True,
        "labels": labels,
        "weights": weight_data,
        "target_weight": target_weight,
        "calories": calorie_data,
        "calorie_goal": calorie_goal,
        "protein": protein_data,
        "protein_goal": protein_goal,
        "water_liters": water_data,
        "recent_workouts": workouts
    }

@progress_router.post("/weight")
def log_weight(req: WeightLogRequest, user: dict = Depends(get_current_user)):
    user_id = user["id"]
    today = date.today()

    if req.weight_kg <= 20 or req.weight_kg >= 300:
        raise HTTPException(status_code=400, detail="Please enter a valid weight in kg.")

    # Use ON DUPLICATE KEY UPDATE to allow updating today's weight seamlessly
    execute("""
        INSERT INTO progress (user_id, weight_kg, log_date)
        VALUES (%s, %s, %s)
        ON DUPLICATE KEY UPDATE weight_kg = VALUES(weight_kg)
    """, (user_id, req.weight_kg, today))

    # Also update current weight in profiles table if exists
    execute("UPDATE profiles SET weight_kg = %s WHERE user_id = %s", (req.weight_kg, user_id))

    return {"success": True, "message": f"Successfully logged weight: {req.weight_kg} kg!"}
