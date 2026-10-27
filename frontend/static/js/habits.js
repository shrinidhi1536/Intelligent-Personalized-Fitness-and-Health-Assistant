import { api, showToast, sound } from "./api.js";

export async function renderHabits(container) {
  container.innerHTML = `
    <div style="text-align: center; padding: 60px 0;">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 32px; color: var(--accent);"></i>
      <p style="margin-top: 12px; color: var(--text-muted);">Loading habit intelligence records...</p>
    </div>
  `;

  try {
    const [todayHabits, weekData] = await Promise.all([
      api.get("/api/habits/today"),
      api.get("/api/habits/weekly")
    ]);

    const week = weekData.week || [];
    const auto = todayHabits.auto_detected || {};

    container.innerHTML = `
      <div style="max-width: 960px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px;">
        <!-- Today's Automatic Activity Detection Card -->
        <div class="app-card">
          <div class="card-header">
            <div class="card-title">
              <i class="fa-solid fa-wand-magic-sparkles" style="color: var(--accent);"></i>
              <span>Today’s Automatically Detected Habits</span>
            </div>
            <span style="font-size: 11px; font-weight: 800; background: var(--accent-light); color: var(--accent); padding: 4px 10px; border-radius: 999px;">
              Live Activity Synced
            </span>
          </div>

          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">
            Habits update automatically based on your real activity inside the app (logged water, completed workout videos, registered meals). You can also click to manually adjust.
          </p>

          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px;">
            ${renderHabitCard("Water Intake", "fa-droplet", todayHabits.water, `${auto.water_ml || 0} ml logged today (Target >= 1500ml)`, "water")}
            ${renderHabitCard("Workout Routine", "fa-dumbbell", todayHabits.workout, `${auto.workouts_completed || 0} session(s) completed in Studio`, "workout")}
            ${renderHabitCard("Calorie Budget", "fa-fire", todayHabits.calorie, `${Math.round(auto.calories_logged || 0)} kcal registered`, "calorie")}
            ${renderHabitCard("Protein Goal", "fa-egg", todayHabits.protein, `${Math.round(auto.protein_logged || 0)}g protein recorded`, "protein")}
            ${renderHabitCard("Balanced Meals", "fa-utensils", todayHabits.meals, `${auto.distinct_meals || 0} distinct meal types logged`, "meals")}
            ${renderHabitCard("Rest & Sleep", "fa-bed", todayHabits.sleep, "Restorative recovery logged", "sleep")}
          </div>
        </div>

        <!-- 7-Day Consistency Weekly Matrix -->
        <div class="app-card">
          <div class="card-header">
            <div class="card-title">
              <i class="fa-solid fa-calendar-check" style="color: var(--primary);"></i>
              <span>7-Day Consistency Matrix</span>
            </div>
            <span style="font-size: 12px; color: var(--text-muted);">Past 7 Days</span>
          </div>

          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="border-bottom: 2px solid var(--border-light); color: var(--text-muted); text-align: center;">
                  <th style="text-align: left; padding: 10px;">Day</th>
                  <th style="padding: 10px;">Water</th>
                  <th style="padding: 10px;">Workout</th>
                  <th style="padding: 10px;">Calories</th>
                  <th style="padding: 10px;">Protein</th>
                  <th style="padding: 10px;">Meals</th>
                  <th style="padding: 10px;">Sleep</th>
                  <th style="padding: 10px;">Score</th>
                </tr>
              </thead>
              <tbody>
                ${week.map(day => `
                  <tr style="border-bottom: 1px solid var(--border-light); text-align: center;">
                    <td style="text-align: left; padding: 10px; font-weight: 700;">${day.day_name} <br/><span style="font-size: 10px; font-weight: 400; color: var(--text-muted);">${day.date}</span></td>
                    <td style="padding: 10px;">${renderCheckIcon(day.water)}</td>
                    <td style="padding: 10px;">${renderCheckIcon(day.workout)}</td>
                    <td style="padding: 10px;">${renderCheckIcon(day.calorie)}</td>
                    <td style="padding: 10px;">${renderCheckIcon(day.protein)}</td>
                    <td style="padding: 10px;">${renderCheckIcon(day.meals)}</td>
                    <td style="padding: 10px;">${renderCheckIcon(day.sleep)}</td>
                    <td style="padding: 10px; font-weight: 800; color: var(--primary);">${day.score} / 6</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="app-card" style="color: var(--primary);">Error: ${err.message}</div>`;
  }
}

function renderHabitCard(title, icon, isDone, sub, habitName) {
  return `
    <div style="padding: 16px; border-radius: var(--radius-md); border: 2px solid ${isDone ? 'var(--accent)' : 'var(--border)'}; background: ${isDone ? 'var(--accent-light)' : 'var(--bg-surface)'}; display: flex; flex-direction: column; justify-content: space-between; cursor: pointer;" onclick="window.app.toggleHabit('${habitName}', ${!isDone})">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 14px;">
          <i class="fa-solid ${icon}" style="color: ${isDone ? 'var(--accent)' : 'var(--text-muted)'};"></i>
          <span>${title}</span>
        </div>
        <i class="fa-solid ${isDone ? 'fa-circle-check' : 'fa-circle'}" style="color: ${isDone ? 'var(--accent)' : 'var(--border)'}; font-size: 18px;"></i>
      </div>
      <div style="font-size: 11px; color: var(--text-muted);">${sub}</div>
    </div>
  `;
}

function renderCheckIcon(boolVal) {
  return boolVal 
    ? `<i class="fa-solid fa-circle-check" style="color: var(--accent); font-size: 16px;"></i>` 
    : `<i class="fa-regular fa-circle" style="color: var(--border); font-size: 16px;"></i>`;
}
