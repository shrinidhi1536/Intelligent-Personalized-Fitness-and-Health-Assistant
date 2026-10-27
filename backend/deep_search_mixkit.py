import urllib.request
import re

search_terms = [
    "plank",
    "push-up",
    "push-ups",
    "pushups",
    "tricep",
    "triceps",
    "dips",
    "bridge",
    "glute",
    "abs",
    "abdominal",
    "pilates",
    "wall",
    "squats",
    "lunges",
    "cardio",
    "jumping",
    "stretching",
    "stretch",
    "hamstring",
    "yoga",
    "cobra",
    "downward-dog"
]

headers = {'User-Agent': 'Mozilla/5.0'}
all_items = {}

for term in search_terms:
    for page in [1, 2]:
        url = f"https://mixkit.co/free-stock-video/{term}/?page={page}" if page > 1 else f"https://mixkit.co/free-stock-video/{term}/"
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=10) as r:
                html = r.read().decode('utf-8', errors='ignore')
            matches = re.findall(r'/free-stock-video/([a-z0-9-]+-(\d+))/', html)
            for slug, vid_id in matches:
                if vid_id not in all_items:
                    all_items[vid_id] = slug
        except Exception:
            pass

print(f"Total unique videos found: {len(all_items)}")

# Filter for woman/female or exercise
keywords = ["woman", "girl", "female", "push", "plank", "lunge", "squat", "yoga", "stretch", "bridge", "dip", "pilates", "abs"]
filtered = {k: v for k, v in all_items.items() if any(kw in v for kw in keywords)}
print(f"Filtered exercise/woman videos: {len(filtered)}")

for vid_id, slug in sorted(filtered.items(), key=lambda x: int(x[0])):
    print(f"[{vid_id}] {slug}")
