import urllib.request
import re
import json

terms = [
    "squat",
    "push-ups",
    "lunge",
    "plank",
    "yoga",
    "jumping-jacks",
    "stretching",
    "woman-exercising",
    "dumbbell",
    "gym"
]

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

for term in terms:
    url = f"https://mixkit.co/free-stock-video/{term}/"
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as r:
            html = r.read().decode('utf-8')
        items = set(re.findall(r'/free-stock-video/([a-z0-9-]+-(\d+))/', html))
        videos = set(re.findall(r'https://assets\.mixkit\.co/videos/\d+/\d+-(?:720|360)\.mp4', html))
        print(f"=== {term} : {len(items)} items, {len(videos)} video previews ===")
        for item, vid_id in list(items)[:4]:
            print(f"  {item} (id: {vid_id})")
    except Exception as e:
        print(f"=== {term} : Error {e} ===")
