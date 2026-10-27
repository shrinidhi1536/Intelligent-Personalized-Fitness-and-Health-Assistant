import { api, showToast, sound } from "./api.js";

export async function renderDashboard(container) {
  container.innerHTML = `
    <div style="text-align: center; padding: 60px 0;">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 32px; color: var(--primary);"></i>
      <p style="margin-top: 12px; color: var(--text-muted);">Loading personalized fitness dashboard...</p>
    </div>
  `;

  try {
    const data = await api.get("/api/dashboard/summary");
    if (data.onboarding_required) {
      window.app.startOnboarding();
      return;
    }

    const { biometrics, nutrition, hydration, workout, streak_days, daily_tracking, health_score, workout_minutes_today, todays_insights } = data;

    // Dynamically update streak counter in top bar
    const streakEl = document.getElementById("streakCount");
    if (streakEl) {
      const s = streak_days || 0;
      streakEl.innerText = `${s} Day${s === 1 ? '' : 's'} Active`;
    }

    const track = daily_tracking || {
      consumed_cals: Math.round(nutrition.consumed.calories),
      burned_cals: 0,
      remaining_cals: Math.max(Math.round(nutrition.target.calories - nutrition.consumed.calories), 0),
      goal_cals: Math.round(nutrition.target.calories)
    };

    const calPct = Math.min(Math.round((nutrition.consumed.calories / Math.max(nutrition.target.calories, 1)) * 100), 100);
    const protPct = Math.min(Math.round((nutrition.consumed.protein_g / Math.max(nutrition.target.protein_g, 1)) * 100), 100);
    const carbsPct = Math.min(Math.round((nutrition.consumed.carbs_g / Math.max(nutrition.target.carbs_g, 1)) * 100), 100);
    const fatPct = Math.min(Math.round((nutrition.consumed.fat_g / Math.max(nutrition.target.fat_goal || nutrition.target.fat_g, 1)) * 100), 100);

    const insights = todays_insights || {
      nutrition: `Your protein intake is ${protPct < 70 ? "below your target. You've had " + Math.round(nutrition.consumed.protein_g) + "g of " + Math.round(nutrition.target.protein_g) + "g — consider adding paneer, eggs, dal or sprouts." : "on track for your daily target."}`,
      hydration: `You've consumed ${(hydration.consumed_ml / 1000).toFixed(1)} L of your ${(hydration.target_ml / 1000).toFixed(1)} L target. You need approximately ${Math.max(0, Math.round(hydration.target_ml - hydration.consumed_ml))} ml more.`
    };

    container.innerHTML = `
      <!-- Top Prominent BMI Banner -->
      <div class="app-card" style="margin-bottom: 20px; padding: 18px 24px; border-left: 5px solid var(--primary); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; background: linear-gradient(135deg, var(--bg-card), var(--border-light));">
        <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
          <span style="font-size: 13px; font-weight: 900; padding: 8px 18px; border-radius: 999px; background: var(--primary); color: white; text-transform: uppercase; letter-spacing: 0.6px; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 2px 8px rgba(133, 113, 255, 0.3);">
            <i class="fa-solid fa-heart-pulse"></i> ${biometrics.bmi_category || 'Normal BMI'}
          </span>
          <div>
            <div style="font-size: 15px; font-weight: 800; color: var(--text-main);">
              BMI ${biometrics.bmi} <span style="font-size: 13px; font-weight: 600; color: var(--text-muted); margin-left: 6px;">• Current Weight: <strong>${biometrics.current_weight} kg</strong> • Target Weight: <strong>${biometrics.target_weight} kg</strong></span>
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 10px;">
          <button class="btn-secondary" style="font-size: 12px; padding: 8px 14px;" onclick="window.app.navigate('plan')">
            <i class="fa-solid fa-clipboard-check" style="color: var(--primary);"></i> Your Plan Today
          </button>
          <button class="btn-secondary" style="font-size: 12px; padding: 8px 14px;" onclick="window.app.navigate('assistant')">
            <i class="fa-solid fa-robot" style="color: var(--primary);"></i> AI Coach
          </button>
        </div>
      </div>

      <!-- 5 Quick Glance Metric Cards Row -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <!-- Card 1: Calories -->
        <div class="app-card" style="padding: 18px; border-radius: var(--radius-md); display: flex; flex-direction: column; justify-content: space-between;">
          <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-fire" style="color: var(--primary);"></i> Calories (kcal)
          </div>
          <div style="font-size: 22px; font-weight: 900; color: var(--text-main); margin-top: 10px;">
            ${track.consumed_cals} <span style="font-size: 13px; color: var(--text-muted); font-weight: 700;">/ ${track.goal_cals}</span>
          </div>
          <div class="progress-track" style="height: 6px; margin-top: 10px;">
            <div class="progress-fill fill-primary" style="width: ${calPct}%;"></div>
          </div>
        </div>

        <!-- Card 2: Protein -->
        <div class="app-card" style="padding: 18px; border-radius: var(--radius-md); display: flex; flex-direction: column; justify-content: space-between;">
          <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-egg" style="color: var(--primary);"></i> Protein
          </div>
          <div style="font-size: 22px; font-weight: 900; color: var(--text-main); margin-top: 10px;">
            ${Math.round(nutrition.consumed.protein_g)} <span style="font-size: 13px; color: var(--text-muted); font-weight: 700;">/ ${Math.round(nutrition.target.protein_g)}g</span>
          </div>
          <div class="progress-track" style="height: 6px; margin-top: 10px;">
            <div class="progress-fill fill-primary" style="width: ${protPct}%;"></div>
          </div>
        </div>

        <!-- Card 3: Water -->
        <div class="app-card" style="padding: 18px; border-radius: var(--radius-md); display: flex; flex-direction: column; justify-content: space-between;">
          <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); display: flex; align-items: center; justify-content: space-between;">
            <span style="display: flex; align-items: center; gap: 6px;"><i class="fa-solid fa-droplet" style="color: var(--primary);"></i> Water</span>
            <div style="display: flex; gap: 4px;">
              <button onclick="window.app.quickWater(250)" title="Quick +250ml" style="background: var(--primary-light); color: var(--primary-hover); border: none; border-radius: 4px; padding: 2px 7px; font-size: 10px; font-weight: 800; cursor: pointer;">+250</button>
              <button onclick="window.app.quickWater(500)" title="Quick +500ml" style="background: var(--primary-light); color: var(--primary-hover); border: none; border-radius: 4px; padding: 2px 7px; font-size: 10px; font-weight: 800; cursor: pointer;">+500</button>
            </div>
          </div>
          <div style="font-size: 22px; font-weight: 900; color: var(--text-main); margin-top: 10px;">
            ${(hydration.consumed_ml / 1000).toFixed(1)} <span style="font-size: 13px; color: var(--text-muted); font-weight: 700;">/ ${(hydration.target_ml / 1000).toFixed(1)}L</span>
          </div>
          <div class="progress-track" style="height: 6px; margin-top: 10px;">
            <div class="progress-fill fill-primary" style="width: ${hydration.percentage}%;"></div>
          </div>
        </div>

        <!-- Card 4: Workout Today -->
        <div class="app-card" style="padding: 18px; border-radius: var(--radius-md); display: flex; flex-direction: column; justify-content: space-between;">
          <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-dumbbell" style="color: var(--primary);"></i> Workout Today
          </div>
          <div style="font-size: 22px; font-weight: 900; color: var(--text-main); margin-top: 10px;">
            ${workout_minutes_today || 0} <span style="font-size: 13px; color: var(--text-muted); font-weight: 700;">min</span>
          </div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 10px;">
            ${(workout.completed_today || []).length} routine${(workout.completed_today || []).length === 1 ? '' : 's'} completed today
          </div>
        </div>

        <!-- Card 5: Health Score -->
        <div class="app-card" style="padding: 18px; border-radius: var(--radius-md); display: flex; flex-direction: column; justify-content: space-between;">
          <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-gauge-high" style="color: var(--primary);"></i> Health Score
          </div>
          <div style="font-size: 22px; font-weight: 900; color: var(--primary); margin-top: 10px;">
            ${health_score ?? 55} <span style="font-size: 13px; color: var(--text-muted); font-weight: 700;">/ 100</span>
          </div>
          <div class="progress-track" style="height: 6px; margin-top: 10px;">
            <div class="progress-fill fill-primary" style="width: ${health_score ?? 55}%;"></div>
          </div>
        </div>
      </div>

      <!-- Core Tracking & Insights 2-Column Balanced Layout -->
      <div style="display: grid; grid-template-columns: repeat(12, 1fr); gap: 24px; margin-bottom: 24px;">
        
        <!-- Left Column (7 Cols): Daily Calorie Tracking + Macronutrients Combined -->
        <div class="col-span-7" style="display: flex; flex-direction: column; gap: 20px;">
          <div class="app-card" style="padding: 24px;">
            <!-- Section 1: Daily Calorie Tracking -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <div style="display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 800; color: var(--text-main);">
                <i class="fa-solid fa-fire" style="color: var(--primary);"></i>
                <span>Daily Calorie Tracking</span>
              </div>
              <span style="font-size: 12px; font-weight: 800; color: var(--primary-hover); background: var(--primary-light); padding: 4px 10px; border-radius: 999px;">
                ${calPct}% Met
              </span>
            </div>

            <div style="text-align: center; margin: 12px 0 18px;">
              <div style="font-size: 38px; font-weight: 900; color: var(--text-main); line-height: 1;">${track.consumed_cals}</div>
              <div style="font-size: 13px; color: var(--text-muted); font-weight: 700; margin-top: 6px;">of ${track.goal_cals} kcal</div>
              <div class="progress-track" style="height: 10px; margin-top: 14px; border-radius: 999px;">
                <div class="progress-fill fill-primary" style="width: ${calPct}%;"></div>
              </div>
            </div>

            <!-- 4 Metric Cards: Consumed, Burned, Remaining, Goal -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding: 14px 0; border-top: 1px solid var(--border-light); border-bottom: 1px solid var(--border-light);">
              <div style="background: var(--border-light); padding: 10px; border-radius: var(--radius-sm); text-align: center;">
                <div style="font-size: 10px; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">Consumed</div>
                <div style="font-size: 15px; font-weight: 900; color: var(--text-main); margin-top: 3px;">${track.consumed_cals} <span style="font-size: 10px; font-weight: 600;">kcal</span></div>
              </div>
              <div style="background: var(--border-light); padding: 10px; border-radius: var(--radius-sm); text-align: center;">
                <div style="font-size: 10px; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">Burned</div>
                <div style="font-size: 15px; font-weight: 900; color: var(--primary); margin-top: 3px;">${track.burned_cals} <span style="font-size: 10px; font-weight: 600;">kcal</span></div>
              </div>
              <div style="background: var(--border-light); padding: 10px; border-radius: var(--radius-sm); text-align: center;">
                <div style="font-size: 10px; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">Remaining</div>
                <div style="font-size: 15px; font-weight: 900; color: var(--text-main); margin-top: 3px;">${track.remaining_cals} <span style="font-size: 10px; font-weight: 600;">kcal</span></div>
              </div>
              <div style="background: var(--border-light); padding: 10px; border-radius: var(--radius-sm); text-align: center;">
                <div style="font-size: 10px; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">Goal</div>
                <div style="font-size: 15px; font-weight: 900; color: var(--primary-hover); margin-top: 3px;">${track.goal_cals} <span style="font-size: 10px; font-weight: 600;">kcal</span></div>
              </div>
            </div>

            <!-- Section 2: Macronutrients (Wide, spacious progress bars with zero line breaks!) -->
            <div style="margin-top: 20px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                <div style="display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 800; color: var(--text-main);">
                  <i class="fa-solid fa-chart-pie" style="color: var(--primary);"></i>
                  <span>Macronutrients</span>
                </div>
                <span style="font-size: 11px; color: var(--text-muted); font-weight: 600;">Scientific TDEE Target</span>
              </div>

              <div style="display: flex; flex-direction: column; gap: 14px;">
                <!-- Protein -->
                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 700; margin-bottom: 5px;">
                    <span style="color: var(--text-main);">Protein</span>
                    <span style="color: var(--primary); font-weight: 800;">${Math.round(nutrition.consumed.protein_g)} / ${Math.round(nutrition.target.protein_g)} g</span>
                  </div>
                  <div class="progress-track" style="height: 8px;">
                    <div class="progress-fill fill-primary" style="width: ${protPct}%;"></div>
                  </div>
                </div>

                <!-- Carbohydrates -->
                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 700; margin-bottom: 5px;">
                    <span style="color: var(--text-main);">Carbohydrates</span>
                    <span style="color: var(--primary); font-weight: 800;">${Math.round(nutrition.consumed.carbs_g)} / ${Math.round(nutrition.target.carbs_g)} g</span>
                  </div>
                  <div class="progress-track" style="height: 8px;">
                    <div class="progress-fill fill-primary" style="width: ${carbsPct}%;"></div>
                  </div>
                </div>

                <!-- Fat -->
                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 700; margin-bottom: 5px;">
                    <span style="color: var(--text-main);">Fat</span>
                    <span style="color: var(--primary); font-weight: 800;">${Math.round(nutrition.consumed.fat_g)} / ${Math.round(nutrition.target.fat_goal || nutrition.target.fat_g)} g</span>
                  </div>
                  <div class="progress-track" style="height: 8px;">
                    <div class="progress-fill fill-primary" style="width: ${fatPct}%;"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column (5 Cols): Today's AI Insight & Shortcuts -->
        <div class="col-span-5" style="display: flex; flex-direction: column; gap: 20px;">
          <!-- Today's AI Insight Card -->
          <div class="app-card" style="padding: 24px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div class="card-header" style="margin-bottom: 16px;">
                <div class="card-title" style="font-size: 16px; font-weight: 800;">
                  <i class="fa-solid fa-wand-magic-sparkles" style="color: var(--primary);"></i>
                  <span>Today's AI Insight</span>
                </div>
                <span style="font-size: 11px; font-weight: 800; color: var(--primary); background: var(--primary-light); padding: 3px 8px; border-radius: 999px;">
                  Active Analysis
                </span>
              </div>

              <div style="display: flex; flex-direction: column; gap: 14px;">
                <!-- Nutrition Insight -->
                <div style="background: var(--border-light); padding: 14px 16px; border-radius: var(--radius-md); border-left: 4px solid var(--primary);">
                  <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--primary-hover); margin-bottom: 5px; display: flex; align-items: center; gap: 6px;">
                    <i class="fa-solid fa-utensils"></i> Nutrition
                  </div>
                  <p style="font-size: 13px; color: var(--text-main); line-height: 1.45; margin: 0;">
                    ${insights.nutrition}
                  </p>
                </div>

                <!-- Hydration Insight -->
                <div style="background: var(--border-light); padding: 14px 16px; border-radius: var(--radius-md); border-left: 4px solid var(--primary-mid);">
                  <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--primary-hover); margin-bottom: 5px; display: flex; align-items: center; gap: 6px;">
                    <i class="fa-solid fa-droplet"></i> Hydration
                  </div>
                  <p style="font-size: 13px; color: var(--text-main); line-height: 1.45; margin: 0;">
                    ${insights.hydration}
                  </p>
                </div>
              </div>
            </div>

            <div style="margin-top: 18px; text-align: right;">
              <button class="btn-secondary" style="font-size: 12px; padding: 8px 16px; border-color: var(--primary); color: var(--primary); font-weight: 700;" onclick="window.app.navigate('assistant')">
                View all insights <i class="fa-solid fa-arrow-right" style="margin-left: 6px;"></i>
              </button>
            </div>
          </div>

          <!-- Quick Navigation Shortcuts Card -->
          <div class="app-card" style="padding: 20px;">
            <div style="font-size: 13px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px;">
              Quick Actions
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <button class="btn-secondary" style="padding: 12px; justify-content: flex-start; text-align: left; font-size: 12px;" onclick="window.app.navigate('plan')">
                <i class="fa-solid fa-clipboard-check" style="color: var(--primary); font-size: 14px;"></i>
                <div>
                  <div style="font-weight: 800; color: var(--text-main);">Your Plan Today</div>
                  <div style="font-size: 10px; color: var(--text-muted);">Workout, Diet & Water</div>
                </div>
              </button>
              <button class="btn-secondary" style="padding: 12px; justify-content: flex-start; text-align: left; font-size: 12px;" onclick="window.app.navigate('food')">
                <i class="fa-solid fa-bowl-food" style="color: var(--primary); font-size: 14px;"></i>
                <div>
                  <div style="font-weight: 800; color: var(--text-main);">Food Diary</div>
                  <div style="font-size: 10px; color: var(--text-muted);">Log Meals & Calories</div>
                </div>
              </button>
              <button class="btn-secondary" style="padding: 12px; justify-content: flex-start; text-align: left; font-size: 12px;" onclick="window.app.navigate('workouts')">
                <i class="fa-solid fa-dumbbell" style="color: var(--primary); font-size: 14px;"></i>
                <div>
                  <div style="font-weight: 800; color: var(--text-main);">Workout Studio</div>
                  <div style="font-size: 10px; color: var(--text-muted);">Library & Routines</div>
                </div>
              </button>
              <button class="btn-secondary" style="padding: 12px; justify-content: flex-start; text-align: left; font-size: 12px;" onclick="window.app.navigate('scanner')">
                <i class="fa-solid fa-camera" style="color: var(--primary); font-size: 14px;"></i>
                <div>
                  <div style="font-weight: 800; color: var(--text-main);">Food Scanner</div>
                  <div style="font-size: 10px; color: var(--text-muted);">AI Plate Analysis</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="app-card" style="color: var(--primary); text-align: center; padding: 40px;">Error loading dashboard: ${err.message}</div>`;
  }
}
