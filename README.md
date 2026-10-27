# Intelligent Personalized Fitness and Health Assistant (Pro)

An original, production-grade, database-backed personalized fitness and health platform inspired by the depth and experience of top modern fitness platforms, with genuine scientific personalization across workouts, nutrition, habits, and AI coaching.

---

## 🌟 Key Architecture & Capabilities

1. **Secure Multi-User Authentication & Real Forgot Password**:
   - Cryptographically hashed passwords with `scrypt` and JWT authentication.
   - Real working forgot-password system with secure 1-hour expiration tokens stored in MySQL `password_resets`.
   - Preserves all existing registered user accounts in `ipfha_db`.

2. **Adaptive Multi-Step 12-Step Dynamic Onboarding ("Question 4 of 12")**:
   - One question per screen with live progress percentage.
   - Calculates scientific Mifflin-St Jeor BMR, TDEE, safe caloric deficit/surplus, target milestone completion date, and BMI.

3. **Dynamic Personalized Dashboard**:
   - Adapts to user's real biometrics and daily activity.
   - Dynamic calorie budget bar with live macro tracking (Protein, Carbs, Fat).
   - Fluid hydration ring with +250ml and +500ml quick logging.
   - Spotlight recommended workout routine with instant studio launch.
   - "Your Plan Today" meal cards with live checkboxes and macro-matched "Replace" buttons.

4. **Workout Studio with Video Demonstrations & Countdown Timer**:
   - Curated workouts across Pilates, HIIT, Strength, Mobility, Cardio, Yoga, and Flexibility.
   - Embedded video guides with synchronized countdown and rest interval timers.
   - Web Audio API synthesizer for 3-2-1 countdown ticks, interval alerts, and victory fanfare.
   - Celebratory completion modal with dynamic follow-up recommendations ("Here’s more for you").

5. **AI Diet Planner & 150+ Structured Food Database**:
   - Breakfast, Lunch, Dinner, and Snacks aligned with user's exact calorie and protein targets.
   - Zero junk food / allergen exclusions.
   - Checking items automatically logs them to `food_logs` and deducts from remaining calories.
   - Smart Food Substitution ("Replace") searches for nutritionally equivalent alternatives.

6. **AI Vision Food & Plate Scanner**:
   - Upload or drag & drop food plate photos.
   - Multimodal image analysis identifies dishes and portions, cross-referencing verified database entries.
   - Review table with calories, protein, carbs, fat before batch confirmation to food log.

7. **Context-Aware AI Fitness Coach**:
   - Injects user's profile, today's meals consumed, remaining macros, today's workout status, and hydration into the prompt.
   - Answers specific questions with genuine personalized advice.

8. **Automatic Activity & Habit Tracker**:
   - Automatically detects progress from application events (water logged >= 1500ml, completed workout video, logged meals).
   - 7-day consistency adherence matrix.

9. **Smart Progress Analytics**:
   - Chart.js weight trend trajectory vs target milestone line.
   - Daily calorie and protein consistency bar graphs.
   - Hydration consistency line graphs.

---

## 🚀 How to Run

1. Open PowerShell in `C:\Users\SHRINIDHI\Downloads\intelligent-fitness-pro`:
   ```powershell
   python run.py
   ```
2. Open your browser and navigate to:
   ```
   http://127.0.0.1:8000
   ```
