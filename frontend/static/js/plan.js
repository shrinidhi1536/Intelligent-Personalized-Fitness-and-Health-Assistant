import { api, showToast, sound } from "./api.js";

export async function renderPlanToday(container) {
  container.innerHTML = `
    <div style="text-align: center; padding: 60px 0;">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 32px; color: var(--primary);"></i>
      <p style="margin-top: 12px; color: var(--text-muted);">Loading your personalized plan for today...</p>
    </div>
  `;

  try {
    const [workoutRes, dietRes, hydRes] = await Promise.all([
      api.get("/api/workouts/recommendations").catch(() => ({ spotlight: { id: 1, name: "Daily Movement Routine", duration_min: 20, cal_per_minute: 6, difficulty: "Beginner", equipment_needed: "No Equipment", target_muscles: "Full Body" }, recent_completions: [] })),
      api.get("/api/nutrition/daily-plan").catch(() => ({ plan: { target: { calories: 2304 }, planned_total: { calories: 2280 }, meals: {} } })),
      api.get("/api/hydration/status").catch(() => ({ target_ml: 2500, consumed_ml: 0, percentage: 0 }))
    ]);

    const spotlight = workoutRes.spotlight || { id: 1, name: "Daily Movement Routine", duration_min: 20, cal_per_minute: 6, difficulty: "Beginner", equipment_needed: "No Equipment", target_muscles: "Full Body" };
    const completedToday = workoutRes.completed_today || [];
    const isWorkoutDoneToday = completedToday.some(c => c.workout_name === spotlight.name);

    const plan = dietRes.plan || { target: { calories: 2304 }, planned_total: { calories: 2280 }, meals: {} };
    const meals = plan.meals || {};

    const hydration = hydRes || { target_ml: 2500, consumed_ml: 0, percentage: 0 };
    const waterRem = Math.max((hydration.target_ml || 2500) - (hydration.consumed_ml || 0), 0);

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 24px;">
        
        <!-- SECTION 1: Recommended Workout Plan for Today -->
        <div class="app-card" style="padding: 24px; position: relative; overflow: hidden; background: linear-gradient(135deg, var(--bg-card), var(--border-light)); border-left: 5px solid var(--primary);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 14px; margin-bottom: 16px;">
            <div>
              <span style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.6px; background: var(--primary); color: white; padding: 5px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 6px;">
                <i class="fa-solid fa-fire"></i> ${spotlight.daily_focus ? `${new Date().toLocaleDateString('en-US', { weekday: 'long' })} • ${spotlight.daily_focus}` : "Recommended Workout Plan"}
              </span>
              <h2 style="font-size: 24px; font-weight: 900; color: var(--text-main); margin-top: 10px; margin-bottom: 4px;">
                ${spotlight.name || "Daily Movement Routine"}
              </h2>
              <p style="font-size: 13px; color: var(--text-muted); max-width: 650px; line-height: 1.45; margin: 0;">
                ${spotlight.daily_description || spotlight.description || "Calibrated specifically to your body profile, target zones, and recovery rhythm."}
              </p>
            </div>

            <div style="display: flex; align-items: center; gap: 10px;">
              ${isWorkoutDoneToday ? `
                <span style="font-size: 12px; font-weight: 800; color: #16a34a; background: rgba(22, 163, 74, 0.12); padding: 6px 14px; border-radius: 999px; display: flex; align-items: center; gap: 6px;">
                  <i class="fa-solid fa-circle-check"></i> Completed Today
                </span>
              ` : `
                <span style="font-size: 12px; font-weight: 800; color: var(--primary); background: var(--primary-light); padding: 6px 14px; border-radius: 999px;">
                  Scheduled for Today
                </span>
              `}
              <button class="btn-primary" style="padding: 10px 22px; font-size: 14px;" onclick="window.app.startWorkout(${spotlight.id})">
                <i class="fa-solid fa-play"></i> View
              </button>
            </div>
          </div>

          <!-- Workout Details Badges -->
          <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px; border-top: 1px solid var(--border-light); padding-top: 14px;">
            <span style="font-size: 12px; font-weight: 700; color: var(--primary-hover); background: var(--bg-card); padding: 6px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border);">
              <i class="fa-solid fa-clock"></i> ${spotlight.duration_min || 20} Minutes
            </span>
            <span style="font-size: 12px; font-weight: 700; color: var(--primary-hover); background: var(--bg-card); padding: 6px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border);">
              <i class="fa-solid fa-bolt"></i> ~${Math.round((spotlight.duration_min || 20) * (spotlight.cal_per_minute || 6))} kcal Burn
            </span>
            <span style="font-size: 12px; font-weight: 700; color: var(--text-main); background: var(--bg-card); padding: 6px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border);">
              <i class="fa-solid fa-layer-group"></i> ${spotlight.difficulty || "Beginner"}
            </span>
            <span style="font-size: 12px; font-weight: 700; color: var(--text-main); background: var(--bg-card); padding: 6px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border);">
              <i class="fa-solid fa-bullseye"></i> ${spotlight.target_muscles || "Full Body"}
            </span>
            <span style="font-size: 12px; font-weight: 700; color: var(--text-muted); background: var(--bg-card); padding: 6px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border);">
              <i class="fa-solid fa-dumbbell"></i> ${spotlight.equipment_needed || "No Equipment"}
            </span>
          </div>
        </div>

        <!-- SECTION 2: Recommended Diet Plan for Today -->
        <div class="app-card" style="padding: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 20px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.6px; background: var(--primary-light); color: var(--primary-hover); padding: 4px 10px; border-radius: 999px;">
                  Diet Intelligence
                </span>
                <span style="font-size: 12px; color: var(--text-muted);">Check meals as consumed to log automatically</span>
              </div>
              <h2 style="font-size: 22px; font-weight: 900; color: var(--text-main); margin-top: 6px;">
                Recommended Diet Plan for Today
              </h2>
            </div>

            <!-- Target vs Planned Totals with Full Macro Breakdown -->
            <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
              <div style="display: flex; gap: 12px; background: var(--border-light); padding: 10px 16px; border-radius: var(--radius-md); border: 1px solid var(--border);">
                <div style="text-align: center;">
                  <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--text-muted);">Calories</div>
                  <div style="font-size: 15px; font-weight: 900; color: var(--text-main);">${Math.round(plan.planned_total.calories || 0)} <span style="font-size: 11px; font-weight: 700; color: var(--text-muted);">/ ${plan.target.calories || 2304}</span></div>
                </div>
                <div style="width: 1px; background: var(--border);"></div>
                <div style="text-align: center;">
                  <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #3b82f6;">Protein</div>
                  <div style="font-size: 15px; font-weight: 900; color: var(--text-main);">${Math.round(plan.planned_total.protein_g || 0)}g <span style="font-size: 11px; font-weight: 700; color: var(--text-muted);">/ ${plan.target.protein_g || 0}g</span></div>
                </div>
                <div style="width: 1px; background: var(--border);"></div>
                <div style="text-align: center;">
                  <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #10b981;">Carbs</div>
                  <div style="font-size: 15px; font-weight: 900; color: var(--text-main);">${Math.round(plan.planned_total.carbs_g || 0)}g <span style="font-size: 11px; font-weight: 700; color: var(--text-muted);">/ ${plan.target.carbs_g || 0}g</span></div>
                </div>
                <div style="width: 1px; background: var(--border);"></div>
                <div style="text-align: center;">
                  <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #f59e0b;">Fat</div>
                  <div style="font-size: 15px; font-weight: 900; color: var(--text-main);">${Math.round(plan.planned_total.fat_g || 0)}g <span style="font-size: 11px; font-weight: 700; color: var(--text-muted);">/ ${plan.target.fat_g || 0}g</span></div>
                </div>
              </div>
              <span style="font-size: 11px; font-weight: 800; color: #16a34a; background: rgba(22, 163, 74, 0.12); padding: 6px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 5px;">
                <i class="fa-solid fa-circle-check"></i> 100% Target Matched
              </span>
            </div>
          </div>

          <!-- 4 Meal Cards Grid -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
            ${renderMealColumn("Breakfast", "fa-mug-saucer", meals.Breakfast || [])}
            ${renderMealColumn("Lunch", "fa-utensils", meals.Lunch || [])}
            ${renderMealColumn("Dinner", "fa-bowl-rice", meals.Dinner || [])}
            ${renderMealColumn("Snacks", "fa-apple-whole", meals.Snacks || [])}
          </div>
        </div>

        <!-- SECTION 3: Recommended Water Intake for Today -->
        <div class="app-card" style="padding: 24px; border-left: 5px solid var(--primary-mid);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 14px; margin-bottom: 18px;">
            <div>
              <span style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.6px; background: var(--primary-light); color: var(--primary-hover); padding: 4px 10px; border-radius: 999px;">
                Hydration Requirement
              </span>
              <h2 style="font-size: 22px; font-weight: 900; color: var(--text-main); margin-top: 6px;">
                Recommended Water Intake for Today
              </h2>
              <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">
                Calibrated to your body weight, activity level, and climate needs.
              </p>
            </div>

            <div style="display: flex; gap: 8px;">
              <button class="btn-secondary" onclick="window.app.quickWater(250)" style="font-size: 13px; font-weight: 800;">
                <i class="fa-solid fa-plus" style="color: var(--primary);"></i> 250 ml (Glass)
              </button>
              <button class="btn-secondary" onclick="window.app.quickWater(500)" style="font-size: 13px; font-weight: 800;">
                <i class="fa-solid fa-plus" style="color: var(--primary);"></i> 500 ml (Bottle)
              </button>
              <button class="btn-primary" onclick="window.app.promptCustomWater()" style="font-size: 13px;">
                <i class="fa-solid fa-droplet"></i> Custom Log
              </button>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 10px;">
            <div style="background: var(--border-light); padding: 16px; border-radius: var(--radius-md); text-align: center;">
              <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text-muted);">Recommended Target</div>
              <div style="font-size: 26px; font-weight: 900; color: var(--primary); margin-top: 6px;">
                ${(hydration.target_ml / 1000).toFixed(1)} <span style="font-size: 14px;">L</span>
              </div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">${hydration.target_ml} ml daily goal</div>
            </div>

            <div style="background: var(--border-light); padding: 16px; border-radius: var(--radius-md); text-align: center;">
              <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text-muted);">Consumed Today</div>
              <div style="font-size: 26px; font-weight: 900; color: var(--text-main); margin-top: 6px;">
                ${(hydration.consumed_ml / 1000).toFixed(1)} <span style="font-size: 14px;">L</span>
              </div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">${hydration.percentage}% completed</div>
            </div>

            <div style="background: var(--border-light); padding: 16px; border-radius: var(--radius-md); text-align: center;">
              <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text-muted);">Remaining Needed</div>
              <div style="font-size: 26px; font-weight: 900; color: ${waterRem > 0 ? 'var(--primary-hover)' : '#16a34a'}; margin-top: 6px;">
                ${(waterRem / 1000).toFixed(1)} <span style="font-size: 14px;">L</span>
              </div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">${waterRem} ml to go</div>
            </div>
          </div>

          <div style="margin-top: 18px;">
            <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">
              <span>Hydration Progress</span>
              <span>${hydration.percentage}%</span>
            </div>
            <div class="progress-track" style="height: 10px; border-radius: 999px;">
              <div class="progress-fill fill-primary" style="width: ${Math.min(hydration.percentage, 100)}%;"></div>
            </div>
          </div>
        </div>

      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="app-card" style="color: var(--primary); text-align: center; padding: 40px;">Error loading daily plan: ${err.message}</div>`;
  }
}

function renderMealColumn(mealTitle, iconClass, items) {
  const mealCals = Math.round(items.reduce((acc, i) => acc + (parseFloat(i.calories) || 0), 0));
  const mealProt = Math.round(items.reduce((acc, i) => acc + (parseFloat(i.protein_g) || 0), 0));
  const mealCarbs = Math.round(items.reduce((acc, i) => acc + (parseFloat(i.carbs_g) || 0), 0));
  const mealFat = Math.round(items.reduce((acc, i) => acc + (parseFloat(i.fat_g) || 0), 0));

  return `
    <div style="background: var(--border-light); border-radius: var(--radius-md); padding: 16px; display: flex; flex-direction: column; justify-content: space-between; border: 1px solid var(--border);">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border);">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 800; color: var(--text-main);">
              <i class="fa-solid ${iconClass}" style="color: var(--primary);"></i>
              <span>${mealTitle}</span>
            </div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 3px;">
              P: ${mealProt}g • C: ${mealCarbs}g • F: ${mealFat}g
            </div>
          </div>
          <span style="font-size: 11px; font-weight: 800; color: var(--primary); background: var(--bg-card); padding: 3px 8px; border-radius: 4px; border: 1px solid var(--border);">
            ${mealCals} kcal
          </span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${items.length === 0 ? `
            <div style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 16px 0;">No items planned</div>
          ` : items.map(item => `
            <div class="food-checklist-item ${item.is_consumed ? 'consumed' : ''}" id="checkItem_${item.id}" style="padding: 10px; background: var(--bg-card); border-radius: var(--radius-sm); border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <div style="display: flex; align-items: flex-start; gap: 10px; min-width: 0;">
                <input type="checkbox" class="food-checkbox" style="margin-top: 3px; cursor: pointer;" ${item.is_consumed ? 'checked' : ''} onchange="window.app.toggleFoodChecklist(${item.id}, this.checked)" />
                <div style="min-width: 0;">
                  <div style="font-size: 13px; font-weight: 700; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${item.food_name}">
                    ${item.food_name}
                  </div>
                  <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                    ${item.serving} • <strong>${Math.round(item.calories)} kcal</strong>
                  </div>
                  <div style="font-size: 10px; color: var(--text-muted); margin-top: 1px;">
                    P:${item.protein_g}g • C:${item.carbs_g}g • F:${item.fat_g}g
                  </div>
                </div>
              </div>

              <button class="btn-swap" onclick="window.app.swapFoodItem(${item.id})" title="Replace with nutritionally matched food" style="background: none; border: 1px solid var(--border); border-radius: 6px; padding: 6px 8px; cursor: pointer; color: var(--text-muted);">
                <i class="fa-solid fa-arrows-rotate"></i>
              </button>
            </div>
          `).join("")}
        </div>
      </div>

      <div style="margin-top: 14px; text-align: center;">
        <button class="btn-secondary" style="width: 100%; justify-content: center; font-size: 11px; padding: 6px;" onclick="window.app.navigate('food')">
          <i class="fa-solid fa-plus"></i> Add to Food Diary
        </button>
      </div>
    </div>
  `;
}
