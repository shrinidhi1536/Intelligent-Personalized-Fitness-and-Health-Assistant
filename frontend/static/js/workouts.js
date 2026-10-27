
let studioCanvasAnimFrame = null;
let studioAnimTime = 0;
let currentRepCounter = 1;

export function getTrainerImageForExercise(exerciseName = "", category = "", workoutName = "") {
  return getTrainerAssetBase(exerciseName, category, workoutName) + ".jpg";
}

export function getTrainerVideoForExercise(exerciseName = "", category = "", workoutName = "") {
  return getTrainerAssetBase(exerciseName, category, workoutName) + ".mp4";
}

function getTrainerAssetBase(exerciseName = "", category = "", workoutName = "") {
  const ex = (exerciseName || "").toLowerCase();
  const cat = (category || "").toLowerCase();
  const wk = (workoutName || "").toLowerCase();

  // =========================================================================
  // 1. SPECIFIC EXERCISE MOVEMENTS FIRST (Highest Priority):
  // Evaluates the individual exercise step name so each step in a workout
  // displays its own dedicated demonstration video.
  // =========================================================================

  // Yoga & Restorative Mobility Movements
  if (ex.includes("cat-cow") || ex.includes("cat cow") || ex.includes("cat/cow")) return "cat_cow";
  if (ex.includes("downward") || ex.includes("adho mukha") || ex.includes("dog to") || (ex.includes("dog") && ex.includes("down"))) return "downward_dog";
  if (ex.includes("warrior") || ex.includes("virabhadrasana") || ex.includes("side angle")) return "warrior";
  if (ex.includes("forward bend") || ex.includes("forward fold") || ex.includes("ragdoll") || ex.includes("uttanasana")) return "forward_fold";
  if (ex.includes("child") || ex.includes("balasana")) return "child_pose";
  if (ex.includes("legs-up") || ex.includes("legs up") || ex.includes("wall inversion") || ex.includes("viparita")) return "legs_up_wall";
  if (ex.includes("twist") || ex.includes("spinal twist") || ex.includes("supine gentle")) return "supine_twist";
  if (ex.includes("bound angle") || ex.includes("supta baddha") || ex.includes("shavasana") || ex.includes("savasana") || ex.includes("constructive rest") || ex.includes("reclined")) return "reclined_rest";
  if (ex.includes("sun salutation") || ex.includes("surya namaskar") || ex.includes("mountain pose") || ex.includes("tadasana")) return "sun_salutation";
  if (ex.includes("cobra") || ex.includes("vinyasa") || ex.includes("heart opener")) return "yoga";

  // Wall Pilates & Posture Movements
  if (ex.includes("wall roll") || ex.includes("wall pilates") || (ex.includes("wall") && wk.includes("pilates"))) return "wall_pilates";
  if (ex.includes("wall angel") || ex.includes("scapular") || ex.includes("chin tuck") || ex.includes("thoracic extension") || ex.includes("neck relief")) return "posture";

  // Strength, Calisthenics & Core Movements
  if (ex.includes("goblet") || ex.includes("sumo squat")) return "goblet_squat";
  if (ex.includes("plank jack")) return "plank_jacks";
  if (ex.includes("side-lying") || ex.includes("clamshell")) return "glute_sculpt";
  if (ex.includes("bridge") || ex.includes("pelvic tilt") || ex.includes("hip thrust")) return "bridge";
  if (ex.includes("side lunge") || ex.includes("pulse lunge") || ex.includes("lateral lunge") || ex.includes("skater")) return "side_lunge";
  if (ex.includes("step up") || ex.includes("step-up")) return "step_ups";
  if (ex.includes("standing crunch") || ex.includes("elbow to knee")) return "standing_crunch";
  if (ex.includes("superman") || ex.includes("prone extension")) return "superman";
  if (ex.includes("dip") || ex.includes("tricep dip")) return "dips";
  if (ex.includes("deadlift") || ex.includes("bent-over row") || ex.includes("overhead press") || ex.includes("hypertrophy") || ex.includes("dumbbell")) return "dumbbell";

  // Cardio & High-Intensity Conditioning Movements
  if (ex.includes("mountain climber") || ex.includes("climber")) return "mountain_climbers";
  if (ex.includes("burpee")) return "burpees";
  if (ex.includes("jump squat") || ex.includes("rebound squat") || ex.includes("squat jump") || ex.includes("lateral bound")) return "jump_squats";
  if (ex.includes("jumping jack") || ex.includes("seal jack") || ex.includes("cross-jack") || ex.includes("jack")) return "jumping_jacks";
  if (ex.includes("high knee") || ex.includes("a-skip") || ex.includes("knee drive") || ex.includes("butt kick")) return "high_knees";
  if (wk.includes("cycl") || wk.includes("spin") || cat.includes("cycl") || ex.includes("rpm") || ex.includes("pedal") || ex.includes("spin")) return "cycling";
  if (ex.includes("sprint") || ex.includes("dash") || ex.includes("shuffle")) return "sprint";
  if (ex.includes("jump rope") || ex.includes("rope")) return "hiit";
  if (ex.includes("walk") || ex.includes("marching") || ex.includes("march") || ex.includes("stride")) {
    return (wk.includes("cardio") || wk.includes("melt")) ? "cardio_walk" : "walk";
  }
  if (ex.includes("run") || ex.includes("jog")) return "run";
  if (ex.includes("push-up") || ex.includes("push up") || ex.includes("pushup")) return "pushup";
  if (ex.includes("lunge") || ex.includes("split squat")) return "lunge";
  if (ex.includes("plank") || ex.includes("shoulder tap") || ex.includes("hollow body")) return "plank";
  if (ex.includes("wall sit")) return wk.includes("pilates") ? "wall_pilates" : "squat";
  if (ex.includes("squat")) return "squat";
  if (ex.includes("stretch") || ex.includes("hamstring") || ex.includes("psoas") || ex.includes("reach") || ex.includes("piriformis") || ex.includes("figure-4") || ex.includes("expansion")) return "stretch";
  if (ex.includes("somatic") || wk.includes("somatic") || ex.includes("pelvic clock") || ex.includes("windmill")) return "somatic";

  // =========================================================================
  // 2. WORKOUT-LEVEL / CATEGORY FALLBACKS:
  // Used when previewing workout routines before expanding exercise steps
  // =========================================================================
  if (wk.includes("jumping jack")) return "jumping_jacks";
  if (wk.includes("high knee")) return "high_knees";
  if (wk.includes("mountain climber")) return "mountain_climbers";
  if (wk.includes("burpee")) return "burpees";
  if (wk.includes("jump squat")) return "jump_squats";
  if (wk.includes("sprint")) return "sprint";
  if (wk.includes("cardio walk") || wk.includes("fat melt")) return "cardio_walk";
  if (wk.includes("walk") || cat.includes("walking")) return "walk";
  if (wk.includes("run") || cat.includes("running")) return "run";
  if (wk.includes("cycl") || cat.includes("cycling")) return "cycling";
  if (wk.includes("sun salutation") || wk.includes("surya")) return "sun_salutation";
  if (wk.includes("yoga") || cat.includes("yoga")) return "yoga";
  if (wk.includes("bedtime") || wk.includes("deep rest") || wk.includes("rest")) return "bedtime_rest";
  if (wk.includes("wall pilates") || wk.includes("pilates") || cat.includes("pilates")) return "wall_pilates";
  if (wk.includes("torch") || wk.includes("hiit") || cat.includes("hiit")) return "hiit";
  if (wk.includes("dumbbell")) return "dumbbell";
  if (wk.includes("somatic")) return "somatic";
  if (wk.includes("glute") || wk.includes("sculpt")) return "glute_sculpt";
  if (wk.includes("desk worker") || wk.includes("posture")) return "posture";
  if (wk.includes("calisthenic")) return "dips";
  if (wk.includes("push up") || wk.includes("push-up")) return "pushup";
  if (wk.includes("lunge")) return "lunge";
  if (wk.includes("plank")) return "plank";
  if (wk.includes("stretch") || cat.includes("flexibility")) return "stretch";

  return "squat";
}

export function initStudioCanvas(canvas, exerciseName = "Squats", isRunning = false) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  if (studioCanvasAnimFrame) {
    cancelAnimationFrame(studioCanvasAnimFrame);
  }

  const name = exerciseName.toLowerCase();

  function animate() {
    if (isRunning) {
      studioAnimTime += 0.045;
    } else {
      studioAnimTime += 0.01; // subtle idle breathing
    }

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Deep studio ambient gradient
    const bgGrad = ctx.createRadialGradient(w/2, h/2, 20, w/2, h/2, w/1.2);
    bgGrad.addColorStop(0, "#1c183a");
    bgGrad.addColorStop(0.6, "#120e2a");
    bgGrad.addColorStop(1, "#0a071a");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Grid floor perspective
    ctx.strokeStyle = "rgba(181, 171, 244, 0.15)";
    ctx.lineWidth = 1.5;
    const floorY = h * 0.82;
    for (let i = -6; i <= 6; i++) {
      ctx.beginPath();
      ctx.moveTo(w/2 + i * 36, floorY);
      ctx.lineTo(w/2 + i * 72, h);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(30, floorY);
    ctx.lineTo(w - 30, floorY);
    ctx.stroke();

    // Biomechanical Figure Drawing
    const pPrimary = "#8571FF";
    const pDark = "#5D4FB3";
    const pGlow = "#DBD5FF";
    const cx = w / 2;

    // Movement interpolation
    const cycle = Math.sin(studioAnimTime); // -1 to 1
    const t = (cycle + 1) / 2; // 0 (start) to 1 (peak contraction)

    currentRepCounter = Math.floor((studioAnimTime / (Math.PI * 2))) % 12 + 1;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (name.includes("squat") || name.includes("wall sit") || name.includes("deadlift")) {
      // SQUAT: Hips lower, knees bend, torso 45 deg, arms reach forward
      const hipY = floorY - 90 + t * 45;
      const kneeX = cx + 25 + t * 10;
      const kneeY = floorY - 50 + t * 15;
      const footX = cx + 18;
      const headY = hipY - 60;
      const headX = cx - 12 - t * 8;

      // Glow halo on Quadriceps & Glutes
      ctx.shadowColor = "#8571FF";
      ctx.shadowBlur = isRunning ? 22 : 8;

      // Spine & Torso
      ctx.strokeStyle = pPrimary;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(headX, headY + 12);
      ctx.lineTo(cx - 15, hipY);
      ctx.stroke();

      // Head
      ctx.fillStyle = pGlow;
      ctx.beginPath();
      ctx.arc(headX, headY, 14, 0, Math.PI * 2);
      ctx.fill();

      // Arms reaching forward for counter-balance
      ctx.strokeStyle = pGlow;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(headX + 4, headY + 20);
      ctx.lineTo(cx + 42 + t * 8, headY + 22 + t * 4);
      ctx.stroke();

      // Thigh (Glute / Quad)
      ctx.strokeStyle = isRunning ? "#DBD5FF" : pPrimary;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(cx - 15, hipY);
      ctx.lineTo(kneeX, kneeY);
      ctx.stroke();

      // Shin down to foot
      ctx.strokeStyle = pDark;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(kneeX, kneeY);
      ctx.lineTo(footX, floorY);
      ctx.lineTo(footX + 18, floorY);
      ctx.stroke();

      // Muscle activation pulse indicator
      ctx.fillStyle = "rgba(133, 113, 255, 0.85)";
      ctx.beginPath();
      ctx.arc(cx - 4, hipY + 10, 6 + t * 4, 0, Math.PI * 2);
      ctx.fill();

    } else if (name.includes("push") || name.includes("press") || name.includes("dip") || name.includes("archer") || name.includes("pike") || name.includes("row")) {
      // PUSH-UP / DIP / ARCHER: Horizontal / angled pressing mechanics
      const pushY = floorY - 45 + t * 24;
      const headX = cx - 70;
      const feetX = cx + 80;

      ctx.shadowColor = "#8571FF";
      ctx.shadowBlur = isRunning ? 22 : 8;

      // Straight horizontal torso / legs
      ctx.strokeStyle = pPrimary;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(headX, pushY);
      ctx.lineTo(feetX, floorY - 10);
      ctx.stroke();

      // Head
      ctx.fillStyle = pGlow;
      ctx.beginPath();
      ctx.arc(headX - 16, pushY - 4, 13, 0, Math.PI * 2);
      ctx.fill();

      // Arms pushing up
      ctx.strokeStyle = pGlow;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(headX + 24, pushY);
      ctx.lineTo(headX + 14 - t * 10, floorY);
      ctx.stroke();

      // Pectoral / Tricep activation glow
      ctx.fillStyle = "rgba(133, 113, 255, 0.9)";
      ctx.beginPath();
      ctx.arc(headX + 20, pushY + 4, 5 + t * 4, 0, Math.PI * 2);
      ctx.fill();

    } else if (name.includes("lunge") || name.includes("split")) {
      // LUNGE: Staggered stance, lead knee flexes 90 deg, rear knee lowers
      const lungeY = t * 30;
      const headX = cx - 5;
      const headY = floorY - 130 + lungeY;

      ctx.shadowColor = "#8571FF";
      ctx.shadowBlur = isRunning ? 20 : 8;

      // Vertical spine
      ctx.strokeStyle = pPrimary;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(headX, headY + 14);
      ctx.lineTo(headX, floorY - 70 + lungeY);
      ctx.stroke();

      // Head
      ctx.fillStyle = pGlow;
      ctx.beginPath();
      ctx.arc(headX, headY, 14, 0, Math.PI * 2);
      ctx.fill();

      // Front leg
      ctx.strokeStyle = pGlow;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(headX, floorY - 70 + lungeY);
      ctx.lineTo(cx + 40, floorY - 35);
      ctx.lineTo(cx + 40, floorY);
      ctx.lineTo(cx + 56, floorY);
      ctx.stroke();

      // Rear leg
      ctx.strokeStyle = pDark;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(headX, floorY - 70 + lungeY);
      ctx.lineTo(cx - 42, floorY - 35 + lungeY * 0.7);
      ctx.lineTo(cx - 52, floorY);
      ctx.stroke();

    } else if (name.includes("plank") || name.includes("hollow") || name.includes("tap")) {
      // PLANK / HOLLOW: Isometric core stability hold
      const headX = cx - 70;
      const feetX = cx + 80;
      const plankY = floorY - 36 + Math.sin(studioAnimTime * 2) * 2;

      ctx.shadowColor = "#8571FF";
      ctx.shadowBlur = 24;

      // Torso & legs
      ctx.strokeStyle = pPrimary;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(headX, plankY);
      ctx.lineTo(feetX, floorY - 12);
      ctx.stroke();

      // Head
      ctx.fillStyle = pGlow;
      ctx.beginPath();
      ctx.arc(headX - 16, plankY - 2, 13, 0, Math.PI * 2);
      ctx.fill();

      // Forearms on floor
      ctx.strokeStyle = pGlow;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(headX + 22, plankY);
      ctx.lineTo(headX + 18, floorY);
      ctx.lineTo(headX + 38, floorY);
      ctx.stroke();

      // Pulsating Core Stability Rings
      ctx.strokeStyle = "rgba(181, 171, 244, 0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, plankY + 2, 16 + t * 10, 0, Math.PI * 2);
      ctx.stroke();

    } else if (name.includes("yoga") || name.includes("salutation") || name.includes("cobra") || name.includes("dog") || name.includes("stretch") || name.includes("twist") || name.includes("reach") || name.includes("fold") || name.includes("pose") || name.includes("rest") || name.includes("tadasana") || name.includes("breath")) {
      // YOGA / STRETCH: Graceful standing upward salute into spinal wave
      const reachY = Math.sin(studioAnimTime * 1.5) * 18;
      const headX = cx;
      const headY = floorY - 140 - reachY * 0.5;

      ctx.shadowColor = "#DBD5FF";
      ctx.shadowBlur = 22;

      // Spine elongated
      ctx.strokeStyle = pPrimary;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(headX, headY + 14);
      ctx.lineTo(headX, floorY - 55);
      ctx.stroke();

      // Head
      ctx.fillStyle = pGlow;
      ctx.beginPath();
      ctx.arc(headX, headY, 14, 0, Math.PI * 2);
      ctx.fill();

      // Arms sweeping upward into majestic salutary pose
      ctx.strokeStyle = pGlow;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(headX - 10, headY + 22);
      ctx.lineTo(headX - 25, headY - 25 - reachY);
      ctx.lineTo(headX, headY - 45 - reachY);
      ctx.moveTo(headX + 10, headY + 22);
      ctx.lineTo(headX + 25, headY - 25 - reachY);
      ctx.lineTo(headX, headY - 45 - reachY);
      ctx.stroke();

      // Legs rooted tall
      ctx.strokeStyle = pDark;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(headX, floorY - 55);
      ctx.lineTo(headX - 12, floorY);
      ctx.moveTo(headX, floorY - 55);
      ctx.lineTo(headX + 12, floorY);
      ctx.stroke();

      // Spiritual / Zen halo ring
      ctx.strokeStyle = "rgba(219, 213, 255, 0.45)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(headX, headY, 26 + t * 6, 0, Math.PI * 2);
      ctx.stroke();

    } else {
      // DYNAMIC CARDIO / HIGH KNEES / JACKS / BURPEES
      const kneeLift = Math.abs(Math.sin(studioAnimTime * 3)) * 45;
      const headY = floorY - 130 + Math.abs(Math.sin(studioAnimTime * 3)) * 6;

      ctx.shadowColor = "#8571FF";
      ctx.shadowBlur = 18;

      // Torso
      ctx.strokeStyle = pPrimary;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(cx, headY + 14);
      ctx.lineTo(cx, floorY - 65);
      ctx.stroke();

      // Head
      ctx.fillStyle = pGlow;
      ctx.arc(cx, headY, 14, 0, Math.PI * 2);
      ctx.fill();

      // High Knee Drive
      ctx.strokeStyle = pGlow;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(cx, floorY - 65);
      ctx.lineTo(cx + 32, floorY - 65 + 10 - kneeLift);
      ctx.lineTo(cx + 30, floorY - 20 - kneeLift * 0.5);
      ctx.stroke();

      // Supporting leg
      ctx.strokeStyle = pDark;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(cx, floorY - 65);
      ctx.lineTo(cx - 15, floorY - 30);
      ctx.lineTo(cx - 15, floorY);
      ctx.stroke();
    }

    ctx.restore();

    // Bottom On-Screen HUD Data
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.font = "800 12px Inter, sans-serif";
    ctx.fillText(`TEMPO REP: ${currentRepCounter} / 12`, 20, h - 20);

    const breathText = t > 0.5 ? "BREATHE OUT (DRIVE)" : "BREATHE IN (ECCENTRIC)";
    ctx.fillStyle = t > 0.5 ? "#8571FF" : "#DBD5FF";
    ctx.fillText(breathText, w - 190, h - 20);

    studioCanvasAnimFrame = requestAnimationFrame(animate);
  }

  animate();
}

export function stopStudioCanvas() {
  if (studioCanvasAnimFrame) {
    cancelAnimationFrame(studioCanvasAnimFrame);
    studioCanvasAnimFrame = null;
  }
}

import { api, showToast, sound } from "./api.js";

let currentWorkoutTimer = null;
let isTimerRunning = false;
let elapsedSeconds = 0;
let stepSecondsRemaining = 25;
let currentExerciseIndex = 0;
let currentSetIndex = 0;
let totalWorkoutSets = 3;
let activeWorkoutData = null;
let caloriesBurned = 0;

export async function renderWorkouts(container, category = "all") {
  container.innerHTML = `
    <div style="text-align: center; padding: 60px 0;">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 32px; color: var(--primary);"></i>
      <p style="margin-top: 12px; color: var(--text-muted);">Loading workout studio and routines...</p>
    </div>
  `;

  try {
    const [libRes, recRes] = await Promise.all([
      api.get(`/api/workouts/library?category=${category}`),
      api.get("/api/workouts/recommendations")
    ]);

    const workouts = libRes.workouts || [];
    const spotlight = recRes.spotlight || {};

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 24px;">
        
        <!-- Top Recommended Workout Hero (Shown First at Top) -->
        <div class="app-card" style="padding: 24px; position: relative; overflow: hidden; background: linear-gradient(135deg, var(--bg-card), var(--border-light)); border-left: 5px solid var(--primary);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
            <div style="max-width: 650px;">
              <span style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.6px; background: var(--primary); color: white; padding: 5px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 6px;">
                <i class="fa-solid fa-sparkles"></i> ${spotlight.daily_focus ? `${new Date().toLocaleDateString('en-US', { weekday: 'long' })} • ${spotlight.daily_focus}` : "Recommended Workout for Today"}
              </span>
              <h2 style="font-size: 24px; font-weight: 900; color: var(--text-main); margin-top: 10px; margin-bottom: 6px;">
                ${spotlight.name || "Daily Movement Routine"}
              </h2>
              <p style="font-size: 13px; color: var(--text-muted); line-height: 1.45; margin-bottom: 14px;">
                ${spotlight.daily_description || spotlight.description || "Personalized routine calibrated for optimal recovery, mobility, and metabolic activation."}
              </p>

              <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                <span style="font-size: 11px; font-weight: 800; color: #5D4FB3; background: #DBD5FF; padding: 4px 10px; border-radius: var(--radius-sm);">
                  <i class="fa-solid fa-tag"></i> ${spotlight.category || "General"}
                </span>
                <span style="font-size: 11px; font-weight: 800; color: var(--primary-hover); background: var(--primary-light); padding: 4px 10px; border-radius: var(--radius-sm);">
                  <i class="fa-solid fa-clock"></i> ${spotlight.duration_min || 20} min
                </span>
                <span style="font-size: 11px; font-weight: 800; color: var(--primary-hover); background: var(--primary-light); padding: 4px 10px; border-radius: var(--radius-sm);">
                  <i class="fa-solid fa-bolt"></i> ~${Math.round((spotlight.duration_min || 20) * (spotlight.cal_per_minute || 6))} kcal
                </span>
                <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); background: var(--border-light); padding: 4px 10px; border-radius: var(--radius-sm);">
                  <i class="fa-solid fa-layer-group"></i> ${spotlight.difficulty || "Beginner"}
                </span>
                <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); background: var(--border-light); padding: 4px 10px; border-radius: var(--radius-sm);">
                  <i class="fa-solid fa-dumbbell"></i> ${spotlight.equipment_needed || "No Equipment"}
                </span>
              </div>
            </div>

            <button class="btn-primary" style="padding: 12px 28px; font-size: 14px; font-weight: 800;" onclick="window.app.startWorkout(${spotlight.id || 1})">
              <i class="fa-solid fa-eye"></i> View
            </button>
          </div>
        </div>

        <!-- MORE TO EXPLORE (Inspired by Modern Mobile Reference) -->
        <div>
          <div style="font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.8px; color: var(--primary); margin-bottom: 4px;">
            More to Explore
          </div>
          <div style="font-size: 15px; font-weight: 800; color: var(--text-main); margin-bottom: 12px;">
            Shake up your routine with targeted workout collections
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 20px;">
            <div onclick="window.app.filterWorkouts('Pilates & Core')" style="cursor: pointer; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 14px; display: flex; align-items: center; gap: 12px; transition: all 0.2s ease;">
              <div style="width: 40px; height: 40px; border-radius: 10px; background: #DBD5FF; color: #5D4FB3; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                <i class="fa-solid fa-person-praying"></i>
              </div>
              <div>
                <div style="font-size: 13px; font-weight: 800; color: var(--text-main);">Wall Pilates</div>
                <div style="font-size: 11px; color: var(--text-muted);">28 routines • Alignment</div>
              </div>
            </div>

            <div onclick="window.app.filterWorkouts('Pilates & Core')" style="cursor: pointer; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 14px; display: flex; align-items: center; gap: 12px; transition: all 0.2s ease;">
              <div style="width: 40px; height: 40px; border-radius: 10px; background: #EDEBFC; color: #8571FF; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                <i class="fa-solid fa-child-reaching"></i>
              </div>
              <div>
                <div style="font-size: 13px; font-weight: 800; color: var(--text-main);">Home Pilates</div>
                <div style="font-size: 11px; color: var(--text-muted);">28 routines • Core & Abs</div>
              </div>
            </div>

            <div onclick="window.app.filterWorkouts('HIIT')" style="cursor: pointer; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 14px; display: flex; align-items: center; gap: 12px; transition: all 0.2s ease;">
              <div style="width: 40px; height: 40px; border-radius: 10px; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                <i class="fa-solid fa-fire"></i>
              </div>
              <div>
                <div style="font-size: 13px; font-weight: 800; color: var(--text-main);">HIIT Fat Burn</div>
                <div style="font-size: 11px; color: var(--text-muted);">24 routines • High Calorie</div>
              </div>
            </div>

            <div onclick="window.app.filterWorkouts('Strength')" style="cursor: pointer; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 14px; display: flex; align-items: center; gap: 12px; transition: all 0.2s ease;">
              <div style="width: 40px; height: 40px; border-radius: 10px; background: #e0e7ff; color: #4338ca; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                <i class="fa-solid fa-dumbbell"></i>
              </div>
              <div>
                <div style="font-size: 13px; font-weight: 800; color: var(--text-main);">Strength & Tone</div>
                <div style="font-size: 11px; color: var(--text-muted);">25 routines • Full Body</div>
              </div>
            </div>

            <div onclick="window.app.filterWorkouts('Mobility')" style="cursor: pointer; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 14px; display: flex; align-items: center; gap: 12px; transition: all 0.2s ease;">
              <div style="width: 40px; height: 40px; border-radius: 10px; background: #dcfce7; color: #16a34a; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                <i class="fa-solid fa-spa"></i>
              </div>
              <div>
                <div style="font-size: 13px; font-weight: 800; color: var(--text-main);">Mobility & Stretch</div>
                <div style="font-size: 11px; color: var(--text-muted);">20 routines • Flexibility</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Filter Controls Bar -->
        <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 14px;">
          <!-- Category Pills -->
          <div style="display: flex; gap: 8px; flex-wrap: wrap;" id="workoutCatFilters">
            ${["all", "Pilates & Core", "HIIT", "Strength", "Mobility", "Cardio", "Yoga", "Flexibility"].map(cat => `
              <button class="btn-secondary ${category.toLowerCase() === cat.toLowerCase() ? 'active' : ''}" style="${category.toLowerCase() === cat.toLowerCase() ? 'background: var(--primary); color: white; border-color: var(--primary);' : ''}" onclick="window.app.filterWorkouts('${cat}')">
                ${cat === "all" ? "All Routines" : cat}
              </button>
            `).join("")}
          </div>

          <!-- Search input -->
          <div style="position: relative; min-width: 260px;">
            <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 12px; top: 12px; color: var(--text-muted);"></i>
            <input type="text" id="workoutSearch" placeholder="Search exercises, muscles..." style="width: 100%; padding: 10px 12px 10px 36px; border-radius: 999px; border: 1px solid var(--border); background: var(--bg-surface); font-size: 13px; color: var(--text-main);" onkeyup="window.app.searchWorkouts(this.value)" />
          </div>
        </div>

        <!-- Workout Library Cards Grid (All Available Workouts Below) -->
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px;" id="workoutCardsGrid">
          ${renderWorkoutCards(workouts)}
        </div>

      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="app-card" style="text-align: center; color: var(--primary); padding: 40px;">Error: ${err.message}</div>`;
  }
}

// Generates distinct anatomical SVG pose preview for all 25 routines
export function getWorkoutPoseSvg(workoutId, workoutName = "") {
  const id = parseInt(workoutId) || 1;
  const name = workoutName.toLowerCase();

  // Color theme palette
  const p1 = "#8571FF"; // Primary violet
  const p2 = "#5D4FB3"; // Dark violet
  const p3 = "#DBD5FF"; // Light lavender
  const bgGrad = "url(#poseBgGrad)";

  // Specific pose paths and geometry for all 25 routines
  const poses = {
    1: { // Squats
      badge: "SQUAT POSE",
      muscles: "Quads & Glutes",
      svg: `
        <!-- Floor line -->
        <line x1="20" y1="140" x2="280" y2="140" stroke="${p3}" stroke-width="2" stroke-dasharray="4,4" />
        <!-- Person deep squat -->
        <circle cx="150" cy="52" r="10" fill="${p1}" />
        <!-- Spine leaning 45 deg -->
        <line x1="150" y1="62" x2="135" y2="92" stroke="${p1}" stroke-width="7" stroke-linecap="round" />
        <!-- Arms forward balance -->
        <line x1="145" y1="70" x2="185" y2="70" stroke="${p3}" stroke-width="5" stroke-linecap="round" />
        <!-- Thigh parallel to floor -->
        <line x1="135" y1="92" x2="175" y2="94" stroke="${p1}" stroke-width="7" stroke-linecap="round" />
        <!-- Shin down to foot -->
        <line x1="175" y1="94" x2="165" y2="138" stroke="${p1}" stroke-width="7" stroke-linecap="round" />
        <!-- Foot flat -->
        <line x1="155" y1="138" x2="180" y2="138" stroke="${p3}" stroke-width="6" stroke-linecap="round" />
        <!-- Movement arrows up/down -->
        <path d="M195,80 L195,110 M190,87 L195,80 L200,87 M190,103 L195,110 L200,103" stroke="#fff" stroke-width="2" fill="none" />
      `
    },
    2: { // Push Ups
      badge: "PUSH-UP POSE",
      muscles: "Chest & Triceps",
      svg: `
        <line x1="20" y1="135" x2="280" y2="135" stroke="${p3}" stroke-width="2" stroke-dasharray="4,4" />
        <circle cx="75" cy="85" r="9" fill="${p1}" />
        <!-- Straight torso horizontal -->
        <line x1="84" y1="88" x2="185" y2="105" stroke="${p1}" stroke-width="7" stroke-linecap="round" />
        <!-- Bent elbow pushing up -->
        <path d="M100,90 L115,112 L112,135" stroke="${p3}" stroke-width="5" stroke-linecap="round" fill="none" />
        <!-- Legs & feet on floor -->
        <line x1="185" y1="105" x2="235" y2="128" stroke="${p1}" stroke-width="6" stroke-linecap="round" />
        <line x1="235" y1="128" x2="242" y2="135" stroke="${p3}" stroke-width="5" stroke-linecap="round" />
        <path d="M60,95 L60,115 M56,102 L60,95 L64,102" stroke="#fff" stroke-width="2" fill="none" />
      `
    },
    3: { // Lunges
      badge: "FORWARD LUNGE",
      muscles: "Hamstrings & Core",
      svg: `
        <line x1="20" y1="140" x2="280" y2="140" stroke="${p3}" stroke-width="2" stroke-dasharray="4,4" />
        <circle cx="150" cy="46" r="9" fill="${p1}" />
        <!-- Torso upright -->
        <line x1="150" y1="55" x2="150" y2="92" stroke="${p1}" stroke-width="7" stroke-linecap="round" />
        <!-- Front thigh 90 deg -->
        <line x1="150" y1="92" x2="190" y2="94" stroke="${p1}" stroke-width="7" stroke-linecap="round" />
        <line x1="190" y1="94" x2="190" y2="138" stroke="${p1}" stroke-width="7" stroke-linecap="round" />
        <!-- Back leg hovering knee -->
        <line x1="150" y1="92" x2="115" y2="118" stroke="${p3}" stroke-width="6" stroke-linecap="round" />
        <line x1="115" y1="118" x2="85" y2="136" stroke="${p3}" stroke-width="6" stroke-linecap="round" />
      `
    },
    4: { // Plank
      badge: "FOREARM PLANK",
      muscles: "Deep Core & Abs",
      svg: `
        <line x1="20" y1="135" x2="280" y2="135" stroke="${p3}" stroke-width="2" stroke-dasharray="4,4" />
        <circle cx="70" cy="92" r="9" fill="${p1}" />
        <!-- Flat horizontal board body -->
        <line x1="78" y1="96" x2="225" y2="118" stroke="${p1}" stroke-width="7" stroke-linecap="round" />
        <!-- Forearm vertical support -->
        <line x1="95" y1="99" x2="95" y2="134" stroke="${p3}" stroke-width="5" stroke-linecap="round" />
        <line x1="95" y1="134" x2="115" y2="134" stroke="${p3}" stroke-width="5" stroke-linecap="round" />
        <!-- Toes tuck on floor -->
        <line x1="225" y1="118" x2="238" y2="134" stroke="${p1}" stroke-width="5" stroke-linecap="round" />
        <!-- Core highlight glow -->
        <circle cx="150" cy="107" r="14" fill="rgba(133,113,255,0.3)" />
      `
    },
    5: { // Jumping Jacks
      badge: "JUMPING JACKS",
      muscles: "Cardio & Full Body",
      svg: `
        <circle cx="150" cy="40" r="9" fill="${p1}" />
        <line x1="150" y1="49" x2="150" y2="90" stroke="${p1}" stroke-width="7" stroke-linecap="round" />
        <!-- Arms overhead V-shape -->
        <line x1="150" y1="56" x2="110" y2="28" stroke="${p3}" stroke-width="5" stroke-linecap="round" />
        <line x1="150" y1="56" x2="190" y2="28" stroke="${p3}" stroke-width="5" stroke-linecap="round" />
        <!-- Legs spread wide in star -->
        <line x1="150" y1="90" x2="115" y2="138" stroke="${p1}" stroke-width="6" stroke-linecap="round" />
        <line x1="150" y1="90" x2="185" y2="138" stroke="${p1}" stroke-width="6" stroke-linecap="round" />
        <!-- Energy bursts -->
        <circle cx="95" cy="20" r="3" fill="#fff" />
        <circle cx="205" cy="20" r="3" fill="#fff" />
      `
    },
    6: { // High Knees
      badge: "HIGH KNEES",
      muscles: "Hip Flexors & Heart Rate",
      svg: `
        <line x1="20" y1="140" x2="280" y2="140" stroke="${p3}" stroke-width="2" stroke-dasharray="4,4" />
        <circle cx="145" cy="44" r="9" fill="${p1}" />
        <line x1="145" y1="53" x2="145" y2="90" stroke="${p1}" stroke-width="7" stroke-linecap="round" />
        <!-- Lifted high knee at 90 deg -->
        <line x1="145" y1="90" x2="185" y2="88" stroke="${p1}" stroke-width="7" stroke-linecap="round" />
        <line x1="185" y1="88" x2="185" y2="120" stroke="${p1}" stroke-width="6" stroke-linecap="round" />
        <!-- Supporting leg straight -->
        <line x1="145" y1="90" x2="140" y2="138" stroke="${p3}" stroke-width="6" stroke-linecap="round" />
        <!-- Running arms -->
        <line x1="145" y1="62" x2="120" y2="80" stroke="${p3}" stroke-width="5" stroke-linecap="round" />
        <line x1="145" y1="62" x2="170" y2="52" stroke="${p3}" stroke-width="5" stroke-linecap="round" />
      `
    },
    7: { // Mountain Climbers
      badge: "MOUNTAIN CLIMBER",
      muscles: "Abs & Shoulder Girdle",
      svg: `
        <line x1="20" y1="135" x2="280" y2="135" stroke="${p3}" stroke-width="2" stroke-dasharray="4,4" />
        <circle cx="80" cy="75" r="9" fill="${p1}" />
        <line x1="88" y1="79" x2="180" y2="98" stroke="${p1}" stroke-width="7" stroke-linecap="round" />
        <line x1="100" y1="82" x2="100" y2="134" stroke="${p3}" stroke-width="5" stroke-linecap="round" />
        <!-- Knee driven up to chest -->
        <path d="M180,98 L140,110 L130,96" stroke="${p1}" stroke-width="6" stroke-linecap="round" fill="none" />
        <!-- Back extended leg -->
        <line x1="180" y1="98" x2="235" y2="130" stroke="${p3}" stroke-width="6" stroke-linecap="round" />
      `
    },
    8: { // Burpees
      badge: "BURPEE FLOW",
      muscles: "Full Body Explosive",
      svg: `
        <line x1="20" y1="138" x2="280" y2="138" stroke="${p3}" stroke-width="2" stroke-dasharray="4,4" />
        <!-- Squat thrust transition into jump -->
        <circle cx="160" cy="40" r="8" fill="${p1}" />
        <line x1="160" y1="48" x2="160" y2="85" stroke="${p1}" stroke-width="6" stroke-linecap="round" />
        <line x1="160" y1="56" x2="135" y2="34" stroke="${p3}" stroke-width="5" stroke-linecap="round" />
        <line x1="160" y1="56" x2="185" y2="34" stroke="${p3}" stroke-width="5" stroke-linecap="round" />
        <line x1="160" y1="85" x2="145" y2="125" stroke="${p1}" stroke-width="6" stroke-linecap="round" />
        <line x1="160" y1="85" x2="175" y2="125" stroke="${p1}" stroke-width="6" stroke-linecap="round" />
        <!-- Ground burst lines -->
        <path d="M125,130 L195,130" stroke="#fff" stroke-width="2" />
      `
    },
    9: { // Jump Squats
      badge: "JUMP SQUAT",
      muscles: "Glute Power & Calves",
      svg: `
        <line x1="20" y1="140" x2="280" y2="140" stroke="${p3}" stroke-width="2" stroke-dasharray="4,4" />
        <!-- Mid-air vertical leap -->
        <circle cx="150" cy="38" r="9" fill="${p1}" />
        <line x1="150" y1="47" x2="150" y2="82" stroke="${p1}" stroke-width="7" stroke-linecap="round" />
        <line x1="150" y1="56" x2="120" y2="70" stroke="${p3}" stroke-width="5" stroke-linecap="round" />
        <line x1="150" y1="56" x2="180" y2="70" stroke="${p3}" stroke-width="5" stroke-linecap="round" />
        <line x1="150" y1="82" x2="130" y2="114" stroke="${p1}" stroke-width="6" stroke-linecap="round" />
        <line x1="150" y1="82" x2="170" y2="114" stroke="${p1}" stroke-width="6" stroke-linecap="round" />
        <!-- Upward motion arrows -->
        <path d="M105,100 L105,65 M100,73 L105,65 L110,73" stroke="#fff" stroke-width="2" fill="none" />
        <path d="M195,100 L195,65 M190,73 L195,65 L200,73" stroke="#fff" stroke-width="2" fill="none" />
      `
    },
    10: { // Sprint Intervals
      badge: "SPRINT STRIDE",
      muscles: "Anaerobic Conditioning",
      svg: `
        <line x1="20" y1="138" x2="280" y2="138" stroke="${p3}" stroke-width="2" stroke-dasharray="4,4" />
        <circle cx="165" cy="50" r="9" fill="${p1}" />
        <!-- Forward aggressive lean -->
        <line x1="165" y1="59" x2="145" y2="92" stroke="${p1}" stroke-width="7" stroke-linecap="round" />
        <!-- Driving front knee -->
        <path d="M145,92 L180,85 L165,115" stroke="${p1}" stroke-width="6" stroke-linecap="round" fill="none" />
        <!-- Back push off -->
        <path d="M145,92 L115,115 L95,136" stroke="${p3}" stroke-width="6" stroke-linecap="round" fill="none" />
        <!-- Powerful arm swing -->
        <line x1="155" y1="68" x2="190" y2="60" stroke="${p3}" stroke-width="5" stroke-linecap="round" />
        <line x1="155" y1="68" x2="125" y2="85" stroke="${p3}" stroke-width="5" stroke-linecap="round" />
      `
    },
    11: { // Brisk Walk
      badge: "POWER WALK",
      muscles: "Cardio & Joint Health",
      svg: `
        <line x1="20" y1="138" x2="280" y2="138" stroke="${p3}" stroke-width="2" stroke-dasharray="4,4" />
        <circle cx="150" cy="46" r="9" fill="${p1}" />
        <line x1="150" y1="55" x2="150" y2="92" stroke="${p1}" stroke-width="7" stroke-linecap="round" />
        <line x1="150" y1="92" x2="175" y2="136" stroke="${p1}" stroke-width="6" stroke-linecap="round" />
        <line x1="150" y1="92" x2="125" y2="136" stroke="${p3}" stroke-width="6" stroke-linecap="round" />
        <line x1="150" y1="64" x2="130" y2="84" stroke="${p3}" stroke-width="5" stroke-linecap="round" />
        <line x1="150" y1="64" x2="170" y2="84" stroke="${p3}" stroke-width="5" stroke-linecap="round" />
      `
    },
    12: { // Steady Run
      badge: "AEROBIC RUN",
      muscles: "Endurance & Stamina",
      svg: `
        <line x1="20" y1="138" x2="280" y2="138" stroke="${p3}" stroke-width="2" stroke-dasharray="4,4" />
        <circle cx="155" cy="46" r="9" fill="${p1}" />
        <line x1="155" y1="55" x2="148" y2="92" stroke="${p1}" stroke-width="7" stroke-linecap="round" />
        <path d="M148,92 L175,98 L160,136" stroke="${p1}" stroke-width="6" stroke-linecap="round" fill="none" />
        <path d="M148,92 L125,110 L105,125" stroke="${p3}" stroke-width="6" stroke-linecap="round" fill="none" />
        <line x1="152" y1="65" x2="178" y2="60" stroke="${p3}" stroke-width="5" stroke-linecap="round" />
        <line x1="152" y1="65" x2="130" y2="80" stroke="${p3}" stroke-width="5" stroke-linecap="round" />
      `
    },
    13: { // Cycling
      badge: "CYCLING CADENCE",
      muscles: "Quads & Hamstrings",
      svg: `
        <circle cx="85" cy="115" r="22" stroke="${p3}" stroke-width="3" fill="none" />
        <circle cx="195" cy="115" r="22" stroke="${p3}" stroke-width="3" fill="none" />
        <circle cx="140" cy="52" r="8" fill="${p1}" />
        <line x1="140" y1="60" x2="125" y2="90" stroke="${p1}" stroke-width="6" stroke-linecap="round" />
        <line x1="135" y1="68" x2="175" y2="85" stroke="${p3}" stroke-width="5" stroke-linecap="round" />
        <path d="M125,90 L140,115 L125,128" stroke="${p1}" stroke-width="5" stroke-linecap="round" fill="none" />
      `
    },
    14: { // Yoga Flow
      badge: "WARRIOR II POSE",
      muscles: "Balance & Core",
      svg: `
        <line x1="20" y1="138" x2="280" y2="138" stroke="${p3}" stroke-width="2" stroke-dasharray="4,4" />
        <circle cx="150" cy="46" r="9" fill="${p1}" />
        <line x1="150" y1="55" x2="150" y2="92" stroke="${p1}" stroke-width="7" stroke-linecap="round" />
        <!-- Outstretched arms parallel to floor -->
        <line x1="95" y1="65" x2="205" y2="65" stroke="${p3}" stroke-width="5" stroke-linecap="round" />
        <!-- Lunge bend front knee -->
        <line x1="150" y1="92" x2="190" y2="98" stroke="${p1}" stroke-width="7" stroke-linecap="round" />
        <line x1="190" y1="98" x2="190" y2="136" stroke="${p1}" stroke-width="7" stroke-linecap="round" />
        <!-- Straight back leg -->
        <line x1="150" y1="92" x2="105" y2="136" stroke="${p3}" stroke-width="6" stroke-linecap="round" />
      `
    },
    15: { // Stretching
      badge: "SEATED HAMSTRING",
      muscles: "Flexibility & Spine",
      svg: `
        <line x1="20" y1="136" x2="280" y2="136" stroke="${p3}" stroke-width="2" stroke-dasharray="4,4" />
        <circle cx="95" cy="85" r="9" fill="${p1}" />
        <!-- Spine reaching toward toes -->
        <line x1="95" y1="94" x2="140" y2="105" stroke="${p1}" stroke-width="7" stroke-linecap="round" />
        <!-- Legs straight forward on floor -->
        <line x1="95" y1="130" x2="210" y2="130" stroke="${p1}" stroke-width="7" stroke-linecap="round" />
        <!-- Hands grasping towards feet -->
        <line x1="115" y1="98" x2="190" y2="122" stroke="${p3}" stroke-width="5" stroke-linecap="round" />
      `
    },
    16: { // Wall Pilates Core & Posture
      badge: "WALL PILATES",
      muscles: "Transverse Abs & Posture",
      svg: `
        <!-- Vertical wall line -->
        <line x1="70" y1="30" x2="70" y2="140" stroke="${p1}" stroke-width="4" />
        <line x1="20" y1="140" x2="280" y2="140" stroke="${p3}" stroke-width="2" stroke-dasharray="4,4" />
        <circle cx="85" cy="55" r="9" fill="${p1}" />
        <!-- Back pressed to wall -->
        <line x1="82" y1="64" x2="82" y2="98" stroke="${p1}" stroke-width="7" stroke-linecap="round" />
        <!-- Wall sit 90 deg thigh -->
        <line x1="82" y1="98" x2="130" y2="98" stroke="${p1}" stroke-width="7" stroke-linecap="round" />
        <line x1="130" y1="98" x2="130" y2="138" stroke="${p1}" stroke-width="7" stroke-linecap="round" />
        <line x1="85" y1="75" x2="125" y2="75" stroke="${p3}" stroke-width="5" stroke-linecap="round" />
      `
    },
    17: { // 10-Min Fast Calorie Torch HIIT
      badge: "SKATER JUMP HIIT",
      muscles: "Cardio & Lateral Glutes",
      svg: `
        <line x1="20" y1="138" x2="280" y2="138" stroke="${p3}" stroke-width="2" stroke-dasharray="4,4" />
        <circle cx="140" cy="50" r="9" fill="${p1}" />
        <line x1="140" y1="59" x2="130" y2="95" stroke="${p1}" stroke-width="7" stroke-linecap="round" />
        <!-- Lateral skater bent leg -->
        <path d="M130,95 L145,115 L140,136" stroke="${p1}" stroke-width="6" stroke-linecap="round" fill="none" />
        <!-- Trailing crossed leg behind -->
        <path d="M130,95 L95,118 L85,134" stroke="${p3}" stroke-width="6" stroke-linecap="round" fill="none" />
        <line x1="135" y1="68" x2="175" y2="75" stroke="${p3}" stroke-width="5" stroke-linecap="round" />
      `
    },
    18: { // Dumbbell Full Body Hypertrophy
      badge: "DUMBBELL THRUSTER",
      muscles: "Deltoids & Quads",
      svg: `
        <line x1="20" y1="140" x2="280" y2="140" stroke="${p3}" stroke-width="2" stroke-dasharray="4,4" />
        <circle cx="150" cy="46" r="9" fill="${p1}" />
        <line x1="150" y1="55" x2="150" y2="92" stroke="${p1}" stroke-width="7" stroke-linecap="round" />
        <line x1="150" y1="92" x2="135" y2="138" stroke="${p1}" stroke-width="6" stroke-linecap="round" />
        <line x1="150" y1="92" x2="165" y2="138" stroke="${p1}" stroke-width="6" stroke-linecap="round" />
        <!-- Arms overhead holding dumbbells -->
        <line x1="150" y1="62" x2="125" y2="35" stroke="${p3}" stroke-width="5" stroke-linecap="round" />
        <line x1="150" y1="62" x2="175" y2="35" stroke="${p3}" stroke-width="5" stroke-linecap="round" />
        <!-- Dumbbells -->
        <rect x="115" y="30" width="18" height="8" rx="2" fill="#fff" />
        <rect x="167" y="30" width="18" height="8" rx="2" fill="#fff" />
      `
    },
    19: { // Somatic Reset & Nervous System De-stress
      badge: "REST & RESET",
      muscles: "Vagus Nerve & Diaphragm",
      svg: `
        <line x1="20" y1="135" x2="280" y2="135" stroke="${p3}" stroke-width="2" stroke-dasharray="4,4" />
        <!-- Reclined restorative pose on floor -->
        <circle cx="85" cy="122" r="9" fill="${p1}" />
        <line x1="94" y1="126" x2="180" y2="128" stroke="${p1}" stroke-width="7" stroke-linecap="round" />
        <!-- Butterfly bent knees -->
        <path d="M180,128 L195,108 L220,132" stroke="${p1}" stroke-width="6" stroke-linecap="round" fill="none" />
        <!-- Hand on chest/belly -->
        <path d="M125,126 L140,112 L148,124" stroke="${p3}" stroke-width="4" stroke-linecap="round" fill="none" />
        <!-- Calm breathing ripples -->
        <circle cx="140" cy="98" r="8" stroke="${p3}" stroke-width="1.5" fill="none" opacity="0.6" />
        <circle cx="140" cy="98" r="14" stroke="${p3}" stroke-width="1" fill="none" opacity="0.3" />
      `
    },
    20: { // Glute & Leg Sculpt Blast
      badge: "DONKEY KICK BLAST",
      muscles: "Gluteus Maximus & Core",
      svg: `
        <line x1="20" y1="136" x2="280" y2="136" stroke="${p3}" stroke-width="2" stroke-dasharray="4,4" />
        <!-- Quadruped hands and knees -->
        <circle cx="95" cy="85" r="9" fill="${p1}" />
        <line x1="102" y1="92" x2="165" y2="95" stroke="${p1}" stroke-width="7" stroke-linecap="round" />
        <line x1="115" y1="95" x2="115" y2="134" stroke="${p3}" stroke-width="5" stroke-linecap="round" />
        <!-- Ground supporting knee -->
        <line x1="165" y1="95" x2="165" y2="134" stroke="${p3}" stroke-width="5" stroke-linecap="round" />
        <!-- Elevated glute donkey kick leg -->
        <path d="M165,95 L195,80 L195,55" stroke="${p1}" stroke-width="6" stroke-linecap="round" fill="none" />
      `
    },
    21: { // Bedtime Deep Rest & Mobility Stretch
      badge: "CHILD'S POSE",
      muscles: "Spinal Decompression",
      svg: `
        <line x1="20" y1="136" x2="280" y2="136" stroke="${p3}" stroke-width="2" stroke-dasharray="4,4" />
        <!-- Child's pose hips back, head down -->
        <circle cx="145" cy="115" r="8" fill="${p1}" />
        <!-- Hips sitting on heels -->
        <path d="M85,132 L95,110 L140,118" stroke="${p1}" stroke-width="7" stroke-linecap="round" fill="none" />
        <!-- Extended arms forward on mat -->
        <line x1="135" y1="118" x2="215" y2="134" stroke="${p3}" stroke-width="5" stroke-linecap="round" />
      `
    },
    22: { // Desk Worker Posture & Neck Relief
      badge: "POSTURE CORRECTION",
      muscles: "Cervical Spine & Rhomboids",
      svg: `
        <circle cx="150" cy="48" r="9" fill="${p1}" />
        <!-- Perfect upright alignment spine -->
        <line x1="150" y1="57" x2="150" y2="105" stroke="${p1}" stroke-width="7" stroke-linecap="round" />
        <!-- Retracted shoulder blades, hands behind head -->
        <path d="M125,58 L142,50" stroke="${p3}" stroke-width="5" stroke-linecap="round" />
        <path d="M175,58 L158,50" stroke="${p3}" stroke-width="5" stroke-linecap="round" />
        <!-- Seated base -->
        <line x1="120" y1="130" x2="180" y2="130" stroke="${p3}" stroke-width="6" stroke-linecap="round" />
      `
    },
    23: { // Cardio Walking Fat Melt
      badge: "POWER STRIDE",
      muscles: "Fat Oxidation & Aerobics",
      svg: `
        <line x1="20" y1="138" x2="280" y2="138" stroke="${p3}" stroke-width="2" stroke-dasharray="4,4" />
        <circle cx="150" cy="45" r="9" fill="${p1}" />
        <line x1="150" y1="54" x2="148" y2="92" stroke="${p1}" stroke-width="7" stroke-linecap="round" />
        <line x1="148" y1="92" x2="180" y2="136" stroke="${p1}" stroke-width="6" stroke-linecap="round" />
        <line x1="148" y1="92" x2="120" y2="136" stroke="${p3}" stroke-width="6" stroke-linecap="round" />
        <line x1="150" y1="65" x2="125" y2="82" stroke="${p3}" stroke-width="5" stroke-linecap="round" />
        <line x1="150" y1="65" x2="175" y2="82" stroke="${p3}" stroke-width="5" stroke-linecap="round" />
      `
    },
    24: { // Morning Sun Salutation Yoga Flow
      badge: "SUN SALUTATION",
      muscles: "Spinal Wave & Hip Opening",
      svg: `
        <line x1="20" y1="136" x2="280" y2="136" stroke="${p3}" stroke-width="2" stroke-dasharray="4,4" />
        <!-- Sun glow in background -->
        <circle cx="210" cy="45" r="18" fill="rgba(255, 215, 0, 0.2)" />
        <circle cx="110" cy="72" r="9" fill="${p1}" />
        <!-- Upward Cobra arch -->
        <path d="M110,81 Q145,95 210,132" stroke="${p1}" stroke-width="7" stroke-linecap="round" fill="none" />
        <!-- Arms vertical pushing up from floor -->
        <line x1="125" y1="95" x2="125" y2="134" stroke="${p3}" stroke-width="5" stroke-linecap="round" />
      `
    },
    25: { // Advanced Calisthenics Upper Body Shred
      badge: "CALISTHENICS HOLD",
      muscles: "Lats, Biceps & Core",
      svg: `
        <!-- Pullup bar overhead -->
        <line x1="60" y1="28" x2="240" y2="28" stroke="#fff" stroke-width="4" />
        <circle cx="150" cy="52" r="9" fill="${p1}" />
        <!-- Arms gripping bar -->
        <line x1="150" y1="58" x2="125" y2="30" stroke="${p3}" stroke-width="5" stroke-linecap="round" />
        <line x1="150" y1="58" x2="175" y2="30" stroke="${p3}" stroke-width="5" stroke-linecap="round" />
        <!-- Suspended athletic hollow body -->
        <line x1="150" y1="61" x2="150" y2="105" stroke="${p1}" stroke-width="7" stroke-linecap="round" />
        <line x1="150" y1="105" x2="155" y2="140" stroke="${p1}" stroke-width="6" stroke-linecap="round" />
      `
    }
  };

  const pose = poses[id] || poses[1];

  return `
    <svg viewBox="0 0 300 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display: block; border-radius: 12px; background: linear-gradient(135deg, #181530 0%, #292257 100%);">
      <defs>
        <linearGradient id="poseBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#181530" />
          <stop offset="100%" stop-color="#2a225a" />
        </linearGradient>
      </defs>
      
      <!-- Pose Graphic -->
      ${pose.svg}

      <!-- Top Overlay Tag -->
      <g transform="translate(14, 14)">
        <rect x="0" y="0" width="115" height="22" rx="11" fill="rgba(133, 113, 255, 0.3)" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
        <text x="57" y="15" fill="#ffffff" font-size="9" font-weight="800" text-anchor="middle" letter-spacing="0.5" font-family="Inter, sans-serif">${pose.badge}</text>
      </g>

      <!-- Bottom Target Tag -->
      <g transform="translate(14, 130)">
        <text x="0" y="16" fill="${p3}" font-size="10" font-weight="700" font-family="Inter, sans-serif">${pose.muscles}</text>
      </g>
    </svg>
  `;
}

function renderWorkoutCards(workouts) {
  if (workouts.length === 0) {
    return `<div style="grid-column: 1/-1; text-align: center; padding: 48px; color: var(--text-muted);">No workouts found matching your filter criteria.</div>`;
  }

  return workouts.map(w => {
    const poseSvg = getWorkoutPoseSvg(w.id, w.name);
    return `
      <div class="app-card" style="display: flex; flex-direction: column; justify-content: space-between; transition: transform 0.2s ease;">
        <div>
          <!-- Distinct Anatomical Pose Preview for this Routine -->
          <div style="height: 165px; position: relative; overflow: hidden; border-radius: var(--radius-md); margin-bottom: 14px; box-shadow: 0 4px 14px rgba(0,0,0,0.15);">
            ${poseSvg}
            <div style="position: absolute; bottom: 8px; right: 10px; background: rgba(0,0,0,0.65); backdrop-filter: blur(4px); color: white; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 700;">
              <i class="fa-solid fa-circle-play" style="color: var(--primary);"></i> Live Demonstrator
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
            <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--primary-hover); background: var(--primary-light); padding: 4px 10px; border-radius: 999px;">
              ${w.category}
            </span>
            <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); background: var(--border-light); padding: 4px 8px; border-radius: var(--radius-sm);">
              ${w.difficulty}
            </span>
          </div>

          <h3 style="font-size: 17px; font-weight: 900; margin-bottom: 6px; color: var(--text-main);">${w.name}</h3>
          <p style="font-size: 13px; color: var(--text-muted); line-height: 1.4; margin-bottom: 14px;">${w.description || "Science-backed routine with targeted muscular activation."}</p>

          <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px;">
            <span style="font-size: 11px; font-weight: 700; color: var(--primary-hover); background: var(--primary-light); padding: 4px 8px; border-radius: var(--radius-sm);">
              <i class="fa-solid fa-clock"></i> ${w.duration_min} min
            </span>
            <span style="font-size: 11px; font-weight: 700; color: var(--primary-hover); background: var(--primary-light); padding: 4px 8px; border-radius: var(--radius-sm);">
              <i class="fa-solid fa-fire"></i> ~${Math.round(w.duration_min * (w.cal_per_minute || 6))} kcal
            </span>
            <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); background: var(--border-light); padding: 4px 8px; border-radius: var(--radius-sm);">
              <i class="fa-solid fa-dumbbell"></i> ${w.equipment_needed}
            </span>
          </div>
        </div>

        <!-- Button explicitly says "View" -->
        <button class="btn-primary" style="width: 100%; justify-content: center; font-weight: 800;" onclick="window.app.startWorkout(${w.id})">
          <i class="fa-solid fa-eye"></i> View
        </button>
      </div>
    `;
  }).join("");
}

export async function openWorkoutStudio(workoutId) {
  const modal = document.getElementById("workoutPlayerModal");
  if (!modal) return;

  modal.innerHTML = `
    <div class="modal-card" style="max-width: 500px; text-align: center; padding: 40px;">
      <i class="fa-solid fa-spinner fa-spin" style="font-size: 32px; color: var(--primary);"></i>
      <div style="margin-top: 14px; font-weight: 700; color: var(--text-muted);">Calibrating Workout Studio...</div>
    </div>
  `;
  modal.classList.add("open");

  try {
    const res = await api.get(`/api/workouts/${workoutId}`);
    const w = res.workout;
    activeWorkoutData = w;

    const steps = (w.exercise_steps && w.exercise_steps.length > 0) ? w.exercise_steps : [
      { name: "Active Dynamic Warm-Up", duration_sec: 25, reps: "10 reps", form: "Mobilize joints with gentle circular motions.", cues: "Stay loose and breathe deeply.", sets: 3 },
      { name: "Primary Movement Focus", duration_sec: 30, reps: "12 reps", form: "Perform the primary exercise movement with steady cadence.", cues: "Maintain braced core and aligned spine.", sets: 3 },
      { name: "Metabolic Conditioning Burst", duration_sec: 25, reps: "15 reps", form: "Increase tempo to elevate cardiovascular demand.", cues: "Push through heels, keep posture tall.", sets: 3 },
      { name: "Cool-down & Recovery Stretch", duration_sec: 20, reps: "5 deep breaths", form: "Extend muscles and breathe deeply to downregulate heart rate.", cues: "Relax shoulders and lengthen spine.", sets: 2 }
    ];

    activeWorkoutData.exercise_steps = steps;
    totalWorkoutSets = parseInt(w.default_sets || w.sets || steps[0]?.sets || 3, 10);
    currentSetIndex = 0;
    currentExerciseIndex = 0;
    elapsedSeconds = 0;
    caloriesBurned = 0;
    stepSecondsRemaining = steps[0].duration_sec || 25;

    // Open in paused/ready state - user clicks Start Workout
    isTimerRunning = false;
    clearInterval(currentWorkoutTimer);

    renderDesktopStudioUI(modal, w, steps);

  } catch (err) {
    showToast(err.message, "error");
  }
}

export function renderSetBadgesHtml(totalSets, activeSetIdx) {
  let html = "";
  for (let s = 0; s < totalSets; s++) {
    const isCompleted = s < activeSetIdx;
    const isActive = s === activeSetIdx;
    const bg = isActive ? "var(--primary)" : (isCompleted ? "rgba(34, 197, 94, 0.15)" : "var(--bg-card)");
    const color = isActive ? "#ffffff" : (isCompleted ? "#22c55e" : "var(--text-muted)");
    const border = isActive ? "var(--primary)" : (isCompleted ? "#22c55e" : "var(--border)");
    const icon = isCompleted ? '<i class="fa-solid fa-check" style="font-size: 10px;"></i> ' : (isActive ? '<i class="fa-solid fa-play" style="font-size: 8px; margin-right: 3px;"></i> ' : '');
    html += `
      <button onclick="window.app.switchWorkoutSet(${s})" title="Switch to Set ${s + 1}" style="flex: 1; padding: 7px 4px; border-radius: 10px; font-size: 11px; font-weight: 800; border: 1.5px solid ${border}; background: ${bg}; color: ${color}; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; gap: 3px;">
        ${icon}Set ${s + 1}
      </button>
    `;
  }
  return html;
}

function renderDesktopStudioUI(modal, w, steps) {
  const currentStep = steps[currentExerciseIndex] || steps[0];

  modal.innerHTML = `
    <!-- BetterMe-Inspired Clean Studio Container (Spacious 940px 2-column layout) -->
    <div class="modal-card" style="max-width: 940px; width: 94vw; padding: 0; overflow: hidden; border-radius: 24px; background: var(--bg-card); border: 1px solid var(--border); box-shadow: 0 25px 60px rgba(0,0,0,0.25);">
      
      <div style="display: grid; grid-template-columns: 1.15fr 0.85fr; min-height: 540px;">
        
        <!-- LEFT COLUMN: Clean Full-Bleed Video Demonstrator & Comprehensive Coaching Details -->
        <div style="background: #0d0a1e; display: flex; flex-direction: column; overflow: hidden; border-right: 1px solid var(--border);">
          
          <!-- Demonstrator Video Area: 100% Clean, NO OVERLAYS, NO COVERING BADGES -->
          <div style="position: relative; width: 100%; height: 370px; background: #000000; overflow: hidden; display: flex; align-items: center; justify-content: center;">
            <video id="studioTrainerVideo" 
                 src="/static/assets/trainer/${getTrainerVideoForExercise(currentStep.name, w.category, w.name)}" 
                 poster="/static/assets/trainer/${getTrainerImageForExercise(currentStep.name, w.category, w.name)}" 
                 autoplay loop muted playsinline 
                 style="width: 100%; height: 100%; object-fit: cover; object-position: center; transition: opacity 0.25s ease-in-out;">
            </video>
          </div>

          <!-- BetterMe-Style Actionable Coaching Card matching Video & Workout -->
          <div style="padding: 18px 22px; background: var(--bg-card); flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <h3 id="studioExerciseTitle" style="font-size: 19px; font-weight: 900; color: var(--text-main); margin: 0; letter-spacing: -0.2px;">
                ${currentStep.name}
              </h3>
              <span id="studioExerciseReps" style="font-size: 12px; font-weight: 800; color: var(--primary); background: var(--primary-light); padding: 3px 10px; border-radius: 999px;">
                ${currentStep.reps || "10-12 reps"}
              </span>
            </div>

            <!-- Dynamic Exercise & Set Indicator -->
            <div id="studioExerciseSubtitle" style="font-size: 12px; color: var(--text-muted); font-weight: 700;">
              Exercise ${currentExerciseIndex + 1} of ${steps.length} • Set ${currentSetIndex + 1} of ${totalWorkoutSets}
            </div>

            <!-- Detailed Movement Execution Guide -->
            <div style="background: var(--border-light); border: 1px solid var(--border); border-radius: 12px; padding: 10px 14px; font-size: 12px; color: var(--text-main); display: flex; align-items: flex-start; gap: 9px;">
              <i class="fa-solid fa-person-running" style="color: var(--primary); margin-top: 2px; font-size: 13px;"></i>
              <div style="line-height: 1.45;">
                <span style="font-weight: 800; color: var(--text-main); display: inline-block; margin-right: 4px;">Form:</span>
                <span id="studioExecutionForm">${currentStep.form || currentStep.description || "Maintain smooth controlled form throughout the movement."}</span>
              </div>
            </div>

            <!-- Actionable Form Coaching Cue & Breathing Guide -->
            <div id="studioCoachingCues" style="display: flex; flex-direction: column; gap: 4px; background: rgba(133, 113, 255, 0.08); border: 1px dashed var(--primary); border-radius: 12px; padding: 9px 13px; font-size: 11px; color: var(--text-main);">
              <div style="display: flex; align-items: center; gap: 6px;">
                <i class="fa-solid fa-bullseye" style="color: var(--primary);"></i>
                <span id="studioKeyCue"><strong>Coach Cue:</strong> ${currentStep.cues || "Focus on mind-muscle connection and controlled posture."}</span>
              </div>
              <div id="studioBreathingRow" style="display: ${currentStep.breathing ? 'flex' : 'none'}; align-items: center; gap: 6px; color: var(--text-muted);">
                <i class="fa-solid fa-wind" style="color: #06b6d4;"></i>
                <span id="studioBreathingCue"><strong>Breathing:</strong> ${currentStep.breathing || ""}</span>
              </div>
            </div>
          </div>

        </div>

        <!-- RIGHT COLUMN: Multi-Set Selector, Sequence Playlist, Stopwatch & Controls -->
        <div style="padding: 24px; display: flex; flex-direction: column; justify-content: space-between; background: var(--bg-surface);">
          <div>
            <!-- Header with Category & Close button -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px;">
              <div>
                <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--primary); background: var(--primary-light); padding: 4px 10px; border-radius: 999px; letter-spacing: 0.6px;">
                  ${w.category}
                </span>
                <h3 style="font-size: 19px; font-weight: 900; color: var(--text-main); margin: 6px 0 0 0; letter-spacing: -0.3px;">${w.name}</h3>
              </div>

              <!-- Top-right Close Button -->
              <button onclick="window.app.closeWorkoutPlayer()" title="Exit Studio" style="background: var(--border-light); border: none; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-main); font-size: 14px; transition: opacity 0.2s;">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>

            <!-- Multi-Set Progression Selector -->
            <div style="margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.5px;">
                  Workout Sets
                </span>
                <span style="font-size: 11px; font-weight: 800; color: var(--primary);" id="studioActiveSetLabel">
                  Set ${currentSetIndex + 1} of ${totalWorkoutSets}
                </span>
              </div>
              <div style="display: flex; gap: 6px;" id="studioSetBadges">
                ${renderSetBadgesHtml(totalWorkoutSets, currentSetIndex)}
              </div>
            </div>

            <!-- Exercises Playlist Sequence (Clickable) -->
            <div style="margin-bottom: 14px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.5px;">
                  Exercise Sequence
                </span>
                <span style="font-size: 11px; font-weight: 700; color: var(--text-muted);" id="studioSequenceStepCounter">
                  Exercise ${currentExerciseIndex + 1} of ${steps.length}
                </span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 6px; max-height: 170px; overflow-y: auto;" id="studioPlaylist">
                ${steps.map((s, idx) => `
                  <div onclick="window.app.selectExerciseIndex(${idx})" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-radius: 12px; border: 1.5px solid ${idx === currentExerciseIndex ? 'var(--primary)' : 'var(--border)'}; background: ${idx === currentExerciseIndex ? 'var(--primary-light)' : 'var(--bg-card)'}; cursor: pointer; transition: all 0.2s ease;">
                    <div style="display: flex; align-items: center; gap: 9px;">
                      <span style="font-size: 11px; font-weight: 800; width: 22px; height: 22px; border-radius: 50%; background: ${idx === currentExerciseIndex ? 'var(--primary)' : 'var(--border-light)'}; color: ${idx === currentExerciseIndex ? 'white' : 'var(--text-muted)'}; display: flex; align-items: center; justify-content: center;">
                        ${idx + 1}
                      </span>
                      <span style="font-size: 12px; font-weight: 700; color: var(--text-main);">${s.name}</span>
                    </div>
                    <span style="font-size: 11px; color: var(--text-muted); font-weight: 600;">0:${String(s.duration_sec || 45).padStart(2, '0')}</span>
                  </div>
                `).join("")}
              </div>
            </div>

            <!-- Single Clean Stopwatch Display -->
            <div style="background: var(--border-light); border-radius: 16px; padding: 14px; text-align: center; margin-bottom: 14px; border: 1px solid var(--border);">
              <div style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: var(--primary); letter-spacing: 1px;" id="studioTimerStatus">
                READY TO BEGIN
              </div>
              <div style="font-size: 46px; font-weight: 900; color: var(--text-main); font-variant-numeric: tabular-nums; line-height: 1.1; margin: 2px 0;" id="studioSingleTimer">
                ${formatCountdown(stepSecondsRemaining)}
              </div>
              <div style="font-size: 12px; color: var(--text-muted); font-weight: 700;" id="studioCalCount">
                Elapsed: 00:00 • ~0 kcal burned
              </div>
            </div>
          </div>

          <!-- Bottom Action Buttons: PREV, Start/Pause Workout, NEXT, Finish -->
          <div>
            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
              <button class="btn-secondary" style="flex: 1; justify-content: center; font-size: 13px; font-weight: 800; border-radius: 12px; padding: 11px;" onclick="window.app.prevExercise()">
                <i class="fa-solid fa-backward-step"></i> PREV
              </button>
              
              <!-- Prominent Start / Pause / Resume Workout button -->
              <button class="btn-primary" id="studioStartPauseBtn" style="flex: 2; justify-content: center; font-size: 14px; font-weight: 900; border-radius: 12px; padding: 11px;" onclick="window.app.toggleStudioTimer()">
                <i class="fa-solid fa-play"></i> Start Workout
              </button>

              <button class="btn-secondary" style="flex: 1; justify-content: center; font-size: 13px; font-weight: 800; border-radius: 12px; padding: 11px;" onclick="window.app.nextExercise()">
                NEXT <i class="fa-solid fa-forward-step"></i>
              </button>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
              <button class="btn-secondary" id="calmingMusicToggle" onclick="window.app.toggleCalmingMusic()" style="font-size: 11px; padding: 6px 14px; border-radius: 999px;">
                <i class="fa-solid fa-music"></i> Audio Music
              </button>
              
              <!-- Dynamic Finish & Log: Records actual training time and actual calories burned -->
              <button class="btn-secondary" style="font-size: 11px; padding: 6px 16px; border-radius: 999px; border-color: var(--primary); color: var(--primary); font-weight: 800;" onclick="window.app.completeWorkoutSession()">
                <i class="fa-solid fa-check"></i> Finish & Log
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  `;
}

export function toggleTrainerMediaMode() {
  const vid = document.getElementById("studioTrainerVideo");
  if (!vid) return;
  if (vid.paused) {
    vid.play().catch(() => {});
  } else {
    vid.pause();
  }
}

export function toggleStudioTimer() {
  const btn = document.getElementById("studioStartPauseBtn");
  const statusEl = document.getElementById("studioTimerStatus");
  const videoEl = document.getElementById("studioTrainerVideo");

  if (isTimerRunning) {
    isTimerRunning = false;
    clearInterval(currentWorkoutTimer);
    if (btn) btn.innerHTML = `<i class="fa-solid fa-play"></i> Resume Workout`;
    if (statusEl) statusEl.innerText = "PAUSED";
    if (videoEl && !videoEl.paused) {
      try { videoEl.pause(); } catch (e) {}
    }
  } else {
    isTimerRunning = true;
    try { sound.playClick(); } catch (e) {}
    if (btn) btn.innerHTML = `<i class="fa-solid fa-pause"></i> Pause`;
    if (statusEl) statusEl.innerText = "IN PROGRESS";
    if (videoEl && videoEl.paused) {
      videoEl.play().catch(() => {});
    }
    runTimerInterval();
  }
}

function runTimerInterval() {
  clearInterval(currentWorkoutTimer);
  const w = activeWorkoutData;
  if (!w) return;
  const calPerSec = (w.cal_per_minute || 8.5) / 60;
  const steps = w.exercise_steps || [];

  currentWorkoutTimer = setInterval(() => {
    if (!isTimerRunning) return;

    elapsedSeconds++;
    caloriesBurned = Math.round(elapsedSeconds * calPerSec);

    if (stepSecondsRemaining > 0) {
      stepSecondsRemaining--;
    } else {
      // Step countdown finished
      try { sound.playBeep(880, 0.12); } catch (e) {}

      if (currentExerciseIndex < steps.length - 1) {
        // Next exercise in the current set
        currentExerciseIndex++;
        updateStepView();
      } else {
        // Last exercise in current set finished!
        if (currentSetIndex < totalWorkoutSets - 1) {
          // Advance to the next set!
          currentSetIndex++;
          currentExerciseIndex = 0;
          try { sound.playClick(); } catch (e) {}
          showToast(`Set ${currentSetIndex} finished! Starting Set ${currentSetIndex + 1} of ${totalWorkoutSets}!`, "info");
          updateStepView();
        } else {
          // ONLY when duration completed for ALL sets: routine fully complete!
          clearInterval(currentWorkoutTimer);
          isTimerRunning = false;
          try { sound.playVictory(); } catch (e) {}
          const actualDurationMin = Math.max(Math.round(elapsedSeconds / 60), 1);
          const totalExercises = totalWorkoutSets * steps.length;
          finishWorkoutSession(w.id, w.name, actualDurationMin, caloriesBurned, totalExercises, true);
          return;
        }
      }
    }

    if (stepSecondsRemaining <= 3 && stepSecondsRemaining > 0) {
      try { sound.playBeep(440, 0.08); } catch (e) {}
    }

    const timerEl = document.getElementById("studioSingleTimer");
    const calEl = document.getElementById("studioCalCount");

    if (timerEl) timerEl.innerText = formatCountdown(stepSecondsRemaining);
    if (calEl) calEl.innerText = `Elapsed: ${formatTime(elapsedSeconds)} • ~${Math.max(caloriesBurned, 1)} kcal burned`;

  }, 1000);
}

export function switchWorkoutSet(setIdx) {
  if (!activeWorkoutData || !activeWorkoutData.exercise_steps) return;
  if (setIdx >= 0 && setIdx < totalWorkoutSets) {
    currentSetIndex = setIdx;
    currentExerciseIndex = 0;
    try { sound.playClick(); } catch (e) {}
    showToast(`Switched to Set ${currentSetIndex + 1} of ${totalWorkoutSets}`, "info");
    updateStepView();
  }
}

export function nextExercise() {
  if (!activeWorkoutData || !activeWorkoutData.exercise_steps) return;
  const steps = activeWorkoutData.exercise_steps;
  if (currentExerciseIndex < steps.length - 1) {
    currentExerciseIndex++;
    try { sound.playClick(); } catch (e) {}
    updateStepView();
  } else if (currentSetIndex < totalWorkoutSets - 1) {
    currentSetIndex++;
    currentExerciseIndex = 0;
    try { sound.playClick(); } catch (e) {}
    showToast(`Set ${currentSetIndex} finished! Switched to Set ${currentSetIndex + 1} of ${totalWorkoutSets}`, "info");
    updateStepView();
  } else {
    showToast("You are on the final exercise of the routine!", "info");
  }
}

export function prevExercise() {
  if (!activeWorkoutData || !activeWorkoutData.exercise_steps) return;
  const steps = activeWorkoutData.exercise_steps;
  if (currentExerciseIndex > 0) {
    currentExerciseIndex--;
    try { sound.playClick(); } catch (e) {}
    updateStepView();
  } else if (currentSetIndex > 0) {
    currentSetIndex--;
    currentExerciseIndex = steps.length - 1;
    try { sound.playClick(); } catch (e) {}
    showToast(`Returned to Set ${currentSetIndex + 1} of ${totalWorkoutSets}`, "info");
    updateStepView();
  }
}

export function selectExerciseIndex(idx) {
  if (!activeWorkoutData || !activeWorkoutData.exercise_steps) return;
  const steps = activeWorkoutData.exercise_steps;
  if (steps[idx]) {
    currentExerciseIndex = idx;
    try { sound.playClick(); } catch (e) {}
    updateStepView();
  }
}

function updateStepView() {
  if (!activeWorkoutData || !activeWorkoutData.exercise_steps) return;
  const steps = activeWorkoutData.exercise_steps;
  const step = steps[currentExerciseIndex];
  if (!step) return;

  stepSecondsRemaining = step.duration_sec || 45;

  const titleEl = document.getElementById("studioExerciseTitle");
  const subEl = document.getElementById("studioExerciseSubtitle");
  const repsEl = document.getElementById("studioExerciseReps");
  const formEl = document.getElementById("studioExecutionForm");
  const cueEl = document.getElementById("studioKeyCue");
  const breathRow = document.getElementById("studioBreathingRow");
  const breathEl = document.getElementById("studioBreathingCue");
  const timerEl = document.getElementById("studioSingleTimer");
  const statusEl = document.getElementById("studioTimerStatus");
  const playlist = document.getElementById("studioPlaylist");
  const trainerVideo = document.getElementById("studioTrainerVideo");
  const activeSetLabel = document.getElementById("studioActiveSetLabel");
  const seqStepCounter = document.getElementById("studioSequenceStepCounter");
  const setBadgesContainer = document.getElementById("studioSetBadges");

  if (titleEl) titleEl.innerText = step.name;
  if (subEl) subEl.innerText = `Exercise ${currentExerciseIndex + 1} of ${steps.length} • Set ${currentSetIndex + 1} of ${totalWorkoutSets}`;
  if (repsEl) repsEl.innerText = step.reps || "10-12 reps";
  if (formEl) formEl.innerText = step.form || step.description || "Maintain smooth controlled form throughout the movement.";
  if (cueEl) cueEl.innerHTML = `<strong>Coach Cue:</strong> ${step.cues || "Focus on mind-muscle connection and controlled posture."}`;
  if (breathRow && breathEl) {
    if (step.breathing) {
      breathRow.style.display = "flex";
      breathEl.innerHTML = `<strong>Breathing:</strong> ${step.breathing}`;
    } else {
      breathRow.style.display = "none";
    }
  }

  if (activeSetLabel) activeSetLabel.innerText = `Set ${currentSetIndex + 1} of ${totalWorkoutSets}`;
  if (seqStepCounter) seqStepCounter.innerText = `Exercise ${currentExerciseIndex + 1} of ${steps.length}`;
  if (setBadgesContainer) setBadgesContainer.innerHTML = renderSetBadgesHtml(totalWorkoutSets, currentSetIndex);

  if (timerEl) timerEl.innerText = formatCountdown(stepSecondsRemaining);
  if (statusEl && !isTimerRunning) statusEl.innerText = "READY TO BEGIN";

  // Seamlessly transition the live-action female trainer video matching this specific exercise & workout
  if (activeWorkoutData) {
    const targetVideoName = getTrainerVideoForExercise(step.name, activeWorkoutData.category, activeWorkoutData.name);
    const targetVideoSrc = `/static/assets/trainer/${targetVideoName}`;
    const targetImgName = getTrainerImageForExercise(step.name, activeWorkoutData.category, activeWorkoutData.name);
    const targetImgSrc = `/static/assets/trainer/${targetImgName}`;

    if (trainerVideo && !trainerVideo.src.endsWith(targetVideoName)) {
      trainerVideo.style.opacity = "0.2";
      setTimeout(() => {
        trainerVideo.src = targetVideoSrc;
        trainerVideo.poster = targetImgSrc;
        trainerVideo.style.opacity = "1";
        trainerVideo.play().catch(() => {});
      }, 120);
    }
  }

  // Update playlist active highlight
  if (playlist) {
    playlist.querySelectorAll("div[onclick]").forEach((el, idx) => {
      const numBadge = el.querySelector("span:first-child");
      if (idx === currentExerciseIndex) {
        el.style.borderColor = "var(--primary)";
        el.style.background = "var(--primary-light)";
        if (numBadge) {
          numBadge.style.background = "var(--primary)";
          numBadge.style.color = "white";
        }
      } else {
        el.style.borderColor = "var(--border)";
        el.style.background = "var(--bg-card)";
        if (numBadge) {
          numBadge.style.background = "var(--border-light)";
          numBadge.style.color = "var(--text-muted)";
        }
      }
    });
  }
}

export function resetStudioTimer(initialSeconds) {
  clearInterval(currentWorkoutTimer);
  isTimerRunning = false;
  try { sound.stopCalmingMusic(); } catch(e) {}
  const videoEl = document.getElementById("studioTrainerVideo");
  if (videoEl) { try { videoEl.pause(); } catch(e) {} }
  stepSecondsRemaining = initialSeconds || 25;
  const timerEl = document.getElementById("studioSingleTimer");
  if (timerEl) timerEl.innerText = formatCountdown(stepSecondsRemaining);
}

export function toggleCalmingMusic() {
  const btn = document.getElementById("calmingMusicToggle");
  if (!btn) return;

  if (sound.isMusicPlaying) {
    sound.stopCalmingMusic();
    btn.innerHTML = `<i class="fa-solid fa-music"></i> Audio: Muted`;
    btn.style.color = "var(--text-muted)";
  } else {
    sound.startCalmingMusic();
    btn.innerHTML = `<i class="fa-solid fa-music"></i> Audio: Playing`;
    btn.style.color = "var(--primary)";
  }
}

// Handler called when user clicks Finish & Log before completion, or completes workout
export async function completeWorkoutSession(overrideId, overrideName, overrideDuration, overrideCalories) {
  if (!activeWorkoutData) return;
  const w = activeWorkoutData;
  const steps = w.exercise_steps || [];

  // If user clicks Finish & Log before ever starting the timer
  if (elapsedSeconds <= 0) {
    showToast("Press 'Start Workout' to begin your session before logging!", "warning");
    return;
  }

  const totalPossibleExercises = totalWorkoutSets * steps.length;
  const exercisesCompleted = Math.min(
    (currentSetIndex * steps.length) + currentExerciseIndex + 1,
    totalPossibleExercises
  );

  const isFullCompletion = (currentSetIndex >= totalWorkoutSets - 1) &&
                           (currentExerciseIndex >= steps.length - 1) &&
                           (stepSecondsRemaining <= 0);

  // Accurately log what the user actually completed
  const actualDurationMin = Math.max(Math.round(elapsedSeconds / 60), 1);
  const actualCalories = Math.max(caloriesBurned, 1);

  await finishWorkoutSession(
    w.id,
    w.name,
    actualDurationMin,
    actualCalories,
    exercisesCompleted,
    isFullCompletion
  );
}

// Strictly logs workout with actual elapsed duration and calories
export async function finishWorkoutSession(workoutId, name, duration, calories, exercisesCompleted = 1, isFullCompletion = false) {
  try {
    clearInterval(currentWorkoutTimer);
    isTimerRunning = false;
    try { sound.stopCalmingMusic(); } catch(e) {}

    const videoEl = document.getElementById("studioTrainerVideo");
    if (videoEl) { try { videoEl.pause(); } catch (e) {} }

    const res = await api.post("/api/workouts/complete", {
      workout_id: workoutId,
      workout_name: name,
      duration_min: duration || 1,
      calories_burned: calories || 1,
      exercises_completed: exercisesCompleted || 1
    });

    if (isFullCompletion) {
      try { sound.playVictory(); } catch (e) {}
      showToast("Full workout completed! Logged to your streaks! 🎉", "success");
    } else {
      try { sound.playClick(); } catch (e) {}
      showToast(`Workout session logged: ${formatTime(elapsedSeconds)} • ${calories} kcal!`, "success");
    }

    renderPostWorkoutCelebration(res, isFullCompletion, elapsedSeconds, exercisesCompleted, totalWorkoutSets);
  } catch (err) {
    showToast(err.message, "error");
  }
}

function renderPostWorkoutCelebration(res, isFullCompletion = false, totalElapsed = 0, exercisesDone = 1, totalSets = 3) {
  const modal = document.getElementById("workoutPlayerModal");
  if (!modal) return;

  const recs = res.post_recommendations || {};
  const goal = (recs.goal || "").toLowerCase();
  const similar = recs.similar_workouts || [];
  const recovery = recs.recovery_recommendations || [];

  let goalHeading = "Recommended Next Routines";
  if (goal.includes("gain") || goal.includes("muscle")) {
    goalHeading = "Recommended Next • Muscle Growth & Recovery";
  } else if (goal.includes("loss") || goal.includes("fat")) {
    goalHeading = "Recommended Next • Metabolic Fat Burn";
  }

  const timeDisplay = formatTime(totalElapsed || (res.duration_min * 60));
  const heading = isFullCompletion 
    ? "You Completed All Sets! 🎉" 
    : "Workout Session Logged! ⚡";
  const subtext = isFullCompletion
    ? `Incredible performance! You crushed all ${totalSets} sets (${exercisesDone} exercises) in ${timeDisplay}, burning ~${res.calories_burned} kcal. Your habit streaks and intelligence have been updated!`
    : `Great job! You completed ${timeDisplay} of active training (~${res.duration_min} min, ${exercisesDone} exercises) and burned ~${res.calories_burned} kcal based on what you actually completed.`;

  modal.innerHTML = `
    <div class="modal-card" style="max-width: 520px; text-align: center; padding: 36px 28px; border-radius: 24px;">
      <div style="font-size: 54px; margin-bottom: 12px;">${isFullCompletion ? '🏆' : '⚡'}</div>
      <h2 style="font-size: 22px; font-weight: 900; margin-bottom: 6px; color: var(--text-main);">${heading}</h2>
      <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 18px; line-height: 1.5;">
        ${subtext}
      </p>

      <!-- Accurate Performance Stat Badges -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px;">
        <div style="background: var(--border-light); border-radius: 12px; padding: 12px 8px; border: 1px solid var(--border);">
          <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Active Time</div>
          <div style="font-size: 18px; font-weight: 900; color: var(--text-main); margin-top: 2px;">${timeDisplay}</div>
        </div>
        <div style="background: var(--border-light); border-radius: 12px; padding: 12px 8px; border: 1px solid var(--border);">
          <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Calories</div>
          <div style="font-size: 18px; font-weight: 900; color: var(--primary); margin-top: 2px;">~${res.calories_burned} kcal</div>
        </div>
        <div style="background: var(--border-light); border-radius: 12px; padding: 12px 8px; border: 1px solid var(--border);">
          <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Completion</div>
          <div style="font-size: 16px; font-weight: 900; color: ${isFullCompletion ? '#22c55e' : '#f59e0b'}; margin-top: 2px;">${isFullCompletion ? '100% Done' : 'Partial Log'}</div>
        </div>
      </div>

      <div style="background: var(--border-light); border-radius: var(--radius-md); padding: 16px; text-align: left; margin-bottom: 20px; border: 1px solid var(--border);">
        <h3 style="font-size: 14px; font-weight: 800; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; color: var(--primary-hover);">
          <i class="fa-solid fa-sparkles" style="color: var(--primary);"></i> ${goalHeading}
        </h3>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${[...recovery, ...similar].slice(0, 2).map(w => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: var(--bg-card); border-radius: var(--radius-sm); border: 1px solid var(--border);">
              <div>
                <div style="font-size: 13px; font-weight: 800;">${w.name}</div>
                <div style="font-size: 11px; color: var(--text-muted);">${w.category} • ${w.duration_min} min</div>
              </div>
              <button class="btn-secondary" style="padding: 4px 10px; font-size: 11px;" onclick="window.app.startWorkout(${w.id})">
                View
              </button>
            </div>
          `).join("")}
        </div>
      </div>

      <div style="display: flex; gap: 12px; justify-content: center;">
        <button class="btn-primary" onclick="window.app.closeWorkoutPlayer(); window.app.navigate('dashboard');">
          Back to Dashboard
        </button>
        <button class="btn-secondary" onclick="window.app.closeWorkoutPlayer(); window.app.navigate('workouts');">
          Browse Library
        </button>
      </div>
    </div>
  `;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatCountdown(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
