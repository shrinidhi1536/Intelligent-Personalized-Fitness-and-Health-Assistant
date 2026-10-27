from datetime import date
from typing import List
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel
from backend.routes.auth import get_current_user
from backend.services.scanner_service import analyze_food_image, get_preset_result
from backend.db import execute
from backend.services.habit_engine import sync_daily_habits

scanner_router = APIRouter(prefix="/api/scanner", tags=["Food Scanner"])

class ConfirmedFoodItem(BaseModel):
    food_id: int = None
    name: str
    serving: str
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    meal_type: str = "Lunch"

class ConfirmBatchRequest(BaseModel):
    meal_type: str = "Lunch"
    items: List[ConfirmedFoodItem]

from backend.services.scanner_service import analyze_food_image, get_preset_result, update_gemini_api_key
from backend.config import config
from fastapi import Header

class SetApiKeyRequest(BaseModel):
    gemini_api_key: str

@scanner_router.get("/status")
def get_scanner_status(user: dict = Depends(get_current_user)):
    has_key = bool(config.GEMINI_API_KEY)
    return {
        "success": True,
        "has_gemini_key": has_key,
        "engine_name": "Google Gemini Vision AI" if has_key else "Smart Local Vision & Plate Decomposer",
        "description": "Human-level multimodal food plate intelligence active" if has_key else "Local visual and semantic plate decomposition active"
    }

@scanner_router.post("/set-key")
def set_gemini_key(req: SetApiKeyRequest, user: dict = Depends(get_current_user)):
    res = update_gemini_api_key(req.gemini_api_key)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Failed to configure API key."))
    return res

@scanner_router.get("/preset/{preset_name}")
def get_scanner_preset(preset_name: str, user: dict = Depends(get_current_user)):
    return get_preset_result(preset_name)

@scanner_router.post("/analyze")
async def scan_food_image(
    file: UploadFile = File(...), 
    x_gemini_key: str = Header(None), 
    user: dict = Depends(get_current_user)
):
    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty image file uploaded.")

    result = analyze_food_image(contents, file.filename or "food.jpg", user_api_key=x_gemini_key)
    return result

@scanner_router.post("/confirm-batch")
def confirm_scanned_batch(req: ConfirmBatchRequest, user: dict = Depends(get_current_user)):
    user_id = user["id"]
    today = date.today()

    if not req.items:
        raise HTTPException(status_code=400, detail="No items to add to food log.")

    logged_ids = []
    for item in req.items:
        row_id, _ = execute("""
            INSERT INTO food_logs 
            (user_id, food_id, food_name, serving, calories, protein_g, carbs_g, fat_g, meal_type, log_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id, item.food_id, item.name, item.serving,
            item.calories, item.protein_g, item.carbs_g, item.fat_g,
            req.meal_type, today
        ))
        logged_ids.append(row_id)

    # Automatically sync habits
    sync_daily_habits(user_id, today)

    return {
        "success": True,
        "message": f"Successfully logged {len(logged_ids)} scanned food items to {req.meal_type}!",
        "logged_count": len(logged_ids)
    }
