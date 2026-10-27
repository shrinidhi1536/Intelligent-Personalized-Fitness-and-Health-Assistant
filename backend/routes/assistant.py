from fastapi import APIRouter, HTTPException, Depends
from backend.routes.auth import get_current_user
from backend.db import fetch_one
from backend.models.schemas import AIChatRequest
from backend.services.ai_service import generate_ai_response

assistant_router = APIRouter(prefix="/api/assistant", tags=["AI Assistant"])

@assistant_router.post("/chat")
def chat_with_assistant(req: AIChatRequest, user: dict = Depends(get_current_user)):
    user_id = user["id"]
    profile = fetch_one("SELECT * FROM profiles WHERE user_id = %s", (user_id,))
    if not profile:
        profile = {
            "name": user["name"],
            "goal": "fitness",
            "weight_kg": 70,
            "target_weight_kg": 65,
            "diet_preference": "Vegetarian",
            "allergies": "None",
            "disliked_foods": "None",
            "workout_type": "Cardio",
            "equipment": "No Equipment",
            "fitness_level": "Beginner",
            "calorie_goal": 2000,
            "protein_goal_g": 120,
            "carbs_goal_g": 250,
            "fat_goal_g": 65,
            "water_goal_ml": 2500
        }

    message = req.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    reply = generate_ai_response(user_id, profile, message)

    return {
        "success": True,
        "reply": reply,
        "suggested_questions": [
            "What workout should I do today?",
            "What should I eat after today's workout?",
            "How much protein do I need?",
            "I only have 15 minutes today. What should I do?",
            "Can you explain my calorie deficit?"
        ]
    }
