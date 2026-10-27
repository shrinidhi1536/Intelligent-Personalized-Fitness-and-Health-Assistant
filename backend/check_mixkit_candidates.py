import urllib.request
import cv2
import os

ids = [
    ("squat_52106", 52106),
    ("lunge_52103", 52103),
    ("workout_52110", 52110),
    ("workout_52102", 52102),
    ("stretch_48563", 48563),
    ("dumbbell_44431", 44431),
]

headers = {'User-Agent': 'Mozilla/5.0'}

for name, vid_id in ids:
    url = f"https://assets.mixkit.co/videos/{vid_id}/{vid_id}-720.mp4"
    out_mp4 = f"test_{name}.mp4"
    out_jpg = f"test_{name}.jpg"
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as r, open(out_mp4, "wb") as f:
            f.write(r.read())
        cap = cv2.VideoCapture(out_mp4)
        ret, frame = cap.read()
        if ret:
            cv2.imwrite(out_jpg, frame)
            frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            print(f"Downloaded {name}: {w}x{h}, {frames} frames @ {fps} fps ({out_mp4})")
        cap.release()
    except Exception as e:
        print(f"Error {name}: {e}")
