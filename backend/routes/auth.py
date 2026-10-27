import secrets
import hashlib
from datetime import datetime, timedelta, date
import jwt
from fastapi import APIRouter, HTTPException, Depends, Header, status
from werkzeug.security import generate_password_hash, check_password_hash
from backend.config import config
from backend.db import fetch_one, execute
from backend.models.schemas import UserRegister, UserLogin, ForgotPasswordRequest, ResetPasswordRequest

auth_router = APIRouter(prefix="/api/auth", tags=["Auth"])

def ensure_user_profile(user_id: int) -> dict:
    profile = fetch_one("SELECT * FROM profiles WHERE user_id = %s", (user_id,))
    if not profile:
        execute("""
            INSERT INTO profiles (
                user_id, age, gender, height_cm, weight_kg, target_weight_kg, goal,
                activity_level, diet_preference, cuisine_preference, allergies, disliked_foods,
                workout_type, workout_duration_min, equipment, fitness_level, preferred_duration,
                sleep_duration_hours, water_intake_target_ml, calorie_goal, protein_goal_g,
                carbs_goal_g, fat_goal_g, water_goal_ml
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s
            )
        """, (
            user_id, 25, 'female', 168.0, 65.0, 58.0, 'loss',
            1.375, 'Vegetarian', 'South Indian', 'None', 'None',
            'Cardio', 30, 'No Equipment', 'Beginner', 30,
            7.5, 2500, 1850, 110,
            220, 55, 2500
        ))
        today = date.today()
        prog = fetch_one("SELECT id FROM progress WHERE user_id=%s AND log_date=%s", (user_id, today))
        if not prog:
            execute("INSERT INTO progress (user_id, weight_kg, log_date) VALUES (%s, %s, %s)", (user_id, 65.0, today))
        profile = fetch_one("SELECT * FROM profiles WHERE user_id = %s", (user_id,))
        try:
            from backend.services.recommendation_service import generate_or_get_daily_plan
            generate_or_get_daily_plan(user_id, profile, today)
        except Exception as e:
            print(f"Warning: Initial daily plan generation error: {e}")
    return profile

def create_access_token(user_id: int, email: str) -> str:
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": datetime.utcnow() + timedelta(minutes=config.ACCESS_TOKEN_EXPIRE_MINUTES)
    }
    return jwt.encode(payload, config.SECRET_KEY, algorithm=config.ALGORITHM)

def get_current_user(authorization: str = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication token required.")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, config.SECRET_KEY, algorithms=[config.ALGORITHM])
        user_id = int(payload.get("sub"))
        user = fetch_one("SELECT id, name, email FROM users WHERE id = %s", (user_id,))
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token.")

@auth_router.post("/register")
def register(req: UserRegister):
    name = req.name.strip()
    email = req.email.strip().lower()
    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty.")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    if req.password != req.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    existing = fetch_one("SELECT id FROM users WHERE email = %s", (email,))
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    password_hash = generate_password_hash(req.password)
    user_id, _ = execute("INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s)", (name, email, password_hash))
    token = create_access_token(user_id, email)

    # Initialize complete personalized default profile and daily plan
    profile = ensure_user_profile(user_id)

    return {
        "success": True,
        "message": "Registration successful! Welcome to your dashboard.",
        "token": token,
        "user": {
            "id": user_id,
            "name": name,
            "email": email,
            "onboarding_completed": True
        },
        "profile": profile
    }

@auth_router.post("/login")
def login(req: UserLogin):
    email = req.email.strip().lower()
    user = fetch_one("SELECT id, name, email, password_hash FROM users WHERE email = %s", (email,))
    if not user or not check_password_hash(user["password_hash"], req.password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    profile = ensure_user_profile(user["id"])
    token = create_access_token(user["id"], user["email"])

    return {
        "success": True,
        "message": "Login successful!",
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "onboarding_completed": True
        },
        "profile": profile
    }

@auth_router.get("/me")
def get_me(user: dict = Depends(get_current_user)):
    profile = ensure_user_profile(user["id"])
    return {
        "success": True,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "onboarding_completed": True
        },
        "profile": profile
    }

@auth_router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest):
    email = req.email.strip().lower()
    user = fetch_one("SELECT id, name, email FROM users WHERE email = %s", (email,))
    if not user:
        # Prevent account enumeration or clearly explain in dev mode
        return {
            "success": True,
            "message": "If an account with that email exists, password reset instructions have been generated."
        }

    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    expires_at = datetime.utcnow() + timedelta(hours=1)

    execute("""
        INSERT INTO password_resets (user_id, token_hash, expires_at)
        VALUES (%s, %s, %s)
    """, (user["id"], token_hash, expires_at))

    reset_url = f"/#reset-password?token={raw_token}"
    return {
        "success": True,
        "message": f"Password reset link generated for {user['name']}.",
        "reset_link": reset_url,
        "expires_in": "1 hour",
        "dev_instructions": "Click the reset link below to set a new password."
    }

@auth_router.post("/reset-password")
def reset_password(req: ResetPasswordRequest):
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    if req.new_password != req.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    token_hash = hashlib.sha256(req.token.encode()).hexdigest()
    record = fetch_one("""
        SELECT id, user_id, expires_at, used_at FROM password_resets 
        WHERE token_hash = %s ORDER BY id DESC LIMIT 1
    """, (token_hash,))

    if not record:
        raise HTTPException(status_code=400, detail="Invalid password reset token.")
    if record["used_at"] is not None:
        raise HTTPException(status_code=400, detail="This reset token has already been used.")
    if datetime.utcnow() > record["expires_at"]:
        raise HTTPException(status_code=400, detail="This reset token has expired. Please request a new one.")

    new_hash = generate_password_hash(req.new_password)
    execute("UPDATE users SET password_hash = %s WHERE id = %s", (new_hash, record["user_id"]))
    execute("UPDATE password_resets SET used_at = %s WHERE id = %s", (datetime.utcnow(), record["id"]))

    return {
        "success": True,
        "message": "Your password has been successfully reset! You can now log in with your new password."
    }
