import { api, showToast, sound } from "./api.js";

let currentScannedItems = [];

export function updateScannedItemCount(idx, delta) {
  const item = currentScannedItems[idx];
  if (!item) return;
  const currentCount = item.count || 1;
  const newCount = Math.max(currentCount + delta, 1);
  item.count = newCount;

  if (item.base_per_unit) {
    item.calories = Math.round(item.base_per_unit.calories * newCount * 10) / 10;
    item.protein_g = Math.round(item.base_per_unit.protein_g * newCount * 10) / 10;
    item.carbs_g = Math.round(item.base_per_unit.carbs_g * newCount * 10) / 10;
    item.fat_g = Math.round(item.base_per_unit.fat_g * newCount * 10) / 10;
    item.grams = Math.round(item.base_per_unit.grams * newCount);
  } else {
    const ratio = newCount / currentCount;
    item.calories = Math.round(item.calories * ratio * 10) / 10;
    item.protein_g = Math.round(item.protein_g * ratio * 10) / 10;
    item.carbs_g = Math.round(item.carbs_g * ratio * 10) / 10;
    item.fat_g = Math.round(item.fat_g * ratio * 10) / 10;
    item.grams = Math.round((item.grams || 100) * ratio);
  }
  item.serving = `${newCount} ${item.unit || 'pcs'} (~${item.grams}g)`;
  renderScannedTable({ disclaimer: document.getElementById("scannerDisclaimer")?.innerText || "" });
}

export function renderScanner(container) {
  container.innerHTML = `
    <div style="max-width: 820px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px;">
      
      <!-- Top Scanner Card -->
      <div class="app-card" style="text-align: center; position: relative;">
        
        <!-- Model Status Banner -->
        <div id="scannerModelStatusBar" style="margin-bottom: 22px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; background: var(--border-light); padding: 12px 18px; border-radius: var(--radius-md); border: 1px solid var(--border); text-align: left;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 36px; height: 36px; border-radius: 10px; background: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0;">
              <i class="fa-solid fa-brain"></i>
            </div>
            <div>
              <div style="font-size: 13px; font-weight: 800; color: var(--text-main); display: flex; align-items: center; gap: 8px;">
                <span id="scannerModelStatusDot" style="width: 10px; height: 10px; border-radius: 50%; background: #3b82f6; display: inline-block;"></span>
                <span id="scannerModelStatusText">Smart Local Vision & Plate Decomposer Active</span>
              </div>
              <div id="scannerModelStatusSub" style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                Local engine active • Connect Google Gemini key for instant cloud multimodal vision
              </div>
            </div>
          </div>
          <button id="scannerModelConfigBtn" onclick="window.app.openGeminiKeyModal()" class="btn-primary" style="padding: 8px 16px; font-size: 12px; border-radius: var(--radius-sm); white-space: nowrap; cursor: pointer;">
            <i class="fa-solid fa-key"></i> Connect Free Gemini Key
          </button>
        </div>

        <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 24px; margin: 0 auto 14px;">
          <i class="fa-solid fa-camera"></i>
        </div>
        <h2 style="font-size: 24px; font-weight: 900; margin-bottom: 22px;">AI Food & Multi-Item Plate Scanner</h2>

        <!-- Dropzone / File Picker -->
        <div id="scannerDropzone" style="border: 2px dashed var(--border); border-radius: var(--radius-lg); padding: 36px 20px; background: var(--bg-surface); cursor: pointer; transition: all 0.2s ease;">
          <input type="file" id="scannerFileInput" accept="image/*" style="display: none;" onchange="window.app.handleImageSelected(this.files[0])" />
          <i class="fa-solid fa-cloud-arrow-up" style="font-size: 40px; color: var(--primary); margin-bottom: 12px;"></i>
          <div style="font-size: 15px; font-weight: 800; color: var(--text-main);">Click to upload or drag & drop food photo</div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Supports JPG, PNG, WEBP • Full plate photos, South/North Indian Thalis, Biryani, Milk, Fruits</div>
        </div>

        <!-- Scanning Animation Container -->
        <div id="scannerAnalyzing" style="display: none; padding: 40px 20px; text-align: center;">
          <i class="fa-solid fa-spinner fa-spin" style="font-size: 38px; color: var(--primary); margin-bottom: 16px;"></i>
          <h3 id="scannerAnalyzingTitle" style="font-size: 17px; font-weight: 800; color: var(--text-main);">AI Vision Scanning Plate...</h3>
          <p id="scannerAnalyzingSub" style="font-size: 13px; color: var(--text-muted); margin-top: 6px;">Deconstructing visual plate components and matching nutritional database in real-time.</p>
        </div>
      </div>

      <!-- Scanned Results Review Table -->
      <div id="scannerResultsCard" class="app-card" style="display: none;">
        <div class="card-header">
          <div class="card-title">
            <i class="fa-solid fa-list-check" style="color: var(--primary);"></i>
            <span>Identified Food Items & Verified Macros</span>
          </div>
          <select id="scannerMealType" style="padding: 6px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border); font-size: 12px; font-weight: 700; background: var(--bg-surface); color: var(--text);">
            <option value="Lunch">Log to Lunch</option>
            <option value="Breakfast">Log to Breakfast</option>
            <option value="Dinner">Log to Dinner</option>
            <option value="Snacks">Log to Snacks</option>
          </select>
        </div>

        <!-- Uploaded Image Preview Box -->
        <div id="scannerImageContainer" style="display: flex; gap: 20px; align-items: center; background: var(--border-light); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border); margin-bottom: 20px;">
          <div style="position: relative; width: 140px; height: 140px; border-radius: var(--radius-md); overflow: hidden; border: 2px solid var(--primary-light); flex-shrink: 0; box-shadow: var(--shadow-sm); background: #000;">
            <img id="scannerImagePreview" src="" alt="Analyzed food" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
            <div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(93, 79, 179, 0.9); color: white; font-size: 10px; font-weight: 800; text-align: center; padding: 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">
              <i class="fa-solid fa-wand-magic-sparkles"></i> AI Analyzed
            </div>
          </div>
          <div style="flex: 1;">
            <div style="font-size: 14px; font-weight: 800; color: var(--text); margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
              <span>Uploaded Photo Analysis</span>
              <span id="scannerEngineBadge" style="font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: rgba(34, 197, 94, 0.15); color: #16a34a;">Verified</span>
            </div>
            <div id="scannerDisclaimer" style="display: none;"></div>
          </div>
        </div>


        <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 12px;">
          <thead>
            <tr style="border-bottom: 2px solid var(--border-light); color: var(--text-muted); text-align: left;">
              <th style="padding: 10px 6px;">Detected Food Item</th>
              <th style="padding: 10px 6px;">Est. Portion</th>
              <th style="padding: 10px 6px;">Calories</th>
              <th style="padding: 10px 6px;">Protein</th>
              <th style="padding: 10px 6px;">Carbs</th>
              <th style="padding: 10px 6px;">Fat</th>
              <th style="padding: 10px 6px;"></th>
            </tr>
          </thead>
          <tbody id="scannerItemsTableBody">
          </tbody>
        </table>

        <!-- Add Manual Item to Plate Button -->
        <div style="margin-bottom: 18px; display: flex; justify-content: flex-start;">
          <button type="button" class="btn-secondary" onclick="window.app.addManualItemToPlate()" style="font-size: 12px; padding: 6px 14px; font-weight: 700;">
            <i class="fa-solid fa-plus" style="color: var(--primary);"></i> Add Another Food Item to Plate
          </button>
        </div>

        <!-- Totals Row & Confirm Button -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-light); padding-top: 16px;">
          <div id="scannerTotalsSummary" style="font-size: 13px; font-weight: 700;">
          </div>
          <button class="btn-primary" onclick="window.app.confirmScannedFoodBatch()">
            <i class="fa-solid fa-plus"></i> Add to Today's Food Log
          </button>
        </div>
      </div>
    </div>
  `;

  // Attach drag and drop listeners
  const dropzone = document.getElementById("scannerDropzone");
  const fileInput = document.getElementById("scannerFileInput");

  if (dropzone && fileInput) {
    dropzone.onclick = () => fileInput.click();
    dropzone.ondragover = (e) => { e.preventDefault(); dropzone.style.borderColor = "var(--primary)"; };
    dropzone.ondragleave = () => { dropzone.style.borderColor = "var(--border)"; };
    dropzone.ondrop = (e) => {
      e.preventDefault();
      dropzone.style.borderColor = "var(--border)";
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        window.app.handleImageSelected(e.dataTransfer.files[0]);
      }
    };
  }

  // Check scanner status on load
  checkScannerStatus();
}

async function checkScannerStatus() {
  try {
    const res = await api.get("/api/scanner/status");
    const dot = document.getElementById("scannerModelStatusDot");
    const text = document.getElementById("scannerModelStatusText");
    const sub = document.getElementById("scannerModelStatusSub");
    const btn = document.getElementById("scannerModelConfigBtn");

    if (res.has_gemini_key) {
      if (dot) dot.style.background = "#16a34a";
      if (text) text.innerHTML = `Google Gemini Multimodal Vision AI Active`;
      if (sub) sub.innerText = `Multimodal AI connected • 100% human-level precision plate decomposition`;
      if (btn) {
        btn.innerHTML = `<i class="fa-solid fa-gear"></i> Manage Key`;
        btn.className = "btn-secondary";
      }
    } else {
      if (dot) dot.style.background = "#3b82f6";
      if (text) text.innerHTML = `Smart Local Vision & Plate Decomposer Active`;
      if (sub) sub.innerText = `Local engine active • Connect Google Gemini key for instant cloud multimodal vision`;
      if (btn) {
        btn.innerHTML = `<i class="fa-solid fa-key"></i> Connect Free Gemini Key`;
        btn.className = "btn-primary";
      }
    }
  } catch (e) {
    console.warn("Could not check scanner status:", e);
  }
}

export function openGeminiKeyModal() {
  const modal = document.getElementById("geminiKeyModal");
  if (modal) modal.style.display = "flex";
}

export function closeGeminiKeyModal() {
  const modal = document.getElementById("geminiKeyModal");
  if (modal) modal.style.display = "none";
}

export async function saveGeminiApiKey() {
  const input = document.getElementById("geminiApiKeyInput");
  const key = input ? input.value.trim() : "";

  if (!key) {
    showToast("Please paste your Gemini API key.", "error");
    return;
  }

  try {
    const res = await api.post("/api/scanner/set-key", { gemini_api_key: key });
    showToast(res.message || "Gemini Vision AI connected successfully!", "success");
    sound.playVictory();
    closeGeminiKeyModal();
    checkScannerStatus();
  } catch (err) {
    showToast(err.message || "Failed to validate Gemini API key.", "error");
  }
}

async function compressImageBeforeUpload(file, maxDimension = 768) {
  if (!file || !file.type.startsWith("image/")) return file;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width <= maxDimension && height <= maxDimension && file.size < 180 * 1024) {
          resolve(file);
          return;
        }
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), { type: "image/jpeg" });
          resolve(compressedFile);
        }, "image/jpeg", 0.82);
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export async function processFoodImage(file) {
  const dropzone = document.getElementById("scannerDropzone");
  const analyzing = document.getElementById("scannerAnalyzing");
  const resultsCard = document.getElementById("scannerResultsCard");
  const analyzingTitle = document.getElementById("scannerAnalyzingTitle");
  const analyzingSub = document.getElementById("scannerAnalyzingSub");

  if (dropzone) dropzone.style.display = "none";
  if (analyzing) analyzing.style.display = "block";
  if (resultsCard) resultsCard.style.display = "none";

  if (analyzingTitle) analyzingTitle.innerText = "Scanning Plate with AI Vision...";
  if (analyzingSub) analyzingSub.innerText = "Optimizing photo and detecting plate ingredients...";

  const progressTimer = setTimeout(() => {
    if (analyzingTitle) analyzingTitle.innerText = "Deconstructing Food Components...";
    if (analyzingSub) analyzingSub.innerText = "Matching verified database, calories, and macro nutrition...";
  }, 1200);

  try {
    const readyFile = await compressImageBeforeUpload(file, 768);
    const formData = new FormData();
    formData.append("file", readyFile);

    const res = await api.post("/api/scanner/analyze", formData);
    clearTimeout(progressTimer);
    sound.playVictory();

    if (analyzing) analyzing.style.display = "none";
    if (dropzone) dropzone.style.display = "block";
    if (resultsCard) resultsCard.style.display = "block";

    currentScannedItems = res.detected_items || [];
    renderScannedTable(res);
  } catch (err) {
    clearTimeout(progressTimer);
    if (analyzing) analyzing.style.display = "none";
    if (dropzone) dropzone.style.display = "block";
    showToast(err.message, "error");
  }
}

function renderScannedTable(res) {
  const tbody = document.getElementById("scannerItemsTableBody");
  const disclaimer = document.getElementById("scannerDisclaimer");
  const imgPreview = document.getElementById("scannerImagePreview");
  const engineBadge = document.getElementById("scannerEngineBadge");

  if (res && res.image_preview_uri && imgPreview) {
    imgPreview.src = res.image_preview_uri;
  }

  if (disclaimer && res && res.disclaimer) disclaimer.innerText = res.disclaimer;
  if (engineBadge && res) {
    if (res.engine === "gemini_vision") {
      engineBadge.innerHTML = `<i class="fa-solid fa-cloud me-1"></i> AI Vision Verified`;
      engineBadge.style.background = "rgba(34, 197, 94, 0.15)";
      engineBadge.style.color = "#16a34a";
    } else {
      engineBadge.innerHTML = `<i class="fa-solid fa-microchip me-1"></i> On-Device AI Vision`;
      engineBadge.style.background = "rgba(59, 130, 246, 0.15)";
      engineBadge.style.color = "#3b82f6";
    }
  }

  if (tbody) {
    tbody.innerHTML = currentScannedItems.map((item, idx) => `
      <tr style="border-bottom: 1px solid var(--border-light);">
        <td style="padding: 10px 6px; font-weight: 700;">
          <input type="text" value="${item.name}" onchange="window.app.updateScannedItemName(${idx}, this.value)" style="border: 1px solid var(--border); border-radius: 6px; padding: 4px 8px; font-size: 13px; width: 92%; background: var(--bg-surface); color: var(--text-main);" />
        </td>
        <td style="padding: 10px 6px;">
          <div class="portion-stepper">
            <button class="stepper-btn" onclick="window.app.updateScannedItemCount(${idx}, -1)">-</button>
            <span class="stepper-val" id="stepperCount_${idx}">${item.count || 1}</span>
            <button class="stepper-btn" onclick="window.app.updateScannedItemCount(${idx}, 1)">+</button>
            <span style="font-size: 11px; color: var(--text-muted); margin-left: 4px;">${item.unit || 'pcs'}</span>
          </div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">~${item.grams || (item.count || 1)*50}g</div>
        </td>
        <td style="padding: 10px 6px; font-weight: 800;">${Math.round(item.calories)} kcal</td>
        <td style="padding: 10px 6px; color: var(--text-muted);">${item.protein_g}g</td>
        <td style="padding: 10px 6px; color: var(--text-muted);">${item.carbs_g}g</td>
        <td style="padding: 10px 6px; color: var(--text-muted);">${item.fat_g}g</td>
        <td style="padding: 10px 6px; text-align: right;">
          <button style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px 8px;" onclick="window.app.removeScannedItem(${idx})" title="Remove item">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </td>
      </tr>
    `).join("");
  }

  updateScannedTotalsDisplay();
}

export function addManualItemToPlate() {
  const foodName = prompt("Enter food item to add to your plate (e.g. Sambar, Potato Fry, Pickle, White Rice, Curd, Boiled Egg):");
  if (!foodName || !foodName.trim()) return;

  const newItem = {
    food_id: null,
    name: foodName.trim(),
    serving: "1 serving (~100g)",
    count: 1,
    unit: "serving",
    grams: 100,
    calories: 120.0,
    protein_g: 3.0,
    carbs_g: 20.0,
    fat_g: 2.0,
    base_per_unit: {
      calories: 120.0,
      protein_g: 3.0,
      carbs_g: 20.0,
      fat_g: 2.0,
      grams: 100
    }
  };

  currentScannedItems.push(newItem);
  renderScannedTable({ disclaimer: document.getElementById("scannerDisclaimer")?.innerText || "" });
  showToast(`Added ${foodName.trim()} to plate!`, "info");
}

export function updateScannedItem(idx, newName) {
  if (currentScannedItems[idx]) {
    currentScannedItems[idx].name = newName;
  }
  updateScannedTotalsDisplay();
}

export function removeScannedItem(idx) {
  if (idx >= 0 && idx < currentScannedItems.length) {
    currentScannedItems.splice(idx, 1);
    renderScannedTable({ disclaimer: document.getElementById("scannerDisclaimer")?.innerText || "" });
  }
}

export function updateScannedTotalsDisplay() {
  const totals = document.getElementById("scannerTotalsSummary");
  if (!totals) return;

  const totalCals = currentScannedItems.reduce((acc, i) => acc + (parseFloat(i.calories) || 0), 0);
  const totalProt = currentScannedItems.reduce((acc, i) => acc + (parseFloat(i.protein_g) || 0), 0);
  const totalCarbs = currentScannedItems.reduce((acc, i) => acc + (parseFloat(i.carbs_g) || 0), 0);
  const totalFat = currentScannedItems.reduce((acc, i) => acc + (parseFloat(i.fat_g) || 0), 0);

  totals.innerHTML = `
    Total: <span style="color: var(--primary); font-size: 15px; font-weight: 900;">${Math.round(totalCals)} kcal</span> • 
    <span style="color: #3b82f6;">P: ${Math.round(totalProt)}g</span> • 
    <span style="color: #10b981;">C: ${Math.round(totalCarbs)}g</span> • 
    <span style="color: #f59e0b;">F: ${Math.round(totalFat)}g</span>
  `;
}

export async function confirmBatch() {
  if (currentScannedItems.length === 0) {
    showToast("No items to confirm!", "error");
    return;
  }

  const mealTypeSelect = document.getElementById("scannerMealType");
  const mealType = mealTypeSelect ? mealTypeSelect.value : "Lunch";

  try {
    const res = await api.post("/api/scanner/confirm-batch", {
      meal_type: mealType,
      items: currentScannedItems
    });
    sound.playVictory();
    showToast(res.message, "success");

    // Reset scanner
    const resultsCard = document.getElementById("scannerResultsCard");
    if (resultsCard) resultsCard.style.display = "none";
    currentScannedItems = [];

    // Navigate to food diary
    window.app.navigate("food");
  } catch (err) {
    showToast(err.message, "error");
  }
}

export async function applyQuickFoodPreset(presetKey) {
  try {
    const res = await api.get(`/api/scanner/preset/${presetKey}`);
    currentScannedItems = res.detected_items || [];
    renderScannedTable({
      image_preview_uri: document.getElementById("scannerImagePreview")?.src || "",
      disclaimer: res.disclaimer || `Portion calibrated to verified ${presetKey.replace('_', ' ').toUpperCase()} database profile.`
    });
    sound.playClick();
    showToast(`Adjusted to ${presetKey.replace('_', ' ').toUpperCase()}`, "info");
  } catch (err) {
    showToast(err.message, "error");
  }
}
