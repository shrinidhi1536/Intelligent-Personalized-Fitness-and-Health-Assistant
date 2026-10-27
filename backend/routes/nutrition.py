from datetime import date
from fastapi import APIRouter, HTTPException, Depends, Query
from backend.db import fetch_one, fetch_all, execute
from backend.routes.auth import get_current_user, ensure_user_profile
from backend.models.schemas import FoodLogItem, ChecklistToggle, FoodSwapRequest
from backend.services.recommendation_service import (
    generate_or_get_daily_plan,
    swap_checklist_item
)
from backend.services.habit_engine import sync_daily_habits

nutrition_router = APIRouter(prefix="/api/nutrition", tags=["Nutrition"])

@nutrition_router.get("/foods")
def search_food_database(
    q: str = Query(None),
    category: str = Query(None),
    limit: int = Query(50),
    user: dict = Depends(get_current_user)
):
    sql = "SELECT * FROM food_database WHERE 1=1"
    params = []
    if q:
        sql += " AND LOWER(name) LIKE %s"
        params.append(f"%{q.lower().strip()}%")
    if category and category.lower() != "all":
        sql += " AND LOWER(category) = %s"
        params.append(category.lower())

    sql += " ORDER BY name ASC LIMIT %s"
    params.append(limit)

    rows = fetch_all(sql, tuple(params))
    return {"success": True, "count": len(rows), "foods": rows}

@nutrition_router.get("/categories")
def get_food_categories(user: dict = Depends(get_current_user)):
    rows = fetch_all("SELECT DISTINCT category FROM food_database WHERE category IS NOT NULL ORDER BY category ASC")
    cats = [r["category"] for r in rows if r["category"]]
    return {"success": True, "categories": cats}

@nutrition_router.get("/daily-plan")
@nutrition_router.get("/plan/today")
def get_daily_meal_plan(user: dict = Depends(get_current_user)):
    user_id = user["id"]
    profile = ensure_user_profile(user_id)
    plan = generate_or_get_daily_plan(user_id, profile, date.today())
    return {"success": True, "plan": plan}

@nutrition_router.post("/checklist/toggle")
def toggle_checklist_item(req: ChecklistToggle, user: dict = Depends(get_current_user)):
    user_id = user["id"]
    today = date.today()

    item = fetch_one("SELECT * FROM daily_plan_checklist WHERE id = %s AND user_id = %s", (req.checklist_id, user_id))
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found.")

    new_state = 1 if req.is_consumed else 0
    execute("UPDATE daily_plan_checklist SET is_consumed = %s WHERE id = %s", (new_state, req.checklist_id))

    if new_state == 1:
        # Automatically log to food_logs
        execute("""
            INSERT INTO food_logs 
            (user_id, food_id, food_name, serving, calories, protein_g, carbs_g, fat_g, meal_type, log_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id, item.get("food_id"), item["food_name"], item["serving"],
            float(item["calories"]), float(item["protein_g"]), float(item["carbs_g"]), float(item["fat_g"]),
            item["meal_type"], today
        ))
    else:
        # If unchecked, remove the corresponding log entry from today
        execute("""
            DELETE FROM food_logs 
            WHERE user_id = %s AND food_name = %s AND log_date = %s 
            ORDER BY id DESC LIMIT 1
        """, (user_id, item["food_name"], today))

    # Sync habits automatically
    sync_daily_habits(user_id, today)

    return {"success": True, "checklist_id": req.checklist_id, "is_consumed": bool(new_state)}

@nutrition_router.post("/checklist/swap")
def swap_item(req: FoodSwapRequest, user: dict = Depends(get_current_user)):
    user_id = user["id"]
    profile = fetch_one("SELECT * FROM profiles WHERE user_id = %s", (user_id,))
    if not profile:
        raise HTTPException(status_code=400, detail="Profile required.")

    res = swap_checklist_item(user_id, req.checklist_id, profile)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Could not swap item."))
    return res

@nutrition_router.get("/logs/today")
def get_today_food_logs(user: dict = Depends(get_current_user)):
    user_id = user["id"]
    today = date.today()

    rows = fetch_all("SELECT * FROM food_logs WHERE user_id = %s AND log_date = %s ORDER BY id DESC", (user_id, today))
    totals = fetch_one("""
        SELECT 
            COALESCE(SUM(calories), 0) as total_cals,
            COALESCE(SUM(protein_g), 0) as total_prot,
            COALESCE(SUM(carbs_g), 0) as total_carbs,
            COALESCE(SUM(fat_g), 0) as total_fat
        FROM food_logs WHERE user_id = %s AND log_date = %s
    """, (user_id, today))

    return {
        "success": True,
        "logs": rows,
        "summary": {
            "calories": float(totals["total_cals"]),
            "protein_g": float(totals["total_prot"]),
            "carbs_g": float(totals["total_carbs"]),
            "fat_g": float(totals["total_fat"])
        }
    }

@nutrition_router.post("/logs")
def log_food_manual(item: FoodLogItem, user: dict = Depends(get_current_user)):
    user_id = user["id"]
    log_date = item.log_date or str(date.today())

    row_id, _ = execute("""
        INSERT INTO food_logs 
        (user_id, food_id, food_name, serving, calories, protein_g, carbs_g, fat_g, meal_type, log_date)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (
        user_id, item.food_id, item.food_name, item.serving,
        item.calories, item.protein_g, item.carbs_g, item.fat_g,
        item.meal_type, log_date
    ))

    # Sync habits automatically
    sync_daily_habits(user_id, date.fromisoformat(log_date))

    return {"success": True, "log_id": row_id, "message": f"Logged {item.food_name} to {item.meal_type}!"}

@nutrition_router.delete("/logs/{log_id}")
def delete_food_log(log_id: int, user: dict = Depends(get_current_user)):
    user_id = user["id"]
    execute("DELETE FROM food_logs WHERE id = %s AND user_id = %s", (log_id, user_id))
    sync_daily_habits(user_id, date.today())
    return {"success": True, "message": "Log entry removed."}
