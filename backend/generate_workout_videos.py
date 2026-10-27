import os
import cv2
import numpy as np
import math

TRAINER_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "static", "assets", "trainer")
BRAIN_DIR = r"C:\Users\SHRINIDHI\.gemini\antigravity\brain\990453cb-b353-481c-ae73-86d2c9848a2d"

# Target resolution: 768x432 (16:9 standard for studio demonstrator)
WIDTH = 768
HEIGHT = 432
FPS = 30.0

def get_fourcc():
    return cv2.VideoWriter_fourcc(*'avc1')

def add_hud_overlay(frame, title, focus_cue, angle_text=None, p1=None, p2=None, p3=None, rep_progress=0.0):
    """
    Renders clean, modern fitness HUD elements (biomechanical angle tracking, cue pill)
    onto the frame using the lavender/violet brand palette.
    """
    h, w = frame.shape[:2]
    
    # 1. Subtle glowing tracking nodes & alignment line
    if p1 and p2:
        cv2.line(frame, p1, p2, (244, 171, 181), 2, cv2.LINE_AA) # lavender
        cv2.circle(frame, p1, 5, (255, 113, 133), -1, cv2.LINE_AA) # violet
        cv2.circle(frame, p2, 5, (255, 113, 133), -1, cv2.LINE_AA)
        if p3:
            cv2.line(frame, p2, p3, (244, 171, 181), 2, cv2.LINE_AA)
            cv2.circle(frame, p3, 5, (255, 113, 133), -1, cv2.LINE_AA)
            
    # 2. Angle text badge near primary joint
    if angle_text and p2:
        badge_x = min(max(p2[0] + 15, 20), w - 160)
        badge_y = min(max(p2[1] - 10, 30), h - 30)
        
        # Draw translucent badge background
        overlay = frame.copy()
        cv2.rectangle(overlay, (badge_x - 6, badge_y - 18), (badge_x + len(angle_text)*9 + 8, badge_y + 8), (20, 16, 40), -1)
        cv2.addWeighted(overlay, 0.75, frame, 0.25, 0, frame)
        cv2.rectangle(frame, (badge_x - 6, badge_y - 18), (badge_x + len(angle_text)*9 + 8, badge_y + 8), (181, 171, 244), 1, cv2.LINE_AA)
        cv2.putText(frame, angle_text, (badge_x, badge_y - 2), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (255, 255, 255), 1, cv2.LINE_AA)

    # 3. Top-right Kinematic Motion Status Tag
    tag_text = "AI DEMO VIDEO"
    tag_w = len(tag_text) * 8 + 16
    overlay = frame.copy()
    cv2.rectangle(overlay, (w - tag_w - 18, 14), (w - 18, 38), (133, 113, 255), -1) # primary violet
    cv2.addWeighted(overlay, 0.85, frame, 0.15, 0, frame)
    cv2.putText(frame, tag_text, (w - tag_w - 10, 31), cv2.FONT_HERSHEY_SIMPLEX, 0.40, (255, 255, 255), 1, cv2.LINE_AA)

    # 4. Bottom Cadence & Focus Bar
    bar_h = 28
    overlay = frame.copy()
    cv2.rectangle(overlay, (18, h - bar_h - 14), (w - 18, h - 14), (13, 10, 30), -1)
    cv2.addWeighted(overlay, 0.8, frame, 0.2, 0, frame)
    cv2.rectangle(frame, (18, h - bar_h - 14), (w - 18, h - 14), (181, 171, 244), 1, cv2.LINE_AA)
    
    cv2.putText(frame, focus_cue, (28, h - 22), cv2.FONT_HERSHEY_SIMPLEX, 0.40, (219, 213, 255), 1, cv2.LINE_AA)

    # Mini cadence progress indicator bar inside bottom bar
    progress_w = int((w - 56) * rep_progress)
    if progress_w > 2:
        cv2.line(frame, (28, h - 17), (28 + progress_w, h - 17), (133, 113, 255), 2, cv2.LINE_AA)


def generate_squat_video():
    """Generates 3-phase real squat video from top, mid, and bottom keyframes."""
    top_path = os.path.join(BRAIN_DIR, "trainer_squat_top_1789908663972.jpg")
    mid_path = os.path.join(BRAIN_DIR, "trainer_squat_mid_1789908728145.jpg")
    bot_path = os.path.join(TRAINER_DIR, "squat.jpg")
    out_path = os.path.join(TRAINER_DIR, "squat.mp4")

    im_top = cv2.resize(cv2.imread(top_path), (WIDTH, HEIGHT))
    im_mid = cv2.resize(cv2.imread(mid_path), (WIDTH, HEIGHT))
    im_bot = cv2.resize(cv2.imread(bot_path), (WIDTH, HEIGHT))

    writer = cv2.VideoWriter(out_path, get_fourcc(), FPS, (WIDTH, HEIGHT))

    # Single rep sequence:
    # 1. Top hold: 10 frames
    # 2. Top -> Mid: 18 frames
    # 3. Mid -> Bot: 18 frames
    # 4. Bot depth hold: 8 frames
    # 5. Bot -> Mid: 16 frames
    # 6. Mid -> Top: 16 frames
    # 7. Lockout pause: 8 frames
    # Total = 94 frames per rep (~3.1s). 2 reps = 188 frames (~6.2s)

    def blend(im1, im2, count, start_prog, end_prog, phase_text, angle_from, angle_to):
        seq = []
        for i in range(count):
            a = i / float(count)
            # smooth cosine interpolation
            eased_a = (1.0 - math.cos(a * math.pi)) / 2.0
            frame = cv2.addWeighted(im1, 1.0 - eased_a, im2, eased_a, 0)
            
            prog = start_prog + a * (end_prog - start_prog)
            current_angle = int(angle_from + eased_a * (angle_to - angle_from))
            
            # Hip, knee, ankle points on frame
            knee_y = int(280 + eased_a * 15)
            p_hip = (int(WIDTH * 0.45), int(220 + eased_a * 40))
            p_knee = (int(WIDTH * 0.42), knee_y)
            p_ankle = (int(WIDTH * 0.43), 390)
            
            add_hud_overlay(frame, "SQUAT", phase_text, f"Knee: {current_angle} deg", p_hip, p_knee, p_ankle, prog)
            seq.append(frame)
        return seq

    rep_frames = []
    # 1. Top hold
    for i in range(10):
        f = im_top.copy()
        add_hud_overlay(f, "SQUAT", "Inhale & Brace Core • Neutral Spine", "Knee: 180 deg", (int(WIDTH*0.45), 220), (int(WIDTH*0.42), 280), (int(WIDTH*0.43), 390), 0.05)
        rep_frames.append(f)

    # 2. Top -> Mid
    rep_frames.extend(blend(im_top, im_mid, 18, 0.05, 0.35, "Controlled Descent • Hips Back", 180, 120))

    # 3. Mid -> Bot
    rep_frames.extend(blend(im_mid, im_bot, 18, 0.35, 0.50, "Full Parallel Depth • Knees Over Toes", 120, 90))

    # 4. Bot hold
    for i in range(8):
        f = im_bot.copy()
        add_hud_overlay(f, "SQUAT", "Parallel Depth Achieved • Chest Proud", "Knee: 90 deg", (int(WIDTH*0.45), 260), (int(WIDTH*0.42), 295), (int(WIDTH*0.43), 390), 0.50)
        rep_frames.append(f)

    # 5. Bot -> Mid
    rep_frames.extend(blend(im_bot, im_mid, 16, 0.50, 0.80, "Exhale & Drive Through Midfoot", 90, 130))

    # 6. Mid -> Top
    rep_frames.extend(blend(im_mid, im_top, 16, 0.80, 0.95, "Extend Hips & Glute Squeeze", 130, 180))

    # 7. Lockout pause
    for i in range(8):
        f = im_top.copy()
        add_hud_overlay(f, "SQUAT", "Top Lockout • Ready for Next Rep", "Knee: 180 deg", (int(WIDTH*0.45), 220), (int(WIDTH*0.42), 280), (int(WIDTH*0.43), 390), 1.0)
        rep_frames.append(f)

    # Write 2 full reps
    for _ in range(2):
        for f in rep_frames:
            writer.write(f)

    writer.release()
    print("Generated squat.mp4 successfully!")


def generate_kinematic_video(exercise_key, img_name, title, cue_down, cue_up, 
                             p1_func, p2_func, p3_func, angle_range, max_disp=(0, 24), num_reps=2):
    """
    Generates high-precision biomechanical kinematic movement loop for exercises.
    """
    img_path = os.path.join(TRAINER_DIR, img_name)
    out_path = os.path.join(TRAINER_DIR, f"{exercise_key}.mp4")

    im_base = cv2.imread(img_path)
    if im_base is None:
        print(f"Error: Missing base image {img_path}")
        return

    im_base = cv2.resize(im_base, (WIDTH, HEIGHT))
    writer = cv2.VideoWriter(out_path, get_fourcc(), FPS, (WIDTH, HEIGHT))

    frames_per_rep = 84 # ~2.8s per rep
    total_frames = frames_per_rep * num_reps

    for f_idx in range(total_frames):
        rep_progress = (f_idx % frames_per_rep) / float(frames_per_rep)
        
        # Smooth cyclical curve: 0 -> 1 -> 0
        t = rep_progress * 2.0 * math.pi
        cycle = (1.0 - math.cos(t)) / 2.0 # 0 at start, 1 at midpoint, 0 at end
        
        # Non-linear displacement
        dx = int(max_disp[0] * cycle)
        dy = int(max_disp[1] * cycle)
        
        # Affine displacement matrix
        M = np.float32([[1, 0, dx], [0, 1, dy]])
        frame = cv2.warpAffine(im_base, M, (WIDTH, HEIGHT), borderMode=cv2.BORDER_REFLECT)
        
        # Dynamic subtle respiration/expansion pulse
        breath_scale = 1.0 + 0.015 * math.sin(t)
        M_breath = cv2.getRotationMatrix2D((WIDTH // 2, HEIGHT // 2), 0, breath_scale)
        frame = cv2.warpAffine(frame, M_breath, (WIDTH, HEIGHT), borderMode=cv2.BORDER_REFLECT)
        
        # Calculate dynamic angles & points
        p1 = p1_func(cycle, dx, dy) if p1_func else None
        p2 = p2_func(cycle, dx, dy) if p2_func else None
        p3 = p3_func(cycle, dx, dy) if p3_func else None
        
        cur_angle = int(angle_range[0] + cycle * (angle_range[1] - angle_range[0]))
        angle_text = f"Joint Angle: {cur_angle} deg" if angle_range[0] != angle_range[1] else "Joint Stable"
        
        cue = cue_down if cycle > 0.4 else cue_up
        add_hud_overlay(frame, title, cue, angle_text, p1, p2, p3, rep_progress)
        
        writer.write(frame)

    writer.release()
    print(f"Generated {exercise_key}.mp4 successfully!")


def main():
    print("Beginning Generation of AI Female Trainer Workout Videos...")

    # 1. SQUAT (3-Phase Full Movement)
    generate_squat_video()

    # 2. PUSHUP
    generate_kinematic_video(
        exercise_key="pushup",
        img_name="pushup.jpg",
        title="PUSH-UP",
        cue_down="Chest to Floor • 45 deg Elbow Tuck • Inhale",
        cue_up="Exhale & Drive Up to Lockout • Rigid Core",
        p1_func=lambda c, dx, dy: (int(WIDTH * 0.48), int(HEIGHT * 0.45 + dy)),
        p2_func=lambda c, dx, dy: (int(WIDTH * 0.42), int(HEIGHT * 0.54 + dy)),
        p3_func=lambda c, dx, dy: (int(WIDTH * 0.38), int(HEIGHT * 0.70)),
        angle_range=(165, 90),
        max_disp=(0, -22),
        num_reps=2
    )

    # 3. LUNGE
    generate_kinematic_video(
        exercise_key="lunge",
        img_name="lunge.jpg",
        title="LUNGE",
        cue_down="Sink Hips Down • 90 deg Knee Flexion • Inhale",
        cue_up="Drive Through Front Heel • Upright Torso • Exhale",
        p1_func=lambda c, dx, dy: (int(WIDTH * 0.45), int(HEIGHT * 0.40 + dy)),
        p2_func=lambda c, dx, dy: (int(WIDTH * 0.40), int(HEIGHT * 0.55 + dy)),
        p3_func=lambda c, dx, dy: (int(WIDTH * 0.41), int(HEIGHT * 0.80)),
        angle_range=(140, 90),
        max_disp=(0, 20),
        num_reps=2
    )

    # 4. PLANK
    generate_kinematic_video(
        exercise_key="plank",
        img_name="plank.jpg",
        title="PLANK",
        cue_down="Continuous Tension • Pull Belly to Spine",
        cue_up="Isometric Hold • Inhale 4s • Exhale 4s",
        p1_func=lambda c, dx, dy: (int(WIDTH * 0.35), int(HEIGHT * 0.48 + dy)),
        p2_func=lambda c, dx, dy: (int(WIDTH * 0.50), int(HEIGHT * 0.50 + dy)),
        p3_func=lambda c, dx, dy: (int(WIDTH * 0.68), int(HEIGHT * 0.52)),
        angle_range=(180, 180),
        max_disp=(0, 4),
        num_reps=2
    )

    # 5. YOGA
    generate_kinematic_video(
        exercise_key="yoga",
        img_name="yoga.jpg",
        title="YOGA COBRA FLOW",
        cue_down="Spinal Extension • Shoulders Away From Ears • Inhale",
        cue_up="Heart Open • Relax Glutes • Smooth Exhalation",
        p1_func=lambda c, dx, dy: (int(WIDTH * 0.46), int(HEIGHT * 0.35 + dy)),
        p2_func=lambda c, dx, dy: (int(WIDTH * 0.48), int(HEIGHT * 0.55 + dy)),
        p3_func=lambda c, dx, dy: (int(WIDTH * 0.55), int(HEIGHT * 0.75)),
        angle_range=(125, 145),
        max_disp=(0, -15),
        num_reps=2
    )

    # 6. CARDIO
    generate_kinematic_video(
        exercise_key="cardio",
        img_name="cardio.jpg",
        title="CARDIO SPRINT / HIGH KNEES",
        cue_down="Drive Knee to Hip Height • Fast Cadence",
        cue_up="Explosive Ball of Foot Spring • Arms Pumping",
        p1_func=lambda c, dx, dy: (int(WIDTH * 0.48), int(HEIGHT * 0.30 + dy)),
        p2_func=lambda c, dx, dy: (int(WIDTH * 0.45), int(HEIGHT * 0.50 + dy)),
        p3_func=lambda c, dx, dy: (int(WIDTH * 0.46), int(HEIGHT * 0.75)),
        angle_range=(75, 110),
        max_disp=(0, -18),
        num_reps=4
    )

    # 7. WALL PILATES
    generate_kinematic_video(
        exercise_key="wall_pilates",
        img_name="wall_pilates.jpg",
        title="WALL PILATES SIT",
        cue_down="Back Flat to Wall • 90 deg Knee Depth • Hold",
        cue_up="Pelvic Neutral • Arm Pulse Articulation",
        p1_func=lambda c, dx, dy: (int(WIDTH * 0.44), int(HEIGHT * 0.38 + dy)),
        p2_func=lambda c, dx, dy: (int(WIDTH * 0.42), int(HEIGHT * 0.55 + dy)),
        p3_func=lambda c, dx, dy: (int(WIDTH * 0.43), int(HEIGHT * 0.78)),
        angle_range=(90, 90),
        max_disp=(0, 6),
        num_reps=2
    )

    # 8. DIPS
    generate_kinematic_video(
        exercise_key="dips",
        img_name="dips.jpg",
        title="TRICEP DIPS",
        cue_down="Lower Hips Near Chair • 90 deg Elbow Flexion",
        cue_up="Press Forcefully Through Palms • Lockout",
        p1_func=lambda c, dx, dy: (int(WIDTH * 0.46), int(HEIGHT * 0.42 + dy)),
        p2_func=lambda c, dx, dy: (int(WIDTH * 0.41), int(HEIGHT * 0.50 + dy)),
        p3_func=lambda c, dx, dy: (int(WIDTH * 0.43), int(HEIGHT * 0.65)),
        angle_range=(160, 90),
        max_disp=(0, 22),
        num_reps=2
    )

    # 9. STRETCH
    generate_kinematic_video(
        exercise_key="stretch",
        img_name="stretch.jpg",
        title="HAMSTRING & HIP STRETCH",
        cue_down="Exhale • Reach Torso Toward Toes • Relax Neck",
        cue_up="Inhale • Lengthen Spine • Hip Hinge Focus",
        p1_func=lambda c, dx, dy: (int(WIDTH * 0.42), int(HEIGHT * 0.45 + dy)),
        p2_func=lambda c, dx, dy: (int(WIDTH * 0.48), int(HEIGHT * 0.55 + dy)),
        p3_func=lambda c, dx, dy: (int(WIDTH * 0.58), int(HEIGHT * 0.62)),
        angle_range=(70, 50),
        max_disp=(8, 10),
        num_reps=2
    )

    # 10. BRIDGE
    generate_kinematic_video(
        exercise_key="bridge",
        img_name="bridge.jpg",
        title="GLUTE BRIDGE",
        cue_down="Drive Hips to Full Extension • Squeeze Glutes 2s",
        cue_up="Controlled Lowering to Mat • Tap & Drive",
        p1_func=lambda c, dx, dy: (int(WIDTH * 0.38), int(HEIGHT * 0.58)),
        p2_func=lambda c, dx, dy: (int(WIDTH * 0.50), int(HEIGHT * 0.45 + dy)),
        p3_func=lambda c, dx, dy: (int(WIDTH * 0.62), int(HEIGHT * 0.55)),
        angle_range=(140, 180),
        max_disp=(0, -24),
        num_reps=2
    )

    # 11. DUMBBELL
    generate_kinematic_video(
        exercise_key="dumbbell",
        img_name="dumbbell.jpg",
        title="DUMBBELL BENT ROW",
        cue_down="Elbows Pull Back Past Ribs • Squeeze Lats • Exhale",
        cue_up="Lower Weights Controlled • Maintain Flat Back • Inhale",
        p1_func=lambda c, dx, dy: (int(WIDTH * 0.46), int(HEIGHT * 0.42)),
        p2_func=lambda c, dx, dy: (int(WIDTH * 0.44), int(HEIGHT * 0.52 + dy)),
        p3_func=lambda c, dx, dy: (int(WIDTH * 0.43), int(HEIGHT * 0.68 + dy)),
        angle_range=(160, 95),
        max_disp=(0, -18),
        num_reps=2
    )

    print("\nAll 11 AI Female Trainer Workout Videos Generated Successfully!")

if __name__ == "__main__":
    main()
