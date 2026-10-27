import urllib.request
import cv2
import os

candidates = [
    ("pushup_24273", 24273),
    ("pushup_24311", 24311),
    ("pushup_5351", 5351),
    ("pushup_36008", 36008),
    ("squat_23913", 23913),
    ("squat_752", 752),
    ("squat_52106", 52106),
    ("lunge_52112", 52112),
    ("lunge_24304", 24304),
    ("cardio_48814", 48814),
    ("cardio_14241", 14241),
    ("yoga_4878", 4878),
    ("yoga_1053", 1053),
    ("dumbbell_36598", 36598),
    ("dumbbell_1313", 1313),
    ("pilates_48565", 48565),
    ("pilates_48561", 48561),
    ("stretch_31407", 31407),
    ("stretch_100526", 100526)
]

headers = {'User-Agent': 'Mozilla/5.0'}
os.makedirs("candidate_vids", exist_ok=True)

for name, vid_id in candidates:
    # Try 720 first, fallback to 360
    downloaded = False
    for res in ["720", "360"]:
        url = f"https://assets.mixkit.co/videos/{vid_id}/{vid_id}-{res}.mp4"
        out_mp4 = f"candidate_vids/{name}.mp4"
        out_jpg = f"candidate_vids/{name}.jpg"
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=15) as r, open(out_mp4, "wb") as f:
                f.write(r.read())
            cap = cv2.VideoCapture(out_mp4)
            ret, frame = cap.read()
            if ret:
                cv2.imwrite(out_jpg, frame)
                frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                fps = cap.get(cv2.CAP_PROP_FPS)
                w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                print(f"OK: {name} ({res}p): {w}x{h}, {frames} frames @ {fps:.1f} fps")
                downloaded = True
            cap.release()
            if downloaded:
                break
        except Exception as e:
            pass
    if not downloaded:
        print(f"FAILED: {name}")
