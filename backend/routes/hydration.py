from datetime import date
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from backend.routes.auth import get_current_user
from backend.db import fetch_one, fetch_all, execute
from backend.models.schemas import HydrationLogRequest
from backend.services.habit_engine import sync_daily_habits

hydration_router = APIRouter(prefix="/api/hydration", tags=["Hydration"])

class WaterSettingsRequest(BaseModel):
    interval_minutes: int = 60
    enabled: bool = True
    snoozed_until: str = None

@hydration_router.get("/status")
@hydration_router.get("/today")
def get_hydration_status(user: dict = Depends(get_current_user)):
    user_id = user["id"]
    today = date.today()

    profile = fetch_one("SELECT water_goal_ml FROM profiles WHERE user_id = %s", (user_id,))
    target_ml = profile["water_goal_ml"] if profile and profile.get("water_goal_ml") else 2500

    row = fetch_one("""
        SELECT COALESCE(SUM(amount_ml), 0) AS total_ml, COUNT(*) AS log_count 
        FROM hydration WHERE user_id = %s AND log_date = %s
    """, (user_id, today))

    consumed = int(row["total_ml"]) if row else 0
    remaining = max(target_ml - consumed, 0)
    percentage = min(round((consumed / max(target_ml, 1)) * 100), 100)

    # Hydration reminder message
    if consumed >= target_ml:
        reminder_msg = f"Awesome job! 🎉 You've hit 100% of your {round(target_ml/1000, 1)}L hydration goal."
    else:
        reminder_msg = f"Time to hydrate 💧 You have consumed {round(consumed/1000, 2)}L of your {round(target_ml/1000, 1)}L daily target."

    logs = fetch_all("SELECT id, amount_ml, created_at FROM hydration WHERE user_id = %s AND log_date = %s ORDER BY created_at DESC", (user_id, today))

    return {
        "success": True,
        "target_ml": target_ml,
        "consumed_ml": consumed,
        "remaining_ml": remaining,
        "percentage": percentage,
        "reminder_message": reminder_msg,
        "logs": logs
    }

@hydration_router.post("/log")
def log_water(req: HydrationLogRequest, user: dict = Depends(get_current_user)):
    user_id = user["id"]
    today = date.today()

    if req.amount_ml <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0.")

    row_id, _ = execute("""
        INSERT INTO hydration (user_id, amount_ml, log_date)
        VALUES (%s, %s, %s)
    """, (user_id, req.amount_ml, today))

    # Sync habits automatically
    sync_daily_habits(user_id, today)

    return {"success": True, "log_id": row_id, "added_ml": req.amount_ml, "message": f"Added {req.amount_ml}ml of water!"}

@hydration_router.delete("/logs/{log_id}")
def delete_water_log(log_id: int, user: dict = Depends(get_current_user)):
    user_id = user["id"]
    execute("DELETE FROM hydration WHERE id = %s AND user_id = %s", (log_id, user_id))
    sync_daily_habits(user_id, date.today())
    return {"success": True, "message": "Hydration log removed."}
