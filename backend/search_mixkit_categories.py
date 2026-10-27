import urllib.request
import re

queries = [
    ("pushup", ["woman-push-ups", "push-ups", "pushups", "girl-push-ups"]),
    ("plank", ["plank-exercise", "woman-plank", "core-exercise", "abs-workout"]),
    ("yoga", ["woman-yoga", "yoga-pose", "yoga-flow", "yoga-class"]),
    ("cardio", ["woman-cardio", "jumping-jacks", "aerobics", "woman-running-gym"]),
    ("wall_pilates", ["pilates", "woman-pilates", "mat-pilates", "barre"]),
    ("dips", ["tricep-dips", "dips-exercise", "triceps", "calisthenics"]),
    ("stretch", ["woman-stretching", "stretching", "yoga-stretch", "flexibility"]),
    ("bridge", ["glute-bridge", "bridge-exercise", "floor-workout", "pilates-mat"]),
    ("dumbbell", ["woman-dumbbell", "dumbbell-exercise", "weight-training"]),
    ("lunge", ["woman-lunges", "lunges", "lunge-exercise"]),
    ("squat", ["woman-squats", "squats", "squat-exercise"])
]

headers = {'User-Agent': 'Mozilla/5.0'}

results = {}

for cat, q_list in queries:
    results[cat] = []
    for q in q_list:
        url = f"https://mixkit.co/free-stock-video/{q}/"
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req) as r:
                html = r.read().decode('utf-8', errors='ignore')
            items = re.findall(r'/free-stock-video/([a-z0-9-]+-(\d+))/', html)
            for slug, vid_id in items:
                if (slug, vid_id) not in results[cat]:
                    results[cat].append((slug, vid_id))
        except Exception:
            pass
    print(f"=== Category: {cat} (found {len(results[cat])}) ===")
    for slug, vid_id in results[cat][:5]:
        print(f"  [{vid_id}] {slug}")
