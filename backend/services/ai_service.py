import json
import re
from datetime import date
from backend.config import config
from backend.db import fetch_one, fetch_all

def build_user_context(user_id: int, profile: dict) -> dict:
    today = date.today()

    # 1. Nutrition today
    nutr = fetch_one("""
        SELECT 
            COALESCE(SUM(calories), 0) AS total_cals,
            COALESCE(SUM(protein_g), 0) AS total_prot,
            COALESCE(SUM(carbs_g), 0) AS total_carbs,
            COALESCE(SUM(fat_g), 0) AS total_fat
        FROM food_logs WHERE user_id = %s AND log_date = %s
    """, (user_id, today))

    consumed_cals = float(nutr["total_cals"]) if nutr else 0.0
    consumed_prot = float(nutr["total_prot"]) if nutr else 0.0
    consumed_carbs = float(nutr["total_carbs"]) if nutr else 0.0
    consumed_fat = float(nutr["total_fat"]) if nutr else 0.0

    target_cals = float(profile.get("calorie_goal", 2000))
    target_prot = float(profile.get("protein_goal_g", 120))
    target_carbs = float(profile.get("carbs_goal_g", 250))
    target_fat = float(profile.get("fat_goal_g", 65))

    # 2. Workouts today
    w_today = fetch_all("""
        SELECT workout_name, duration_min, calories_burned 
        FROM workout_completions WHERE user_id = %s AND log_date = %s
    """, (user_id, today))
    total_burned = sum(float(w.get("calories_burned") or 0) for w in (w_today or []))

    # 3. Hydration today
    hyd = fetch_one("""
        SELECT COALESCE(SUM(amount_ml), 0) AS total_ml 
        FROM hydration WHERE user_id = %s AND log_date = %s
    """, (user_id, today))
    water_ml = int(hyd["total_ml"]) if hyd else 0

    user_row = fetch_one("SELECT name FROM users WHERE id = %s", (user_id,))
    user_name = (user_row["name"] if user_row and user_row.get("name") else profile.get("name", "Athlete"))

    return {
        "user_name": user_name,
        "goal": profile.get("goal", "fitness"),
        "current_weight_kg": float(profile.get("weight_kg", 70)),
        "target_weight_kg": float(profile.get("target_weight_kg", 65)),
        "diet_preference": profile.get("diet_preference", "Vegetarian"),
        "allergies": profile.get("allergies", "None"),
        "disliked_foods": profile.get("disliked_foods", "None"),
        "preferred_workout": profile.get("workout_type", "Cardio"),
        "equipment": profile.get("equipment", "No Equipment"),
        "fitness_level": profile.get("fitness_level", "Beginner"),
        "total_burned_cals": round(total_burned, 1),
        "nutrition": {
            "consumed": {
                "calories": round(consumed_cals, 1),
                "protein_g": round(consumed_prot, 1),
                "carbs_g": round(consumed_carbs, 1),
                "fat_g": round(consumed_fat, 1)
            },
            "target": {
                "calories": target_cals,
                "protein_g": target_prot,
                "carbs_g": target_carbs,
                "fat_g": target_fat
            },
            "remaining": {
                "calories": max(round(target_cals - consumed_cals, 1), 0),
                "protein_g": max(round(target_prot - consumed_prot, 1), 0),
                "carbs_g": max(round(target_carbs - consumed_carbs, 1), 0),
                "fat_g": max(round(target_fat - consumed_fat, 1), 0)
            }
        },
        "workouts_today": w_today or [],
        "hydration_ml": water_ml,
        "water_target_ml": int(profile.get("water_goal_ml", 2500))
    }

_ai_client_cache = {}

def get_cached_chat_client(api_key: str):
    if api_key not in _ai_client_cache:
        from google import genai
        from google.genai import types
        retry_opt = types.HttpRetryOptions(attempts=1)
        http_opt = types.HttpOptions(timeout=15000, retry_options=retry_opt)
        _ai_client_cache[api_key] = genai.Client(api_key=api_key, http_options=http_opt)
    return _ai_client_cache[api_key]

def generate_ai_response(user_id: int, profile: dict, message: str) -> str:
    ctx = build_user_context(user_id, profile)

    # Check if real Gemini API key is configured
    if config.GEMINI_API_KEY:
        try:
            client = get_cached_chat_client(config.GEMINI_API_KEY)
            
            w_details = [w['workout_name'] + ' (' + str(round(float(w['calories_burned']), 1)) + ' kcal)' for w in ctx['workouts_today']]
            w_str = ', '.join(w_details) if w_details else 'No workouts logged yet'

            net_cals = round(ctx['nutrition']['consumed']['calories'] - ctx['total_burned_cals'], 1)

            system_prompt = f"""You are Intelligent Fitness AI, an expert, encouraging, scientifically grounded personalized fitness and nutrition coach.
The user ({ctx['user_name']}) is asking you a question. You have access to their real-time profile and today's logged data:

User Context:
- User Name: {ctx['user_name']}
- Goal: {ctx['goal']} (Current Weight: {ctx['current_weight_kg']} kg, Target: {ctx['target_weight_kg']} kg)
- Diet Preference: {ctx['diet_preference']}
- Allergies: {ctx['allergies']}
- Dislikes: {ctx['disliked_foods']}
- Equipment Available: {ctx['equipment']}
- Fitness Level: {ctx['fitness_level']}
- Daily Calorie Target: {ctx['nutrition']['target']['calories']} kcal (Consumed: {ctx['nutrition']['consumed']['calories']} kcal, Remaining: {ctx['nutrition']['remaining']['calories']} kcal)
- Active Workout Calories Burned Today: {ctx['total_burned_cals']} kcal across {len(ctx['workouts_today'])} sessions: {w_str}
- Net Calories Today (Consumed - Burned): {net_cals} kcal
- Protein Target: {ctx['nutrition']['target']['protein_g']}g (Consumed: {ctx['nutrition']['consumed']['protein_g']}g, Remaining: {ctx['nutrition']['remaining']['protein_g']}g)
- Carbs Target: {ctx['nutrition']['target']['carbs_g']}g (Consumed: {ctx['nutrition']['consumed']['carbs_g']}g, Remaining: {ctx['nutrition']['remaining']['carbs_g']}g)
- Fat Target: {ctx['nutrition']['target']['fat_g']}g (Consumed: {ctx['nutrition']['consumed']['fat_g']}g, Remaining: {ctx['nutrition']['remaining']['fat_g']}g)
- Water consumed today: {ctx['hydration_ml']} ml of {ctx['water_target_ml']} ml

STRICT FORMATTING & LENGTH RULES:
1. Keep your reply ULTRA-CONCISE (under 70-90 words total). Never write long essays, extensive guides, or overwhelming text blocks.
2. Directly answer the user's question in the very first sentence.
3. Use 2 to 3 short bullet points highlighting only the most relevant numbers/stats.
4. Conclude with 1 punchy, actionable sentence.
5. Address the user warmly by name ({ctx['user_name']})."""

            for model_name in ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite-preview', 'gemini-3.1-flash-lite', 'gemini-flash-latest']:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=f"System Context:\n{system_prompt}\n\nUser Question:\n{message}"
                    )
                    if response and response.text:
                        return response.text.strip()
                except Exception as m_err:
                    continue
        except Exception as e:
            print(f"[WARN] Gemini API error, falling back to intelligent contextual engine: {e}")

    # Intelligent Contextual Reasoning Engine Fallback
    msg = message.lower().strip()
    rem = ctx["nutrition"]["remaining"]
    cons = ctx["nutrition"]["consumed"]
    target = ctx["nutrition"]["target"]
    diet = ctx["diet_preference"]
    goal = ctx["goal"]
    weight = ctx["current_weight_kg"]
    target_w = ctx["target_weight_kg"]
    water_cons = ctx["hydration_ml"]
    water_target = ctx["water_target_ml"]

    # 1. Post-workout nutrition / Recovery meal
    if any(k in msg for k in ["after workout", "post workout", "post-workout", "eat after", "drink after", "protein shake after"]):
        if diet == "Vegetarian":
            snacks = "Low-fat Paneer bhurji (100g) with 1 whole wheat toast, or 1 cup Greek yogurt topped with chia/pumpkin seeds"
        elif diet == "Vegan":
            snacks = "Sprouted green moong chaat with chopped cucumber & lemon, or a 150g firm tofu stir-fry with a pinch of black pepper"
        elif diet == "Eggetarian":
            snacks = "3 boiled egg whites + 1 whole egg with a banana, or a 2-egg vegetable scramble with whole wheat toast"
        else:
            snacks = "120g grilled chicken breast with steamed sweet potato, or 3 egg whites with a bowl of warm oats"

        return f"Great question! Since your goal is **{goal.replace('_', ' ').title()}**, optimal post-workout recovery focuses on replenishing muscle glycogen and providing essential amino acids for muscle protein synthesis (MPS).\n\n" \
               f"**Your Personalized Context Today:**\n" \
               f"• Remaining Protein Budget: **{rem['protein_g']}g** (Target: {target['protein_g']}g)\n" \
               f"• Remaining Calorie Budget: **{rem['calories']} kcal**\n\n" \
               f"**Recommended Recovery Meals for {diet}:**\n" \
               f"• {snacks}\n" \
               f"• Rehydration: Pair with at least 350-500 ml of water or tender coconut water to restore fluid and electrolytes.\n\n" \
               f"💡 *Aim to consume this within 45 to 60 minutes after your workout session for peak nutrient absorption.*"

    # 2. Pre-workout nutrition / Coffee / Caffeine
    if any(k in msg for k in ["pre-workout", "pre workout", "before workout", "coffee", "caffeine", "drink before"]):
        return f"**Pre-Workout Fueling & Caffeine Strategy:**\n\n" \
               f"• **Black Coffee / Caffeine**: A cup of black coffee (100-200mg caffeine) 30-45 minutes before training acts as an adenosine receptor antagonist, boosting neural drive, focus, and fatty acid oxidation.\n" \
               f"• **Quick Carbohydrates**: If training in a depleted state, 15-20g of fast-digesting carbs (like half a banana or 2 dates) elevates blood glucose for peak muscular output.\n" \
               f"• **Hydration Status**: You have logged **{water_cons} ml** of water today (Goal: {water_target} ml). Drink 300ml of water with a pinch of pink salt before training to prevent cramps and support pump.\n\n" \
               f"💡 *Avoid heavy fats or high fiber 1 hour before training to prevent gastrointestinal sluggishness.*"

    # 3. Knee / Back / Joint Pain / Injuries
    if any(k in msg for k in ["knee", "joint", "back pain", "lower back", "shoulder pain", "hurt", "injury", "pain"]):
        return f"⚠️ **Safety & Injury Management Protocol:**\n\n" \
               f"1. **Stop Painful Range of Motion**: Never push through sharp, stabbing, or joint pain. Discomfort in muscles (burning) is normal; joint or tendon pain is a signal to stop.\n" \
               f"2. **Biomechanics Check**:\n" \
               f"   • *Squats/Lunges*: Ensure knees track directly over your second toe and do not collapse inward (valgus). Initiate movements by hinging at the hips first.\n" \
               f"   • *Lower Back*: Keep your ribcage stacked over your pelvis; engage your transverse abdominis rather than arching your lumbar spine.\n" \
               f"3. **Low-Impact Alternatives in Your Routine**:\n" \
               f"   • Swap jumping squats for **Glute Bridges** or **Wall Sits**.\n" \
               f"   • Use **Wall Pilates Core & Posture** or **Bedtime Deep Rest Mobility Stretch** for zero-impact decompression.\n\n" \
               f"*(Note: If pain persists beyond 48 hours or includes swelling, please consult a physiotherapist or medical professional).* "

    # 4. Belly Fat / Spot Reduction / Stubborn Fat
    if any(k in msg for k in ["belly fat", "stomach", "abs", "spot reduction", "love handles", "waist"]):
        return f"**The Science of Losing Belly & Abdominal Fat:**\n\n" \
               f"• **Spot Reduction is a Myth**: You cannot choose where your body oxidizes triglycerides first. Adipose tissue loss occurs systemically when you sustain an energy deficit.\n" \
               f"• **Your Calorie Target**: Based on your weight of **{weight} kg** and goal of **{target_w} kg**, your calibrated daily target is **{target['calories']} kcal**. Today you have consumed **{cons['calories']} kcal** ({rem['calories']} kcal left).\n" \
               f"• **Visceral Fat vs Subcutaneous Fat**: Abdominal visceral fat responds strongly to reducing refined sugars, alcohol, and elevated cortisol. Getting 7-8 hours of sleep is as crucial as cardio.\n" \
               f"• **What Actually Works**:\n" \
               f"   1. Maintain your daily calorie budget.\n" \
               f"   2. Prioritize your **{target['protein_g']}g** protein target to preserve lean tissue.\n" \
               f"   3. Combine core stabilization (planks, bird-dogs) with daily steps (8k-10k)."

    # 5. Creatine & Supplements (Whey, Multivitamin, B12, D3)
    if any(k in msg for k in ["creatine", "supplement", "whey", "protein powder", "bcaa", "vitamin d", "b12", "multivitamin"]):
        return f"**Evidence-Based Supplement Breakdown:**\n\n" \
               f"• **Creatine Monohydrate (3-5g daily)**: The most researched sports supplement in the world. It saturates intramuscular phosphocreatine stores, boosting ATP regeneration during high-intensity efforts. It causes harmless intracellular hydration within muscle cells (not bloating).\n" \
               f"• **Whey / Plant Protein**: A convenient tool to help hit your **{target['protein_g']}g** daily protein target if whole foods fall short. 1 scoop typically yields 24-26g of high-leucine protein.\n" \
               f"• **Micronutrients for {diet} Diets**: Ensure adequate Vitamin D3 (immune & testosterone support) and Vitamin B12 / Iron, especially if following vegetarian or plant-centric eating.\n\n" \
               f"💡 *Remember: Supplements are the final 5%. 95% of your results come from hitting your daily {target['calories']} kcal and consistent workouts.*"

    # 6. Intermittent Fasting / Skipping Meals / Fasting Windows
    if any(k in msg for k in ["fasting", "intermittent fasting", "16:8", "skip breakfast", "eating window"]):
        return f"**Intermittent Fasting & Metabolic Adaptation:**\n\n" \
               f"• **How It Works**: Protocols like 16:8 (16 hours fasting, 8 hours eating) do not possess magical fat-burning properties on their own; their primary benefit is simplifying caloric control and stabilizing insulin levels.\n" \
               f"• **Crucial Rule**: In your 8-hour window, you must still consume your required **{target['calories']} kcal** and **{target['protein_g']}g protein**. Under-eating protein during fasting windows causes muscle catabolism and metabolic slowdown.\n" \
               f"• **Hydration During Fasting**: Zero-calorie fluids like water, black coffee, and green tea are completely fine and keep electrolyte balance steady.\n\n" \
               f"💡 *If fasting causes fatigue, brain fog, or evening binge cravings, a balanced 3-meal cadence is superior for long-term adherence.*"

    # 7. Sleep, Insomnia & Night Recovery
    if any(k in msg for k in ["sleep", "insomnia", "bedtime", "tired", "rest", "fatigue", "sore", "recovery"]):
        return f"**Recovery, Sleep Architecture & Hormonal Balance:**\n\n" \
               f"• **Slow-Wave (Deep) Sleep**: Over 70% of human growth hormone (HGH) pulse release and muscular tissue repair occurs during stage 3 and 4 deep sleep.\n" \
               f"• **Appetite Regulation**: Sleeping < 6.5 hours increases ghrelin (the hunger hormone) by up to 15% and decreases leptin (satiety), making your {target['calories']} kcal target harder to maintain the next day.\n" \
               f"• **Actionable Evening Habits**:\n" \
               f"   1. Cut off caffeine 8-9 hours before your targeted bedtime.\n" \
               f"   2. Perform the **Bedtime Deep Rest & Mobility Stretch** routine in your Workouts studio.\n" \
               f"   3. Keep your room dark, cool (18-20°C), and avoid blue screens 45 minutes before sleep."

    # 8. Carbs, White Rice, Roti & Late-Night Eating
    if any(k in msg for k in ["rice", "roti", "bread", "carbs", "carbohydrate", "night", "late night", "sugar", "craving"]):
        return f"**Carbohydrates, Rice & Late-Night Digestion:**\n\n" \
               f"• **Myth Buster**: Carbs eaten after 7 PM do not automatically turn into body fat. Fat gain is governed by 24-hour energy balance, not the clock on the wall.\n" \
               f"• **Your Target Carbs Today**: Your profile target is **{target['carbs_g']}g** carbs. Remaining today: **{rem['carbs_g']}g**.\n" \
               f"• **White Rice vs Brown Rice / Roti**: White rice is easily digestible and replenishes glycogen quickly. The key is portion control and glycemic buffering: pair your 150g rice with fiber (dal/sabzi) and protein (paneer/curd/eggs) to flatten insulin spikes.\n\n" \
               f"💡 *If you experience night sugar cravings, it typically indicates inadequate protein or water earlier in the afternoon.*"

    # 9. Hydration & Water Intake
    if any(k in msg for k in ["water", "hydration", "drink", "dehydration", "thirsty"]):
        pct = round((water_cons / max(water_target, 1)) * 100)
        return f"**Hydration & Fluid Homeostasis Status:**\n\n" \
               f"• **Current Progress**: You have logged **{water_cons} ml** of your **{water_target} ml** goal today (**{pct}%**).\n" \
               f"• **Metabolic Function**: Even a 2% drop in cellular hydration decreases muscular force output by up to 10% and slows metabolic thermogenesis.\n" \
               f"• **Coaching Tip**: Aim to consume water in steady 250-500ml boluses throughout the day rather than chugging large amounts at once. Use the Quick +250ml or +500ml buttons on your Dashboard to keep your animated water bottle filling up!"

    # 10. Workout selection / What should I do today
    if any(k in msg for k in ["what workout", "which workout", "15 min", "routine today", "exercise today", "should i do"]):
        if len(ctx["workouts_today"]) > 0:
            last_w = ctx["workouts_today"][-1]["workout_name"]
            return f"You have already completed **{last_w}** today! 🎉\n\n" \
                   f"Because muscle recovery and nervous system adaptation require downtime, I recommend pairing today's workout with:\n" \
                   f"• **Bedtime Deep Rest & Mobility Stretch** (10 mins) — Decompresses lumbar joints and flushes lactic acid.\n" \
                   f"• **Somatic Reset & Nervous System De-stress** (12 mins) — Down-regulates sympathetic tone into rest-and-digest mode."
        else:
            return f"**Recommended Workout For You Today:**\n\n" \
                   f"• **Option 1 (Quick & High Impact)**: **Wall Pilates Core & Posture** (15 min) — Zero equipment needed, builds deep pelvic core strength and spinal alignment.\n" \
                   f"• **Option 2 (Metabolic Burn)**: **10-Min Fast Calorie Torch HIIT** — High EPOC afterburn intervals.\n" \
                   f"• **Option 3 (Full Conditioning)**: **Full Body Sculpt & Tone Pilates** (25 min) — Comprehensive muscle engagement.\n\n" \
                   f"Each routine features our animated vector trainer demonstrator, countdown timers, and calming ambient synth in your **Workout Studio**!"

    # 11. Protein questions & best sources
    if "protein" in msg:
        return f"**Your Protein Blueprint ({diet}):**\n\n" \
               f"For your body weight of **{weight} kg** and goal of **{goal.replace('_', ' ').title()}**, your daily target is **{target['protein_g']}g**.\n\n" \
               f"• **Consumed Today**: **{cons['protein_g']}g** ({round((cons['protein_g']/max(target['protein_g'],1))*100)}%)\n" \
               f"• **Remaining to Hit Target**: **{rem['protein_g']}g**\n\n" \
               f"**Top Verified Foods in Your Database:**\n" \
               f"• Soya Chunks (50g dry = 26g protein, 172 kcal)\n" \
               f"• Low-fat Paneer / Tofu (100g = 18-19g protein)\n" \
               f"• Sprouted Green Moong (1 cup = 7g clean bioavailable protein)\n" \
               f"• Boiled Chickpeas or Black Chana (1 cup = 12-13g protein)\n" \
               f"• Greek Yogurt / Curd (150g = 12-15g protein)"

    # 12. Weight Loss Plateau / Not Seeing Results
    if any(k in msg for k in ["plateau", "stuck", "not losing", "not gaining", "slow progress"]):
        return f"**Overcoming a Fitness & Weight Plateau:**\n\n" \
               f"Plateaus are a natural physiological response as your body adjusts its Total Daily Energy Expenditure (TDEE).\n\n" \
               f"**Check these 3 Key Checkpoints:**\n" \
               f"1. **Hidden Intake**: Are cooking oils, dressings, sauces, and small handfuls of snacks being logged into your Food Log? A 150 kcal unlogged tablespoon of oil can wipe out your deficit.\n" \
               f"2. **Water & Sodium Retention**: Increased workout intensity causes temporary intramuscular inflammation and water retention, masking 1-2 kg of true fat loss on the scale.\n" \
               f"3. **Non-Exercise Activity (NEAT)**: When in a caloric deficit, your subconscious movement (fidgeting, pacing, step count) often drops. Aim for 8,000-10,000 daily steps.\n\n" \
               f"💡 *Track weekly moving averages rather than daily scale swings!*"

    # 13. Calorie Burn & Workout Energy Expenditure
    if any(k in msg for k in ["burn", "burnt", "burned", "burning"]):
        burned = ctx.get("total_burned_cals", 0.0)
        workouts = ctx.get("workouts_today", [])
        net = round(cons["calories"] - burned, 1)
        surplus_deficit = round(net - target["calories"], 1)
        user_name = ctx.get("user_name", "there")

        goal_lower = goal.lower()
        if "gain" in goal_lower or "muscle" in goal_lower:
            return (
                f"Yes, {user_name}, you burned an optimal amount today to stay fit while protecting your muscle-gain surplus!\n\n"
                f"• **Workout Burn**: **{burned} kcal** ({len(workouts)} session{'s' if len(workouts) != 1 else ''})\n"
                f"• **Net Intake**: **{net} kcal** ({'+' if surplus_deficit >= 0 else ''}{surplus_deficit} kcal surplus vs {target['calories']} kcal target)\n"
                f"• **Protein**: **{cons['protein_g']}g / {target['protein_g']}g**\n\n"
                f"Your nutrition protected your caloric surplus perfectly—keep prioritizing strength and recovery!"
            )
        elif "loss" in goal_lower or "fat" in goal_lower:
            return (
                f"{'Great work' if burned >= 300 else 'Good start'}, {user_name}! You've burned **{burned} kcal** across {len(workouts)} workout(s) today.\n\n"
                f"• **Burned Today**: **{burned} kcal**\n"
                f"• **Net Calories**: **{net} kcal** (Target: {target['calories']} kcal)\n"
                f"• **Hydration**: **{water_cons} / {water_target} ml**\n\n"
                f"{'You are in an effective deficit for fat loss!' if net <= target['calories'] else 'A brisk 15-minute walk can help deepen your calorie deficit today.'}"
            )
        else:
            return (
                f"You've burned **{burned} kcal** across {len(workouts)} workout session(s) today, {user_name}.\n\n"
                f"• **Burned**: **{burned} kcal**\n"
                f"• **Net Intake**: **{net} kcal** (Target: {target['calories']} kcal)\n\n"
                f"You are right on track to maintain your energy balance."
            )

    # 14. Universal Contextual Coach Synthesizer (Ultra-Concise)
    user_name = ctx.get("user_name", "there")
    return (
        f"Hi {user_name}! Here is a quick snapshot for your goal of **{goal.replace('_', ' ').title()}**:\n\n"
        f"• **Calories**: **{cons['calories']} / {target['calories']} kcal** ({rem['calories']} kcal left)\n"
        f"• **Protein**: **{cons['protein_g']} / {target['protein_g']}g** ({rem['protein_g']}g needed)\n"
        f"• **Active Burn**: **{ctx.get('total_burned_cals', 0)} kcal** ({len(ctx.get('workouts_today', []))} workouts)\n"
        f"• **Hydration**: **{water_cons} / {water_target} ml**\n\n"
        f"Ask me for specific snack swaps, exercise form cues, or workout options!"
    )
