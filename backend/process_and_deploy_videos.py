import cv2
import os

target_dir = os.path.abspath("frontend/static/assets/trainer")
os.makedirs(target_dir, exist_ok=True)

# Define sources and (start_frame, end_frame, target_fps)
tasks = {
    "squat": {
        "src": "curated_vids/trainer_52117.mp4",
        "start": 10,
        "end": 160,
        "fps": 24.0
    },
    "pushup": {
        "src": "candidate_vids3/pushup_outside_11541.mp4",
        "start": 20,
        "end": 220,
        "fps": 25.0
    },
    "lunge": {
        "src": "curated_vids/trainer_lunge_52112.mp4",
        "start": 10,
        "end": 180,
        "fps": 24.0
    },
    "plank": {
        "src": "yt_plank_pvIjs.mp4",
        "start": 1150,
        "end": 1350,
        "fps": 25.0
    },
    "yoga": {
        "src": "curated_vids/stretch_45767.mp4",
        "start": 10,
        "end": 150,
        "fps": 24.0
    },
    "cardio": {
        "src": "curated_vids/cardio_rope_47901.mp4",
        "start": 20,
        "end": 200,
        "fps": 25.0
    },
    "wall_pilates": {
        "src": "curated_vids/stretch_gym_48567.mp4",
        "start": 100,
        "end": 350,
        "fps": 24.0
    },
    "dips": {
        "src": "yt_test_dips.mp4",
        "start": 60,
        "end": 240,
        "fps": 25.0
    },
    "stretch": {
        "src": "curated_vids/pilates_45764.mp4",
        "start": 10,
        "end": 170,
        "fps": 24.0
    },
    "bridge": {
        "src": "candidate_vids3/girl_floor_5056.mp4",
        "start": 50,
        "end": 250,
        "fps": 24.0
    },
    "dumbbell": {
        "src": "curated_vids/trainer_deadlift_52110.mp4",
        "start": 20,
        "end": 260,
        "fps": 24.0
    }
}

fourcc = cv2.VideoWriter_fourcc(*'avc1')

for name, cfg in tasks.items():
    src_path = cfg["src"]
    out_mp4 = os.path.join(target_dir, f"{name}.mp4")
    out_jpg = os.path.join(target_dir, f"{name}.jpg")
    
    if not os.path.exists(src_path):
        print(f"MISSING SOURCE: {src_path} for {name}")
        continue
        
    cap = cv2.VideoCapture(src_path)
    cap.set(cv2.CAP_PROP_POS_FRAMES, cfg["start"])
    
    # Read first frame to get size & save poster
    ret, first_frame = cap.read()
    if not ret:
        print(f"FAILED TO READ: {src_path}")
        cap.release()
        continue
        
    h, w = first_frame.shape[:2]
    # Standardize to 1280x720
    target_w, target_h = 1280, 720
    resized_first = cv2.resize(first_frame, (target_w, target_h), interpolation=cv2.INTER_AREA)
    cv2.imwrite(out_jpg, resized_first)
    
    writer = cv2.VideoWriter(out_mp4, fourcc, cfg["fps"], (target_w, target_h))
    writer.write(resized_first)
    
    frame_idx = cfg["start"] + 1
    total_written = 1
    while frame_idx <= cfg["end"]:
        ret, frame = cap.read()
        if not ret:
            break
        resized = cv2.resize(frame, (target_w, target_h), interpolation=cv2.INTER_AREA)
        writer.write(resized)
        total_written += 1
        frame_idx += 1
        
    writer.release()
    cap.release()
    
    size_mb = os.path.getsize(out_mp4) / (1024 * 1024)
    print(f"SUCCESS: {name}.mp4 ({total_written} frames, {size_mb:.2f} MB) + {name}.jpg")
