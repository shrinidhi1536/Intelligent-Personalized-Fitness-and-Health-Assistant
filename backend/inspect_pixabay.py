import urllib.request
import re
import cv2
import os

url = "https://pixabay.com/videos/search/woman%20squat/"
headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req, timeout=10) as resp:
    html = resp.read().decode("utf-8")

# Extract large/medium mp4 URLs
large_urls = set(re.findall(r'https://cdn\.pixabay\.com/video/[^\s"\'<>]*(?:large|medium|tiny)\.mp4', html))
print(f"Total direct CDN URLs found: {len(large_urls)}")

# Filter for medium or large
pref_urls = [u for u in large_urls if "large" in u or "medium" in u]
if not pref_urls:
    pref_urls = list(large_urls)

for i, u in enumerate(pref_urls[:8]):
    print(f"Testing video {i}: {u}")
    out_vid = f"pixabay_test_{i}.mp4"
    out_frame = f"pixabay_frame_{i}.jpg"
    try:
        r = urllib.request.Request(u, headers=headers)
        with urllib.request.urlopen(r, timeout=15) as v_resp, open(out_vid, "wb") as f:
            f.write(v_resp.read())
        cap = cv2.VideoCapture(out_vid)
        ret, frame = cap.read()
        if ret:
            cv2.imwrite(out_frame, frame)
            frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            print(f"  -> Saved {out_frame}: {w}x{h}, {frames} frames @ {fps:.1f} fps")
        cap.release()
    except Exception as e:
        print(f"  Error: {e}")
