from datetime import date, timedelta
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from backend.routes.auth import get_current_user
from backend.db import fetch_one, fetch_all, execute
from backend.services.habit_engine import sync_daily_habits

habits_router = APIRouter(prefix="/api/habits", tags=["Habits"])

class HabitToggleRequest(BaseModel):
    habit_name: str
    status: bool

@habits_router.get("/today")
def get_today_habits(user: dict = Depends(get_current_user)):
    user_id = user["id"]
    return sync_daily_habits(user_id, date.today())

@habits_router.get("/weekly")
def get_weekly_habits(user: dict = Depends(get_current_user)):
    user_id = user["id"]
    today = date.today()
    days = []

    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        # Ensure day habit is synced
        sync_daily_habits(user_id, d)
        h = fetch_one("SELECT * FROM habits WHERE user_id = %s AND habit_date = %s", (user_id, d))
        if h:
            days.append({
                "date": str(d),
                "day_name": d.strftime("%a"),
                "water": bool(h["water"]),
                "workout": bool(h["workout"]),
                "calorie": bool(h["calorie"]),
                "protein": bool(h["protein"]),
                "sleep": bool(h["sleep"]),
                "meals": bool(h["meals"]),
                "score": sum([h["water"], h["workout"], h["calorie"], h["protein"], h["sleep"], h["meals"]])
            })

    return {"success": True, "week": days}

@habits_router.post("/manual-toggle")
def manual_habit_toggle(req: HabitToggleRequest, user: dict = Depends(get_current_user)):
    user_id = user["id"]
    today = date.today()
    allowed_habits = ["water", "workout", "calorie", "protein", "sleep", "meals"]
    h_name = req.habit_name.lower().strip()

    if h_name not in allowed_habits:
        raise HTTPException(status_code=400, detail=f"Invalid habit name. Allowed: {allowed_habits}")

    val = 1 if req.status else 0
    existing = fetch_one("SELECT id FROM habits WHERE user_id = %s AND habit_date = %s", (user_id, today))
    if existing:
        execute(f"UPDATE habits SET `{h_name}` = %s WHERE id = %s", (val, existing["id"]))
    else:
        execute(f"INSERT INTO habits (user_id, habit_date, `{h_name}`) VALUES (%s, %s, %s)", (user_id, today, val))

    return sync_daily_habits(user_id, today)
