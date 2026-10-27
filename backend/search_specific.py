import urllib.request
import re

terms = [
    "woman-plank", "plank-hold", "forearm-plank", "side-plank",
    "hip-thrust", "glute-bridge", "pelvic",
    "chair-dips", "bench-dips", "tricep-dips",
    "woman-push-up", "girl-push-up", "female-push-up",
    "gym-push-ups", "fitness-push-ups"
]

headers = {'User-Agent': 'Mozilla/5.0'}
all_found = []

for t in terms:
    url = f"https://mixkit.co/free-stock-video/{t}/"
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=8) as r:
            html = r.read().decode('utf-8', errors='ignore')
        matches = re.findall(r'/free-stock-video/([a-z0-9-]+-(\d+))/', html)
        for slug, vid_id in matches:
            if (vid_id, slug) not in all_found:
                all_found.append((vid_id, slug))
                print(f"[{vid_id}] {slug}")
    except Exception:
        pass

print(f"Total unique found: {len(all_found)}")
