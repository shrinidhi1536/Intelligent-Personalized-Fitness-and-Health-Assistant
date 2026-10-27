import urllib.request
import re

terms = ["push-up", "push-ups", "plank", "bridge", "dips", "triceps", "calisthenics", "mat-workout"]
headers = {'User-Agent': 'Mozilla/5.0'}

found = {}

for t in terms:
    found[t] = []
    for page in range(1, 6):
        url = f"https://mixkit.co/free-stock-video/{t}/?page={page}"
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=8) as r:
                html = r.read().decode('utf-8', errors='ignore')
            items = re.findall(r'/free-stock-video/([a-z0-9-]+-(\d+))/', html)
            if not items:
                break
            for slug, vid_id in items:
                if (slug, vid_id) not in found[t]:
                    found[t].append((slug, vid_id))
        except Exception:
            break
    print(f"=== {t}: {len(found[t])} items ===")
    for slug, vid_id in found[t][:10]:
        print(f"  [{vid_id}] {slug}")
