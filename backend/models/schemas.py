from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    confirm_password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    confirm_password: str

class OnboardingSubmit(BaseModel):
    age: int
    gender: str
    height_cm: float
    weight_kg: float
    target_weight_kg: float
    goal: str
    activity_level: str
    diet_preference: str
    cuisine_preference: Optional[str] = "South Indian"
    allergies: Optional[str] = "None"
    disliked_foods: Optional[str] = "None"
    workout_type: Optional[str] = "Cardio"
    preferred_duration: Optional[int] = 30
    equipment: Optional[str] = "No Equipment"
    fitness_level: Optional[str] = "Beginner"
    water_intake_target_ml: Optional[int] = 2500
    sleep_duration_hours: Optional[float] = 7.5
    survey_data: Optional[dict] = None

class FoodLogItem(BaseModel):
    food_id: Optional[int] = None
    food_name: str
    serving: str
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    meal_type: str
    log_date: Optional[str] = None

class ChecklistToggle(BaseModel):
    checklist_id: int
    is_consumed: bool

class FoodSwapRequest(BaseModel):
    checklist_id: int

class WorkoutCompletionSubmit(BaseModel):
    workout_id: Optional[int] = None
    workout_name: str
    duration_min: int
    calories_burned: float
    exercises_completed: int = 1

class HydrationLogRequest(BaseModel):
    amount_ml: int

class AIChatRequest(BaseModel):
    message: str

class WeightLogRequest(BaseModel):
    weight_kg: float
