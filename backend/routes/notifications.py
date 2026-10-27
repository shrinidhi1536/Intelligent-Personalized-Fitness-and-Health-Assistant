from datetime import datetime, date, time
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from backend.routes.auth import get_current_user
from backend.db import fetch_one, fetch_all, execute
from backend.services.habit_engine import sync_daily_habits

notifications_router = APIRouter(prefix="/api/notifications", tags=["Notifications & Reminders"])

MEAL_WINDOWS = {
    "Breakfast": {"start": time(7, 0), "end": time(11, 0), "label": "Breakfast (7:00 AM – 11:00 AM)"},
    "Lunch": {"start": time(12, 0), "end": time(15, 30), "label": "Lunch (12:00 PM – 3:30 PM)"},
    "Snacks": {"start": time(16, 0), "end": time(18, 30), "label": "Snacks (4:00 PM – 6:30 PM)"},
    "Dinner": {"start": time(19, 0), "end": time(22, 30), "label": "Dinner (7:00 PM – 10:30 PM)"}
}

def get_current_meal_window(now_time: time) -> Optional[str]:
    for meal, window in MEAL_WINDOWS.items():
        if window["start"] <= now_time <= window["end"]:
            return meal
    return None

@notifications_router.get("/active")
def get_active_notifications(user: dict = Depends(get_current_user)):
    user_id = user["id"]
    today = date.today()
    now = datetime.now()
    cur_time = now.time()

    profile = fetch_one("SELECT * FROM profiles WHERE user_id = %s", (user_id,))
    if not profile:
        return {"success": True, "notifications": [], "active_window": None}

    notifications = []

    # 1. Active Meal Window Detection
    current_meal = get_current_meal_window(cur_time)

    # 2. Check today's meal logs
    logged_meals_rows = fetch_all("""
        SELECT meal_type, COALESCE(SUM(calories), 0) as cals, COUNT(*) as count 
        FROM food_logs 
        WHERE user_id = %s AND log_date = %s 
        GROUP BY meal_type
    """, (user_id, today))
    logged_meals_dict = {r["meal_type"]: float(r["cals"]) for r in logged_meals_rows}

    # Meal reminders based on schedule
    if current_meal:
        cals_logged = logged_meals_dict.get(current_meal, 0.0)
        if cals_logged == 0:
            notifications.append({
                "id": f"meal-current-{current_meal.lower()}",
                "type": "meal",
                "urgency": "info",
                "title": f"{current_meal} Window is Active",
                "message": f"It is {MEAL_WINDOWS[current_meal]['label']}. Enjoy and log your {current_meal.lower()} to stay aligned with your daily metabolic plan.",
                "action_type": "navigate",
                "action_target": "food_diary",
                "action_label": f"Log {current_meal}",
                "timestamp": now.isoformat()
            })

    # Check for missed earlier meals
    if cur_time > time(11, 0) and logged_meals_dict.get("Breakfast", 0) == 0:
        notifications.append({
            "id": "meal-missed-breakfast",
            "type": "missed_meal",
            "urgency": "warning",
            "title": "Breakfast Window Passed",
            "message": "You haven't logged your breakfast yet today. Ensure you don't skip meals to keep your metabolic rate high.",
            "action_type": "navigate",
            "action_target": "food_diary",
            "action_label": "Log Past Breakfast",
            "timestamp": now.isoformat()
        })

    if cur_time > time(15, 30) and logged_meals_dict.get("Lunch", 0) == 0:
        notifications.append({
            "id": "meal-missed-lunch",
            "type": "missed_meal",
            "urgency": "warning",
            "title": "Lunch Window Passed",
            "message": "Your midday lunch hasn't been logged. Consistent meal timing helps regulate insulin and energy.",
            "action_type": "navigate",
            "action_target": "food_diary",
            "action_label": "Log Past Lunch",
            "timestamp": now.isoformat()
        })

    # 3. Hydration Check
    target_ml = int(profile.get("water_goal_ml") or 2500)
    hyd_row = fetch_one("SELECT COALESCE(SUM(amount_ml), 0) AS total_ml FROM hydration WHERE user_id = %s AND log_date = %s", (user_id, today))
    consumed_ml = int(hyd_row["total_ml"]) if hyd_row else 0
    deficit_ml = max(target_ml - consumed_ml, 0)

    wake_start = 8.0
    current_hour_float = now.hour + now.minute / 60.0
    hours_awake = max(min(current_hour_float - wake_start, 14.0), 0.0)
    expected_fraction = min(hours_awake / 14.0, 1.0)
    expected_ml = int(target_ml * expected_fraction)

    if consumed_ml < expected_ml and deficit_ml > 0:
        notifications.append({
            "id": "water-reminder",
            "type": "hydration",
            "urgency": "info",
            "title": "Hydration Reminder",
            "message": f"Stay hydrated! You've had {consumed_ml} ml of your {target_ml} ml target. Drink a fresh glass of water (+250 ml) now.",
            "action_type": "quick_water",
            "action_target": "250",
            "action_label": "+250 ml Water",
            "timestamp": now.isoformat()
        })

    # 4. Workout Reminder
    completed_today = fetch_all("SELECT id FROM workout_completions WHERE user_id = %s AND log_date = %s", (user_id, today))
    if not completed_today:
        if now.hour >= 13:
            notifications.append({
                "id": "workout-pending-reminder",
                "type": "workout",
                "urgency": "warning",
                "title": "Workout Pending Today",
                "message": "You haven't completed your workout routine yet today. A 15–20 minute session will maintain your active habit streak!",
                "action_type": "navigate",
                "action_target": "plan",
                "action_label": "Start Workout",
                "timestamp": now.isoformat()
            })

    return {
        "success": True,
        "unread_count": len(notifications),
        "notifications": notifications,
        "active_meal_window": current_meal,
        "meal_windows": {k: {"start": v["start"].strftime("%H:%M"), "end": v["end"].strftime("%H:%M"), "label": v["label"]} for k, v in MEAL_WINDOWS.items()}
    }

class QuickWaterRequest(BaseModel):
    amount_ml: int = 250

@notifications_router.post("/quick-water")
def quick_water_log(req: QuickWaterRequest, user: dict = Depends(get_current_user)):
    user_id = user["id"]
    today = date.today()
    execute("INSERT INTO hydration (user_id, amount_ml, log_date) VALUES (%s, %s, %s)", (user_id, req.amount_ml, today))
    sync_daily_habits(user_id, today)

    hyd_row = fetch_one("SELECT COALESCE(SUM(amount_ml), 0) AS total_ml FROM hydration WHERE user_id = %s AND log_date = %s", (user_id, today))
    return {"success": True, "total_consumed_ml": int(hyd_row["total_ml"])}
