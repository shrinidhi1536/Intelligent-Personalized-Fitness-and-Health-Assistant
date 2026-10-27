import { api, showToast, sound } from "./api.js";

let selectedMealType = "Breakfast";
let currentModalMeal = "Breakfast";
let activeModalTab = "search"; // "search" | "custom"

export async function renderFoodDiary(container) {
  container.innerHTML = `
    <div style="text-align: center; padding: 60px 0;">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 32px; color: var(--primary);"></i>
      <p style="margin-top: 12px; color: var(--text-muted);">Loading Food Diary and nutrition records...</p>
    </div>
  `;

  try {
    const [logRes, dashRes, catRes] = await Promise.all([
      api.get("/api/nutrition/logs/today").catch(() => ({ logs: [], summary: {} })),
      api.get("/api/dashboard/summary").catch(() => ({ nutrition: { target: { calories: 2304, protein_g: 98, carbs_g: 334, fat_g: 64 } }, daily_tracking: { consumed_cals: 0, burned_cals: 0, remaining_cals: 2304, goal_cals: 2304 } })),
      api.get("/api/nutrition/categories").catch(() => ({ categories: [] }))
    ]);

    const logs = logRes.logs || [];
    const summary = logRes.summary || {};
    const categories = catRes.categories || [];
    const nutrition = dashRes.nutrition || { target: {}, consumed: {} };
    const tracking = dashRes.daily_tracking || {
      consumed_cals: Math.round(summary.calories || 0),
      burned_cals: 0,
      remaining_cals: Math.max(Math.round((nutrition.target.calories || 2304) - (summary.calories || 0)), 0),
      goal_cals: Math.round(nutrition.target.calories || 2304)
    };

    const consumedCals = Math.round(tracking.consumed_cals);
    const targetCals = Math.round(tracking.goal_cals);
    const burnedCals = Math.round(tracking.burned_cals);
    const remainingCals = Math.round(tracking.remaining_cals);

    const consumedProt = Math.round(summary.protein_g || 0);
    const targetProt = Math.round(nutrition.target.protein_g || 98);
    const consumedCarbs = Math.round(summary.carbs_g || 0);
    const targetCarbs = Math.round(nutrition.target.carbs_g || 334);
    const consumedFat = Math.round(summary.fat_g || 0);
    const targetFat = Math.round(nutrition.target.fat_goal || nutrition.target.fat_g || 64);

    const calPct = Math.min(Math.round((consumedCals / Math.max(targetCals, 1)) * 100), 100);
    const protPct = Math.min(Math.round((consumedProt / Math.max(targetProt, 1)) * 100), 100);
    const carbsPct = Math.min(Math.round((consumedCarbs / Math.max(targetCarbs, 1)) * 100), 100);
    const fatPct = Math.min(Math.round((consumedFat / Math.max(targetFat, 1)) * 100), 100);

    // Group logs by meal
    const meals = {
      Breakfast: [],
      Lunch: [],
      Dinner: [],
      Snacks: []
    };

    logs.forEach(item => {
      const type = item.meal_type || "Lunch";
      const normalized = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
      if (meals[normalized]) {
        meals[normalized].push(item);
      } else {
        meals.Snacks.push(item);
      }
    });

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 24px;">
        
        <!-- Header Banner -->
        <div class="app-card" style="padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; background: linear-gradient(135deg, var(--bg-card), var(--border-light)); border-left: 5px solid var(--primary);">
          <div>
            <h1 style="font-size: 24px; font-weight: 900; color: var(--text-main); margin: 0 0 4px;">
              Food Diary — Today
            </h1>
            <p style="font-size: 13px; color: var(--text-muted); margin: 0;">
              Log what you eat, monitor macronutrient distribution, and balance your daily calorie targets.
            </p>
          </div>

          <div style="display: flex; gap: 10px;">
            <button class="btn-primary" onclick="window.app.navigate('scanner')">
              <i class="fa-solid fa-camera"></i> AI Plate Scanner
            </button>
            <button class="btn-secondary" onclick="window.app.navigate('plan')">
              <i class="fa-solid fa-clipboard-check" style="color: var(--primary);"></i> Your Plan Today
            </button>
          </div>
        </div>

        <!-- Top Full-Width Daily Calorie Tracking Bar -->
        <div class="app-card" style="padding: 22px 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 800; color: var(--text-main);">
              <i class="fa-solid fa-fire" style="color: var(--primary);"></i>
              <span>Daily Calorie Tracking</span>
            </div>
            <span style="font-size: 12px; font-weight: 800; color: var(--primary-hover); background: var(--primary-light); padding: 4px 12px; border-radius: 999px;">
              ${calPct}% of Daily Goal Met
            </span>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; margin-bottom: 14px;">
            <div>
              <div style="font-size: 34px; font-weight: 900; color: var(--text-main); line-height: 1;">
                ${consumedCals} <span style="font-size: 14px; font-weight: 700; color: var(--text-muted);">of ${targetCals} kcal</span>
              </div>
            </div>
            <div style="display: flex; gap: 16px;">
              <div style="text-align: center;">
                <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--text-muted);">Consumed</div>
                <div style="font-size: 16px; font-weight: 900; color: var(--text-main);">${consumedCals} <span style="font-size: 10px;">kcal</span></div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--text-muted);">Burned</div>
                <div style="font-size: 16px; font-weight: 900; color: var(--primary);">${burnedCals} <span style="font-size: 10px;">kcal</span></div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--text-muted);">Remaining</div>
                <div style="font-size: 16px; font-weight: 900; color: var(--text-main);">${remainingCals} <span style="font-size: 10px;">kcal</span></div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--text-muted);">Goal</div>
                <div style="font-size: 16px; font-weight: 900; color: var(--primary-hover);">${targetCals} <span style="font-size: 10px;">kcal</span></div>
              </div>
            </div>
          </div>

          <div class="progress-track" style="height: 9px; border-radius: 999px;">
            <div class="progress-fill fill-primary" style="width: ${calPct}%;"></div>
          </div>
        </div>

        <!-- 4 Meal Cards Grid: Breakfast, Lunch, Dinner, Snacks -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px;">
          ${renderDiaryMealCard("Breakfast", "fa-mug-saucer", meals.Breakfast)}
          ${renderDiaryMealCard("Lunch", "fa-utensils", meals.Lunch)}
          ${renderDiaryMealCard("Dinner", "fa-bowl-rice", meals.Dinner)}
          ${renderDiaryMealCard("Snacks", "fa-apple-whole", meals.Snacks)}
        </div>

        <!-- Bottom Grid: Daily Totals (5 Cols) + Food Search & Quick Add (7 Cols) -->
        <div style="display: grid; grid-template-columns: repeat(12, 1fr); gap: 20px;">
          
          <!-- Daily Totals Card (5 Cols) -->
          <div class="col-span-5 app-card" style="padding: 24px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 800; color: var(--text-main);">
                  <i class="fa-solid fa-chart-pie" style="color: var(--primary);"></i>
                  <span>Daily Totals</span>
                </div>
                <span style="font-size: 11px; font-weight: 800; color: var(--primary); background: var(--primary-light); padding: 3px 8px; border-radius: 999px;">
                  Actual Logged
                </span>
              </div>

              <div style="display: flex; flex-direction: column; gap: 14px;">
                <!-- Calories -->
                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 800; margin-bottom: 5px;">
                    <span style="color: var(--text-main);">Calories</span>
                    <span style="color: var(--primary); font-weight: 900;">${consumedCals} / ${targetCals} kcal</span>
                  </div>
                  <div class="progress-track" style="height: 8px;">
                    <div class="progress-fill fill-primary" style="width: ${calPct}%;"></div>
                  </div>
                </div>

                <!-- Protein -->
                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 700; margin-bottom: 5px;">
                    <span style="color: var(--text-main);">Protein</span>
                    <span style="color: var(--primary); font-weight: 800;">${consumedProt} / ${targetProt} g</span>
                  </div>
                  <div class="progress-track" style="height: 8px;">
                    <div class="progress-fill fill-primary" style="width: ${protPct}%;"></div>
                  </div>
                </div>

                <!-- Carbohydrates -->
                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 700; margin-bottom: 5px;">
                    <span style="color: var(--text-main);">Carbohydrates</span>
                    <span style="color: var(--primary); font-weight: 800;">${consumedCarbs} / ${targetCarbs} g</span>
                  </div>
                  <div class="progress-track" style="height: 8px;">
                    <div class="progress-fill fill-primary" style="width: ${carbsPct}%;"></div>
                  </div>
                </div>

                <!-- Fat -->
                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 700; margin-bottom: 5px;">
                    <span style="color: var(--text-main);">Fat</span>
                    <span style="color: var(--primary); font-weight: 800;">${consumedFat} / ${targetFat} g</span>
                  </div>
                  <div class="progress-track" style="height: 8px;">
                    <div class="progress-fill fill-primary" style="width: ${fatPct}%;"></div>
                  </div>
                </div>
              </div>
            </div>

            <div style="margin-top: 18px; padding-top: 12px; border-top: 1px solid var(--border-light); font-size: 11px; color: var(--text-muted); text-align: center;">
              Totals dynamically update as foods are added or removed.
            </div>
          </div>

          <!-- Quick Search & 1-Click Add from Database (7 Cols) -->
          <div class="col-span-7 app-card" style="padding: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
              <div style="display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 800; color: var(--text-main);">
                <i class="fa-solid fa-magnifying-glass" style="color: var(--primary);"></i>
                <span>Quick Add Food</span>
              </div>
              <button class="btn-secondary" style="font-size: 11px; padding: 5px 12px; font-weight: 700;" onclick="window.app.openAddFoodModal('Breakfast')">
                <i class="fa-solid fa-plus"></i> Add Custom Food
              </button>
            </div>

            <!-- Meal selector & Search Input -->
            <div style="display: grid; grid-template-columns: 140px 1fr; gap: 10px; margin-bottom: 12px;">
              <div>
                <label style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 4px;">Log To Meal</label>
                <select id="diaryMealSelect" style="width: 100%; padding: 10px 12px; border-radius: var(--radius-md); border: 1px solid var(--border); font-size: 13px; font-weight: 700; background: var(--bg-surface); color: var(--text-main);" onchange="window.app.selectDiaryMeal(this.value)">
                  <option value="Breakfast" ${selectedMealType === 'Breakfast' ? 'selected' : ''}>Breakfast</option>
                  <option value="Lunch" ${selectedMealType === 'Lunch' ? 'selected' : ''}>Lunch</option>
                  <option value="Dinner" ${selectedMealType === 'Dinner' ? 'selected' : ''}>Dinner</option>
                  <option value="Snacks" ${selectedMealType === 'Snacks' ? 'selected' : ''}>Snacks</option>
                </select>
              </div>

              <div>
                <label style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 4px;">Search Food Item</label>
                <input type="text" id="diaryFoodSearch" placeholder="Search Upma, Pongal, Kadhi, Dosa, Paneer, Egg, Dal..." style="width: 100%; padding: 10px 12px; border-radius: var(--radius-md); border: 1px solid var(--border); font-size: 13px; background: var(--bg-surface); color: var(--text-main);" onkeyup="window.app.searchDiaryFoods(this.value)" />
              </div>
            </div>

            <!-- Categories pills -->
            <div style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 12px;">
              <button class="btn-secondary active" style="font-size: 11px; padding: 4px 10px; border-radius: 999px; white-space: nowrap;" onclick="window.app.filterDiaryCategory('all', this)">All Foods</button>
              ${categories.map(c => `
                <button class="btn-secondary" style="font-size: 11px; padding: 4px 10px; border-radius: 999px; white-space: nowrap;" onclick="window.app.filterDiaryCategory('${c}', this)">${c}</button>
              `).join("")}
            </div>

            <!-- Results container -->
            <div id="diaryFoodResultsList" style="max-height: 270px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;">
              <div style="text-align: center; color: var(--text-muted); font-size: 12px; padding: 24px;">
                Type a food name above or click a category to browse nutrients and add to <strong id="diaryTargetMealName">${selectedMealType}</strong>.
              </div>
            </div>
          </div>

        </div>

      </div>
    `;

    // Initialize initial food list
    loadDiaryFoods();
  } catch (err) {
    container.innerHTML = `<div class="app-card" style="color: var(--primary); text-align: center; padding: 40px;">Error loading food diary: ${err.message}</div>`;
  }
}

function renderDiaryMealCard(mealTitle, iconClass, items) {
  const mealCals = Math.round(items.reduce((acc, i) => acc + (parseFloat(i.calories) || 0), 0));
  const windowTimes = {
    "Breakfast": "7:00 AM – 11:00 AM",
    "Lunch": "12:00 PM – 3:30 PM",
    "Dinner": "7:00 PM – 10:30 PM",
    "Snacks": "4:00 PM – 6:30 PM"
  };
  const isActiveWindow = (window.app && window.app.activeMealWindow === mealTitle);

  return `
    <div class="app-card" style="padding: 18px; border-radius: var(--radius-md); display: flex; flex-direction: column; justify-content: space-between; border-top: 4px solid ${isActiveWindow ? 'var(--primary)' : 'var(--border)'}; background: ${isActiveWindow ? 'linear-gradient(180deg, var(--primary-light), var(--bg-card))' : 'var(--bg-card)'};">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid var(--border-light);">
          <div style="display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 800; color: var(--text-main);">
            <i class="fa-solid ${iconClass}" style="color: var(--primary);"></i>
            <span>${mealTitle}</span>
            ${isActiveWindow ? '<span style="font-size: 10px; font-weight: 800; background: var(--primary); color: white; padding: 2px 8px; border-radius: 999px;">Active</span>' : ''}
          </div>
          <span style="font-size: 13px; font-weight: 900; color: var(--primary); background: var(--primary-light); padding: 3px 9px; border-radius: 6px;">
            ${mealCals} kcal
          </span>
        </div>
        <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); margin-bottom: 12px; display: flex; align-items: center; gap: 4px;">
          <i class="fa-regular fa-clock"></i> Window: ${windowTimes[mealTitle] || "Anytime"}
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px; min-height: 80px;">
          ${items.length === 0 ? `
            <div style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 20px 0;">
              No foods logged for ${mealTitle}
            </div>
          ` : items.map(item => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; background: var(--border-light); border-radius: var(--radius-sm);">
              <div style="min-width: 0;">
                <div style="font-size: 13px; font-weight: 800; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${item.food_name}">
                  ${item.food_name}
                </div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                  ${item.serving} • <strong style="color: var(--primary);">${Math.round(item.calories)} kcal</strong>
                </div>
              </div>
              <button onclick="window.app.deleteDiaryFoodLog(${item.id})" title="Remove item" style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px 6px; font-size: 12px; margin-left: 6px;">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          `).join("")}
        </div>
      </div>

      <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid var(--border-light);">
        <button class="btn-secondary" style="width: 100%; justify-content: center; font-size: 12px; font-weight: 700; padding: 8px; border-color: var(--primary); color: var(--primary);" onclick="window.app.openAddFoodModal('${mealTitle}')">
          <i class="fa-solid fa-plus"></i> Add food
        </button>
      </div>
    </div>
  `;
}

export async function loadDiaryFoods(query = "", category = "all") {
  const list = document.getElementById("diaryFoodResultsList");
  if (!list) return;

  try {
    const res = await api.get(`/api/nutrition/foods?q=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}&limit=25`);
    const foods = res.foods || [];

    if (foods.length === 0) {
      list.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 12px; padding: 16px;">No foods found.</div>`;
      return;
    }

    list.innerHTML = foods.map(f => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--border-light); border-radius: var(--radius-sm); gap: 10px;">
        <div style="min-width: 0;">
          <div style="font-size: 13px; font-weight: 800; color: var(--text-main);">${f.name}</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
            ${f.serving} • <strong style="color: var(--primary);">${Math.round(f.calories)} kcal</strong> • P:${f.protein_g}g C:${f.carbs_g}g F:${f.fat_g}g
          </div>
        </div>
        <button class="btn-primary" style="padding: 6px 12px; font-size: 11px; font-weight: 800; white-space: nowrap;" 
          data-food-id="${f.id}"
          data-name="${encodeURIComponent(f.name)}"
          data-serving="${encodeURIComponent(f.serving)}"
          data-cals="${f.calories}"
          data-prot="${f.protein_g}"
          data-carbs="${f.carbs_g}"
          data-fat="${f.fat_g}"
          onclick="window.app.onAddFoodBtnClick(this)">
          <i class="fa-solid fa-plus"></i> Add
        </button>
      </div>
    `).join("");
  } catch (e) {}
}

export function setDiaryMeal(meal) {
  selectedMealType = meal;
  const select = document.getElementById("diaryMealSelect");
  if (select) select.value = meal;
  const lbl = document.getElementById("diaryTargetMealName");
  if (lbl) lbl.innerText = meal;
}

// Add Food Interactive Modal
export async function openAddFoodModal(meal) {
  currentModalMeal = meal || "Breakfast";
  activeModalTab = "search";

  let modal = document.getElementById("foodModal");
  if (!modal) return;

  renderAddFoodModalContent();
  modal.classList.add("open");
  loadModalFoods("");
}

export function closeAddFoodModal() {
  const modal = document.getElementById("foodModal");
  if (modal) modal.classList.remove("open");
}

export function switchModalTab(tab) {
  activeModalTab = tab;
  renderAddFoodModalContent();
  if (tab === "search") {
    loadModalFoods("");
  }
}

function renderAddFoodModalContent() {
  const modal = document.getElementById("foodModal");
  if (!modal) return;

  modal.innerHTML = `
    <div class="modal-card" style="max-width: 600px; width: 92vw; padding: 24px; border-radius: 18px; background: var(--bg-card); border: 1px solid var(--border);">
      
      <!-- Modal Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border-light);">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 32px; height: 32px; border-radius: 8px; background: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 14px;">
            <i class="fa-solid fa-bowl-food"></i>
          </div>
          <h3 style="font-size: 18px; font-weight: 900; margin: 0; color: var(--text-main);">Add Food to ${currentModalMeal}</h3>
        </div>
        <button onclick="window.app.closeFoodModal()" style="background: var(--border-light); border: none; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-main);">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- Tab Switcher -->
      <div style="display: flex; gap: 8px; margin-bottom: 16px; background: var(--border-light); padding: 4px; border-radius: var(--radius-md);">
        <button type="button" class="btn-secondary ${activeModalTab === 'search' ? 'active' : ''}" style="flex: 1; justify-content: center; border: none; font-size: 12px; font-weight: 700; ${activeModalTab === 'search' ? 'background: var(--bg-card); color: var(--primary);' : ''}" onclick="window.app.switchFoodModalTab('search')">
          <i class="fa-solid fa-magnifying-glass"></i> Search Verified Database
        </button>
        <button type="button" class="btn-secondary ${activeModalTab === 'custom' ? 'active' : ''}" style="flex: 1; justify-content: center; border: none; font-size: 12px; font-weight: 700; ${activeModalTab === 'custom' ? 'background: var(--bg-card); color: var(--primary);' : ''}" onclick="window.app.switchFoodModalTab('custom')">
          <i class="fa-solid fa-pen"></i> Custom Food Entry
        </button>
      </div>

      <!-- Tab 1: Search Database -->
      <div id="modalSearchTab" style="display: ${activeModalTab === 'search' ? 'block' : 'none'};">
        <div style="margin-bottom: 12px;">
          <input type="text" id="modalFoodSearchInput" placeholder="Search Idli, Upma, Pongal, Kadhi, Paneer, Egg, Dal..." style="width: 100%; padding: 10px 14px; border-radius: var(--radius-md); border: 1px solid var(--border); font-size: 13px; background: var(--bg-surface); color: var(--text-main);" onkeyup="window.app.onModalSearchKeyUp(this.value)" />
        </div>

        <div id="modalFoodResultsList" style="max-height: 280px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;">
          <div style="text-align: center; color: var(--text-muted); font-size: 12px; padding: 24px;">Loading verified foods...</div>
        </div>
      </div>

      <!-- Tab 2: Custom Food Entry -->
      <div id="modalCustomTab" style="display: ${activeModalTab === 'custom' ? 'block' : 'none'};">
        <form id="modalCustomFoodForm" onsubmit="window.app.onCustomFoodSubmit(event)">
          <div style="margin-bottom: 12px;">
            <label style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text-muted);">Food Name</label>
            <input type="text" id="customFoodName" required placeholder="e.g. Grandma's Rasam Rice" style="width: 100%; padding: 10px 12px; border-radius: var(--radius-md); border: 1px solid var(--border); font-size: 13px; margin-top: 4px; background: var(--bg-surface); color: var(--text-main);" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
            <div>
              <label style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text-muted);">Serving Size</label>
              <input type="text" id="customFoodServing" value="1 bowl (150g)" required style="width: 100%; padding: 10px 12px; border-radius: var(--radius-md); border: 1px solid var(--border); font-size: 13px; margin-top: 4px; background: var(--bg-surface); color: var(--text-main);" />
            </div>
            <div>
              <label style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text-muted);">Calories (kcal)</label>
              <input type="number" id="customFoodCals" required min="1" max="3000" placeholder="220" style="width: 100%; padding: 10px 12px; border-radius: var(--radius-md); border: 1px solid var(--border); font-size: 13px; margin-top: 4px; background: var(--bg-surface); color: var(--text-main);" />
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px;">
            <div>
              <label style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--text-muted);">Protein (g)</label>
              <input type="number" id="customFoodProt" min="0" step="0.5" value="6" style="width: 100%; padding: 8px 10px; border-radius: var(--radius-md); border: 1px solid var(--border); font-size: 12px; margin-top: 4px; background: var(--bg-surface); color: var(--text-main);" />
            </div>
            <div>
              <label style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--text-muted);">Carbs (g)</label>
              <input type="number" id="customFoodCarbs" min="0" step="0.5" value="30" style="width: 100%; padding: 8px 10px; border-radius: var(--radius-md); border: 1px solid var(--border); font-size: 12px; margin-top: 4px; background: var(--bg-surface); color: var(--text-main);" />
            </div>
            <div>
              <label style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--text-muted);">Fat (g)</label>
              <input type="number" id="customFoodFat" min="0" step="0.5" value="4" style="width: 100%; padding: 8px 10px; border-radius: var(--radius-md); border: 1px solid var(--border); font-size: 12px; margin-top: 4px; background: var(--bg-surface); color: var(--text-main);" />
            </div>
          </div>

          <button type="submit" class="btn-primary" style="width: 100%; justify-content: center; padding: 12px; font-weight: 800;">
            <i class="fa-solid fa-plus"></i> Save & Log to ${currentModalMeal}
          </button>
        </form>
      </div>

    </div>
  `;

  setTimeout(() => {
    const input = document.getElementById("modalFoodSearchInput");
    if (input) input.focus();
  }, 100);
}

export async function loadModalFoods(query = "") {
  const list = document.getElementById("modalFoodResultsList");
  if (!list) return;

  try {
    const res = await api.get(`/api/nutrition/foods?q=${encodeURIComponent(query)}&limit=30`);
    const foods = res.foods || [];

    if (foods.length === 0) {
      list.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 12px; padding: 20px;">No foods found. Try a different search term.</div>`;
      return;
    }

    list.innerHTML = foods.map(f => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: var(--border-light); border-radius: var(--radius-sm); gap: 10px;">
        <div style="min-width: 0;">
          <div style="font-size: 13px; font-weight: 800; color: var(--text-main);">${f.name}</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
            ${f.serving} • <strong style="color: var(--primary);">${Math.round(f.calories)} kcal</strong> • P:${f.protein_g}g C:${f.carbs_g}g F:${f.fat_g}g
          </div>
        </div>
        <button class="btn-primary" style="padding: 6px 14px; font-size: 11px; font-weight: 800; white-space: nowrap;"
          data-food-id="${f.id}"
          data-name="${encodeURIComponent(f.name)}"
          data-serving="${encodeURIComponent(f.serving)}"
          data-cals="${f.calories}"
          data-prot="${f.protein_g}"
          data-carbs="${f.carbs_g}"
          data-fat="${f.fat_g}"
          onclick="window.app.onAddFoodToModalMeal(this)">
          <i class="fa-solid fa-plus"></i> Add
        </button>
      </div>
    `).join("");
  } catch (e) {}
}

export function getCurrentModalMeal() {
  return currentModalMeal;
}
