import urllib.request
import cv2
import os

headers = {'User-Agent': 'Mozilla/5.0'}

test_urls = [
    ("coverr_pushup_bench_8305", "https://cdn.coverr.co/videos/coverr-premium-push-ups-on-a-park-bench-8305/720p.mp4"),
    ("coverr_pushup_bench_5106", "https://cdn.coverr.co/videos/coverr-premium-doing-push-ups-on-a-bench-5106/720p.mp4"),
]

for name, url in test_urls:
    out_mp4 = f"test_{name}.mp4"
    out_jpg = f"test_{name}.jpg"
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
            print(f"OK {name}: {w}x{h}, {count} frames @ {fps:.1f} fps")
        cap.release()
    except Exception as e:
        print(f"Error {name}: {e}")
