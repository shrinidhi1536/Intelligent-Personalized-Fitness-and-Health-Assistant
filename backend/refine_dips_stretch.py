import cv2
import os

target_dir = os.path.abspath("frontend/static/assets/trainer")
os.makedirs(target_dir, exist_ok=True)

# Refined tasks for dips and stretch
tasks = {
    "dips": {
        "src": "yt_test_dips.mp4",
        "start": 1390,
        "end": 1640,
        "fps": 25.0
    },
    "stretch": {
        "src": "curated_vids/pilates_45764.mp4",
        "start": 50,
        "end": 170,
        "fps": 24.0
    }
}

fourcc = cv2.VideoWriter_fourcc(*'avc1')

for name, cfg in tasks.items():
    src_path = cfg["src"]
    out_mp4 = os.path.join(target_dir, f"{name}.mp4")
    out_jpg = os.path.join(target_dir, f"{name}.jpg")
    
    cap = cv2.VideoCapture(src_path)
    cap.set(cv2.CAP_PROP_POS_FRAMES, cfg["start"])
    
    ret, first_frame = cap.read()
    if not ret:
        print(f"FAILED TO READ: {src_path}")
        cap.release()
        continue
        
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
    print(f"RE-DEPLOYED: {name}.mp4 ({total_written} frames, {size_mb:.2f} MB) + {name}.jpg")
