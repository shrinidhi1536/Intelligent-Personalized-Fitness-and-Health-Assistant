import { api, showToast, sound } from "./api.js";

// Scientific formula calculations matching BetterMe algorithm
function calculateBMR(gender, weightKg, heightCm, age) {
  const g = String(gender).toLowerCase();
  if (g === "male") {
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5);
  } else {
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161);
  }
}

function calculateTDEE(bmr, activityLevel) {
  const multipliers = {
    sedentary: 1.2,
    "mostly sitting": 1.2,
    light: 1.375,
    "lightly active": 1.375,
    moderate: 1.55,
    "moderately active": 1.55,
    very_active: 1.725,
    "very active": 1.725
  };
  const key = String(activityLevel).toLowerCase().trim();
  return Math.round(bmr * (multipliers[key] || 1.375));
}

function calculateDailyCalorieTarget(tdee, goal) {
  const g = String(goal).toLowerCase();
  if (g.includes("lose") || g.includes("loss") || g.includes("burn")) {
    return Math.max(1300, Math.round(tdee - 450));
  } else if (g.includes("build") || g.includes("gain") || g.includes("muscle")) {
    return Math.round(tdee + 350);
  } else {
    return Math.round(tdee);
  }
}

function calculateWaterTarget(weightKg, activityLevel = "moderate") {
  const base = weightKg * 35.0;
  let actAdd = 400.0;
  const act = String(activityLevel).toLowerCase();
  if (act.includes("sitting") || act.includes("sedentary")) actAdd = 0.0;
  else if (act.includes("light")) actAdd = 200.0;
  else if (act.includes("very")) actAdd = 700.0;
  else actAdd = 400.0;
  return Math.round((base + actAdd) / 100) * 100;
}

function calculateBMI(weightKg, heightCm) {
  if (!heightCm || heightCm <= 0) return { value: 22.0, category: "Healthy Weight", color: "#10B981" };
  const heightM = heightCm / 100;
  const bmi = Number((weightKg / (heightM * heightM)).toFixed(1));
  if (bmi < 18.5) return { value: bmi, category: "Underweight", color: "#3B82F6" };
  if (bmi < 25) return { value: bmi, category: "Healthy Weight", color: "#10B981" };
  if (bmi < 30) return { value: bmi, category: "Overweight", color: "#F59E0B" };
  return { value: bmi, category: "Obesity", color: "#EF4444" };
}

function calculateProjectedDate(currentWeightKg, goalWeightKg) {
  const diffKg = Math.abs(currentWeightKg - goalWeightKg);
  const weeksNeeded = Math.max(2, Math.round(diffKg / 0.5));
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + weeksNeeded * 7);
  return targetDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export class OnboardingWizard {
  constructor(containerId, initialData = {}, onComplete = null) {
    if (typeof initialData === "function") {
      onComplete = initialData;
      initialData = {};
    }
    this.container = document.getElementById(containerId);
    this.onComplete = onComplete;
    this.currentStep = 1;
    this.totalSteps = 30; // 30 questions + Step 31 is the calculation reveal screen

    // Calculation progress state for Step 31
    this.calcProgress = 0;
    this.calcStatus = "Analyzing your 30-point metabolic assessment...";
    this.calcInterval = null;
    this.isSubmitting = false;
    this.planData = null; // Store real backend result for 100% matching display

    // Unit toggle states
    this.heightUnit = "cm"; // "cm" or "ft_in"
    this.weightUnit = "kg"; // "kg" or "lb"
    this.targetWeightUnit = "kg"; // "kg" or "lb"

    // Initial answers
    this.answers = {
      // Section 1: General & Biometrics
      name: initialData.name || "Alex",
      q1_main_goal: "Lose weight",
      q2_gender: initialData.gender ? (initialData.gender.toLowerCase() === "male" ? "Male" : "Female") : "Female",
      q3_age: Number(initialData.age) || 25,
      q4_height_cm: Number(initialData.height_cm) || 168,
      q4_height_ft: 5,
      q4_height_in: 6,
      q5_weight_kg: Number(initialData.weight_kg) || 65,
      q6_target_weight_kg: Number(initialData.target_weight_kg) || 58,
      q6_skipped: false,

      // Section 2: Your fitness goals
      q7_body_focus: ["Overall fitness", "Belly strength"],
      q8_pace: "At a moderate pace",
      q9_motivation: ["Feel healthier", "Have more energy", "Build confidence"],

      // Section 3: Your activity and workout preferences
      q10_activity_level: "Moderately active",
      q11_fitness_level: "Beginner",
      q12_workout_location: "At home",
      q13_days_per_week: "3–4 days",
      q14_workout_duration: "25–30 minutes",
      q15_workout_types: ["Strength training", "Cardio", "Pilates"],
      q16_equipment: ["No equipment", "Dumbbells", "Yoga mat"],

      // Section 4: Nutrition and food preferences
      q17_diet: "Vegetarian",
      q18_food_enjoyment: ["South Indian food", "Fruits and vegetables", "Pulses and legumes"],
      q19_allergies: ["No restrictions"],
      q19_allergy_other: "",
      q20_disliked_foods: "None",
      q21_meals_per_day: "3 meals",
      q22_nutrition_challenge: "Eating too many sweets",

      // Section 5: Daily habits and lifestyle
      q23_sleep_hours: "7–8 hours",
      q24_water_intake: "1.5–2 litres",
      q25_barriers: ["Lack of time"],
      q26_consistency_helpers: ["Daily reminders", "A simple daily plan", "Streaks and rewards"],

      // Section 6: Personalization and safety
      q27_injuries: "No",
      q27_injuries_desc: "",
      q28_health_conditions: "No",
      q28_conditions_desc: "",
      q29_workout_time: "Morning",
      q30_plan_includes: [
        "Workout plan",
        "Daily meal plan",
        "Calorie and nutrient tracking",
        "Water reminders",
        "Habit tracking",
        "AI fitness assistant"
      ]
    };

    // Initialize ft/in from cm
    const totalInches = Math.round(this.answers.q4_height_cm / 2.54);
    this.answers.q4_height_ft = Math.floor(totalInches / 12);
    this.answers.q4_height_in = totalInches % 12;
  }

  start() {
    this.currentStep = 1;
    this.calcProgress = 0;
    this.planData = null;
    this.render();
  }

  setSingleAnswer(key, value) {
    if (sound.playBeep) sound.playBeep(660, 0.04);
    this.answers[key] = value;
    this.render();
  }

  toggleMultiAnswer(key, value) {
    if (sound.playBeep) sound.playBeep(660, 0.04);
    let list = Array.isArray(this.answers[key]) ? [...this.answers[key]] : [];
    if (value === "No restrictions" || value === "Nothing — I exercise regularly" || value === "No major challenge") {
      list = [value];
    } else {
      list = list.filter(item => item !== "No restrictions" && item !== "Nothing — I exercise regularly" && item !== "No major challenge");
      if (list.includes(value)) {
        if (list.length > 1) {
          list = list.filter(item => item !== value);
        }
      } else {
        list.push(value);
      }
    }
    this.answers[key] = list;
    this.render();
  }

  prevStep() {
    if (sound.playBeep) sound.playBeep(440, 0.06);
    if (this.currentStep > 1) {
      this.currentStep--;
      this.render();
    }
  }

  nextStep() {
    if (sound.playBeep) sound.playBeep(880, 0.06);
    if (this.currentStep === 30) {
      // Proceed to Step 31 (Real-Time Backend Generation & Reveal Screen)
      this.currentStep = 31;
      this.calcProgress = 0;
      this.render();
      this.startCalculationAnimation();
      this.submitAndFetchPlan();
    } else if (this.currentStep < 30) {
      this.currentStep++;
      this.render();
    }
  }

  buildPayload() {
    // Map goal to backend enum
    let backendGoal = "loss";
    const g = this.answers.q1_main_goal.toLowerCase();
    if (g.includes("gain")) backendGoal = "gain";
    else if (g.includes("muscle")) backendGoal = "muscle";
    else if (g.includes("flexibility") || g.includes("stamina") || g.includes("fit")) backendGoal = "fitness";
    else backendGoal = "loss";

    // Map gender
    let backendGender = "female";
    if (this.answers.q2_gender.toLowerCase() === "male") backendGender = "male";
    else if (this.answers.q2_gender.toLowerCase() === "female") backendGender = "female";
    else backendGender = "other";

    // Map activity
    let backendActivity = "moderate";
    const act = this.answers.q10_activity_level.toLowerCase();
    if (act.includes("sitting")) backendActivity = "sedentary";
    else if (act.includes("light")) backendActivity = "light";
    else if (act.includes("very")) backendActivity = "very_active";
    else backendActivity = "moderate";

    // Map diet
    let backendDiet = "Vegetarian";
    const d = this.answers.q17_diet.toLowerCase();
    if (d.includes("vegan")) backendDiet = "Vegan";
    else if (d.includes("egg")) backendDiet = "Eggetarian";
    else if (d.includes("non")) backendDiet = "Non-Vegetarian";
    else backendDiet = "Vegetarian";

    // Map duration
    let durMin = 30;
    const durStr = this.answers.q14_workout_duration;
    if (durStr.includes("5–10")) durMin = 10;
    else if (durStr.includes("15–20")) durMin = 20;
    else if (durStr.includes("45")) durMin = 45;
    else if (durStr.includes("60")) durMin = 60;
    else durMin = 30;

    // Map sleep
    let sleepHours = 7.5;
    if (this.answers.q23_sleep_hours.includes("Less than 5")) sleepHours = 4.5;
    else if (this.answers.q23_sleep_hours.includes("5–6")) sleepHours = 5.5;
    else if (this.answers.q23_sleep_hours.includes("More than 8")) sleepHours = 8.5;

    // Map water target
    const waterTargetMl = calculateWaterTarget(this.answers.q5_weight_kg, this.answers.q10_activity_level);

    // Primary workout type
    const preferredWorkouts = Array.isArray(this.answers.q15_workout_types) ? this.answers.q15_workout_types : [];
    let workoutType = "Cardio";
    if (preferredWorkouts.includes("Pilates") || preferredWorkouts.includes("Yoga")) workoutType = "Flexibility";
    else if (preferredWorkouts.includes("Strength training")) workoutType = "Strength";
    else if (preferredWorkouts.includes("HIIT")) workoutType = "HIIT";

    // Cuisine preference
    const foodEnjoy = Array.isArray(this.answers.q18_food_enjoyment) ? this.answers.q18_food_enjoyment : [];
    let cuisine = "South Indian";
    if (foodEnjoy.some(f => f.includes("North Indian"))) cuisine = "North Indian";

    // Allergies string
    let allergiesStr = Array.isArray(this.answers.q19_allergies) ? this.answers.q19_allergies.join(", ") : "None";
    if (this.answers.q19_allergy_other && this.answers.q19_allergy_other.trim()) {
      allergiesStr += `, ${this.answers.q19_allergy_other.trim()}`;
    }

    return {
      age: parseInt(this.answers.q3_age) || 25,
      gender: backendGender,
      height_cm: parseFloat(this.answers.q4_height_cm) || 168.0,
      weight_kg: parseFloat(this.answers.q5_weight_kg) || 65.0,
      target_weight_kg: this.answers.q6_skipped ? parseFloat(this.answers.q5_weight_kg) : (parseFloat(this.answers.q6_target_weight_kg) || 58.0),
      goal: backendGoal,
      activity_level: backendActivity,
      diet_preference: backendDiet,
      cuisine_preference: cuisine,
      allergies: allergiesStr,
      disliked_foods: this.answers.q20_disliked_foods || "None",
      workout_type: workoutType,
      preferred_duration: durMin,
      equipment: Array.isArray(this.answers.q16_equipment) ? this.answers.q16_equipment.join(", ") : "No equipment",
      fitness_level: this.answers.q11_fitness_level || "Beginner",
      water_intake_target_ml: waterTargetMl,
      sleep_duration_hours: sleepHours,
      survey_data: this.answers // Full 30 survey responses stored into profiles table!
    };
  }

  async submitAndFetchPlan() {
    const payload = this.buildPayload();
    try {
      const res = await api.post("/api/onboarding/submit", payload);
      this.planData = res;
      // If animation has already finished, trigger render immediately
      if (this.calcProgress >= 100) {
        this.render();
      }
    } catch (err) {
      console.error("Onboarding submission error:", err);
      showToast(err.message || "Plan generation encountered an issue", "error");
    }
  }

  startCalculationAnimation() {
    if (this.calcInterval) clearInterval(this.calcInterval);
    this.calcProgress = 0;
    this.calcStatus = "Analyzing your 30-point metabolic assessment...";

    this.calcInterval = setInterval(() => {
      this.calcProgress += 4;
      if (this.calcProgress === 20) this.calcStatus = "Calibrating basal metabolic rate & energy deficit...";
      if (this.calcProgress === 44) this.calcStatus = "Assembling your custom workout & movement schedule...";
      if (this.calcProgress === 68) this.calcStatus = "Personalizing whole-food meal checklists & smart hydration...";
      if (this.calcProgress === 88) this.calcStatus = "Finalizing your transformation blueprint (0% Junk Guarantee)...";

      if (this.calcProgress >= 100) {
        this.calcProgress = 100;
        clearInterval(this.calcInterval);
        this.calcInterval = null;
        if (sound.playVictory) sound.playVictory();
        this.render();
      } else {
        const fillCircle = document.getElementById("calcProgressCircle");
        const pctEl = document.getElementById("calcProgressPct");
        const statusEl = document.getElementById("calcStatusText");
        if (fillCircle && pctEl && statusEl) {
          const circumference = 2 * Math.PI * 60;
          fillCircle.style.strokeDashoffset = circumference * (1 - this.calcProgress / 100);
          pctEl.innerText = `${this.calcProgress}%`;
          statusEl.innerText = this.calcStatus;
        }
      }
    }, 45);
  }

  finishAndEnterDashboard() {
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    const finishBtn = document.getElementById("btnFinishOnboarding");
    if (finishBtn) {
      finishBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Loading Dashboard...`;
      finishBtn.disabled = true;
    }

    showToast("Personalized Blueprint Activated!", "success");
    setTimeout(() => {
      if (typeof this.onComplete === "function") {
        const metrics = this.planData ? this.planData.metrics : null;
        this.onComplete(metrics);
      }
    }, 400);
  }

  closeModal() {
    if (sound.playBeep) sound.playBeep(440, 0.05);
    if (this.calcInterval) {
      clearInterval(this.calcInterval);
      this.calcInterval = null;
    }
    const modal = document.getElementById("onboardingModal");
    if (modal) {
      modal.classList.remove("open");
    }
  }

  getSectionMeta(step) {
    if (step <= 6) return { num: 1, title: "General & Biometrics", icon: "fa-solid fa-user" };
    if (step <= 9) return { num: 2, title: "Your Fitness Goals", icon: "fa-solid fa-bullseye" };
    if (step <= 16) return { num: 3, title: "Activity & Workout Preferences", icon: "fa-solid fa-dumbbell" };
    if (step <= 22) return { num: 4, title: "Nutrition & Food Preferences", icon: "fa-solid fa-bowl-food" };
    if (step <= 26) return { num: 5, title: "Daily Habits & Lifestyle", icon: "fa-solid fa-clock" };
    return { num: 6, title: "Personalization & Safety", icon: "fa-solid fa-shield-heart" };
  }

  render() {
    if (!this.container) return;

    if (this.currentStep === 31) {
      this.renderRevealScreen();
      return;
    }

    const sec = this.getSectionMeta(this.currentStep);
    const progressPct = Math.round((this.currentStep / 30) * 100);

    // Signature purple theme header with top-right X close button
    const headerHtml = `
      <div style="margin-bottom: 22px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 24px; height: 24px; border-radius: 6px; background: #8571FF; color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 900;">
              <i class="${sec.icon}"></i>
            </div>
            <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; color: #8571FF;">
              Section ${sec.num} of 6 • ${sec.title}
            </span>
          </div>

          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 12px; font-weight: 700; color: var(--text-muted);">
              ${this.currentStep} / 30
            </span>
            <button type="button" onclick="window.wizard.closeModal()" title="Close Assessment"
              style="width: 30px; height: 30px; border-radius: 8px; border: none; background: var(--border-light); color: var(--text-muted); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease; font-size: 14px; flex-shrink: 0;"
              onmouseover="this.style.background='rgba(133, 113, 255, 0.15)'; this.style.color='#8571FF';"
              onmouseout="this.style.background='var(--border-light)'; this.style.color='var(--text-muted)';">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        <div style="height: 6px; width: 100%; background: var(--border-light); border-radius: 999px; overflow: hidden;">
          <div style="height: 100%; width: ${progressPct}%; background: linear-gradient(90deg, #8571FF, #A393FF); border-radius: 999px; transition: width 0.25s ease;"></div>
        </div>
      </div>
    `;

    let questionContent = "";

    // ---------------- Section 1: General & Biometrics ----------------
    switch (this.currentStep) {
      case 1:
        questionContent = this.renderSingleChoice(
          "What is your main goal?",
          "BetterMe customizes workouts, fasting, and meal plans around this target.",
          "q1_main_goal",
          [
            "Lose weight",
            "Gain weight",
            "Build muscle",
            "Stay fit and healthy",
            "Improve flexibility",
            "Improve stamina and endurance"
          ]
        );
        break;

      case 2:
        questionContent = this.renderSingleChoice(
          "What is your gender?",
          "Used for scientific BMR metabolic rate calibration.",
          "q2_gender",
          [
            "Female",
            "Male",
            "Prefer not to say",
            "Other"
          ]
        );
        break;

      case 3:
        questionContent = `
          <div>
            <h2 style="font-size: 22px; font-weight: 900; color: var(--text-main); margin-bottom: 6px;">How old are you?</h2>
            <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 24px;">Age determines daily resting caloric expenditure.</p>
            <label style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 6px;">Age in years</label>
            <input type="number" min="14" max="100" value="${this.answers.q3_age}"
              oninput="window.wizard.answers.q3_age = parseInt(this.value) || 25"
              style="width: 100%; padding: 16px; border-radius: 14px; border: 2px solid var(--border); font-size: 22px; font-weight: 900; background: var(--bg-card); color: var(--text-main);" />
          </div>
        `;
        break;

      case 4:
        questionContent = `
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <h2 style="font-size: 22px; font-weight: 900; color: var(--text-main);">What is your height?</h2>
              <div style="display: flex; background: var(--border-light); padding: 3px; border-radius: 8px;">
                <button type="button" onclick="window.wizard.heightUnit='cm'; window.wizard.render();" style="padding: 4px 10px; border-radius: 6px; border:none; font-size: 11px; font-weight: 800; cursor:pointer; background: ${this.heightUnit === 'cm' ? '#8571FF' : 'transparent'}; color: ${this.heightUnit === 'cm' ? 'white' : 'var(--text-main)'};">cm</button>
                <button type="button" onclick="window.wizard.heightUnit='ft_in'; window.wizard.render();" style="padding: 4px 10px; border-radius: 6px; border:none; font-size: 11px; font-weight: 800; cursor:pointer; background: ${this.heightUnit === 'ft_in' ? '#8571FF' : 'transparent'}; color: ${this.heightUnit === 'ft_in' ? 'white' : 'var(--text-main)'};">ft/in</button>
              </div>
            </div>
            <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 24px;">Accurate height is essential to determine healthy weight ranges.</p>

            ${this.heightUnit === 'cm' ? `
              <label style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 6px;">Height in cm</label>
              <input type="number" min="100" max="250" value="${this.answers.q4_height_cm}"
                oninput="window.wizard.answers.q4_height_cm = parseFloat(this.value) || 168"
                style="width: 100%; padding: 16px; border-radius: 14px; border: 2px solid var(--border); font-size: 22px; font-weight: 900; background: var(--bg-card); color: var(--text-main);" />
            ` : `
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div>
                  <label style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 6px;">Feet (ft)</label>
                  <input type="number" min="3" max="8" value="${this.answers.q4_height_ft}"
                    oninput="window.wizard.answers.q4_height_ft = parseInt(this.value) || 5; window.wizard.answers.q4_height_cm = Math.round((window.wizard.answers.q4_height_ft * 12 + window.wizard.answers.q4_height_in) * 2.54);"
                    style="width: 100%; padding: 16px; border-radius: 14px; border: 2px solid var(--border); font-size: 22px; font-weight: 900; background: var(--bg-card); color: var(--text-main);" />
                </div>
                <div>
                  <label style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 6px;">Inches (in)</label>
                  <input type="number" min="0" max="11" value="${this.answers.q4_height_in}"
                    oninput="window.wizard.answers.q4_height_in = parseInt(this.value) || 6; window.wizard.answers.q4_height_cm = Math.round((window.wizard.answers.q4_height_ft * 12 + window.wizard.answers.q4_height_in) * 2.54);"
                    style="width: 100%; padding: 16px; border-radius: 14px; border: 2px solid var(--border); font-size: 22px; font-weight: 900; background: var(--bg-card); color: var(--text-main);" />
                </div>
              </div>
            `}
          </div>
        `;
        break;

      case 5:
        const bmi = calculateBMI(this.answers.q5_weight_kg, this.answers.q4_height_cm);
        questionContent = `
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <h2 style="font-size: 22px; font-weight: 900; color: var(--text-main);">What is your current weight?</h2>
              <div style="display: flex; background: var(--border-light); padding: 3px; border-radius: 8px;">
                <button type="button" onclick="window.wizard.weightUnit='kg'; window.wizard.render();" style="padding: 4px 10px; border-radius: 6px; border:none; font-size: 11px; font-weight: 800; cursor:pointer; background: ${this.weightUnit === 'kg' ? '#8571FF' : 'transparent'}; color: ${this.weightUnit === 'kg' ? 'white' : 'var(--text-main)'};">kg</button>
                <button type="button" onclick="window.wizard.weightUnit='lb'; window.wizard.render();" style="padding: 4px 10px; border-radius: 6px; border:none; font-size: 11px; font-weight: 800; cursor:pointer; background: ${this.weightUnit === 'lb' ? '#8571FF' : 'transparent'}; color: ${this.weightUnit === 'lb' ? 'white' : 'var(--text-main)'};">lb</button>
              </div>
            </div>
            <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">We calculate your baseline BMI and daily fluid targets.</p>

            <div style="margin-bottom: 16px;">
              <label style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 6px;">Weight in ${this.weightUnit}</label>
              <input type="number" step="0.5" min="20" max="400"
                value="${this.weightUnit === 'kg' ? this.answers.q5_weight_kg : Math.round(this.answers.q5_weight_kg * 2.20462)}"
                oninput="const v = parseFloat(this.value) || 65; window.wizard.answers.q5_weight_kg = window.wizard.weightUnit === 'kg' ? v : Math.round(v / 2.20462); window.wizard.updateBmiPreview();"
                style="width: 100%; padding: 16px; border-radius: 14px; border: 2px solid var(--border); font-size: 24px; font-weight: 900; background: var(--bg-card); color: var(--text-main);" />
            </div>

            <div id="wizardBmiPreview" style="padding: 12px 16px; border-radius: 12px; background: var(--border-light); display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 13px; font-weight: 800; color: var(--text-main);">Live BMI Calculation</span>
              <span style="font-size: 13px; font-weight: 900; color: ${bmi.color}; display: flex; align-items: center; gap: 6px;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: ${bmi.color}; display: inline-block;"></span>
                BMI ${bmi.value} • ${bmi.category}
              </span>
            </div>
          </div>
        `;
        break;

      case 6:
        questionContent = `
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <h2 style="font-size: 22px; font-weight: 900; color: var(--text-main);">What is your target weight?</h2>
              <div style="display: flex; background: var(--border-light); padding: 3px; border-radius: 8px;">
                <button type="button" onclick="window.wizard.targetWeightUnit='kg'; window.wizard.render();" style="padding: 4px 10px; border-radius: 6px; border:none; font-size: 11px; font-weight: 800; cursor:pointer; background: ${this.targetWeightUnit === 'kg' ? '#8571FF' : 'transparent'}; color: ${this.targetWeightUnit === 'kg' ? 'white' : 'var(--text-main)'};">kg</button>
                <button type="button" onclick="window.wizard.targetWeightUnit='lb'; window.wizard.render();" style="padding: 4px 10px; border-radius: 6px; border:none; font-size: 11px; font-weight: 800; cursor:pointer; background: ${this.targetWeightUnit === 'lb' ? '#8571FF' : 'transparent'}; color: ${this.targetWeightUnit === 'lb' ? 'white' : 'var(--text-main)'};">lb</button>
              </div>
            </div>
            <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">We'll calculate your realistic, healthy milestone transformation date.</p>

            ${!this.answers.q6_skipped ? `
              <div style="margin-bottom: 16px;">
                <label style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #8571FF; display: block; margin-bottom: 6px;">Target Goal in ${this.targetWeightUnit}</label>
                <input type="number" step="0.5" min="20" max="400"
                  value="${this.targetWeightUnit === 'kg' ? this.answers.q6_target_weight_kg : Math.round(this.answers.q6_target_weight_kg * 2.20462)}"
                  oninput="const v = parseFloat(this.value) || 58; window.wizard.answers.q6_target_weight_kg = window.wizard.targetWeightUnit === 'kg' ? v : Math.round(v / 2.20462);"
                  style="width: 100%; padding: 16px; border-radius: 14px; border: 2px solid #8571FF; font-size: 24px; font-weight: 900; background: var(--bg-card); color: #8571FF;" />
              </div>
            ` : `
              <div style="padding: 20px; border-radius: 14px; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); color: #10B981; font-weight: 800; font-size: 14px; margin-bottom: 16px;">
                <i class="fa-solid fa-check"></i> Weight maintenance mode enabled (Target matches current weight).
              </div>
            `}

            <button type="button" onclick="window.wizard.answers.q6_skipped = !window.wizard.answers.q6_skipped; if(window.wizard.answers.q6_skipped) { window.wizard.answers.q6_target_weight_kg = window.wizard.answers.q5_weight_kg; } window.wizard.render();"
              style="width: 100%; padding: 12px; border-radius: 12px; border: 1px dashed var(--border); background: var(--bg-card); color: var(--text-muted); font-size: 13px; font-weight: 800; cursor: pointer;">
              ${this.answers.q6_skipped ? "Set a specific target weight instead" : "Skip (I don't have a weight-related goal)"}
            </button>
          </div>
        `;
        break;

      // ---------------- Section 2: Your fitness goals ----------------
      case 7:
        questionContent = this.renderMultiChoice(
          "What would you most like to improve about your body?",
          "Select all zones and attributes you'd love to shape.",
          "q7_body_focus",
          [
            "Overall fitness",
            "Belly strength",
            "Arms and shoulders",
            "Legs and glutes",
            "Back and posture",
            "Full-body strength",
            "Flexibility and mobility"
          ]
        );
        break;

      case 8:
        questionContent = this.renderSingleChoice(
          "How quickly would you like to progress toward your goal?",
          "Calibrates the intensity of workouts and caloric deficit.",
          "q8_pace",
          [
            "Slowly and steadily",
            "At a moderate pace",
            "I am not sure yet"
          ]
        );
        break;

      case 9:
        questionContent = this.renderMultiChoice(
          "What motivates you to become fitter?",
          "Your AI Fitness Coach will tailor affirmations and guidance to this.",
          "q9_motivation",
          [
            "Feel healthier",
            "Have more energy",
            "Build confidence",
            "Improve strength",
            "Feel comfortable in my clothes",
            "Prepare for a specific event",
            "Build a consistent routine"
          ]
        );
        break;

      // ---------------- Section 3: Your activity and workout preferences ----------------
      case 10:
        questionContent = this.renderSingleChoice(
          "How active are you during a typical day?",
          "Determines your Total Daily Energy Expenditure (TDEE).",
          "q10_activity_level",
          [
            "Mostly sitting",
            "Lightly active",
            "Moderately active",
            "Very active"
          ]
        );
        break;

      case 11:
        questionContent = this.renderSingleChoice(
          "How would you describe your fitness level?",
          "Ensures exercises start at an appropriate difficulty without injury risk.",
          "q11_fitness_level",
          [
            "Beginner",
            "Intermediate",
            "Advanced",
            "I am not sure"
          ]
        );
        break;

      case 12:
        questionContent = this.renderSingleChoice(
          "Where do you prefer to work out?",
          "Workouts in your routine will adapt to your environment.",
          "q12_workout_location",
          [
            "At home",
            "At the gym",
            "Outdoors",
            "A combination of places"
          ]
        );
        break;

      case 13:
        questionContent = this.renderSingleChoice(
          "How many days per week can you exercise?",
          "We structure rest and active recovery days around your availability.",
          "q13_days_per_week",
          [
            "1–2 days",
            "3–4 days",
            "5–6 days",
            "Every day"
          ]
        );
        break;

      case 14:
        questionContent = this.renderSingleChoice(
          "How much time can you spend on each workout?",
          "We will match exercise sets to comfortably fit your session.",
          "q14_workout_duration",
          [
            "5–10 minutes",
            "15–20 minutes",
            "25–30 minutes",
            "45 minutes",
            "60 minutes or more"
          ]
        );
        break;

      case 15:
        questionContent = this.renderMultiChoice(
          "What types of workouts do you enjoy?",
          "Prioritized in your daily spotlight workout recommendations.",
          "q15_workout_types",
          [
            "Strength training",
            "Cardio",
            "Yoga",
            "Pilates",
            "HIIT",
            "Walking",
            "Stretching and mobility",
            "Bodyweight workouts"
          ]
        );
        break;

      case 16:
        questionContent = this.renderMultiChoice(
          "What equipment do you have access to?",
          "We'll never recommend routines requiring unavailable gear.",
          "q16_equipment",
          [
            "No equipment",
            "Dumbbells",
            "Resistance bands",
            "Yoga mat",
            "Gym equipment",
            "Other equipment"
          ]
        );
        break;

      // ---------------- Section 4: Nutrition and food preferences ----------------
      case 17:
        questionContent = this.renderSingleChoice(
          "Which diet best describes you?",
          "Our AI meal planner strictly aligns daily recipes to this choice.",
          "q17_diet",
          [
            "Vegetarian",
            "Non-vegetarian",
            "Vegan",
            "Eggetarian",
            "No specific diet"
          ]
        );
        break;

      case 18:
        questionContent = this.renderMultiChoice(
          "Which foods do you usually enjoy?",
          "Your breakfast, lunch, and dinner checklists will feature these ingredients.",
          "q18_food_enjoyment",
          [
            "South Indian food",
            "North Indian food",
            "Rice and grains",
            "Fruits and vegetables",
            "Dairy products",
            "Eggs",
            "Chicken and fish",
            "Pulses and legumes",
            "Nuts and seeds"
          ]
        );
        break;

      case 19:
        const isOther = Array.isArray(this.answers.q19_allergies) && this.answers.q19_allergies.includes("Other — specify");
        questionContent = `
          <div>
            ${this.renderMultiChoice(
              "Do you have any food allergies or dietary restrictions?",
              "Strict exclusion of allergens in meal plan suggestions.",
              "q19_allergies",
              [
                "No restrictions",
                "Dairy",
                "Eggs",
                "Peanuts or tree nuts",
                "Gluten",
                "Other — specify"
              ]
            )}
            ${isOther ? `
              <div style="margin-top: 12px;">
                <label style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 4px;">Specify other restrictions:</label>
                <input type="text" value="${this.answers.q19_allergy_other || ''}"
                  oninput="window.wizard.answers.q19_allergy_other = this.value"
                  placeholder="e.g. Shellfish, Soy, Mustard"
                  style="width: 100%; padding: 12px; border-radius: 12px; border: 1px solid var(--border); font-size: 14px; background: var(--bg-card); color: var(--text-main);" />
              </div>
            ` : ''}
          </div>
        `;
        break;

      case 20:
        questionContent = `
          <div>
            <h2 style="font-size: 22px; font-weight: 900; color: var(--text-main); margin-bottom: 6px;">Are there any foods you dislike or want to avoid?</h2>
            <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">We will exclude these specific ingredients from your meal recipes.</p>
            <label style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 6px;">Disliked foods (comma separated or None)</label>
            <input type="text" value="${this.answers.q20_disliked_foods}"
              oninput="window.wizard.answers.q20_disliked_foods = this.value"
              placeholder="e.g. Bitter gourd, Mushrooms, Seafood, or None"
              style="width: 100%; padding: 14px; border-radius: 12px; border: 1px solid var(--border); font-size: 15px; font-weight: 700; background: var(--bg-card); color: var(--text-main);" />
          </div>
        `;
        break;

      case 21:
        questionContent = this.renderSingleChoice(
          "How many meals do you usually eat per day?",
          "We structure your macro calorie allocation per eating window.",
          "q21_meals_per_day",
          [
            "2 meals",
            "3 meals",
            "4 meals",
            "5 or more meals"
          ]
        );
        break;

      case 22:
        questionContent = this.renderSingleChoice(
          "What is your biggest nutrition challenge?",
          "Your AI health coach provides tactical tips to conquer this.",
          "q22_nutrition_challenge",
          [
            "Eating too many sweets",
            "Frequent snacking",
            "Eating irregularly",
            "Not eating enough protein",
            "Eating outside frequently",
            "Difficulty planning meals",
            "Drinking too little water",
            "No major challenge"
          ]
        );
        break;

      // ---------------- Section 5: Daily habits and lifestyle ----------------
      case 23:
        questionContent = this.renderSingleChoice(
          "How many hours do you usually sleep?",
          "Sleep impacts cortisol levels, recovery, and metabolic hunger hormones.",
          "q23_sleep_hours",
          [
            "Less than 5 hours",
            "5–6 hours",
            "7–8 hours",
            "More than 8 hours"
          ]
        );
        break;

      case 24:
        questionContent = this.renderSingleChoice(
          "How much water do you drink daily?",
          "Fluid balance is critical for cellular energy and muscle hydration.",
          "q24_water_intake",
          [
            "Less than 1 litre",
            "1–1.5 litres",
            "1.5–2 litres",
            "More than 2 litres",
            "I am not sure"
          ]
        );
        break;

      case 25:
        questionContent = this.renderMultiChoice(
          "What usually prevents you from exercising regularly?",
          "Select any friction points so we can build safeguards into your plan.",
          "q25_barriers",
          [
            "Lack of time",
            "Lack of motivation",
            "Not knowing which exercises to do",
            "Tiredness",
            "Lack of equipment",
            "Difficulty maintaining a routine",
            "Nothing — I exercise regularly"
          ]
        );
        break;

      case 26:
        questionContent = this.renderMultiChoice(
          "What would help you stay consistent?",
          "We will activate these accountability drivers in your app interface.",
          "q26_consistency_helpers",
          [
            "Daily reminders",
            "A simple daily plan",
            "Progress charts",
            "Workout videos",
            "Streaks and rewards",
            "Encouragement from an AI assistant"
          ]
        );
        break;

      // ---------------- Section 6: Personalization and safety ----------------
      case 27:
        const hasInjury = this.answers.q27_injuries === "Yes — please describe";
        questionContent = `
          <div>
            ${this.renderSingleChoice(
              "Do you have any injuries or physical limitations that may affect exercise?",
              "Safety first: exercise alternatives will be adjusted to protect your joints.",
              "q27_injuries",
              [
                "No",
                "Yes — please describe",
                "Prefer not to say"
              ]
            )}
            ${hasInjury ? `
              <div style="margin-top: 14px;">
                <label style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 4px;">Describe injury or area of sensitivity:</label>
                <textarea rows="2" oninput="window.wizard.answers.q27_injuries_desc = this.value" placeholder="e.g. Lower back pain, left knee discomfort"
                  style="width: 100%; padding: 12px; border-radius: 12px; border: 1px solid var(--border); font-size: 14px; background: var(--bg-card); color: var(--text-main);">${this.answers.q27_injuries_desc || ''}</textarea>
              </div>
            ` : ''}
          </div>
        `;
        break;

      case 28:
        const hasHealthCond = this.answers.q28_health_conditions === "Yes — optional details";
        questionContent = `
          <div>
            ${this.renderSingleChoice(
              "Are there any health conditions or exercise restrictions you would like the plan to consider?",
              "e.g. Asthma, hypertension, diabetes, or physician guidance.",
              "q28_health_conditions",
              [
                "No",
                "Yes — optional details",
                "Prefer not to say"
              ]
            )}
            ${hasHealthCond ? `
              <div style="margin-top: 14px;">
                <label style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 4px;">Health condition details (optional):</label>
                <textarea rows="2" oninput="window.wizard.answers.q28_conditions_desc = this.value" placeholder="e.g. Mild asthma during high cardio"
                  style="width: 100%; padding: 12px; border-radius: 12px; border: 1px solid var(--border); font-size: 14px; background: var(--bg-card); color: var(--text-main);">${this.answers.q28_conditions_desc || ''}</textarea>
              </div>
            ` : ''}
          </div>
        `;
        break;

      case 29:
        questionContent = this.renderSingleChoice(
          "When would you prefer to work out?",
          "We will align workout session reminders to this window.",
          "q29_workout_time",
          [
            "Morning",
            "Afternoon",
            "Evening",
            "No fixed time"
          ]
        );
        break;

      case 30:
        questionContent = this.renderMultiChoice(
          "What would you like your personalized plan to include?",
          "Select the core features you want enabled on your daily dashboard.",
          "q30_plan_includes",
          [
            "Workout plan",
            "Daily meal plan",
            "Calorie and nutrient tracking",
            "Water reminders",
            "Habit tracking",
            "Weight and progress tracking",
            "AI fitness assistant"
          ]
        );
        break;
    }

    // Navigation buttons styled with purple theme
    const navButtonsHtml = `
      <div style="display: flex; gap: 12px; margin-top: 24px; border-top: 1px solid var(--border-light); padding-top: 18px;">
        ${this.currentStep > 1 ? `
          <button type="button" class="btn-secondary" onclick="window.wizard.prevStep()"
            style="flex: 1; justify-content: center; padding: 14px; border-radius: 14px; font-weight: 800;">
            <i class="fa-solid fa-arrow-left"></i> Back
          </button>
        ` : `<div></div>`}

        <button type="button" class="btn-primary" onclick="window.wizard.nextStep()"
          style="flex: ${this.currentStep > 1 ? '2' : '1'}; justify-content: center; padding: 14px; background: linear-gradient(135deg, #8571FF, #5D4FB3); border: none; font-weight: 900; font-size: 15px; border-radius: 14px; box-shadow: 0 4px 14px rgba(133, 113, 255, 0.35);">
          ${this.currentStep === 30 ? 'Synthesize My Plan <i class="fa-solid fa-wand-magic-sparkles"></i>' : 'Continue <i class="fa-solid fa-arrow-right"></i>'}
        </button>
      </div>
    `;

    this.container.innerHTML = `
      <div class="onboarding-card" style="padding: 4px;">
        ${headerHtml}
        <div style="min-height: 290px;">
          ${questionContent}
        </div>
        ${navButtonsHtml}
      </div>
    `;
  }

  renderSingleChoice(title, subtitle, key, options) {
    const currentVal = this.answers[key];
    return `
      <div>
        <h2 style="font-size: 21px; font-weight: 900; color: var(--text-main); margin-bottom: 6px;">${title}</h2>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 18px;">${subtitle}</p>
        <div style="display: flex; flex-direction: column; gap: 9px;">
          ${options.map(opt => {
            const isSelected = currentVal === opt;
            return `
              <div onclick="window.wizard.setSingleAnswer('${key}', '${opt.replace(/'/g, "\\'")}')"
                style="padding: 13px 16px; border-radius: 14px; border: 2px solid ${isSelected ? '#8571FF' : 'var(--border)'}; background: ${isSelected ? 'rgba(133, 113, 255, 0.08)' : 'var(--bg-card)'}; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: all 0.15s ease;">
                <span style="font-size: 14px; font-weight: 800; color: var(--text-main);">${opt}</span>
                <div style="width: 20px; height: 20px; border-radius: 50%; border: 2px solid ${isSelected ? '#8571FF' : 'var(--border)'}; background: ${isSelected ? '#8571FF' : 'transparent'}; color: white; display: flex; align-items: center; justify-content: center; font-size: 10px;">
                  ${isSelected ? '<i class="fa-solid fa-check"></i>' : ''}
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  renderMultiChoice(title, subtitle, key, options) {
    const currentList = Array.isArray(this.answers[key]) ? this.answers[key] : [];
    return `
      <div>
        <h2 style="font-size: 21px; font-weight: 900; color: var(--text-main); margin-bottom: 6px;">${title}</h2>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 18px;">${subtitle}</p>
        <div style="display: flex; flex-direction: column; gap: 9px;">
          ${options.map(opt => {
            const isSelected = currentList.includes(opt);
            return `
              <div onclick="window.wizard.toggleMultiAnswer('${key}', '${opt.replace(/'/g, "\\'")}')"
                style="padding: 13px 16px; border-radius: 14px; border: 2px solid ${isSelected ? '#8571FF' : 'var(--border)'}; background: ${isSelected ? 'rgba(133, 113, 255, 0.08)' : 'var(--bg-card)'}; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: all 0.15s ease;">
                <span style="font-size: 14px; font-weight: 800; color: var(--text-main);">${opt}</span>
                <div style="width: 20px; height: 20px; border-radius: 6px; border: 2px solid ${isSelected ? '#8571FF' : 'var(--border)'}; background: ${isSelected ? '#8571FF' : 'transparent'}; color: white; display: flex; align-items: center; justify-content: center; font-size: 10px;">
                  ${isSelected ? '<i class="fa-solid fa-check"></i>' : ''}
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  updateBmiPreview() {
    const bmiBadge = document.getElementById("wizardBmiPreview");
    if (bmiBadge) {
      const bmi = calculateBMI(this.answers.q5_weight_kg, this.answers.q4_height_cm);
      bmiBadge.innerHTML = `
        <span style="font-size: 13px; font-weight: 800; color: var(--text-main);">Live BMI Calculation</span>
        <span style="font-size: 13px; font-weight: 900; color: ${bmi.color}; display: flex; align-items: center; gap: 6px;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: ${bmi.color}; display: inline-block;"></span>
          BMI ${bmi.value} • ${bmi.category}
        </span>
      `;
    }
  }

  renderRevealScreen() {
    if (this.calcProgress < 100) {
      const radius = 60;
      const circumference = 2 * Math.PI * radius;
      const offset = circumference * (1 - this.calcProgress / 100);

      this.container.innerHTML = `
        <div class="onboarding-card" style="text-align: center; padding: 20px 12px 36px; position: relative;">
          <!-- Top Right Close Icon -->
          <div style="display: flex; justify-content: flex-end; margin-bottom: 8px;">
            <button type="button" onclick="window.wizard.closeModal()" title="Close Assessment"
              style="width: 30px; height: 30px; border-radius: 8px; border: none; background: var(--border-light); color: var(--text-muted); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease; font-size: 14px; flex-shrink: 0;"
              onmouseover="this.style.background='rgba(133, 113, 255, 0.15)'; this.style.color='#8571FF';"
              onmouseout="this.style.background='var(--border-light)'; this.style.color='var(--text-muted)';">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <!-- Circular Progress SVG in Purple Theme -->
          <div style="position: relative; width: 140px; height: 140px; margin: 0 auto 20px;">
            <svg style="width: 100%; height: 100%; transform: rotate(-90deg);">
              <circle cx="70" cy="70" r="${radius}" stroke="rgba(133, 113, 255, 0.15)" stroke-width="8" fill="transparent" />
              <circle id="calcProgressCircle" cx="70" cy="70" r="${radius}" stroke="#8571FF" stroke-width="8" fill="transparent"
                stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round" style="transition: stroke-dashoffset 0.1s ease-out;" />
            </svg>
            <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;">
              <span id="calcProgressPct" style="font-size: 32px; font-weight: 900; color: var(--text-main);">${this.calcProgress}%</span>
              <span style="font-size: 10px; font-weight: 800; color: #8571FF; text-transform: uppercase; letter-spacing: 1px;">Synthesizing</span>
            </div>
          </div>

          <h3 style="font-size: 21px; font-weight: 900; color: var(--text-main); margin-bottom: 6px;">
            Synthesizing Your 30-Point Blueprint
          </h3>
          <p id="calcStatusText" style="font-size: 13px; font-weight: 600; color: var(--text-muted); min-height: 20px;">
            ${this.calcStatus}
          </p>
        </div>
      `;
      return;
    }

    // Step 31: Reveal Personalized Master Plan Popup
    // Extract calculated data from backend response if ready, or compute fallback identical values
    const backendMetrics = this.planData?.metrics;
    const backendSpotlight = this.planData?.spotlight_workout;
    const backendMeals = this.planData?.daily_plan;

    const bmr = backendMetrics?.bmr || calculateBMR(this.answers.q2_gender, this.answers.q5_weight_kg, this.answers.q4_height_cm, this.answers.q3_age);
    const tdee = backendMetrics?.tdee || calculateTDEE(bmr, this.answers.q10_activity_level);
    const dailyCalories = backendMetrics?.daily_calories || calculateDailyCalorieTarget(tdee, this.answers.q1_main_goal);
    const waterTargetMl = backendMetrics?.water_target_ml || calculateWaterTarget(this.answers.q5_weight_kg, this.answers.q10_activity_level);
    const waterLiters = (waterTargetMl / 1000).toFixed(1);
    const waterGlasses = Math.round(waterTargetMl / 250);
    const bmiVal = backendMetrics?.bmi || calculateBMI(this.answers.q5_weight_kg, this.answers.q4_height_cm).value;
    const bmiCategory = backendMetrics?.bmi_category || calculateBMI(this.answers.q5_weight_kg, this.answers.q4_height_cm).category;
    const targetKg = this.answers.q6_skipped ? this.answers.q5_weight_kg : this.answers.q6_target_weight_kg;
    const projectedDate = backendMetrics?.projected_date || calculateProjectedDate(this.answers.q5_weight_kg, targetKg);
    const diffKg = Math.abs(this.answers.q5_weight_kg - targetKg).toFixed(1);
    const proteinTarget = backendMetrics?.protein_g || Math.round(this.answers.q5_weight_kg * 1.8);
    const carbsTarget = backendMetrics?.carbs_g || 220;
    const fatTarget = backendMetrics?.fat_g || 55;

    // Spotlight workout summary
    const workoutName = backendSpotlight?.name || "Wall Pilates Core & Posture";
    const workoutDur = backendSpotlight?.duration_min || 20;
    const workoutCat = backendSpotlight?.category || "Pilates & Core";
    const workoutEq = backendSpotlight?.equipment_needed || "No Equipment";
    const workoutFocus = backendSpotlight?.daily_focus || "Personalized Routine";

    // Clean Meal Plan items breakdown
    const mealsData = backendMeals || {
      "Breakfast": [
        { food_name: "Idli", serving: "3 pcs (~150g)", calories: 210 },
        { food_name: "Sambar", serving: "1 bowl (~150g)", calories: 120 },
        { food_name: "Banana", serving: "1 medium", calories: 105 }
      ],
      "Lunch": [
        { food_name: "Rice, cooked", serving: "1.5 cup (~200g)", calories: 260 },
        { food_name: "Dal (lentils)", serving: "1.5 bowl (~200g)", calories: 230 },
        { food_name: "Vegetable Poriyal", serving: "1 cup (~150g)", calories: 110 }
      ],
      "Dinner": [
        { food_name: "Chapati", serving: "2 pcs (~80g)", calories: 200 },
        { food_name: "Paneer Curry", serving: "1 bowl (~150g)", calories: 240 },
        { food_name: "Cucumber Salad", serving: "1 bowl (~100g)", calories: 45 }
      ],
      "Snacks": [
        { food_name: "Almonds, raw", serving: "12 pcs (~15g)", calories: 85 },
        { food_name: "Tender Coconut Water", serving: "1 glass (~250ml)", calories: 45 }
      ]
    };

    this.container.innerHTML = `
      <div class="onboarding-card" style="padding: 6px; max-height: 84vh; overflow-y: auto;">
        
        <!-- Top Status Pill & Close Icon -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 8px;">
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <div style="display: inline-flex; align-items: center; gap: 6px; padding: 5px 14px; border-radius: 999px; background: rgba(133, 113, 255, 0.12); color: #8571FF; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
              <i class="fa-solid fa-sparkles"></i> 30-Point Assessment Complete
            </div>
            <div style="display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 999px; background: rgba(16, 185, 129, 0.12); color: #10B981; font-size: 11px; font-weight: 800;">
              <i class="fa-solid fa-shield-halved"></i> 100% Whole Foods • 0% Junk Guarantee
            </div>
          </div>

          <button type="button" onclick="window.wizard.closeModal()" title="Close Assessment"
            style="width: 30px; height: 30px; border-radius: 8px; border: none; background: var(--border-light); color: var(--text-muted); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease; font-size: 14px; flex-shrink: 0;"
            onmouseover="this.style.background='rgba(133, 113, 255, 0.15)'; this.style.color='#8571FF';"
            onmouseout="this.style.background='var(--border-light)'; this.style.color='var(--text-muted)';">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <h2 style="font-size: 22px; font-weight: 900; color: var(--text-main); margin-bottom: 4px;">
          Your Personalized Blueprint is Ready, ${this.answers.name}!
        </h2>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
          Synthesized from your 30 assessment responses. These exact metrics and plans will populate your daily dashboard.
        </p>

        <!-- Predicted Target Milestone Hero Card (Purple Theme Gradient) -->
        <div style="padding: 20px 22px; border-radius: 20px; background: linear-gradient(135deg, #8571FF, #5D4FB3); color: white; margin-bottom: 16px; box-shadow: 0 8px 24px rgba(133, 113, 255, 0.28);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px;">
            <div>
              <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; opacity: 0.9;">
                Target Milestone Projection
              </span>
              <div style="font-size: 24px; font-weight: 900; margin-top: 3px;">
                ${targetKg} kg by ${projectedDate}
              </div>
            </div>
            <div style="font-size: 32px; opacity: 0.85;">
              <i class="fa-solid fa-bullseye"></i>
            </div>
          </div>
          <div style="padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.22); display: flex; justify-content: space-between; font-size: 12px; opacity: 0.95;">
            <span>Current: <strong>${this.answers.q5_weight_kg} kg</strong></span>
            <span>Target Shift: <strong>${this.answers.q6_skipped ? 'Maintain Weight' : `-${diffKg} kg`}</strong></span>
            <span>BMI: <strong>${bmiVal} (${bmiCategory})</strong></span>
          </div>
        </div>

        <!-- 4 Core Metrics Strip (100% Matching Daily Plan) -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px;">
          <div style="padding: 12px; border-radius: 16px; background: var(--bg-card); border: 1px solid var(--border); text-align: center;">
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--text-muted);">
              <i class="fa-solid fa-fire" style="color: #8571FF; margin-right: 2px;"></i> Calories
            </div>
            <div style="font-size: 20px; font-weight: 900; color: var(--text-main); margin: 3px 0;">${dailyCalories}</div>
            <div style="font-size: 10px; color: var(--text-muted); font-weight: 700;">kcal/day</div>
          </div>

          <div style="padding: 12px; border-radius: 16px; background: var(--bg-card); border: 1px solid var(--border); text-align: center;">
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--text-muted);">
              <i class="fa-solid fa-droplet" style="color: #7864F6; margin-right: 2px;"></i> Water Level
            </div>
            <div style="font-size: 20px; font-weight: 900; color: #7864F6; margin: 3px 0;">${waterLiters} L</div>
            <div style="font-size: 10px; color: var(--text-muted); font-weight: 700;">${waterTargetMl} ml (${waterGlasses} gl)</div>
          </div>

          <div style="padding: 12px; border-radius: 16px; background: var(--bg-card); border: 1px solid var(--border); text-align: center;">
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--text-muted);">
              <i class="fa-solid fa-egg" style="color: #8571FF; margin-right: 2px;"></i> Protein
            </div>
            <div style="font-size: 20px; font-weight: 900; color: var(--text-main); margin: 3px 0;">${proteinTarget}g</div>
            <div style="font-size: 10px; color: var(--text-muted); font-weight: 700;">Target / day</div>
          </div>

          <div style="padding: 12px; border-radius: 16px; background: var(--bg-card); border: 1px solid var(--border); text-align: center;">
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--text-muted);">
              <i class="fa-solid fa-wheat-awn" style="color: #8571FF; margin-right: 2px;"></i> Carbs & Fat
            </div>
            <div style="font-size: 16px; font-weight: 900; color: var(--text-main); margin: 6px 0;">${carbsTarget}g / ${fatTarget}g</div>
            <div style="font-size: 10px; color: var(--text-muted); font-weight: 700;">Healthy macros</div>
          </div>
        </div>

        <!-- Spotlight Workout Card -->
        <div style="padding: 16px; border-radius: 18px; background: var(--bg-card); border: 1px solid var(--border); border-left: 5px solid #8571FF; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 10px; font-weight: 900; text-transform: uppercase; background: rgba(133, 113, 255, 0.12); color: #8571FF; padding: 3px 8px; border-radius: 6px;">
                <i class="fa-solid fa-dumbbell"></i> Spotlight Workout
              </span>
              <span style="font-size: 11px; font-weight: 700; color: var(--text-muted);">${workoutCat}</span>
            </div>
            <span style="font-size: 12px; font-weight: 800; color: var(--text-main);"><i class="fa-regular fa-clock"></i> ${workoutDur} min</span>
          </div>

          <div style="font-size: 16px; font-weight: 900; color: var(--text-main); margin-bottom: 4px;">
            ${workoutName}
          </div>
          <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">
            ${workoutFocus} • Gear needed: <strong>${workoutEq}</strong>
          </div>
        </div>

        <!-- Daily Whole-Food Meal Plan Breakdown (Breakfast, Lunch, Dinner, Snacks) -->
        <div style="padding: 16px; border-radius: 18px; background: var(--bg-card); border: 1px solid var(--border); margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid var(--border-light); padding-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-bowl-food" style="color: #8571FF; font-size: 16px;"></i>
              <span style="font-size: 14px; font-weight: 900; color: var(--text-main);">Personalized Clean Meal Plan</span>
            </div>
            <span style="font-size: 11px; font-weight: 800; color: #10B981; background: rgba(16, 185, 129, 0.1); padding: 3px 8px; border-radius: 6px;">
              Zero Junk • ${this.answers.q17_diet}
            </span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
            <!-- Breakfast -->
            <div style="padding: 10px 12px; border-radius: 12px; background: var(--border-light); font-size: 12px;">
              <div style="font-weight: 800; color: var(--text-main); margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                <i class="fa-solid fa-mug-saucer" style="color: #8571FF;"></i> Breakfast (~25%)
              </div>
              ${(mealsData["Breakfast"] || []).map(item => `
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px; color: var(--text-muted);">
                  <span>• ${item.food_name || item.name} <small style="opacity: 0.8;">(${item.serving})</small></span>
                  <span style="font-weight: 700; color: var(--text-main);">${Math.round(item.calories)} kcal</span>
                </div>
              `).join("")}
            </div>

            <!-- Lunch -->
            <div style="padding: 10px 12px; border-radius: 12px; background: var(--border-light); font-size: 12px;">
              <div style="font-weight: 800; color: var(--text-main); margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                <i class="fa-solid fa-utensils" style="color: #8571FF;"></i> Lunch (~35%)
              </div>
              ${(mealsData["Lunch"] || []).map(item => `
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px; color: var(--text-muted);">
                  <span>• ${item.food_name || item.name} <small style="opacity: 0.8;">(${item.serving})</small></span>
                  <span style="font-weight: 700; color: var(--text-main);">${Math.round(item.calories)} kcal</span>
                </div>
              `).join("")}
            </div>

            <!-- Dinner -->
            <div style="padding: 10px 12px; border-radius: 12px; background: var(--border-light); font-size: 12px;">
              <div style="font-weight: 800; color: var(--text-main); margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                <i class="fa-solid fa-plate-wheat" style="color: #8571FF;"></i> Dinner (~25%)
              </div>
              ${(mealsData["Dinner"] || []).map(item => `
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px; color: var(--text-muted);">
                  <span>• ${item.food_name || item.name} <small style="opacity: 0.8;">(${item.serving})</small></span>
                  <span style="font-weight: 700; color: var(--text-main);">${Math.round(item.calories)} kcal</span>
                </div>
              `).join("")}
            </div>

            <!-- Snacks -->
            <div style="padding: 10px 12px; border-radius: 12px; background: var(--border-light); font-size: 12px;">
              <div style="font-weight: 800; color: var(--text-main); margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                <i class="fa-solid fa-apple-whole" style="color: #8571FF;"></i> Healthy Snacks (~15%)
              </div>
              ${(mealsData["Snacks"] || []).map(item => `
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px; color: var(--text-muted);">
                  <span>• ${item.food_name || item.name} <small style="opacity: 0.8;">(${item.serving})</small></span>
                  <span style="font-weight: 700; color: var(--text-main);">${Math.round(item.calories)} kcal</span>
                </div>
              `).join("")}
            </div>
          </div>
        </div>

        <!-- Big Start My Transformation Button -->
        <button type="button" id="btnFinishOnboarding" onclick="window.wizard.finishAndEnterDashboard()"
          style="width: 100%; justify-content: center; padding: 16px; background: linear-gradient(135deg, #8571FF, #5D4FB3); border: none; color: white; font-weight: 900; font-size: 15px; border-radius: 16px; cursor: pointer; display: flex; align-items: center; gap: 10px; box-shadow: 0 6px 20px rgba(133, 113, 255, 0.35); transition: transform 0.1s ease;">
          <span>Start My Transformation & Enter Dashboard</span> <i class="fa-solid fa-arrow-right"></i>
        </button>
      </div>
    `;
  }
}
