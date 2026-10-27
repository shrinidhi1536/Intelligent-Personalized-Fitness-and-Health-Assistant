import json
from datetime import date
from fastapi import APIRouter, HTTPException, Depends, Query
from backend.db import fetch_one, fetch_all, execute
from backend.routes.auth import get_current_user
from backend.models.schemas import WorkoutCompletionSubmit
from backend.services.recommendation_service import (
    recommend_spotlight_workout,
    get_post_workout_recommendations
)
from backend.services.habit_engine import sync_daily_habits

workouts_router = APIRouter(prefix="/api/workouts", tags=["Workouts"])

@workouts_router.get("/library")
def get_workout_library(
    category: str = Query(None),
    difficulty: str = Query(None),
    equipment: str = Query(None),
    search: str = Query(None),
    user: dict = Depends(get_current_user)
):
    sql = "SELECT * FROM workouts WHERE 1=1"
    params = []

    if category and category.lower() != "all":
        sql += " AND (LOWER(category) = %s OR LOWER(category) LIKE %s)"
        params.extend([category.lower(), f"%{category.lower()}%"])
    if difficulty and difficulty.lower() != "all":
        sql += " AND LOWER(difficulty) = %s"
        params.append(difficulty.lower())
    if equipment and equipment.lower() != "all":
        sql += " AND LOWER(equipment_needed) LIKE %s"
        params.append(f"%{equipment.lower()}%")
    if search:
        sql += " AND (LOWER(name) LIKE %s OR LOWER(target_muscles) LIKE %s OR LOWER(description) LIKE %s)"
        s = f"%{search.lower().strip()}%"
        params.extend([s, s, s])

    sql += " ORDER BY id ASC"
    rows = fetch_all(sql, tuple(params))

    # Parse json steps
    for r in rows:
        steps = r.get("exercise_steps_json")
        if isinstance(steps, str):
            try:
                r["exercise_steps"] = json.loads(steps)
            except Exception:
                r["exercise_steps"] = []
        else:
            r["exercise_steps"] = steps or []

    return {"success": True, "count": len(rows), "workouts": rows}

@workouts_router.get("/recommendations")
def get_recommendations(user: dict = Depends(get_current_user)):
    user_id = user["id"]
    profile = fetch_one("SELECT * FROM profiles WHERE user_id = %s", (user_id,))
    if not profile:
        profile = {
            "goal": "fitness", "workout_type": "Cardio", "workout_duration_min": 20,
            "equipment": "No Equipment", "fitness_level": "Beginner"
        }

    spotlight = recommend_spotlight_workout(user_id, profile)
    today = date.today()
    completed_today = fetch_all("""
        SELECT workout_name, duration_min, calories_burned, completed_at, log_date 
        FROM workout_completions WHERE user_id = %s AND log_date = %s ORDER BY completed_at DESC
    """, (user_id, today))

    past_history = fetch_all("""
        SELECT workout_name, duration_min, calories_burned, completed_at, log_date 
        FROM workout_completions WHERE user_id = %s AND log_date < %s ORDER BY completed_at DESC LIMIT 5
    """, (user_id, today))

    return {
        "success": True,
        "spotlight": spotlight,
        "completed_today": completed_today,
        "recent_completions": completed_today,
        "past_history": past_history
    }

@workouts_router.get("/{workout_id}")
def get_workout_detail(workout_id: int, user: dict = Depends(get_current_user)):
    w = fetch_one("SELECT * FROM workouts WHERE id = %s", (workout_id,))
    if not w:
        raise HTTPException(status_code=404, detail="Workout not found.")

    steps = w.get("exercise_steps_json")
    if isinstance(steps, str):
        try:
            w["exercise_steps"] = json.loads(steps)
        except Exception:
            w["exercise_steps"] = []
    else:
        w["exercise_steps"] = steps or []

    return {"success": True, "workout": w}

@workouts_router.post("/complete")
def complete_workout(req: WorkoutCompletionSubmit, user: dict = Depends(get_current_user)):
    user_id = user["id"]
    today = date.today()

    cid, _ = execute("""
        INSERT INTO workout_completions 
        (user_id, workout_id, workout_name, duration_min, calories_burned, exercises_completed, log_date)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """, (
        user_id, req.workout_id, req.workout_name, req.duration_min,
        req.calories_burned, req.exercises_completed, today
    ))

    # Also log to workout_logs table for backwards compatibility
    execute("""
        INSERT INTO workout_logs (user_id, workout_id, name, category, duration_min, calories_burned, log_date)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """, (user_id, req.workout_id, req.workout_name, "Completed", req.duration_min, req.calories_burned, today))

    # Automatically trigger habit sync
    sync_daily_habits(user_id, today)

    # Fetch post workout recommendations
    profile = fetch_one("SELECT * FROM profiles WHERE user_id = %s", (user_id,)) or {}
    post_recs = get_post_workout_recommendations(user_id, req.workout_id or 0, profile)

    return {
        "success": True,
        "completion_id": cid,
        "message": f"Congratulations! You completed {req.workout_name}! 🎉",
        "calories_burned": req.calories_burned,
        "duration_min": req.duration_min,
        "post_recommendations": post_recs
    }
