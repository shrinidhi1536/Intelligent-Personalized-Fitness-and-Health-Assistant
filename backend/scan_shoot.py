import urllib.request
import re

headers = {'User-Agent': 'Mozilla/5.0'}

# Scan IDs around 52070 to 52140
print("Scanning IDs 52070-52140...")
for vid_id in range(52070, 52140):
    url = f"https://mixkit.co/free-stock-video/{vid_id}/"
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as r:
            final_url = r.geturl()
            html = r.read().decode('utf-8', errors='ignore')
            title_m = re.search(r'<title>(.*?)</title>', html)
            title = title_m.group(1) if title_m else ""
            print(f"ID {vid_id}: {title} -> {final_url}")
    except Exception as e:
        pass
