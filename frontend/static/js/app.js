import { api, showToast, sound } from "./api.js";
import { initAuth } from "./auth.js";
import { OnboardingWizard } from "./onboarding.js";
import { renderDashboard } from "./dashboard.js";
import { renderPlanToday } from "./plan.js";
import { renderFoodDiary, loadDiaryFoods, setDiaryMeal, openAddFoodModal, closeAddFoodModal, switchModalTab, loadModalFoods, getCurrentModalMeal } from "./food_diary.js";
import { renderWorkouts, openWorkoutStudio, toggleStudioTimer, resetStudioTimer, finishWorkoutSession, completeWorkoutSession, switchWorkoutSet, nextExercise, prevExercise, toggleCalmingMusic, selectExerciseIndex, toggleTrainerMediaMode } from "./workouts.js";
import { renderScanner, processFoodImage, confirmBatch, updateScannedTotalsDisplay, updateScannedItem, removeScannedItem, applyQuickFoodPreset, updateScannedItemCount, openGeminiKeyModal, closeGeminiKeyModal, saveGeminiApiKey, addManualItemToPlate } from "./scanner.js";
import { renderAssistant, sendMessage, clearChat } from "./assistant.js";
import { renderHydration } from "./hydration.js";
import { renderHabits } from "./habits.js";
import { renderProgress } from "./progress.js";

class AppController {
  constructor() {
    this.currentPage = "dashboard";
    this.currentUser = null;
    this.currentProfile = null;
    this.theme = localStorage.getItem("ipfha_theme") || "light";
    this.soundEnabled = localStorage.getItem("ipfha_sound") !== "false";
    this.diaryCurrentCat = "all";
    this.selectedDiaryMeal = "Breakfast";
  }

  async init() {
    this.applyTheme();

    // Check if user is authenticated
    const token = api.token || localStorage.getItem("ipfha_token");
    if (!token) {
      this.showAuthModal();
      initAuth((user, isNewUser) => this.onAuthSuccess(user, isNewUser));
      return;
    }
    if (!api.token) {
      api.token = token;
    }

    try {
      const me = await api.get("/api/auth/me");
      this.currentUser = me.user;
      this.currentProfile = me.profile;

      this.updateSidebarUser();
      this.navigate("dashboard");
      this.initNotificationEngine();
    } catch (e) {
      this.showAuthModal();
      initAuth((user, isNewUser) => this.onAuthSuccess(user, isNewUser));
    }
  }

  async onAuthSuccess(user, isNewUser = false) {
    this.currentUser = user;
    if (!api.token) {
      api.token = localStorage.getItem("ipfha_token");
    }
    try {
      const me = await api.get("/api/auth/me");
      this.currentUser = me.user;
      this.currentProfile = me.profile;
    } catch (e) {
      console.warn("Could not load user profile in onAuthSuccess:", e);
    }
    const authModal = document.getElementById("authModal");
    if (authModal) authModal.classList.remove("open");

    this.updateSidebarUser();

    if (isNewUser) {
      this.startOnboarding();
    } else {
      this.navigate("dashboard");
      this.initNotificationEngine();
    }
  }

  updateSidebarUser() {
    const nameEl = document.getElementById("sidebarUserName");
    const goalEl = document.getElementById("sidebarUserGoal");
    const avatarEl = document.getElementById("sidebarAvatar");

    if (this.currentUser && nameEl) {
      nameEl.innerText = this.currentUser.name;
      avatarEl.innerText = this.currentUser.name.charAt(0).toUpperCase();
    }
    if (this.currentProfile && goalEl) {
      goalEl.innerText = `${this.currentProfile.goal} • ${this.currentProfile.weight_kg}kg`;
    }
  }

  showAuthModal() {
    const modal = document.getElementById("authModal");
    if (modal) modal.classList.add("open");
  }

  startOnboarding() {
    const modal = document.getElementById("onboardingModal");
    if (!modal) return;
    modal.classList.add("open");

    const initialData = {
      name: this.currentUser ? this.currentUser.name : (this.currentProfile?.name || 'Alex'),
      gender: this.currentProfile?.gender || 'female',
      age: this.currentProfile?.age || 26,
      height_cm: this.currentProfile?.height_cm || 168,
      weight_kg: this.currentProfile?.weight_kg || 64,
      target_weight_kg: this.currentProfile?.target_weight_kg || 58,
      goal: this.currentProfile?.goal || 'lose_weight',
      activity_level: 'moderate',
      diet_preference: 'balanced',
      workout_type: this.currentProfile?.workout_type || 'Flexibility'
    };

    window.wizard = new OnboardingWizard("onboardingWizardHost", initialData, async (metrics) => {
      modal.classList.remove("open");
      try {
        const me = await api.get("/api/auth/me");
        this.currentUser = me.user;
        this.currentProfile = me.profile;
      } catch (err) {
        console.warn("Could not refresh profile after onboarding:", err);
      }
      this.updateSidebarUser();
      this.navigate("dashboard");
      this.initNotificationEngine();
    });

    window.wizard.start();
  }

  restartOnboarding() {
    this.startOnboarding();
  }

  navigate(page) {
    this.currentPage = page;
    sound.playBeep(880, 0.05);

    // Close mobile drawer if open
    const sidebar = document.getElementById("appSidebar");
    if (sidebar) sidebar.classList.remove("open");

    // Update active state in sidebar and mobile nav
    document.querySelectorAll(".nav-item, .mobile-nav-btn").forEach(el => {
      if (el.dataset.page === page) el.classList.add("active");
      else el.classList.remove("active");
    });

    // Update Header Title
    const titleEl = document.getElementById("currentViewTitle");
    const subEl = document.getElementById("currentViewSubtitle");

    const titles = {
      dashboard: { title: "Daily Dashboard", sub: "Personalized metabolic metrics and daily routine" },
      plan: { title: "Your Plan Today", sub: "Recommended workout, personalized meals, and hydration targets" },
      food: { title: "Food Diary — Today", sub: "Track breakfast, lunch, dinner, snacks & daily macro targets" },
      workouts: { title: "Workout Studio & Library", sub: "Curated routines with countdown timer and continuous video demonstrator" },
      scanner: { title: "AI Food & Plate Scanner", sub: "Multimodal image analysis mapped to verified nutrition values" },
      assistant: { title: "AI Fitness & Health Coach", sub: "Context-aware conversational advisor powered by your logged data" },
      hydration: { title: "Smart Hydration & Reminders", sub: "Water tracking with automated reminders and fluid balance" },
      habits: { title: "Habit Intelligence Tracker", sub: "Automatically detected habits from actual logged activity" },
      progress: { title: "Progress Analytics & Charts", sub: "Weight trend trajectory vs target and intake consistency" }
    };

    if (titles[page] && titleEl && subEl) {
      titleEl.innerText = titles[page].title;
      subEl.innerText = titles[page].sub;
    }

    // Render View Content
    const canvas = document.getElementById("contentCanvas");
    if (!canvas) return;

    switch (page) {
      case "dashboard": renderDashboard(canvas); break;
      case "plan": renderPlanToday(canvas); break;
      case "food": renderFoodDiary(canvas); break;
      case "workouts": renderWorkouts(canvas); break;
      case "scanner": renderScanner(canvas); break;
      case "assistant": renderAssistant(canvas); break;
      case "hydration": renderHydration(canvas); break;
      case "habits": renderHabits(canvas); break;
      case "progress": renderProgress(canvas); break;
      default: renderDashboard(canvas);
    }
  }

  // Quick Action Helpers
  async quickWater(amountMl) {
    try {
      sound.playBeep(1046, 0.1);
      const res = await api.post("/api/hydration/log", { amount_ml: amountMl });
      showToast(res.message, "success");
      if (this.currentPage === "dashboard") renderDashboard(document.getElementById("contentCanvas"));
      if (this.currentPage === "plan") renderPlanToday(document.getElementById("contentCanvas"));
      if (this.currentPage === "hydration") renderHydration(document.getElementById("contentCanvas"));
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  async promptCustomWater() {
    const amt = prompt("Enter water amount in milliliters (e.g. 350):", "350");
    if (amt && parseInt(amt) > 0) {
      this.quickWater(parseInt(amt));
    }
  }

  async deleteWaterLog(id) {
    try {
      await api.delete(`/api/hydration/logs/${id}`);
      showToast("Hydration log removed", "info");
      renderHydration(document.getElementById("contentCanvas"));
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  async toggleFoodChecklist(id, isConsumed) {
    try {
      sound.playBeep(isConsumed ? 880 : 440, 0.08);
      await api.post("/api/nutrition/checklist/toggle", { checklist_id: id, is_consumed: isConsumed });
      showToast(isConsumed ? "Marked as eaten & logged to food budget!" : "Unchecked item", "success");
      const itemEl = document.getElementById(`checkItem_${id}`);
      if (itemEl) {
        if (isConsumed) itemEl.classList.add("consumed");
        else itemEl.classList.remove("consumed");
      }
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  async swapFoodItem(checklistId) {
    try {
      sound.playBeep(700, 0.1);
      showToast("Finding macro-matched alternative...", "info");
      const res = await api.post("/api/nutrition/checklist/swap", { checklist_id: checklistId });
      showToast(`Swapped for ${res.new_item.food_name}!`, "success");
      if (this.currentPage === "plan") renderPlanToday(document.getElementById("contentCanvas"));
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  // Food Diary specific actions
  selectDiaryMeal(meal) {
    this.selectedDiaryMeal = meal;
    setDiaryMeal(meal);
  }

  searchDiaryFoods(val) {
    loadDiaryFoods(val, this.diaryCurrentCat);
  }

  filterDiaryCategory(cat, btn) {
    this.diaryCurrentCat = cat;
    if (btn && btn.parentElement) {
      btn.parentElement.querySelectorAll("button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    }
    const q = document.getElementById("diaryFoodSearch")?.value || "";
    loadDiaryFoods(q, cat);
  }

  openAddFoodModal(meal) {
    openAddFoodModal(meal);
  }

  closeFoodModal() {
    closeAddFoodModal();
  }

  switchFoodModalTab(tab) {
    switchModalTab(tab);
  }

  onModalSearchKeyUp(val) {
    loadModalFoods(val);
  }

  async onAddFoodBtnClick(btn) {
    const foodId = btn.dataset.foodId;
    const name = decodeURIComponent(btn.dataset.name);
    const serving = decodeURIComponent(btn.dataset.serving);
    const cals = parseFloat(btn.dataset.cals);
    const prot = parseFloat(btn.dataset.prot);
    const carbs = parseFloat(btn.dataset.carbs);
    const fat = parseFloat(btn.dataset.fat);
    const meal = this.selectedDiaryMeal || "Breakfast";

    await this.addFoodToDiary(foodId, name, serving, cals, prot, carbs, fat, meal);
  }

  async onAddFoodToModalMeal(btn) {
    const foodId = btn.dataset.foodId;
    const name = decodeURIComponent(btn.dataset.name);
    const serving = decodeURIComponent(btn.dataset.serving);
    const cals = parseFloat(btn.dataset.cals);
    const prot = parseFloat(btn.dataset.prot);
    const carbs = parseFloat(btn.dataset.carbs);
    const fat = parseFloat(btn.dataset.fat);
    const meal = getCurrentModalMeal() || "Breakfast";

    await this.addFoodToDiary(foodId, name, serving, cals, prot, carbs, fat, meal);
    closeAddFoodModal();
  }

  async onCustomFoodSubmit(event) {
    event.preventDefault();
    const meal = getCurrentModalMeal() || "Breakfast";
    const name = document.getElementById("customFoodName")?.value.trim();
    const serving = document.getElementById("customFoodServing")?.value.trim() || "1 serving";
    const cals = parseFloat(document.getElementById("customFoodCals")?.value || "0");
    const prot = parseFloat(document.getElementById("customFoodProt")?.value || "0");
    const carbs = parseFloat(document.getElementById("customFoodCarbs")?.value || "0");
    const fat = parseFloat(document.getElementById("customFoodFat")?.value || "0");

    if (!name || isNaN(cals) || cals <= 0) {
      showToast("Please enter a valid food name and calories", "error");
      return;
    }

    await this.addFoodToDiary(null, name, serving, cals, prot, carbs, fat, meal);
    closeAddFoodModal();
  }

  async addFoodToDiary(foodId, name, serving, cals, prot, carbs, fat, mealType) {
    const meal = mealType || this.selectedDiaryMeal || "Breakfast";
    try {
      await api.post("/api/nutrition/logs", {
        food_id: foodId ? parseInt(foodId) : null,
        food_name: name,
        serving: serving,
        calories: cals,
        protein_g: prot,
        carbs_g: carbs,
        fat_g: fat,
        meal_type: meal
      });
      sound.playVictory();
      showToast(`Added ${name} to ${meal}!`, "success");
      if (this.currentPage === "food") renderFoodDiary(document.getElementById("contentCanvas"));
      if (this.currentPage === "dashboard") renderDashboard(document.getElementById("contentCanvas"));
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  async deleteDiaryFoodLog(id) {
    try {
      await api.delete(`/api/nutrition/logs/${id}`);
      showToast("Item removed from food diary", "info");
      if (this.currentPage === "food") renderFoodDiary(document.getElementById("contentCanvas"));
      if (this.currentPage === "dashboard") renderDashboard(document.getElementById("contentCanvas"));
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  // Workouts Actions
  filterWorkouts(cat) {
    renderWorkouts(document.getElementById("contentCanvas"), cat);
  }

  searchWorkouts(val) {
    const s = val.toLowerCase().trim();
    document.querySelectorAll("#workoutCardsGrid .app-card").forEach(card => {
      const txt = card.innerText.toLowerCase();
      card.style.display = txt.includes(s) ? "flex" : "none";
    });
  }

  startWorkout(workoutId) {
    try { sound.playBeep(880, 0.1); } catch (e) {}
    openWorkoutStudio(workoutId);
  }

  // Strictly closes player without logging completion!
  closeWorkoutPlayer() {
    resetStudioTimer();
    const modal = document.getElementById("workoutPlayerModal");
    if (modal) modal.classList.remove("open");
  }

  toggleStudioTimer() {
    toggleStudioTimer();
  }

  resetStudioTimer(seconds) {
    resetStudioTimer(seconds);
  }

  completeWorkoutSession(id, name, duration, calories) {
    completeWorkoutSession(id, name, duration, calories);
  }

  switchWorkoutSet(setIdx) {
    switchWorkoutSet(setIdx);
  }

  nextExercise() {
    nextExercise();
  }

  prevExercise() {
    prevExercise();
  }

  toggleCalmingMusic() {
    toggleCalmingMusic();
  }

  selectExerciseIndex(idx) {
    selectExerciseIndex(idx);
  }

  toggleTrainerMediaMode() {
    toggleTrainerMediaMode();
  }

  // Scanner Actions
  handleImageSelected(file) {
    if (file) processFoodImage(file);
  }

  updateScannedItemName(index, name) {
    updateScannedItem(index, name);
  }

  updateScannedItemCount(index, delta) {
    updateScannedItemCount(index, delta);
  }

  removeScannedItem(index) {
    removeScannedItem(index);
  }

  confirmScannedFoodBatch() {
    confirmBatch();
  }

  applyQuickFoodPreset(presetKey) {
    applyQuickFoodPreset(presetKey);
  }

  openGeminiKeyModal() {
    openGeminiKeyModal();
  }

  closeGeminiKeyModal() {
    closeGeminiKeyModal();
  }

  saveGeminiApiKey() {
    saveGeminiApiKey();
  }

  addManualItemToPlate() {
    addManualItemToPlate();
  }

  // Assistant Chat Actions
  sendAIChat(question) {
    sendMessage(question);
  }

  handleChatSubmit() {
    sendMessage();
  }

  clearAIChat() {
    clearChat();
  }

  // Habit Actions
  async toggleHabit(name, status) {
    try {
      sound.playBeep(880, 0.08);
      await api.post("/api/habits/manual-toggle", { habit_name: name, status: status });
      renderHabits(document.getElementById("contentCanvas"));
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  // Progress Weight Log
  async submitWeightLog() {
    const input = document.getElementById("newWeightInput");
    if (!input || !input.value) return;

    try {
      const res = await api.post("/api/progress/weight", { weight_kg: parseFloat(input.value) });
      sound.playVictory();
      showToast(res.message, "success");
      renderProgress(document.getElementById("contentCanvas"));
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  snoozeWaterReminder() {
    showToast("Hydration reminder snoozed for 1 hour 💧", "info");
  }

  toggleTheme() {
    this.theme = this.theme === "light" ? "dark" : "light";
    localStorage.setItem("ipfha_theme", this.theme);
    this.applyTheme();
  }

  applyTheme() {
    document.documentElement.setAttribute("data-theme", this.theme);
    const btn = document.getElementById("themeToggleBtn");
    if (btn) {
      btn.innerHTML = `<i class="fa-solid ${this.theme === 'light' ? 'fa-moon' : 'fa-sun'}"></i>`;
    }
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem("ipfha_sound", this.soundEnabled ? "true" : "false");
    const btn = document.getElementById("soundToggleBtn");
    if (btn) {
      btn.innerHTML = `<i class="fa-solid ${this.soundEnabled ? 'fa-volume-high' : 'fa-volume-xmark'}"></i>`;
    }
    showToast(`Sound FX ${this.soundEnabled ? 'Enabled' : 'Muted'}`, "info");
  }

  logout() {
    api.clearAuth();
    showToast("Signed out successfully", "info");
    setTimeout(() => location.reload(), 300);
  }

  // Notification Engine & Drawer Controls
  initNotificationEngine() {
    this.notifications = [];
    this.lastNotifIds = new Set();
    this.pollNotifications();
    this.notifInterval = setInterval(() => this.pollNotifications(), 60000);

    // Close drawer when clicking outside
    document.addEventListener("click", (e) => {
      const drawer = document.getElementById("notificationDrawer");
      const btn = document.getElementById("notifBellBtn");
      if (drawer && drawer.style.display !== "none" && !drawer.contains(e.target) && !btn?.contains(e.target)) {
        drawer.style.display = "none";
      }
    });

    if ("Notification" in window && Notification.permission === "default") {
      setTimeout(() => {
        Notification.requestPermission().catch(() => {});
      }, 5000);
    }
  }

  async pollNotifications() {
    if (!api.token) return;
    try {
      const res = await api.get("/api/notifications/active");
      if (!res || !res.success) return;

      this.notifications = res.notifications || [];
      this.activeMealWindow = res.active_meal_window;
      this.mealWindows = res.meal_windows;

      const badge = document.getElementById("notifBadge");
      if (badge) {
        if (this.notifications.length > 0) {
          badge.innerText = this.notifications.length;
          badge.style.display = "flex";
        } else {
          badge.style.display = "none";
        }
      }

      // Check for new notifications to sound/push
      this.notifications.forEach(n => {
        if (!this.lastNotifIds.has(n.id)) {
          this.lastNotifIds.add(n.id);
          if (this.soundEnabled) sound.playBeep(660, 0.12);
          showToast(`🔔 ${n.title}: ${n.message}`, n.urgency === "warning" ? "warning" : "info");

          if ("Notification" in window && Notification.permission === "granted") {
            try {
              new Notification(`Intelligent Fitness: ${n.title}`, {
                body: n.message,
                icon: "/static/assets/icons/app-icon.png"
              });
            } catch (e) {}
          }
        }
      });

      this.renderNotificationList();
    } catch (e) {
      console.warn("Notification polling:", e);
    }
  }

  renderNotificationList() {
    const list = document.getElementById("notificationList");
    if (!list) return;

    if (this.notifications.length === 0) {
      list.innerHTML = `
        <div style="text-align: center; padding: 28px 16px; color: var(--text-muted); font-size: 13px;">
          <i class="fa-solid fa-circle-check" style="color: #10b981; font-size: 24px; margin-bottom: 8px; display: block;"></i>
          All caught up! No pending health alerts right now.
        </div>
      `;
      return;
    }

    list.innerHTML = this.notifications.map(n => `
      <div class="notif-card ${n.urgency || 'info'}">
        <div class="notif-icon">
          <i class="fa-solid ${n.type === 'hydration' ? 'fa-droplet' : n.type === 'workout' ? 'fa-dumbbell' : 'fa-utensils'}"></i>
        </div>
        <div class="notif-content">
          <div class="notif-title">${n.title}</div>
          <div class="notif-msg">${n.message}</div>
          <div>
            ${n.action_type === 'quick_water' ? `
              <button class="notif-action-btn" onclick="window.app.quickDrinkWater(${n.action_target})">
                <i class="fa-solid fa-plus"></i> ${n.action_label}
              </button>
            ` : n.action_type === 'navigate' ? `
              <button class="notif-action-btn" onclick="window.app.navigate('${n.action_target}'); window.app.toggleNotificationDrawer();">
                <i class="fa-solid fa-arrow-right"></i> ${n.action_label}
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `).join("");
  }

  toggleNotificationDrawer() {
    const drawer = document.getElementById("notificationDrawer");
    if (!drawer) return;
    const isOpen = drawer.style.display !== "none";
    drawer.style.display = isOpen ? "none" : "block";
    if (!isOpen) {
      this.pollNotifications();
    }
  }

  async quickDrinkWater(amount = 250) {
    try {
      sound.playClick();
      await api.post("/api/notifications/quick-water", { amount_ml: amount });
      showToast(`Logged +${amount} ml water! 💧`, "success");
      await this.pollNotifications();
      if (this.currentPage === "dashboard") renderDashboard(document.getElementById("contentCanvas"));
      if (this.currentPage === "hydration") renderHydration(document.getElementById("contentCanvas"));
      if (this.currentPage === "plan") renderPlanToday(document.getElementById("contentCanvas"));
    } catch (e) {
      showToast(e.message, "error");
    }
  }
}

window.app = new AppController();
document.addEventListener("DOMContentLoaded", () => {
  window.app.init();
});
