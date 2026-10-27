import urllib.request
import cv2
import os

items = [
    (52103, "trainer_52103"),
    (52106, "trainer_squat_52106"),
    (52107, "trainer_52107"),
    (52110, "trainer_deadlift_52110"),
    (52111, "trainer_52111"),
    (52112, "trainer_lunge_52112"),
    (52115, "trainer_52115"),
    (52116, "trainer_squats_52116"),
    (52117, "trainer_52117"),
    (52119, "trainer_stretch_52119"),
    (52138, "trainer_warmup_52138"),
    (45761, "pilates_45761"),
    (45764, "pilates_45764"),
    (45766, "pilates_45766"),
    (45767, "stretch_45767"),
    (39568, "yoga_floor_39568"),
    (47901, "cardio_rope_47901"),
    (49501, "cardio_gym_49501"),
    (48554, "stretch_gym_48554"),
    (48567, "stretch_gym_48567")
]

os.makedirs("curated_vids", exist_ok=True)
headers = {'User-Agent': 'Mozilla/5.0'}

for vid_id, name in items:
    out_mp4 = f"curated_vids/{name}.mp4"
    out_jpg = f"curated_vids/{name}.jpg"
    if os.path.exists(out_mp4) and os.path.getsize(out_mp4) > 10000:
        print(f"Already exists: {name}")
        continue
    for res in ["720", "360"]:
        url = f"https://assets.mixkit.co/videos/{vid_id}/{vid_id}-{res}.mp4"
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=15) as r, open(out_mp4, "wb") as f:
                f.write(r.read())
            cap = cv2.VideoCapture(out_mp4)
            count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            cap.set(cv2.CAP_PROP_POS_FRAMES, count // 2)
            ret, frame = cap.read()
            if ret:
                cv2.imwrite(out_jpg, frame)
                w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                fps = cap.get(cv2.CAP_PROP_FPS)
                print(f"Downloaded {name} ({res}p): {w}x{h}, {count} frames @ {fps:.1f} fps")
            cap.release()
            break
        except Exception:
            pass
