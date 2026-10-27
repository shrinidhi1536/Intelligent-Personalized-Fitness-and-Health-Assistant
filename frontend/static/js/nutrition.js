import { api, showToast, sound } from "./api.js";

export async function renderNutrition(container) {
  container.innerHTML = `
    <div style="text-align: center; padding: 60px 0;">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 32px; color: var(--primary);"></i>
      <p style="margin-top: 12px; color: var(--text-muted);">Loading diet planner and nutrition database...</p>
    </div>
  `;

  try {
    const [planRes, logRes, catRes] = await Promise.all([
      api.get("/api/nutrition/daily-plan"),
      api.get("/api/nutrition/logs/today"),
      api.get("/api/nutrition/categories")
    ]);

    const plan = planRes.plan || {};
    const logs = logRes.logs || [];
    const summary = logRes.summary || {};
    const categories = catRes.categories || [];

    container.innerHTML = `
      <div class="dashboard-grid">
        <!-- Target vs Planned Header Card (12 Cols) -->
        <div class="col-span-12 app-card">
          <div class="card-header">
            <div class="card-title">
              <i class="fa-solid fa-scale-balanced" style="color: var(--primary);"></i>
              <span>Diet Plan Target vs Planned Total</span>
            </div>
            <span style="font-size: 11px; font-weight: 800; color: var(--primary); background: var(--primary-light); padding: 4px 10px; border-radius: 999px;">
              Personalized Plan
            </span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div style="background: var(--border-light); padding: 14px; border-radius: var(--radius-md);">
              <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px;">Daily Target</div>
              <div style="font-size: 22px; font-weight: 900; color: var(--primary);">${plan.target.calories} <span style="font-size: 13px;">kcal</span></div>
              <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
                P: <strong>${plan.target.protein_g}g</strong> • C: <strong>${plan.target.carbs_g}g</strong> • F: <strong>${plan.target.fat_g}g</strong>
              </div>
            </div>

            <div style="background: var(--border-light); padding: 14px; border-radius: var(--radius-md);">
              <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px;">Planned Total</div>
              <div style="font-size: 22px; font-weight: 900; color: var(--text-main);">${plan.planned_total.calories} <span style="font-size: 13px;">kcal</span></div>
              <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
                P: <strong>${plan.planned_total.protein_g}g</strong> • C: <strong>${plan.planned_total.carbs_g}g</strong> • F: <strong>${plan.planned_total.fat_g}g</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- "Your Plan Today" Section: Horizontal Side-by-Side Meal Cards (12 Cols) -->
        <div class="col-span-12 app-card">
          <div class="card-header">
            <div class="card-title">
              <i class="fa-solid fa-clipboard-check" style="color: var(--primary);"></i>
              <span>Your Plan Today</span>
            </div>
            <span style="font-size: 12px; color: var(--text-muted);">Check meals as consumed to automatically log macros</span>
          </div>

          ${renderPlanChecklist(plan.meals)}
        </div>

        <!-- Food Database Search (6 Cols) -->
        <div class="col-span-6 app-card">
          <div class="card-header">
            <div class="card-title">
              <i class="fa-solid fa-magnifying-glass" style="color: var(--primary);"></i>
              <span>Food Database</span>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px;">
            <input type="text" id="foodSearchInput" placeholder="Search Idli, Oats, Paneer, Chicken..." style="width: 100%; padding: 10px 14px; border-radius: var(--radius-md); border: 1px solid var(--border); font-size: 13px; background: var(--bg-surface); color: var(--text);" onkeyup="window.app.searchFoods(this.value)" />
            <select id="foodCategoryFilter" style="width: 100%; padding: 10px 14px; border-radius: var(--radius-md); border: 1px solid var(--border); font-size: 13px; background: var(--bg-surface); color: var(--text);" onchange="window.app.filterFoodCategory(this.value)">
              <option value="all">All Categories</option>
              ${categories.map(c => `<option value="${c}">${c}</option>`).join("")}
            </select>
          </div>

          <div id="foodResultsList" style="max-height: 280px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;">
            <div style="text-align: center; color: var(--text-muted); font-size: 12px; padding: 20px;">
              Type above or choose a category to browse nutrients.
            </div>
          </div>
        </div>

        <!-- Today's Food Log (6 Cols) -->
        <div class="col-span-6 app-card">
          <div class="card-header">
            <div class="card-title">
              <i class="fa-solid fa-utensils" style="color: var(--primary);"></i>
              <span>Today’s Food Log</span>
            </div>
            <span style="font-size: 12px; font-weight: 800; color: var(--primary);">
              ${Math.round(summary.calories || 0)} kcal
            </span>
          </div>

          <div style="max-height: 280px; overflow-y: auto;">
            ${logs.length === 0 ? `
              <div style="text-align: center; color: var(--text-light); font-size: 12px; padding: 24px;">No foods logged yet today. Check items from Your Plan or search the database!</div>
            ` : `
              <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                  <tr style="border-bottom: 1px solid var(--border-light); color: var(--text-muted); text-align: left;">
                    <th style="padding: 8px 4px;">Food</th>
                    <th style="padding: 8px 4px;">Meal</th>
                    <th style="padding: 8px 4px;">Kcal</th>
                    <th style="padding: 8px 4px;">P / C / F</th>
                    <th style="padding: 8px 4px;"></th>
                  </tr>
                </thead>
                <tbody>
                  ${logs.map(l => `
                    <tr style="border-bottom: 1px solid var(--border-light);">
                      <td style="padding: 8px 4px; font-weight: 700;">${l.food_name} <br/><span style="font-size: 10px; font-weight: 400; color: var(--text-muted);">${l.serving}</span></td>
                      <td style="padding: 8px 4px; color: var(--text-muted);">${l.meal_type}</td>
                      <td style="padding: 8px 4px; font-weight: 800;">${Math.round(l.calories)}</td>
                      <td style="padding: 8px 4px; color: var(--text-muted);">${l.protein_g} / ${l.carbs_g} / ${l.fat_g}</td>
                      <td style="padding: 8px 4px; text-align: right;">
                        <button style="background: none; border: none; color: var(--text-light); cursor: pointer;" onclick="window.app.deleteFoodLog(${l.id})">
                          <i class="fa-solid fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            `}
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="app-card" style="color: var(--primary);">Error: ${err.message}</div>`;
  }
}

function renderPlanChecklist(meals) {
  const mealKeys = [
    { key: "Breakfast", icon: "fa-mug-saucer" },
    { key: "Lunch", icon: "fa-utensils" },
    { key: "Dinner", icon: "fa-bowl-rice" },
    { key: "Snacks", icon: "fa-apple-whole" }
  ];

  let html = `<div class="horizontal-meals-row">`;

  for (const { key, icon } of mealKeys) {
    const items = meals[key] || [];
    const mealCals = Math.round(items.reduce((acc, i) => acc + (i.calories || 0), 0));
    html += `
      <div class="meal-column-card">
        <div>
          <div class="meal-column-header">
            <div class="meal-title">
              <i class="fa-solid ${icon}"></i>
              <span>${key}</span>
            </div>
            <span style="font-size: 11px; font-weight: 800; color: var(--primary); background: var(--border-light); padding: 2px 8px; border-radius: 4px;">
              ${mealCals} kcal
            </span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${items.length === 0 ? `
              <div style="font-size: 12px; color: var(--text-light); text-align: center; padding: 16px 0;">No items scheduled</div>
            ` : items.map(item => `
              <div class="food-checklist-item ${item.is_consumed ? 'consumed' : ''}" id="checkItem_${item.id}">
                <div class="food-item-left">
                  <input type="checkbox" class="food-checkbox" ${item.is_consumed ? 'checked' : ''} onchange="window.app.toggleFoodChecklist(${item.id}, this.checked)" />
                  <div style="min-width: 0;">
                    <div class="food-name" style="font-size: 13px; font-weight: 700; line-height: 1.3;" title="${item.food_name}">${item.food_name}</div>
                    <div class="food-meta" style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                      ${item.serving} • ${Math.round(item.calories)} kcal
                    </div>
                    <div style="font-size: 10px; color: var(--text-muted); margin-top: 1px;">
                      P:${item.protein_g}g • C:${item.carbs_g}g • F:${item.fat_g}g
                    </div>
                  </div>
                </div>

                <div class="food-actions">
                  <button class="btn-swap" onclick="window.app.swapFoodItem(${item.id})" title="Replace with nutritionally similar food">
                    <i class="fa-solid fa-arrows-rotate"></i>
                  </button>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    `;
  }

  html += `</div>`;
  return html;
}

export async function searchAndRenderFoods(query = "", category = "all") {
  const list = document.getElementById("foodResultsList");
  if (!list) return;

  try {
    const res = await api.get(`/api/nutrition/foods?q=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}&limit=25`);
    const foods = res.foods || [];

    if (foods.length === 0) {
      list.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 12px; padding: 16px;">No foods found.</div>`;
      return;
    }

    list.innerHTML = foods.map(f => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-md);">
        <div>
          <div style="font-size: 13px; font-weight: 700;">${f.name}</div>
          <div style="font-size: 11px; color: var(--text-muted);">${f.serving} • ${Math.round(f.calories)} kcal • P: ${f.protein_g}g • C: ${f.carbs_g}g • F: ${f.fat_g}g</div>
        </div>
        <button class="btn-secondary" style="padding: 6px 10px; font-size: 11px;" onclick="window.app.promptLogFood(${f.id}, '${f.name.replace(/'/g, "\\'")}', '${f.serving}', ${f.calories}, ${f.protein_g}, ${f.carbs_g}, ${f.fat_g})">
          <i class="fa-solid fa-plus"></i> Log
        </button>
      </div>
    `).join("");
  } catch (e) {}
}
