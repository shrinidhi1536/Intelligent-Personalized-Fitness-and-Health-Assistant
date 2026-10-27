import urllib.request
import cv2
import os

items = [
    (11544, "pushup_11544"),
    (36895, "mat_36895"),
    (16201, "stretch_mat_16201"),
    (5064, "stretch_floor_5064"),
    (36813, "plank_36813")
]

os.makedirs("candidate_vids2", exist_ok=True)
headers = {'User-Agent': 'Mozilla/5.0'}

for vid_id, name in items:
    out_mp4 = f"candidate_vids2/{name}.mp4"
    out_jpg = f"candidate_vids2/{name}.jpg"
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
