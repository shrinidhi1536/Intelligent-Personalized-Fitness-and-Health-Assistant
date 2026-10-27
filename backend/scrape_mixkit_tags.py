import urllib.request
import re
import json

headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

terms = ["squat", "yoga", "plank", "pushup", "lunges", "stretching", "fitness-woman", "pilates"]
found_videos = {}

for t in terms:
    url = f"https://mixkit.co/free-stock-video/search/{t}/"
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode("utf-8", errors="ignore")
            # Find item URLs and video assets
            matches = re.findall(r'href="(/free-stock-video/[^"]+)"[^>]*>.*?assets\.mixkit\.co/videos/(\d+)', html, re.DOTALL)
            print(f"Search '{t}': found {len(matches)} matches")
            for slug, vid in matches:
                if vid not in found_videos:
                    found_videos[vid] = {
                        "slug": slug,
                        "term": t,
                        "url_720": f"https://assets.mixkit.co/videos/{vid}/{vid}-720.mp4",
                        "url_1080": f"https://assets.mixkit.co/videos/{vid}/{vid}-1080.mp4",
                        "url_360": f"https://assets.mixkit.co/videos/{vid}/{vid}-360.mp4",
                    }
    except Exception as e:
        print(f"Search '{t}' error: {e}")

print(f"\nTotal unique videos collected: {len(found_videos)}")
for vid, data in list(found_videos.items())[:30]:
    print(f"[{vid}] ({data['term']}) {data['slug']}")
