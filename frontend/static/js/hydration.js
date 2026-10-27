import { api, showToast, sound } from "./api.js";

export async function renderHydration(container) {
  container.innerHTML = `
    <div style="text-align: center; padding: 60px 0;">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 32px; color: var(--water);"></i>
      <p style="margin-top: 12px; color: var(--text-muted);">Loading hydration status and reminder service...</p>
    </div>
  `;

  try {
    const data = await api.get("/api/hydration/status");

    container.innerHTML = `
      <div style="max-width: 860px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px;">
        <!-- Reminder Banner -->
        <div style="background: var(--water-light); border: 1px solid var(--water); border-radius: var(--radius-lg); padding: 18px 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="width: 44px; height: 44px; border-radius: 50%; background: var(--water); color: white; display: flex; align-items: center; justify-content: center; font-size: 20px;">
              <i class="fa-solid fa-bell"></i>
            </div>
            <div>
              <h4 style="font-size: 14px; font-weight: 800; color: var(--text-main);">Hydration Coach Notification</h4>
              <p style="font-size: 13px; color: var(--text-main); margin-top: 2px;">${data.reminder_message}</p>
            </div>
          </div>
          <button class="btn-secondary" style="border-color: var(--water); color: var(--water);" onclick="window.app.snoozeWaterReminder()">
            <i class="fa-solid fa-clock"></i> Snooze 1 Hr
          </button>
        </div>

        <div class="dashboard-grid">
          <!-- Left Column: Animated Bottle & Fluid Level & Quick Actions -->
          <div class="col-span-7 app-card" style="text-align: center;">
            <div class="card-header" style="justify-content: center;">
              <span style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: var(--primary);">
                Metabolic Fluid Balance
              </span>
            </div>

            <div style="margin: 20px auto; display: flex; flex-direction: column; align-items: center;">
              <!-- Animated Water Bottle with wave effect -->
              <div class="water-bottle-cap" style="width: 44px; height: 12px;"></div>
              <div class="water-container-visual" style="width: 140px; height: 220px; border-radius: 20px 20px 30px 30px;">
                <div class="water-fluid-level" style="height: ${Math.min(data.percentage, 100)}%;">
                  <div class="water-fluid-meniscus"></div>
                </div>
                <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none;">
                  <span style="font-size: 28px; font-weight: 900; color: ${data.percentage > 50 ? '#ffffff' : 'var(--primary)'}; text-shadow: 0 1px 3px rgba(0,0,0,0.3);">
                    ${data.percentage}%
                  </span>
                  <span style="font-size: 11px; font-weight: 700; color: ${data.percentage > 50 ? 'rgba(255,255,255,0.95)' : 'var(--text-muted)'};">
                    ${(data.consumed_ml / 1000).toFixed(2)}L / ${(data.target_ml / 1000).toFixed(1)}L
                  </span>
                </div>
              </div>

              <div style="font-size: 32px; font-weight: 900; color: var(--primary); margin-top: 10px;">
                ${(data.consumed_ml / 1000).toFixed(2)} <span style="font-size: 18px; color: var(--text-muted);">Liters</span>
              </div>
              <div style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">
                Goal: ${(data.target_ml / 1000).toFixed(1)} Liters (${data.percentage}% achieved)
              </div>
            </div>

            <!-- Quick Log Buttons -->
            <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; margin-top: 16px;">
              <button class="btn-primary" onclick="window.app.quickWater(250)">
                <i class="fa-solid fa-plus"></i> +250 ml (Glass)
              </button>
              <button class="btn-primary" onclick="window.app.quickWater(500)">
                <i class="fa-solid fa-plus"></i> +500 ml (Bottle)
              </button>
              <button class="btn-secondary" onclick="window.app.promptCustomWater()">
                Custom Amount
              </button>
            </div>
          </div>

          <!-- Right Column: Today's Hydration Log -->
          <div class="col-span-5 app-card">
            <div class="card-header">
              <div class="card-title">
                <i class="fa-solid fa-clock-rotate-left" style="color: var(--water);"></i>
                <span>Today’s Hydration Entries</span>
              </div>
            </div>

            <div style="max-height: 280px; overflow-y: auto;">
              ${data.logs.length === 0 ? `
                <div style="text-align: center; color: var(--text-light); font-size: 12px; padding: 24px;">No water logged today. Tap a quick add button to start!</div>
              ` : `
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  ${data.logs.map(log => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: var(--border-light); border-radius: var(--radius-md);">
                      <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fa-solid fa-glass-water" style="color: var(--water);"></i>
                        <div>
                          <div style="font-size: 13px; font-weight: 700;">+${log.amount_ml} ml</div>
                          <div style="font-size: 10px; color: var(--text-muted);">${new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      </div>
                      <button style="background: none; border: none; color: var(--text-light); cursor: pointer;" onclick="window.app.deleteWaterLog(${log.id})">
                        <i class="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  `).join("")}
                </div>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="app-card" style="color: var(--primary);">Error: ${err.message}</div>`;
  }
}
