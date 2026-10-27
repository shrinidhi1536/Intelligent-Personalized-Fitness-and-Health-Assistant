import urllib.request
import cv2
import os

items = [
    (5056, "girl_floor_5056"),
    (42898, "woman_livingroom_42898"),
    (15079, "woman_apt_15079"),
    (11541, "pushup_outside_11541"),
    (24383, "pushup_ground_24383"),
    (739, "fitness_warmup_739")
]

os.makedirs("candidate_vids3", exist_ok=True)
headers = {'User-Agent': 'Mozilla/5.0'}

for vid_id, name in items:
    out_mp4 = f"candidate_vids3/{name}.mp4"
    out_jpg = f"candidate_vids3/{name}.jpg"
    for res in ["720", "360"]:
        url = f"https://assets.mixkit.co/videos/{vid_id}/{vid_id}-{res}.mp4"
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=12) as r, open(out_mp4, "wb") as f:
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
        except Exception as e:
            pass
