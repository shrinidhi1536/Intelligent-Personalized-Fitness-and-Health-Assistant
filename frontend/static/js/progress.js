import { api, showToast } from "./api.js";

let weightChartInstance = null;
let calorieChartInstance = null;
let waterChartInstance = null;

export async function renderProgress(container) {
  container.innerHTML = `
    <div style="text-align: center; padding: 60px 0;">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 32px; color: var(--primary);"></i>
      <p style="margin-top: 12px; color: var(--text-muted);">Compiling metabolic progress and Chart.js analytics...</p>
    </div>
  `;

  try {
    const data = await api.get("/api/progress/charts");

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 24px;">
        <!-- Top Bar: Log New Weight -->
        <div class="app-card" style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 16px;">
          <div>
            <h3 style="font-size: 16px; font-weight: 800;">Log Today's Body Weight</h3>
            <p style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">Target Milestone: <strong>${data.target_weight} kg</strong></p>
          </div>
          <form style="display: flex; gap: 10px;" onsubmit="event.preventDefault(); window.app.submitWeightLog();">
            <input type="number" step="0.1" min="30" max="250" id="newWeightInput" placeholder="e.g. 64.5" style="width: 140px; padding: 10px 14px; border-radius: var(--radius-md); border: 1px solid var(--border); font-size: 14px; font-weight: 700;" required />
            <button type="submit" class="btn-primary" style="padding: 10px 18px;">
              <i class="fa-solid fa-plus"></i> Save Weight
            </button>
          </form>
        </div>

        <div class="dashboard-grid">
          <!-- Weight Trend Chart -->
          <div class="col-span-12 app-card">
            <div class="card-header">
              <div class="card-title">
                <i class="fa-solid fa-chart-line" style="color: var(--primary);"></i>
                <span>Weight Trajectory vs Target Goal (14-Day Trend)</span>
              </div>
            </div>
            <div style="height: 280px; position: relative;">
              <canvas id="weightChartCanvas"></canvas>
            </div>
          </div>

          <!-- Calories & Protein Intake Chart -->
          <div class="col-span-7 app-card">
            <div class="card-header">
              <div class="card-title">
                <i class="fa-solid fa-fire" style="color: var(--warning);"></i>
                <span>Calorie & Protein Consistency</span>
              </div>
            </div>
            <div style="height: 260px; position: relative;">
              <canvas id="calorieChartCanvas"></canvas>
            </div>
          </div>

          <!-- Hydration History Chart -->
          <div class="col-span-5 app-card">
            <div class="card-header">
              <div class="card-title">
                <i class="fa-solid fa-droplet" style="color: var(--water);"></i>
                <span>Daily Hydration (Liters)</span>
              </div>
            </div>
            <div style="height: 260px; position: relative;">
              <canvas id="waterChartCanvas"></canvas>
            </div>
          </div>

          <!-- Recent Completed Workouts Table -->
          <div class="col-span-12 app-card">
            <div class="card-header">
              <div class="card-title">
                <i class="fa-solid fa-dumbbell" style="color: var(--accent);"></i>
                <span>Completed Workout History</span>
              </div>
            </div>

            <div style="overflow-x: auto;">
              ${data.recent_workouts.length === 0 ? `
                <div style="text-align: center; color: var(--text-light); font-size: 13px; padding: 24px;">No workouts recorded yet. Launch a session in the Workouts tab!</div>
              ` : `
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                  <thead>
                    <tr style="border-bottom: 2px solid var(--border-light); color: var(--text-muted); text-align: left;">
                      <th style="padding: 10px;">Routine Name</th>
                      <th style="padding: 10px;">Date</th>
                      <th style="padding: 10px;">Duration</th>
                      <th style="padding: 10px;">Calories Burned</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.recent_workouts.map(w => `
                      <tr style="border-bottom: 1px solid var(--border-light);">
                        <td style="padding: 10px; font-weight: 700;">${w.workout_name}</td>
                        <td style="padding: 10px; color: var(--text-muted);">${w.log_date}</td>
                        <td style="padding: 10px;">${w.duration_min} mins</td>
                        <td style="padding: 10px; font-weight: 800; color: var(--primary);">~${Math.round(w.calories_burned)} kcal</td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              `}
            </div>
          </div>
        </div>
      </div>
    `;

    // Render Chart.js
    setTimeout(() => {
      initCharts(data);
    }, 100);
  } catch (err) {
    container.innerHTML = `<div class="app-card" style="color: var(--primary);">Error: ${err.message}</div>`;
  }
}

function initCharts(data) {
  if (typeof Chart === "undefined") return;

  // 1. Weight Chart
  const weightCtx = document.getElementById("weightChartCanvas");
  if (weightCtx) {
    if (weightChartInstance) weightChartInstance.destroy();
    weightChartInstance = new Chart(weightCtx, {
      type: "line",
      data: {
        labels: data.labels,
        datasets: [
          {
            label: "Recorded Weight (kg)",
            data: data.weights,
            borderColor: "#ff3b47",
            backgroundColor: "rgba(255, 59, 71, 0.1)",
            tension: 0.3,
            fill: true,
            pointRadius: 4,
            pointBackgroundColor: "#ff3b47"
          },
          {
            label: "Target Milestone",
            data: data.labels.map(() => data.target_weight),
            borderColor: "#10b981",
            borderDash: [6, 6],
            pointRadius: 0,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "top" } },
        scales: { y: { beginAtZero: false } }
      }
    });
  }

  // 2. Calorie Chart
  const calCtx = document.getElementById("calorieChartCanvas");
  if (calCtx) {
    if (calorieChartInstance) calorieChartInstance.destroy();
    calorieChartInstance = new Chart(calCtx, {
      type: "bar",
      data: {
        labels: data.labels,
        datasets: [
          {
            label: "Calories Eaten",
            data: data.calories,
            backgroundColor: "#f59e0b",
            borderRadius: 6
          },
          {
            type: "line",
            label: "Daily Target",
            data: data.labels.map(() => data.calorie_goal),
            borderColor: "#64748b",
            borderDash: [4, 4],
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "top" } }
      }
    });
  }

  // 3. Water Chart
  const waterCtx = document.getElementById("waterChartCanvas");
  if (waterCtx) {
    if (waterChartInstance) waterChartInstance.destroy();
    waterChartInstance = new Chart(waterCtx, {
      type: "line",
      data: {
        labels: data.labels,
        datasets: [
          {
            label: "Liters Logged",
            data: data.water_liters,
            borderColor: "#0ea5e9",
            backgroundColor: "rgba(14, 165, 233, 0.15)",
            tension: 0.3,
            fill: true,
            pointRadius: 4,
            pointBackgroundColor: "#0ea5e9"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "top" } }
      }
    });
  }
}
